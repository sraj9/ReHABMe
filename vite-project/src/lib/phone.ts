/**
 * Normalizes a mobile number to international format.
 * Country code is optional — bare 10-digit numbers are assumed Indian (+91).
 * Returns null when the input can't be a valid number.
 */
export function normalizePhone(input: string): string | null {
  const compact = input.replace(/[\s()-]/g, '')
  if (/^\+\d{8,15}$/.test(compact)) return compact
  if (/^\d{10}$/.test(compact)) return `+91${compact}`
  if (/^\d{11,15}$/.test(compact)) return `+${compact}`
  return null
}
