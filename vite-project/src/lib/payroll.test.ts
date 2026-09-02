import { describe, it, expect } from 'vitest'
import { format } from 'date-fns'
import { payoutFor, workingDaysInMonth } from './payroll'
import type { Attendance, Holiday, StaffProfile } from './types'

const staff = (over: Partial<StaffProfile> = {}): StaffProfile => ({
  id: 's1', user_id: 'u1', full_name: 'Dr. Test', role: 'therapist',
  is_active: true, monthly_salary: 30000, daily_working_hours: 8,
  created_at: '', updated_at: '', ...over,
})

const att = (date: string, inH: string, outH: string): Attendance => ({
  id: `${date}-${inH}`, profile_id: 's1',
  check_in_at: `${date}T${inH}:00`, check_out_at: `${date}T${outH}:00`,
  created_at: '',
})

const holiday = (d: string, name: string): Holiday =>
  ({ id: d, holiday_date: d, name, is_national: false, created_at: '' })

describe('payroll', () => {
  it('excludes Sundays from working days', () => {
    // September 2026: 30 days, 4 Sundays (6, 13, 20, 27)
    const days = workingDaysInMonth(new Date('2026-09-01T00:00:00'), [])
    expect(days.length).toBe(26)
  })

  it('excludes holidays too', () => {
    const days = workingDaysInMonth(new Date('2026-09-01T00:00:00'), [holiday('2026-09-02', 'Test Day')])
    expect(days.length).toBe(25)
  })

  it('pays the full salary when hours match expectation', () => {
    const month = new Date('2026-09-01T00:00:00')
    const days = workingDaysInMonth(month, [])
    // Work a full 8h on every working day
    // format() keeps the local calendar date; toISOString() would shift it in IST
    const attendance = days.map(d => att(format(d, 'yyyy-MM-dd'), '09:00', '17:00'))
    const calc = payoutFor(staff(), month, attendance, [])
    expect(calc.expectedHours).toBe(208) // 26 days x 8h
    expect(calc.actualHours).toBe(208)
    expect(calc.payout).toBe(30000)
  })

  it('pro-rates the payout when hours fall short', () => {
    const month = new Date('2026-09-01T00:00:00')
    // Only 13 of 26 days worked => half the salary
    const attendance = ['01','02','03','04','07','08','09','10','11','14','15','16','17']
      .map(d => att(`2026-09-${d}`, '09:00', '17:00'))
    const calc = payoutFor(staff(), month, attendance, [])
    expect(calc.daysPresent).toBe(13)
    expect(calc.payout).toBe(15000)
  })

  it('reports no payout when a salary has not been set', () => {
    const calc = payoutFor(staff({ monthly_salary: null }), new Date('2026-09-01T00:00:00'), [], [])
    expect(calc.payout).toBeNull()
  })

  it('ignores entries with no check-out', () => {
    const open: Attendance = { id: 'o', profile_id: 's1', check_in_at: '2026-09-01T09:00:00', created_at: '' }
    const calc = payoutFor(staff(), new Date('2026-09-01T00:00:00'), [open], [])
    expect(calc.actualHours).toBe(0)
  })
})
