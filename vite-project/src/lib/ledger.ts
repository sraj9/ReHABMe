import type { Invoice, Payment } from './types'

/** Payments that count toward totals — voided ("wrong entry") ones do not. */
export function effectivePayments(payments: Payment[]): Payment[] {
  return payments.filter(p => !p.voided)
}

export function paidForInvoice(invoiceId: string, payments: Payment[]): number {
  return effectivePayments(payments)
    .filter(p => p.invoice_id === invoiceId)
    .reduce((sum, p) => sum + p.amount, 0)
}

export function invoiceBalance(invoice: Invoice, payments: Payment[]): number {
  return Math.max(0, Math.round((invoice.total_amount - paidForInvoice(invoice.id, payments)) * 100) / 100)
}
