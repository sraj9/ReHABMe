import { useState } from 'react'
import { IndianRupee } from 'lucide-react'
import Button from './ui/Button'
import { usePatientsContext } from '../context/PatientsContext'
import { usePaymentsContext } from '../context/PaymentsContext'
import { usePackagesContext } from '../context/PackagesContext'
import { useSessionsContext } from '../context/SessionsContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { activePackageFor } from '../lib/packages'
import { formatCurrency } from '../lib/format'
import type { PaymentMethod } from '../lib/types'

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
}

interface DailyPaymentModalProps {
  onClose: () => void
  defaultPatientId?: string
}

/**
 * A one-off visit charge for a patient with no package — recorded straight
 * against the patient, with no invoice behind it.
 */
export default function DailyPaymentModal({ onClose, defaultPatientId }: DailyPaymentModalProps) {
  const { patients } = usePatientsContext()
  const { addPayment } = usePaymentsContext()
  const { packages } = usePackagesContext()
  const { sessions } = useSessionsContext()
  const { profile } = useAuth()
  const toast = useToast()

  const today = new Date().toISOString().split('T')[0]
  const [patientId, setPatientId] = useState(defaultPatientId ?? '')
  const [amount, setAmount] = useState('')
  const [method, setMethod] = useState<PaymentMethod>('cash')
  const [paidAt, setPaidAt] = useState(today)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Warn if this patient actually has a package — the visit is already paid for
  const activePackage = patientId ? activePackageFor(patientId, packages, sessions) : undefined

  const handleSave = async () => {
    if (!patientId) {
      setError('Select a patient')
      return
    }
    const value = Math.round(parseFloat(amount) * 100) / 100
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount')
      return
    }
    setSaving(true)
    setError('')
    const now = new Date().toISOString()
    const patient = patients.find(p => p.id === patientId)

    const payment = await addPayment({
      id: crypto.randomUUID(),
      // No invoice — this is a direct visit charge
      invoice_id: null,
      patient_id: patientId,
      amount: value,
      method,
      paid_at: paidAt || today,
      notes: notes.trim() || 'Daily visit payment',
      received_by: profile?.id,
      created_at: now,
      patient,
      receiver: profile ?? undefined,
    })
    setSaving(false)
    if (!payment) {
      setError('Could not record the payment. Please try again.')
      return
    }
    toast.success(`${formatCurrency(value)} received from ${patient?.full_name ?? 'patient'}`)
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
          <h2 className="text-lg font-semibold text-gray-900">Daily Payment</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          <p className="text-xs text-gray-500">
            For a patient paying per visit. No invoice is created — it goes straight into collections.
          </p>

          <div>
            <label htmlFor="daily-patient" className={labelClass}>Patient *</label>
            <select id="daily-patient" className={fieldClass} value={patientId} onChange={e => { setPatientId(e.target.value); setError('') }}>
              <option value="">Select patient...</option>
              {patients
                .filter(p => p.is_active)
                .slice()
                .sort((a, b) => a.full_name.localeCompare(b.full_name))
                .map(p => (
                  <option key={p.id} value={p.id}>{p.full_name}</option>
                ))}
            </select>
            {activePackage && (
              <p className="text-xs text-amber-600 mt-1">
                This patient has an active package ({activePackage.name}) — their visits may already be paid for.
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="daily-amount" className={labelClass}>Amount (₹) *</label>
              <input id="daily-amount" type="number" min="0" step="0.01" className={fieldClass} value={amount} onChange={e => { setAmount(e.target.value); setError('') }} placeholder="e.g. 400" />
            </div>
            <div>
              <label htmlFor="daily-method" className={labelClass}>Method</label>
              <select id="daily-method" className={fieldClass} value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
                {Object.entries(methodLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label htmlFor="daily-date" className={labelClass}>Payment Date</label>
            <input id="daily-date" type="date" className={fieldClass} value={paidAt} onChange={e => setPaidAt(e.target.value)} />
          </div>
          <div>
            <label htmlFor="daily-notes" className={labelClass}>Notes</label>
            <input id="daily-notes" className={fieldClass} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional — e.g. single session charge" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} icon={<IndianRupee size={14} />} onClick={handleSave}>Record Payment</Button>
        </div>
      </div>
    </div>
  )
}
