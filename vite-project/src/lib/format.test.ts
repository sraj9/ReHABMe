import { describe, it, expect } from 'vitest'
import { formatCurrency } from './format'

describe('formatCurrency', () => {
  it('formats with the rupee symbol and en-IN digit grouping', () => {
    expect(formatCurrency(123456)).toBe('₹1,23,456')
  })

  it('formats zero', () => {
    expect(formatCurrency(0)).toBe('₹0')
  })

  it('passes through Intl fraction options', () => {
    expect(formatCurrency(1500, { minimumFractionDigits: 2 })).toBe('₹1,500.00')
  })
})
