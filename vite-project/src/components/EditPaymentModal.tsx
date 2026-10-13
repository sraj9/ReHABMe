import { useState } from 'react'
import { Save } from 'lucide-react'
import Button from './ui/Button'
import { usePaymentsContext } from '../context/PaymentsContext'
import { useInvoicesContext } from '../context/InvoicesContext'
import { useToast } from '../context/ToastContext'
import { invoiceBalance } from '../lib/ledger'
import { formatCurrency } from '../lib/format'
import type { Payment, PaymentMethod } from '../lib/types'

const methodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
}

interface EditPaymentModalProps {
  payment: Payment
  onClose: () => void
}

export default function EditPaymentModal({ payment, onClose }: EditPaymentModalProps) {
  const { payments, updatePayment } = usePaymentsContext()
  const { invoices, updateInvoice } = useInvoicesContext()
  const toast = useToast()

  const invoice = payment.invoice_id ? invoices.find(i => i.id === payment.invoice_id) : undefined
  // What this payment may grow to: the invoice balance as if this payment were not recorded
  const otherPayments = payments.filter(p => p.id !== payment.id)
  const maxAmount = invoice ? invoiceBalance(invoice, otherPayments) : Infinity

  const [amount, setAmount] = useState(String(payment.amount))
  const [method, setMethod] = useState<PaymentMethod>(payment.method)
  const [paidAt, setPaidAt] = useState(payment.paid_at.split('T')[0])
  const [notes, setNotes] = useState(payment.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    const value = Math.round(parseFloat(amount) * 100) / 100
    if (!Number.isFinite(value) || value <= 0) {
      setError('Enter a valid amount')
      return
    }
    if (value > maxAmount) {
      setError(`Amount exceeds the invoice balance of ${formatCurrency(maxAmount)}`)
      return
    }
    if (!paidAt) {
      setError('Pick a payment date')
      return
    }
    setSaving(true)
    setError('')

    const updated = await updatePayment({
      ...payment,
      amount: value,
      method,
      paid_at: paidAt,
      notes: notes.trim() || undefined,
    })
    if (!updated) {
      setSaving(false)
      setError('Could not save the payment. Please try again.')
      return
    }

    // Keep the invoice status in sync with the corrected amount
    if (invoice && !payment.voided) {
      const remaining = invoiceBalance(invoice, [...otherPayments, { ...payment, amount: value }])
      const now = new Date().toISOString()
      if (remaining <= 0 && invoice.status !== 'paid') {
        await updateInvoice({ ...invoice, status: 'paid', paid_date: paidAt, updated_at: now })
      } else if (remaining > 0 && invoice.status === 'paid') {
        await updateInvoice({ ...invoice, status: 'sent', paid_date: null, updated_at: now })
      }
    }

    setSaving(false)
    toast.success('Payment updated')
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
          <h2 className="text-lg font-semibold text-gray-900">Edit Payment</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          <div className="bg-gray-50 rounded-xl px-4 py-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-[#3d9cd6]">{payment.invoice?.invoice_number ?? 'Daily payment'}</p>
              <p className="text-xs text-gray-500">{payment.patient?.full_name}</p>
            </div>
            {invoice && (
              <div className="text-right">
                <p className="text-xs text-gray-500">Max allowed</p>
                <p className="text-base font-bold text-gray-900">{formatCurrency(maxAmount)}</p>
              </div>
            )}
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="edit-payment-amount" className={labelClass}>Amount (₹) *</label>
              <input id="edit-payment-amount" type="number" min="0" step="0.01" className={fieldClass} value={amount} onChange={e => setAmount(e.target.value)} />
            </div>
            <div>
              <label htmlFor="edit-payment-method" className={labelClass}>Method</label>
              <select id="edit-payment-method" className={fieldClass} value={method} onChange={e => setMethod(e.target.value as PaymentMethod)}>
                {Object.entries(methodLabels).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="edit-payment-date" className={labelClass}>Payment Date</label>
            <input id="edit-payment-date" type="date" className={fieldClass} value={paidAt} onChange={e => setPaidAt(e.target.value)} />
          </div>
          <div>
            <label htmlFor="edit-payment-notes" className={labelClass}>Notes</label>
            <input id="edit-payment-notes" className={fieldClass} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Reference number, remarks…" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} icon={<Save size={14} />} onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
