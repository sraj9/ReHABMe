import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Plus, Search, CalendarDays, Clock, Filter, Trash2, List } from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge, { getAppointmentStatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../components/ui/Pagination'
import AppointmentCalendar from './AppointmentCalendar'
import { useAppointmentsContext } from '../../context/AppointmentsContext'
import { usePatientsContext } from '../../context/PatientsContext'
import { useStaffContext } from '../../context/StaffContext'
import { useToast } from '../../context/ToastContext'
import type { Appointment, AppointmentStatus, AppointmentType } from '../../lib/types'

const PAGE_SIZE = 15

const appointmentTypeLabels: Record<string, string> = {
  initial_assessment: 'Initial Assessment',
  follow_up: 'Follow Up',
  physiotherapy: 'Physiotherapy',
  occupational_therapy: 'Occupational Therapy',
  speech_therapy: 'Speech Therapy',
  hydrotherapy: 'Hydrotherapy',
}

export default function AppointmentList() {
  const { appointments, loading, updateAppointment, deleteAppointment } = useAppointmentsContext()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<AppointmentStatus | 'all'>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [therapistFilter, setTherapistFilter] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  // Deep links like /appointments?new=1&patient=<id> open the form prefilled on mount
  const [showForm, setShowForm] = useState(() => searchParams.get('new') === '1')
  const [editAppointment, setEditAppointment] = useState<Appointment | undefined>(undefined)
  const [view, setView] = useState<'list' | 'calendar'>('list')
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<Appointment | null>(null)
  const [prefill, setPrefill] = useState<{ patientId?: string; date?: string }>(() =>
    searchParams.get('new') === '1' ? { patientId: searchParams.get('patient') ?? undefined } : {}
  )

  // Date filter applies to the list only — the calendar shows every date at once
  const baseFiltered = appointments.filter(apt => {
    const matchSearch =
      (apt.patient?.full_name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
      (apt.therapist?.full_name.toLowerCase().includes(search.toLowerCase()) ?? false)
    const matchStatus = statusFilter === 'all' || apt.status === statusFilter
    const matchTherapist = !therapistFilter || apt.therapist_id === therapistFilter
    return matchSearch && matchStatus && matchTherapist
  })
  const filtered = baseFiltered.filter(apt => !dateFilter || apt.appointment_date === dateFilter)

  // Clamp rather than reset-in-effect so filter changes can't leave us past the last page
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Group by date
  const grouped = paged.reduce<Record<string, Appointment[]>>((acc, apt) => {
    const date = apt.appointment_date
    if (!acc[date]) acc[date] = []
    acc[date].push(apt)
    return acc
  }, {})

  const sortedDates = Object.keys(grouped).sort()

  const therapistMap = new Map<string, typeof appointments[0]['therapist']>()
  for (const a of appointments) {
    if (a.therapist_id && a.therapist) therapistMap.set(a.therapist_id, a.therapist)
  }
  const uniqueTherapists = [...therapistMap.values()]

  const statusCounts = appointments.reduce<Record<string, number>>((acc, apt) => {
    acc[apt.status] = (acc[apt.status] || 0) + 1
    return acc
  }, {})

  const handleOpenNew = () => {
    setPrefill({})
    setEditAppointment(undefined)
    setShowForm(true)
  }

  const handleOpenEdit = (apt: Appointment) => {
    setEditAppointment(apt)
    setShowForm(true)
  }

  const handleCreateAt = (date: string) => {
    setPrefill({ date })
    setEditAppointment(undefined)
    setShowForm(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const ok = await deleteAppointment(deleteTarget.id)
    setDeleteTarget(null)
    if (ok) {
      toast.success('Appointment deleted')
    } else {
      toast.error('Could not delete the appointment')
    }
  }

  const handleStatusChange = async (apt: Appointment, newStatus: AppointmentStatus) => {
    const result = await updateAppointment({ ...apt, status: newStatus, updated_at: new Date().toISOString() })
    if (result) {
      toast.success(`Appointment marked ${newStatus.replace('-', ' ')}`)
    } else {
      toast.error('Could not update the appointment status')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex gap-3">
          {(['all', 'scheduled', 'completed', 'cancelled', 'no-show'] as const).map(status => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize transition-colors ${statusFilter === status ? 'bg-[#3d9cd6] text-white' : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'}`}
            >
              {status === 'all' ? 'All' : status.replace('-', ' ')}
              <span className="ml-1.5 opacity-70">
                {status === 'all' ? appointments.length : statusCounts[status] || 0}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
            <button
              onClick={() => setView('list')}
              aria-label="List view"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <List size={13} />
              List
            </button>
            <button
              onClick={() => setView('calendar')}
              aria-label="Calendar view"
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${view === 'calendar' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'}`}
            >
              <CalendarDays size={13} />
              Calendar
            </button>
          </div>
          <Button icon={<Plus size={16} />} onClick={handleOpenNew}>
            New Appointment
          </Button>
        </div>
      </div>

      {view === 'calendar' ? (
        <AppointmentCalendar
          appointments={baseFiltered}
          onSelectAppointment={handleOpenEdit}
          onCreateAt={handleCreateAt}
        />
      ) : (
      <Card padding="none">
        {/* Search & filters */}
        <div className="px-5 py-4 border-b border-gray-100 flex flex-col gap-3">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search by patient or therapist..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-3 py-2 text-sm border rounded-lg transition-colors ${showFilters ? 'bg-[#3d9cd6]/10 border-[#3d9cd6]/30 text-[#3d9cd6]' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
            >
              <Filter size={14} />
              Filters
            </button>
          </div>

          {showFilters && (
            <div className="flex flex-wrap gap-3 pt-1">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Date</label>
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3d9cd6]"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-medium text-gray-500">Therapist</label>
                <select
                  value={therapistFilter}
                  onChange={e => setTherapistFilter(e.target.value)}
                  className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#3d9cd6]"
                >
                  <option value="">All Therapists</option>
                  {uniqueTherapists.map(t => (
                    <option key={t!.id} value={t!.id}>{t!.full_name}</option>
                  ))}
                </select>
              </div>
              {(dateFilter || therapistFilter) && (
                <div className="flex items-end">
                  <button
                    onClick={() => { setDateFilter(''); setTherapistFilter('') }}
                    className="px-3 py-1.5 text-xs text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg"
                  >
                    Clear filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Appointment list */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-sm text-gray-500">
            {loading ? 'Loading appointments…' : 'No appointments match your filters'}
          </div>
        ) : (
          <div>
            {sortedDates.map(date => (
              <div key={date}>
                {/* Date header */}
                <div className="px-5 py-2 bg-gray-50 border-b border-gray-100">
                  <div className="flex items-center gap-2">
                    <CalendarDays size={13} className="text-[#3d9cd6]" />
                    <span className="text-xs font-semibold text-gray-600">
                      {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                    </span>
                    <span className="text-xs text-gray-400">({grouped[date].length} appointments)</span>
                  </div>
                </div>

                {/* Appointments for this date */}
                <div className="divide-y divide-gray-50">
                  {grouped[date].sort((a, b) => a.appointment_time.localeCompare(b.appointment_time)).map(apt => (
                    <div
                      key={apt.id}
                      className="px-5 py-3.5 hover:bg-gray-50 transition-colors"
                    >
                      <div
                        className="flex items-center gap-4 cursor-pointer focus:outline-none focus-visible:ring-2 focus-visible:ring-[#3d9cd6] focus-visible:ring-inset"
                        onClick={() => handleOpenEdit(apt)}
                        role="button"
                        tabIndex={0}
                        onKeyDown={e => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            if (e.key === ' ') e.preventDefault()
                            handleOpenEdit(apt)
                          }
                        }}
                      >
                        {/* Time */}
                        <div className="w-16 flex-shrink-0">
                          <div className="flex items-center gap-1 text-sm font-semibold text-gray-900">
                            <Clock size={12} className="text-gray-400" />
                            {apt.appointment_time}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">{apt.duration_minutes}min</p>
                        </div>

                        {/* Status indicator */}
                        <div className={`w-1 h-10 rounded-full flex-shrink-0 ${
                          apt.status === 'completed' ? 'bg-green-400' :
                          apt.status === 'cancelled' ? 'bg-red-400' :
                          apt.status === 'no-show' ? 'bg-amber-400' :
                          'bg-[#3d9cd6]'
                        }`} />

                        {/* Patient */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-[#3d9cd6]/10 flex items-center justify-center text-[#3d9cd6] text-xs font-semibold flex-shrink-0">
                              {apt.patient?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </div>
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{apt.patient?.full_name}</p>
                              <p className="text-xs text-gray-500">{appointmentTypeLabels[apt.type]}</p>
                            </div>
                          </div>
                        </div>

                        {/* Therapist */}
                        <div className="hidden sm:block flex-1 min-w-0">
                          <p className="text-xs text-gray-500">Therapist</p>
                          <p className="text-sm text-gray-700 truncate">{apt.therapist?.full_name}</p>
                        </div>

                        {/* Room */}
                        {apt.room && (
                          <div className="hidden md:block">
                            <p className="text-xs text-gray-500">Room</p>
                            <p className="text-sm text-gray-700">{apt.room}</p>
                          </div>
                        )}

                        {/* Status badge */}
                        <Badge variant={getAppointmentStatusBadge(apt.status)} dot>
                          {apt.status.replace('-', ' ')}
                        </Badge>
                      </div>

                      {/* Row actions */}
                      <div className="flex items-center gap-2 mt-2 pl-20" onClick={e => e.stopPropagation()}>
                        <select
                          value={apt.status}
                          onChange={e => handleStatusChange(apt, e.target.value as AppointmentStatus)}
                          className="text-xs px-2 py-1 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-1 focus:ring-[#3d9cd6]"
                        >
                          <option value="scheduled">Scheduled</option>
                          <option value="completed">Completed</option>
                          <option value="cancelled">Cancelled</option>
                          <option value="no-show">No-show</option>
                        </select>
                        <button
                          onClick={() => setDeleteTarget(apt)}
                          className="p-1 text-gray-400 hover:text-red-500 transition-colors rounded"
                          title="Delete appointment"
                          aria-label="Delete appointment"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>

                      {apt.reason && (
                        <p className="text-xs text-gray-500 mt-1 pl-20 truncate">{apt.reason}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} label="appointments" />
      </Card>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete appointment?"
        message={`This will permanently delete the appointment for ${deleteTarget?.patient?.full_name ?? 'this patient'} on ${deleteTarget ? format(parseISO(deleteTarget.appointment_date), 'MMM d, yyyy') : ''}.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Add / edit appointment modal */}
      {showForm && (
        <AppointmentFormModal
          onClose={() => {
            setShowForm(false)
            setEditAppointment(undefined)
            setPrefill({})
            if (searchParams.get('new')) setSearchParams({}, { replace: true })
          }}
          editAppointment={editAppointment}
          defaultPatientId={prefill.patientId}
          defaultDate={prefill.date}
        />
      )}
    </div>
  )
}

interface AppointmentFormModalProps {
  onClose: () => void
  editAppointment?: Appointment
  defaultPatientId?: string
  defaultDate?: string
}

function AppointmentFormModal({ onClose, editAppointment, defaultPatientId, defaultDate }: AppointmentFormModalProps) {
  const { addAppointment, updateAppointment } = useAppointmentsContext()
  const { patients } = usePatientsContext()
  const { staff } = useStaffContext()
  const toast = useToast()

  const isEdit = !!editAppointment

  const [form, setForm] = useState({
    patient_id: editAppointment?.patient_id ?? defaultPatientId ?? '',
    therapist_id: editAppointment?.therapist_id ?? '',
    appointment_date: editAppointment?.appointment_date ?? defaultDate ?? '',
    appointment_time: editAppointment?.appointment_time ?? '',
    duration_minutes: String(editAppointment?.duration_minutes ?? '60'),
    type: editAppointment?.type ?? 'physiotherapy',
    status: editAppointment?.status ?? 'scheduled',
    reason: editAppointment?.reason ?? '',
    room: editAppointment?.room ?? '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.patient_id) errs.patient_id = 'Patient is required'
    if (!form.therapist_id) errs.therapist_id = 'Therapist is required'
    if (!form.appointment_date) errs.appointment_date = 'Date is required'
    if (!form.appointment_time) errs.appointment_time = 'Time is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    setSubmitError('')
    const now = new Date().toISOString()

    let result
    if (isEdit && editAppointment) {
      result = await updateAppointment({
        ...editAppointment,
        patient_id: form.patient_id,
        therapist_id: form.therapist_id,
        patient: patients.find(p => p.id === form.patient_id),
        therapist: staff.find(s => s.id === form.therapist_id),
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        duration_minutes: parseInt(form.duration_minutes),
        type: form.type as AppointmentType,
        status: form.status as AppointmentStatus,
        reason: form.reason,
        room: form.room,
        updated_at: now,
      })
    } else {
      result = await addAppointment({
        id: `apt-${Date.now()}`,
        patient_id: form.patient_id,
        therapist_id: form.therapist_id,
        patient: patients.find(p => p.id === form.patient_id),
        therapist: staff.find(s => s.id === form.therapist_id),
        appointment_date: form.appointment_date,
        appointment_time: form.appointment_time,
        duration_minutes: parseInt(form.duration_minutes),
        type: form.type as AppointmentType,
        status: form.status as AppointmentStatus,
        reason: form.reason,
        room: form.room,
        created_at: now,
        updated_at: now,
      })
    }
    setSaving(false)
    if (!result) {
      setSubmitError('Could not save the appointment. Please check your connection and try again.')
      return
    }
    toast.success(isEdit ? 'Appointment updated' : 'Appointment scheduled')
    onClose()
  }

  const fieldClass = (hasError?: boolean) =>
    `w-full px-3 py-2 rounded-lg border ${hasError ? 'border-red-400' : 'border-gray-300'} text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent`
  const labelClass = "block text-xs font-medium text-gray-700 mb-1"
  const errorClass = "text-xs text-red-500 mt-1"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit Appointment' : 'New Appointment'}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">
            ✕
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="apt-patient_id">Patient *</label>
              <select
                id="apt-patient_id"
                className={fieldClass(!!errors.patient_id)}
                value={form.patient_id}
                onChange={e => { setForm(f => ({ ...f, patient_id: e.target.value })); setErrors(er => ({ ...er, patient_id: '' })) }}
              >
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              {errors.patient_id && <p className={errorClass}>{errors.patient_id}</p>}
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="apt-therapist_id">Therapist *</label>
              <select
                id="apt-therapist_id"
                className={fieldClass(!!errors.therapist_id)}
                value={form.therapist_id}
                onChange={e => { setForm(f => ({ ...f, therapist_id: e.target.value })); setErrors(er => ({ ...er, therapist_id: '' })) }}
              >
                <option value="">Select therapist...</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name} — {s.specialty}</option>)}
              </select>
              {errors.therapist_id && <p className={errorClass}>{errors.therapist_id}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="apt-appointment_date">Date *</label>
              <input
                id="apt-appointment_date"
                type="date"
                className={fieldClass(!!errors.appointment_date)}
                value={form.appointment_date}
                onChange={e => { setForm(f => ({ ...f, appointment_date: e.target.value })); setErrors(er => ({ ...er, appointment_date: '' })) }}
              />
              {errors.appointment_date && <p className={errorClass}>{errors.appointment_date}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="apt-appointment_time">Time *</label>
              <input
                id="apt-appointment_time"
                type="time"
                className={fieldClass(!!errors.appointment_time)}
                value={form.appointment_time}
                onChange={e => { setForm(f => ({ ...f, appointment_time: e.target.value })); setErrors(er => ({ ...er, appointment_time: '' })) }}
              />
              {errors.appointment_time && <p className={errorClass}>{errors.appointment_time}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="apt-duration_minutes">Duration (minutes)</label>
              <select id="apt-duration_minutes" className={fieldClass()} value={form.duration_minutes} onChange={e => setForm(f => ({ ...f, duration_minutes: e.target.value }))}>
                {['30', '45', '60', '90', '120'].map(d => <option key={d} value={d}>{d} min</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="apt-type">Type</label>
              <select id="apt-type" className={fieldClass()} value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as AppointmentType }))}>
                {Object.entries(appointmentTypeLabels).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="apt-status">Status</label>
              <select id="apt-status" className={fieldClass()} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as AppointmentStatus }))}>
                {['scheduled', 'completed', 'cancelled', 'no-show'].map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="apt-room">Room</label>
              <input id="apt-room" className={fieldClass()} value={form.room} onChange={e => setForm(f => ({ ...f, room: e.target.value }))} placeholder="e.g. Room 1, Gym" />
            </div>
            <div className="sm:col-span-2">
              <label className={labelClass} htmlFor="apt-reason">Reason / Notes</label>
              <textarea id="apt-reason" className={`${fieldClass()} resize-y`} rows={2} value={form.reason} onChange={e => setForm(f => ({ ...f, reason: e.target.value }))} placeholder="Reason for visit..." />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          {submitError && <p className="text-xs text-red-600 mr-auto">{submitError}</p>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSave}>{isEdit ? 'Save Changes' : 'Schedule Appointment'}</Button>
        </div>
      </div>
    </div>
  )
}
