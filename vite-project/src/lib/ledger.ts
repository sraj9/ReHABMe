import type { Invoice, Payment } from './types'

export function paidForInvoice(invoiceId: string, payments: Payment[]): number {
  return payments
    .filter(p => p.invoice_id === invoiceId)
    .reduce((sum, p) => sum + p.amount, 0)
}

export function invoiceBalance(invoice: Invoice, payments: Payment[]): number {
  return Math.max(0, Math.round((invoice.total_amount - paidForInvoice(invoice.id, payments)) * 100) / 100)
}
