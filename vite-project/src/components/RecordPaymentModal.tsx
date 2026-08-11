import { useState } from 'react'
import { IndianRupee } from 'lucide-react'
import Button from './ui/Button'
import { usePaymentsContext } from '../context/PaymentsContext'
import { useInvoicesContext } from '../context/InvoicesContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { invoiceBalance } from '../lib/ledger'
import { formatCurrency } from '../lib/format'
import type { Invoice, PaymentMethod } from '../lib/types'

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
}

interface RecordPaymentModalProps {
  invoice: Invoice
  onClose: () => void
}

export default function RecordPaymentModal({ invoice, onClose }: RecordPaymentModalProps) {
  const { payments, addPayment } = usePaymentsContext()
  const { updateInvoice } = useInvoicesContext()
  const { profile } = useAuth()
  const toast = useToast()

  const balance = invoiceBalance(invoice, payments)
  const today = new Date().toISOString().split('T')[0]

  const [amount, setAmount] = useState(String(balance))
  const [method, setMethod] = useState<PaymentMethod>('upi')
  const [paidAt, setPaidAt] = useState(today)
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const value = Math.round(parseFloat(amount) * 100) / 100
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (value > balance) {
      setError(`Amount exceeds the outstanding balance of ${formatCurrency(balance)}`)
      return
    }
    setSaving(true)
    setError('')
    const now = new Date().toISOString()

    const payment = await addPayment({
      id: crypto.randomUUID(),
      invoice_id: invoice.id,
      patient_id: invoice.patient_id,
      amount: value,
      method,
      paid_at: paidAt || today,
      notes: notes.trim() || undefined,
      received_by: profile?.id,
      created_at: now,
      patient: invoice.patient,
      invoice,
      receiver: profile ?? undefined,
    })
    if (!payment) {
      setSaving(false)
      setError('Could not record the payment. Please try again.')
      return
    }

    // Keep the invoice status in sync with what has actually been received
    const newBalance = Math.round((balance - value) * 100) / 100
    if (newBalance <= 0) {
      await updateInvoice({ ...invoice, status: 'paid', paid_date: paidAt || today, updated_at: now })
    } else if (invoice.status === 'draft') {
      await updateInvoice({ ...invoice, status: 'sent', updated_at: now })
    }

    setSaving(false)
    toast.success(
      newBalance <= 0
        ? `${formatCurrency(value)} received — invoice ${invoice.invoice_number} fully paid`
        : `${formatCurrency(value)} received — ${formatCurrency(newBalance)} remaining`
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
          <h2 className="text-lg font-semibold text-gray-900">Record Payment</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#3d9cd6]">{invoice.invoice_number}</p>
              <p className="text-xs text-gray-500">{invoice.patient?.full_name}</p>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-500">Outstanding</p>
              <p className="text-base font-bold text-gray-900">{formatCurrency(balance)}</p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="payment-amount" className={labelClass}>Amount (₹) *</label>
              <input id="payment-amount" type="number" min="0" step="0.01" className={fieldClass} value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label htmlFor="payment-method" className={labelClass}>Method</label>
              <select id="payment-method" className={fieldClass} value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
                {Object.entries(methodLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="payment-date" className={labelClass}>Payment Date</label>
            <input id="payment-date" type="date" className={fieldClass} value={paidAt} onChange={e => setPaidAt(e.target.value)} />
          </div>
          <div>
            <label htmlFor="payment-notes" className={labelClass}>Notes</label>
            <input id="payment-notes" className={fieldClass} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reference number, remarks…" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} icon={<IndianRupee size={14} />} onClick={handleSave}>
            Record Payment
          </Button>
        </div>
      </div>
    </div>
  )
}
