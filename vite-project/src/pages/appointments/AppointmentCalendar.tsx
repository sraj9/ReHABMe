import { useState } from 'react'
import {
  addDays, addMonths, endOfMonth, endOfWeek, format, isSameDay,
  isSameMonth, isToday, parseISO, startOfMonth, startOfWeek, subMonths,
} from 'date-fns'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Card from '../../components/ui/Card'
import type { Appointment } from '../../lib/types'

interface AppointmentCalendarProps {
  appointments: Appointment[]
  onSelectAppointment: (apt: Appointment) => void
  /** Called with 'yyyy-MM-dd' when the user clicks an empty day to schedule */
  onCreateAt: (date: string) => void
}

const statusChipClass: Record<string, string> = {
  scheduled: 'bg-[#3d9cd6]/10 text-[#1e7ab4]',
  completed: 'bg-green-50 text-green-700',
  cancelled: 'bg-red-50 text-red-500 line-through',
  'no-show': 'bg-amber-50 text-amber-700',
}

const MAX_CHIPS_PER_DAY = 3

export default function AppointmentCalendar({ appointments, onSelectAppointment, onCreateAt }: AppointmentCalendarProps) {
  const [month, setMonth] = useState(() => startOfMonth(new Date()))

  const gridStart = startOfWeek(month)
  const gridEnd = endOfWeek(endOfMonth(month))
  const days: Date[] = []
  for (let day = gridStart; day <= gridEnd; day = addDays(day, 1)) {
    days.push(day)
  }

  const appointmentsOn = (day: Date) =>
    appointments
      .filter(apt => isSameDay(parseISO(apt.appointment_date), day))
      .sort((a, b) => a.appointment_time.localeCompare(b.appointment_time))

  return (
    <Card padding="none">
      {/* Month navigation */}
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-gray-900">{format(month, 'MMMM yyyy')}</h3>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMonth(m => subMonths(m, 1))}
            aria-label="Previous month"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            onClick={() => setMonth(startOfMonth(new Date()))}
            className="px-3 py-1.5 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
          >
            Today
          </button>
          <button
            onClick={() => setMonth(m => addMonths(m, 1))}
            aria-label="Next month"
            className="p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>

      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(dayName => (
          <div key={dayName} className="px-2 py-2 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">
            {dayName}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="grid grid-cols-7">
        {days.map(day => {
          const dayAppointments = appointmentsOn(day)
          const inMonth = isSameMonth(day, month)
          const overflow = dayAppointments.length - MAX_CHIPS_PER_DAY
          return (
            <div
              key={day.toISOString()}
              onClick={() => onCreateAt(format(day, 'yyyy-MM-dd'))}
              title={`Schedule appointment on ${format(day, 'MMM d, yyyy')}`}
              className={`min-h-28 border-b border-r border-gray-50 p-1.5 cursor-pointer transition-colors hover:bg-[#3d9cd6]/5 ${inMonth ? '' : 'bg-gray-50/60'}`}
            >
              <span
                className={`inline-flex items-center justify-center w-6 h-6 text-xs rounded-full mb-1 ${
                  isToday(day)
                    ? 'bg-[#3d9cd6] text-white font-semibold'
                    : inMonth
                      ? 'text-gray-700'
                      : 'text-gray-400'
                }`}
              >
                {format(day, 'd')}
              </span>
              <div className="space-y-1">
                {dayAppointments.slice(0, MAX_CHIPS_PER_DAY).map(apt => (
                  <button
                    key={apt.id}
                    onClick={e => { e.stopPropagation(); onSelectAppointment(apt) }}
                    title={`${apt.appointment_time} ${apt.patient?.full_name ?? ''} (${apt.status})`}
                    className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] leading-tight truncate hover:opacity-75 transition-opacity ${statusChipClass[apt.status] ?? 'bg-gray-100 text-gray-600'}`}
                  >
                    <span className="font-semibold">{apt.appointment_time}</span> {apt.patient?.full_name}
                  </button>
                ))}
                {overflow > 0 && (
                  <p className="px-1.5 text-[11px] text-gray-400">+{overflow} more</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}
