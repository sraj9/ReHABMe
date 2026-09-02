import { addDays, format, parseISO } from 'date-fns'
import type { Appointment } from './types'

/** Sunday is the clinic's weekly off. */
export const WEEKLY_OFF_DAY = 0

/**
 * Clinic shifts, matching how the clinic actually runs: a morning block and an
 * evening block. Slots are generated inside these windows.
 */
export const SHIFTS = [
  { label: 'Morning', start: '09:00', end: '13:00' },
  { label: 'Evening', start: '16:00', end: '20:30' },
]

export const SLOT_MINUTES = 30
/** How many patients the clinic can see in one slot. */
export const SLOT_CAPACITY = 2

export const isWeeklyOff = (date: Date): boolean => date.getDay() === WEEKLY_OFF_DAY

/** The next day the clinic is open — tomorrow, or Monday when tomorrow is Sunday. */
export function nextWorkingDay(from: Date = new Date()): Date {
  let d = addDays(from, 1)
  while (isWeeklyOff(d)) d = addDays(d, 1)
  return d
}

const toMinutes = (hhmm: string): number => {
  const [h, m] = hhmm.split(':').map(Number)
  return h * 60 + m
}

const toHHMM = (mins: number): string =>
  `${String(Math.floor(mins / 60)).padStart(2, '0')}:${String(mins % 60).padStart(2, '0')}`

/** Every bookable slot in a clinic day, e.g. ['09:00', '09:30', …]. */
export function daySlots(): { label: string; slots: string[] }[] {
  return SHIFTS.map(shift => {
    const slots: string[] = []
    for (let m = toMinutes(shift.start); m < toMinutes(shift.end); m += SLOT_MINUTES) {
      slots.push(toHHMM(m))
    }
    return { label: shift.label, slots }
  })
}

/**
 * Snap a real visit time to the nearest bookable slot, clamped into the
 * surrounding shift so an early or late walk-in still lands on a valid slot.
 */
export function slotForTime(time: Date): string {
  const mins = time.getHours() * 60 + time.getMinutes()
  const all = daySlots().flatMap(s => s.slots)
  let best = all[0]
  let bestDiff = Infinity
  for (const s of all) {
    const diff = Math.abs(toMinutes(s) - mins)
    if (diff < bestDiff) {
      bestDiff = diff
      best = s
    }
  }
  return best
}

/** Appointments already booked on a date, keyed by slot time. */
export function bookingsBySlot(date: string, appointments: Appointment[]): Record<string, Appointment[]> {
  return appointments
    .filter(a => a.appointment_date === date && a.status !== 'cancelled')
    .reduce<Record<string, Appointment[]>>((acc, a) => {
      const key = a.appointment_time.slice(0, 5)
      ;(acc[key] ||= []).push(a)
      return acc
    }, {})
}

export interface SlotAvailability {
  time: string
  booked: number
  free: number
  appointments: Appointment[]
}

/** Free capacity per slot for a given date. */
export function availability(date: string, appointments: Appointment[]): { label: string; slots: SlotAvailability[] }[] {
  const booked = bookingsBySlot(date, appointments)
  return daySlots().map(shift => ({
    label: shift.label,
    slots: shift.slots.map(time => {
      const taken = booked[time] ?? []
      return {
        time,
        booked: taken.length,
        free: Math.max(0, SLOT_CAPACITY - taken.length),
        appointments: taken,
      }
    }),
  }))
}

/** First slot with room left on a date, or null when the day is full. */
export function firstFreeSlot(date: string, appointments: Appointment[]): string | null {
  for (const shift of availability(date, appointments)) {
    const open = shift.slots.find(s => s.free > 0)
    if (open) return open.time
  }
  return null
}

/**
 * The follow-up slot for a patient seen now: same time tomorrow (skipping the
 * weekly off), moved to the next free slot if that one is already full.
 */
export function followUpBooking(
  sessionAt: Date,
  appointments: Appointment[]
): { date: string; time: string } | null {
  const date = format(nextWorkingDay(sessionAt), 'yyyy-MM-dd')
  const preferred = slotForTime(sessionAt)
  const slots = availability(date, appointments).flatMap(s => s.slots)
  const at = slots.find(s => s.time === preferred)
  if (at && at.free > 0) return { date, time: preferred }

  // Preferred slot is full — take the nearest later one that still has room
  const idx = slots.findIndex(s => s.time === preferred)
  const later = slots.slice(idx + 1).find(s => s.free > 0)
  if (later) return { date, time: later.time }
  const earlier = [...slots.slice(0, Math.max(0, idx))].reverse().find(s => s.free > 0)
  return earlier ? { date, time: earlier.time } : null
}

/** True when the patient already has a non-cancelled appointment that day. */
export function hasBookingOn(patientId: string, date: string, appointments: Appointment[]): boolean {
  return appointments.some(
    a => a.patient_id === patientId && a.appointment_date === date && a.status !== 'cancelled'
  )
}

export const formatSlot = (time: string): string =>
  format(parseISO(`2000-01-01T${time}:00`), 'h:mm a')
