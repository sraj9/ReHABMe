import { differenceInMinutes, eachDayOfInterval, endOfMonth, format, parseISO, startOfMonth } from 'date-fns'
import { isWeeklyOff } from './scheduling'
import type { Attendance, Holiday, StaffProfile } from './types'

export interface PayoutBreakdown {
  /** Days the clinic is open this month (excludes Sundays and holidays) */
  workingDays: number
  /** workingDays × the staff member's daily hours */
  expectedHours: number
  /** Hours actually recorded in attendance */
  actualHours: number
  /** actualHours / expectedHours, 0 when nothing is expected */
  ratio: number
  /** Salary scaled by the ratio — null when no salary is set */
  payout: number | null
  daysPresent: number
  holidays: Holiday[]
}

const round1 = (n: number) => Math.round(n * 10) / 10

/** Days the clinic is open in a month: not Sunday, not a holiday. */
export function workingDaysInMonth(month: Date, holidays: Holiday[]): Date[] {
  const holidayDates = new Set(holidays.map(h => h.holiday_date))
  return eachDayOfInterval({ start: startOfMonth(month), end: endOfMonth(month) }).filter(
    d => !isWeeklyOff(d) && !holidayDates.has(format(d, 'yyyy-MM-dd'))
  )
}

/** Hours recorded for one staff member in a month; open entries count 0. */
export function hoursWorked(profileId: string, month: Date, attendance: Attendance[]): { hours: number; days: number } {
  const prefix = format(month, 'yyyy-MM')
  const mine = attendance.filter(
    a => a.profile_id === profileId && a.check_in_at.startsWith(prefix) && a.check_out_at
  )
  const minutes = mine.reduce(
    (sum, a) => sum + Math.max(0, differenceInMinutes(parseISO(a.check_out_at as string), parseISO(a.check_in_at))),
    0
  )
  const days = new Set(mine.map(a => a.check_in_at.slice(0, 10))).size
  return { hours: round1(minutes / 60), days }
}

/**
 * Pro-rata payout: the salary scaled by hours actually worked against the
 * hours expected for the month. Uncapped, so overtime shows above 100% and
 * the admin can see it rather than having it silently trimmed.
 */
export function payoutFor(
  staff: StaffProfile,
  month: Date,
  attendance: Attendance[],
  holidays: Holiday[]
): PayoutBreakdown {
  const monthHolidays = holidays.filter(h => h.holiday_date.startsWith(format(month, 'yyyy-MM')))
  const days = workingDaysInMonth(month, holidays)
  const dailyHours = Number(staff.daily_working_hours ?? 8)
  const expectedHours = round1(days.length * dailyHours)
  const { hours: actualHours, days: daysPresent } = hoursWorked(staff.id, month, attendance)
  const ratio = expectedHours > 0 ? actualHours / expectedHours : 0
  const salary = staff.monthly_salary != null ? Number(staff.monthly_salary) : null

  return {
    workingDays: days.length,
    expectedHours,
    actualHours,
    ratio,
    payout: salary != null ? Math.round(salary * ratio) : null,
    daysPresent,
    holidays: monthHolidays,
  }
}
