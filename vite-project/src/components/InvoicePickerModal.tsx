import { useInvoicesContext } from '../context/InvoicesContext'
import { usePaymentsContext } from '../context/PaymentsContext'
import { invoiceBalance } from '../lib/ledger'
import { formatCurrency } from '../lib/format'
import type { Invoice } from '../lib/types'

interface InvoicePickerModalProps {
  onClose: () => void
  onSelect: (invoice: Invoice) => void
}

/** Lists invoices with an outstanding balance so a payment can be recorded against one. */
export default function InvoicePickerModal({ onClose, onSelect }: InvoicePickerModalProps) {
  const { invoices } = useInvoicesContext()
  const { payments } = usePaymentsContext()

  const openInvoices = invoices.filter(i => i.status !== 'paid' && invoiceBalance(i, payments) > 0)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Select Invoice</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="max-h-96 overflow-y-auto divide-y divide-gray-50">
          {openInvoices.length === 0 ? (
            <p className="px-6 py-10 text-center text-sm text-gray-500">No invoices with an outstanding balance</p>
          ) : (
            openInvoices.map(invoice => (
              <button
                key={invoice.id}
                onClick={() => onSelect(invoice)}
                className="w-full px-6 py-3 flex items-center justify-between gap-3 hover:bg-gray-50 text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-[#3d9cd6]">{invoice.invoice_number}</p>
                  <p className="text-xs text-gray-500 truncate">{invoice.patient?.full_name}</p>
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
