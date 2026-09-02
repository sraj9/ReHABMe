import { describe, it, expect } from 'vitest'
import { availability, followUpBooking, isWeeklyOff, nextWorkingDay, slotForTime } from './scheduling'
import type { Appointment } from './types'

const appt = (date: string, time: string, over: Partial<Appointment> = {}): Appointment => ({
  id: `${date}-${time}-${Math.random()}`,
  patient_id: 'p1',
  therapist_id: 't1',
  appointment_date: date,
  appointment_time: time,
  duration_minutes: 30,
  type: 'follow_up',
  status: 'scheduled',
  created_at: '',
  updated_at: '',
  ...over,
})

describe('scheduling', () => {
  it('treats Sunday as the weekly off', () => {
    expect(isWeeklyOff(new Date('2026-09-06T10:00:00'))).toBe(true) // Sunday
    expect(isWeeklyOff(new Date('2026-09-07T10:00:00'))).toBe(false) // Monday
  })

  it('skips Sunday when finding the next working day', () => {
    // Saturday -> Monday
    expect(nextWorkingDay(new Date('2026-09-05T10:00:00')).getDay()).toBe(1)
    // Monday -> Tuesday
    expect(nextWorkingDay(new Date('2026-09-07T10:00:00')).getDay()).toBe(2)
  })

  it('snaps a visit time to the nearest bookable slot', () => {
    expect(slotForTime(new Date('2026-09-07T09:12:00'))).toBe('09:00')
    expect(slotForTime(new Date('2026-09-07T18:46:00'))).toBe('19:00') // nearest, not earlier
    // Outside opening hours clamps to the closest slot
    expect(slotForTime(new Date('2026-09-07T22:30:00'))).toBe('20:00')
  })

  it('books the follow-up at the same time on the next working day', () => {
    const booking = followUpBooking(new Date('2026-09-07T18:46:00'), [])
    expect(booking).toEqual({ date: '2026-09-08', time: '19:00' })
  })

  it('moves the follow-up to a free slot when the preferred one is full', () => {
    const full = [appt('2026-09-08', '19:00'), appt('2026-09-08', '19:00', { patient_id: 'p2' })]
    expect(followUpBooking(new Date('2026-09-07T18:46:00'), full)).toEqual({
      date: '2026-09-08',
      time: '19:30',
    })
  })

  it('counts capacity per slot and ignores cancelled appointments', () => {
    const booked = [
      appt('2026-09-08', '09:00'),
      appt('2026-09-08', '09:00', { patient_id: 'p2', status: 'cancelled' }),
    ]
    const morning = availability('2026-09-08', booked)[0]
    const nine = morning.slots.find(s => s.time === '09:00')
    expect(nine?.booked).toBe(1)
    expect(nine?.free).toBe(1)
  })
})
