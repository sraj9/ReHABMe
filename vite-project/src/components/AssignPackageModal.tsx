import { useState } from 'react'
import { PackagePlus } from 'lucide-react'
import Button from './ui/Button'
import { usePackagesContext } from '../context/PackagesContext'
import { useInvoicesContext } from '../context/InvoicesContext'
import { useToast } from '../context/ToastContext'
import { formatCurrency } from '../lib/format'
import type { Patient } from '../lib/types'

interface AssignPackageModalProps {
  patient: Patient
  onClose: () => void
}

export default function AssignPackageModal({ patient, onClose }: AssignPackageModalProps) {
  const { addPackage } = usePackagesContext()
  const { invoices, addInvoice } = useInvoicesContext()
  const toast = useToast()
  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({ name: '', total_sessions: '10', price: '', purchased_at: today })
  const [createInvoice, setCreateInvoice] = useState(true)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleAssign = async () => {
    const totalSessions = parseInt(form.total_sessions)
    const price = Math.round(parseFloat(form.price || '0') * 100) / 100
    const name = form.name.trim() || `${totalSessions} Session Package`
    if (!Number.isFinite(totalSessions) || totalSessions <= 0) {
      setError('Enter a valid number of sessions')
      return
    }
    if (createInvoice && (!Number.isFinite(price) || price <= 0)) {
      setError('Enter the package price to create its invoice')
      return
    }
    setSaving(true)
    setError('')
    const now = new Date().toISOString()

    // Bill the package through the normal invoicing flow so payments and
    // dues show up in Billing and Accounts
    let invoiceId: string | null = null
    if (createInvoice) {
      const dueDate = new Date()
      dueDate.setDate(dueDate.getDate() + 7)
      const invoice = await addInvoice({
        id: crypto.randomUUID(),
        invoice_number: `INV-${String(invoices.length + 1).padStart(4, '0')}`,
        patient_id: patient.id,
        patient,
        status: 'sent',
        issue_date: form.purchased_at || today,
        due_date: dueDate.toISOString().split('T')[0],
        subtotal: price,
        tax_rate: 0,
        tax_amount: 0,
        discount_amount: 0,
        total_amount: price,
        notes: `Session package: ${name}`,
        items: [{
          id: crypto.randomUUID(),
          invoice_id: '',
          description: name,
          quantity: 1,
          unit_price: price,
          total: price,
        }],
        created_at: now,
        updated_at: now,
      })
      if (!invoice) {
        setSaving(false)
        setError('Could not create the package invoice. Please try again.')
        return
      }
      invoiceId = invoice.id
    }

    const pkg = await addPackage({
      id: crypto.randomUUID(),
      patient_id: patient.id,
      name,
      total_sessions: totalSessions,
      price,
      invoice_id: invoiceId,
      purchased_at: form.purchased_at || today,
      is_active: true,
      created_at: now,
      updated_at: now,
      patient,
    })
    setSaving(false)
    if (!pkg) {
      setError('Could not assign the package. Please try again.')
      return
    }
    toast.success(
      createInvoice
        ? `${name} assigned to ${patient.full_name} — invoiced ${formatCurrency(price)}`
        : `${name} assigned to ${patient.full_name}`
    )
    onClose()
  }

  const fieldClass =
    'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent'
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Assign Package — {patient.full_name}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="package-name" className={labelClass}>Package Name</label>
            <input id="package-name" className={fieldClass} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Physiotherapy 10-Session Package" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="package-sessions" className={labelClass}>Number of Sessions *</label>
              <input id="package-sessions" type="number" min="1" className={fieldClass} value={form.total_sessions} onChange={e => setForm(f => ({ ...f, total_sessions: e.target.value }))} />
            </div>
            <div>
              <label htmlFor="package-price" className={labelClass}>Package Price (₹)</label>
              <input id="package-price" type="number" min="0" step="0.01" className={fieldClass} value={form.price} onChange={e => setForm(f => ({ ...f, price: e.target.value }))} placeholder="e.g. 4500" />
            </div>
          </div>
          <div>
            <label htmlFor="package-date" className={labelClass}>Purchase Date</label>
            <input id="package-date" type="date" className={fieldClass} value={form.purchased_at} onChange={e => setForm(f => ({ ...f, purchased_at: e.target.value }))} />
          </div>
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={createInvoice} onChange={e => setCreateInvoice(e.target.checked)} className="rounded border-gray-300 accent-[#3d9cd6]" />
            <span className="text-sm text-gray-700">Create invoice for this package</span>
          </label>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} icon={<PackagePlus size={14} />} onClick={handleAssign}>
            Assign Package
          </Button>
        </div>
      </div>
    </div>
  )
}
