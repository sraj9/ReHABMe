import { IndianRupee, Receipt } from 'lucide-react'
import { useInvoicesContext } from '../context/InvoicesContext'
import { usePaymentsContext } from '../context/PaymentsContext'
import { invoiceBalance } from '../lib/ledger'
import { formatCurrency } from '../lib/format'
import type { Invoice } from '../lib/types'

interface InvoicePickerModalProps {
  onClose: () => void
  onSelect: (invoice: Invoice) => void
  /** Collect a one-off payment from a patient with no invoice (no package) */
  onDailyPayment?: () => void
}

/** Lists invoices with an outstanding balance so a payment can be recorded against one. */
export default function InvoicePickerModal({ onClose, onSelect, onDailyPayment }: InvoicePickerModalProps) {
  const { invoices } = useInvoicesContext()
  const { payments } = usePaymentsContext()

  const openInvoices = invoices
    .filter(i => i.status !== 'paid' && invoiceBalance(i, payments) > 0)
    .sort((a, b) => (a.patient?.full_name ?? '').localeCompare(b.patient?.full_name ?? ''))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Payment Received</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        {onDailyPayment && (
          <button
            onClick={onDailyPayment}
            className="w-full px-6 py-3.5 flex items-center gap-3 border-b border-gray-100 hover:bg-[#3d9cd6]/5 text-left"
          >
            <span className="p-2 bg-[#b7f383]/40 rounded-lg flex-shrink-0">
              <IndianRupee size={15} className="text-[#3d9cd6]" />
            </span>
            <span>
              <span className="block text-sm font-semibold text-gray-900">Daily payment</span>
              <span className="block text-xs text-gray-500">
                For a patient without a package — collect today's visit charge
              </span>
            </span>
          </button>
        )}

        <div className="px-6 pt-3 pb-1 flex items-center gap-1.5">
          <Receipt size={12} className="text-gray-400" />
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Against an invoice</p>
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-gray-50">
          {openInvoices.length === 0 ? (
            <p className="px-6 py-8 text-center text-sm text-gray-500">No invoices with an outstanding balance</p>
          ) : (
            openInvoices.map(invoice => (
              <button
                key={invoice.id}
                onClick={() => onSelect(invoice)}
                className="w-full px-6 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 text-left"
              >
                <div className="min-w-0">
                  {/* Patient name leads — staff look people up by name, not invoice number */}
                  <p className="text-sm font-semibold text-gray-900 truncate">{invoice.patient?.full_name ?? 'Unknown patient'}</p>
                  <p className="text-xs text-[#3d9cd6]">{invoice.invoice_number}</p>
                </div>
                <p className="text-sm font-semibold text-gray-900 flex-shrink-0">{formatCurrency(invoiceBalance(invoice, payments))} due</p>
              </button>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
