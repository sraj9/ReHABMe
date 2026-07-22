import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, parseISO, addDays } from 'date-fns'
import { Plus, Search, IndianRupee, TrendingUp, Clock, AlertCircle, Trash2, Printer } from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge, { getInvoiceStatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import StatCard from '../../components/ui/StatCard'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../components/ui/Pagination'
import { useInvoicesContext } from '../../context/InvoicesContext'
import { usePatientsContext } from '../../context/PatientsContext'
import { useToast } from '../../context/ToastContext'
import { formatCurrency } from '../../lib/format'
import { printInvoice } from '../../lib/invoicePrint'
import type { Invoice, InvoiceStatus } from '../../lib/types'

const PAGE_SIZE = 10

export default function InvoiceList() {
  const { invoices, loading, addInvoice, updateInvoice, deleteInvoice } = useInvoicesContext()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<InvoiceStatus | 'all'>('all')
  // Deep links like /billing?new=1&patient=<id> open the form prefilled on mount
  const [showForm, setShowForm] = useState(() => searchParams.get('new') === '1')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Invoice | null>(null)
  const [prefillPatientId, setPrefillPatientId] = useState<string | undefined>(() =>
    searchParams.get('new') === '1' ? searchParams.get('patient') ?? undefined : undefined
  )

  const filtered = invoices.filter(inv => {
    const matchSearch =
      inv.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
      (inv.patient?.full_name.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchStatus = statusFilter === 'all' || inv.status === statusFilter
    return matchSearch && matchStatus
  })

  // Clamp rather than reset-in-effect so filter changes can't leave us past the last page
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const totals = {
    paid: invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total_amount, 0),
    pending: invoices.filter(i => i.status === 'sent').reduce((s, i) => s + i.total_amount, 0),
    overdue: invoices.filter(i => i.status === 'overdue').reduce((s, i) => s + i.total_amount, 0),
    draft: invoices.filter(i => i.status === 'draft').reduce((s, i) => s + i.total_amount, 0),
  }

  const statusCounts = invoices.reduce<Record<string, number>>((acc, inv) => {
    acc[inv.status] = (acc[inv.status] || 0) + 1
    return acc
  }, {})

  const handleStatusChange = async (inv: Invoice, newStatus: InvoiceStatus) => {
    const now = new Date().toISOString()
    const result = await updateInvoice({
      ...inv,
      status: newStatus,
      paid_date: newStatus === 'paid' ? now.split('T')[0] : inv.paid_date,
      updated_at: now,
    })
    if (result) {
      toast.success(`Invoice ${inv.invoice_number} marked ${newStatus}`)
    } else {
      toast.error('Could not update the invoice status')
    }
  }

  const handlePrint = (inv: Invoice) => {
    if (!printInvoice(inv)) {
      toast.error('Pop-up blocked — allow pop-ups for this site to print invoices')
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const ok = await deleteInvoice(deleteTarget.id)
    setDeleteTarget(null)
    if (ok) {
      toast.success('Invoice deleted')
    } else {
      toast.error('Could not delete the invoice')
    }
  }

  return (
    <div className="space-y-5">
      {/* Summary stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        <StatCard
          title="Total Collected"
          value={formatCurrency(totals.paid)}
          subtitle={`${statusCounts.paid || 0} paid invoices`}
          icon={<IndianRupee size={24} />}
          color="green"
        />
        <StatCard
          title="Pending Payment"
          value={formatCurrency(totals.pending)}
          subtitle={`${statusCounts.sent || 0} sent invoices`}
          icon={<Clock size={24} />}
          color="primary"
        />
        <StatCard
          title="Overdue"
          value={formatCurrency(totals.overdue)}
          subtitle={`${statusCounts.overdue || 0} overdue invoices`}
          icon={<AlertCircle size={24} />}
          color="red"
        />
        <StatCard
          title="Draft"
          value={formatCurrency(totals.draft)}
          subtitle={`${statusCounts.draft || 0} draft invoices`}
          icon={<TrendingUp size={24} />}
          color="amber"
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['all', 'draft', 'sent', 'paid', 'overdue'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === status ? 'bg-[#3d9cd6] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {status === 'all' ? 'All' : status}
              <span className="ml-1.5 opacity-70">{status === 'all' ? invoices.length : statusCounts[status] || 0}</span>
            </button>
          ))}
        </div>
        <Button icon={<Plus size={16} />} onClick={() => setShowForm(true)}>
          New Invoice
        </Button>
      </div>

      <Card padding="none">
        {/* Search */}
        <div className="px-5 py-4 border-b border-gray-100">
          <div className="relative">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Search by invoice number or patient..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Patient</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Issue Date</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Due Date</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Amount</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-5 py-12 text-center text-sm text-gray-500">
                    {loading ? 'Loading invoices…' : 'No invoices match your search'}
                  </td>
                </tr>
              ) : (
                paged.map(inv => (
                  <tr key={inv.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="text-sm font-semibold text-[#3d9cd6]">{inv.invoice_number}</p>
                      <p className="text-xs text-gray-500">{inv.items.length} line item{inv.items.length !== 1 ? 's' : ''}</p>
                    </td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#3d9cd6]/10 flex items-center justify-center text-[#3d9cd6] text-xs font-semibold flex-shrink-0">
                          {inv.patient?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                        </div>
                        <span className="text-sm text-gray-900">{inv.patient?.full_name}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-sm text-gray-600">
                      {format(parseISO(inv.issue_date), 'MMM d, yyyy')}
                    </td>
                    <td className="px-5 py-3.5">
                      <p className={`text-sm ${inv.status === 'overdue' ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {format(parseISO(inv.due_date), 'MMM d, yyyy')}
                      </p>
                      {inv.paid_date && (
                        <p className="text-xs text-green-600">Paid {format(parseISO(inv.paid_date), 'MMM d')}</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total_amount)}</p>
                      {inv.discount_amount > 0 && (
                        <p className="text-xs text-green-600">-{formatCurrency(inv.discount_amount)} disc</p>
                      )}
                    </td>
                    <td className="px-5 py-3.5">
                      <select
                        value={inv.status}
                        onChange={e => handleStatusChange(inv, e.target.value as InvoiceStatus)}
                        className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#3d9cd6]"
                      >
                        <option value="draft">Draft</option>
                        <option value="sent">Sent</option>
                        <option value="paid">Paid</option>
                        <option value="overdue">Overdue</option>
                      </select>
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Badge variant={getInvoiceStatusBadge(inv.status)} dot>
                          {inv.status}
                        </Badge>
                        <button
                          onClick={() => handlePrint(inv)}
                          className="p-1 text-gray-400 hover:text-[#3d9cd6] transition-colors rounded ml-1"
                          title="Print / save as PDF"
                          aria-label="Print invoice"
                        >
                          <Printer size={13} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(inv)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                          title="Delete invoice"
                          aria-label="Delete invoice"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} label="invoices" />
      </Card>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete invoice?"
        message={`This will permanently delete invoice ${deleteTarget?.invoice_number ?? ''} for ${deleteTarget?.patient?.full_name ?? 'this patient'}.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {showForm && (
        <InvoiceFormModal
          onClose={() => {
            setShowForm(false)
            setPrefillPatientId(undefined)
            if (searchParams.get('new')) setSearchParams({}, { replace: true })
          }}
          addInvoice={addInvoice}
          invoiceCount={invoices.length}
          defaultPatientId={prefillPatientId}
        />
      )}
    </div>
  )
}

interface InvoiceFormModalProps {
  onClose: () => void
  addInvoice: (invoice: Invoice) => Promise<Invoice | null>
  invoiceCount: number
  defaultPatientId?: string
}

function InvoiceFormModal({ onClose, addInvoice, invoiceCount, defaultPatientId }: InvoiceFormModalProps) {
  const { patients } = usePatientsContext()
  const toast = useToast()

  const today = new Date().toISOString().split('T')[0]

  const [form, setForm] = useState({
    patient_id: defaultPatientId ?? '',
    issue_date: today,
    due_date: addDays(new Date(), 30).toISOString().split('T')[0],
    tax_rate: '0',
    discount_amount: '0',
    notes: '',
  })
  const [items, setItems] = useState([{ description: '', quantity: 1, unit_price: 0 }])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const addItem = () => setItems(prev => [...prev, { description: '', quantity: 1, unit_price: 0 }])
  const removeItem = (i: number) => setItems(prev => prev.filter((_, idx) => idx !== i))
  const updateItem = (i: number, field: string, value: string | number) => {
    setItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)
  const taxRate = parseFloat(form.tax_rate) || 0
  const discountAmount = parseFloat(form.discount_amount) || 0
  // Mirrors the DB's recalculate_invoice_totals: round(subtotal * rate / 100, 2)
  const taxAmount = Math.round(subtotal * taxRate) / 100
  const totalAmount = Math.max(0, Math.round((subtotal + taxAmount - discountAmount) * 100) / 100)

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.patient_id) errs.patient_id = 'Patient is required'
    const hasValidItem = items.some(item => item.description.trim())
    if (!hasValidItem) errs.items = 'At least one item with a description is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    setSubmitError('')
    const now = new Date().toISOString()
    const invoiceId = `inv-${Date.now()}`

    const result = await addInvoice({
      id: invoiceId,
      invoice_number: `INV-${String(invoiceCount + 1).padStart(4, '0')}`,
      patient_id: form.patient_id,
      patient: patients.find(p => p.id === form.patient_id),
      issue_date: form.issue_date || today,
      due_date: form.due_date || addDays(new Date(), 30).toISOString().split('T')[0],
      status: 'draft' as InvoiceStatus,
      subtotal,
      tax_rate: taxRate,
      tax_amount: taxAmount,
      discount_amount: discountAmount,
      total_amount: totalAmount,
      notes: form.notes,
      items: items.map((item, i) => ({
        id: `item-${Date.now()}-${i}`,
        invoice_id: invoiceId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total: item.quantity * item.unit_price,
      })),
      created_at: now,
      updated_at: now,
    })
    setSaving(false)
    if (!result) {
      setSubmitError('Could not create the invoice. Please check your connection and try again.')
      return
    }
    toast.success(`Invoice ${result.invoice_number} created`)
    onClose()
  }

  const fieldClass = (hasError?: boolean) =>
    `w-full px-3 py-2 rounded-lg border ${hasError ? 'border-red-400' : 'border-gray-300'} text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent`
  const labelClass = "block text-xs font-medium text-gray-700 mb-1"
  const errorClass = "text-xs text-red-500 mt-1"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Create Invoice</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="inv-patient_id">Patient *</label>
              <select
                id="inv-patient_id"
                className={fieldClass(!!errors.patient_id)}
                value={form.patient_id}
                onChange={e => { setForm(f => ({ ...f, patient_id: e.target.value })); setErrors(er => ({ ...er, patient_id: '' })) }}
              >
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              {errors.patient_id && <p className={errorClass}>{errors.patient_id}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="inv-issue_date">Issue Date</label>
              <input id="inv-issue_date" type="date" className={fieldClass()} value={form.issue_date} onChange={e => setForm(f => ({ ...f, issue_date: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass} htmlFor="inv-due_date">Due Date</label>
              <input id="inv-due_date" type="date" className={fieldClass()} value={form.due_date} onChange={e => setForm(f => ({ ...f, due_date: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass} htmlFor="inv-tax_rate">Tax Rate (%)</label>
              <input id="inv-tax_rate" type="number" min="0" max="100" step="0.01" className={fieldClass()} value={form.tax_rate} onChange={e => setForm(f => ({ ...f, tax_rate: e.target.value }))} />
            </div>
            <div>
              <label className={labelClass} htmlFor="inv-discount_amount">Discount (₹)</label>
              <input id="inv-discount_amount" type="number" min="0" step="0.01" className={fieldClass()} value={form.discount_amount} onChange={e => setForm(f => ({ ...f, discount_amount: e.target.value }))} />
            </div>
          </div>

          {/* Line items */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <label className="text-sm font-semibold text-gray-700">Line Items *</label>
              <button onClick={addItem} className="text-xs text-[#3d9cd6] hover:underline">+ Add item</button>
            </div>
            {errors.items && <p className={`${errorClass} mb-2`}>{errors.items}</p>}
            <div className="space-y-2">
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-start">
                  <div className="col-span-6">
                    {i === 0 && <label htmlFor={`inv-item-${i}-description`} className="block text-xs text-gray-500 mb-1">Description</label>}
                    <input
                      id={`inv-item-${i}-description`}
                      aria-label={i === 0 ? undefined : 'Description'}
                      className={fieldClass()}
                      value={item.description}
                      onChange={e => { updateItem(i, 'description', e.target.value); setErrors(er => ({ ...er, items: '' })) }}
                      placeholder="Service description..."
                    />
                  </div>
                  <div className="col-span-2">
                    {i === 0 && <label htmlFor={`inv-item-${i}-quantity`} className="block text-xs text-gray-500 mb-1">Qty</label>}
                    <input id={`inv-item-${i}-quantity`} aria-label={i === 0 ? undefined : 'Qty'} type="number" min="1" className={fieldClass()} value={item.quantity} onChange={e => updateItem(i, 'quantity', parseInt(e.target.value))} />
                  </div>
                  <div className="col-span-3">
                    {i === 0 && <label htmlFor={`inv-item-${i}-unit_price`} className="block text-xs text-gray-500 mb-1">Unit Price (₹)</label>}
                    <input id={`inv-item-${i}-unit_price`} aria-label={i === 0 ? undefined : 'Unit Price (₹)'} type="number" min="0" step="0.01" className={fieldClass()} value={item.unit_price} onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value))} />
                  </div>
                  <div className={`col-span-1 flex ${i === 0 ? 'mt-5' : ''} items-center justify-end`}>
                    {items.length > 1 && (
                      <button onClick={() => removeItem(i)} aria-label="Remove line item" className="text-red-400 hover:text-red-600 text-lg leading-none">×</button>
                    )}
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-3 flex justify-end">
              <div className="text-right space-y-0.5">
                <p className="text-xs text-gray-500">Subtotal: {formatCurrency(subtotal, { minimumFractionDigits: 2 })}</p>
                {taxAmount > 0 && (
                  <p className="text-xs text-gray-500">Tax ({taxRate}%): {formatCurrency(taxAmount, { minimumFractionDigits: 2 })}</p>
                )}
                {discountAmount > 0 && (
                  <p className="text-xs text-green-600">Discount: -{formatCurrency(discountAmount, { minimumFractionDigits: 2 })}</p>
                )}
                <p className="text-xl font-bold text-gray-900">{formatCurrency(totalAmount, { minimumFractionDigits: 2 })}</p>
              </div>
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="inv-notes">Notes</label>
            <textarea id="inv-notes" className={`${fieldClass()} resize-y`} rows={2} value={form.notes} onChange={e => setForm(f => ({ ...f, notes: e.target.value }))} placeholder="Additional notes for this invoice..." />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          {submitError && <p className="text-xs text-red-600 mr-auto">{submitError}</p>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSave}>Create Invoice</Button>
        </div>
      </div>
    </div>
  )
}
