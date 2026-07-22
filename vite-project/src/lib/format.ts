/** Single source of truth for money display — the clinic bills in INR. */
export function formatCurrency(amount: number, options?: Intl.NumberFormatOptions): string {
  return `₹${amount.toLocaleString('en-IN', options)}`
}
