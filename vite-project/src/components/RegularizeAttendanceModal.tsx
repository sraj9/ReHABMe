import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { ClockAlert, Send } from 'lucide-react'
import Button from './ui/Button'
import Badge from './ui/Badge'
import { useAttendanceContext } from '../context/AttendanceContext'
import { useAttendanceRequestsContext } from '../context/AttendanceRequestsContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import type { AttendanceRequestType } from '../lib/types'

interface RegularizeAttendanceModalProps {
  onClose: () => void
}

/** Staff-facing: raise a request to fix a missed punch in/out. */
export default function RegularizeAttendanceModal({ onClose }: RegularizeAttendanceModalProps) {
  const { profile } = useAuth()
  const { attendance } = useAttendanceContext()
  const { requests, addRequest, deleteRequest } = useAttendanceRequestsContext()
  const toast = useToast()

  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [type, setType] = useState<AttendanceRequestType>('both')
  const [inTime, setInTime] = useState('09:30')
  const [outTime, setOutTime] = useState('18:30')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const myRequests = requests.filter(r => r.profile_id === profile?.id).slice(0, 5)

  // Regularizing a check-out attaches to that day's existing punch-in
  const dayAttendance = profile
    ? attendance.find(a => a.profile_id === profile.id && a.check_in_at.startsWith(date))
    : undefined

  const submit = async () => {
    if (!profile) return
    if (!reason.trim()) {
      setError('Add a short reason so the admin can approve it')
      return
    }
    if (type === 'check_out' && !dayAttendance) {
      setError('No check-in found for that date — choose "Missed both" instead')
      return
    }
    setSaving(true)
    setError('')
    const now = new Date().toISOString()
    const iso = (t: string) => new Date(`${date}T${t}`).toISOString()

    const created = await addRequest({
      id: crypto.randomUUID(),
      profile_id: profile.id,
      attendance_id: type === 'check_out' ? dayAttendance?.id ?? null : null,
      request_date: date,
      type,
      requested_check_in_at: type === 'check_out' ? null : iso(inTime),
      requested_check_out_at: type === 'check_in' ? null : iso(outTime),
      reason: reason.trim(),
      status: 'pending',
      created_at: now,
      updated_at: now,
      profile,
    })
    setSaving(false)
    if (!created) {
      setError('Could not send the request — you may already have one pending for that date.')
      return
    }
    toast.success('Request sent — an admin will review it')
    onClose()
  }

  const withdraw = async (id: string) => {
    const ok = await deleteRequest(id)
    if (ok) toast.success('Request withdrawn')
    else toast.error('Could not withdraw the request')
  }

  const fieldClass =
    'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent'
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <ClockAlert size={18} className="text-[#3d9cd6]" />
            <h2 className="text-lg font-semibold text-gray-900">Attendance Regularization</h2>
          </div>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          <p className="text-xs text-gray-500">
            Forgot to punch in or out? Send the correct times with a reason — an admin approves it before it appears in attendance.
          </p>

          <div>
            <label htmlFor="reg-date" className={labelClass}>Date *</label>
            <input id="reg-date" type="date" max={today} className={fieldClass} value={date} onChange={e => { setDate(e.target.value); setError('') }} />
          </div>

          <div>
            <label htmlFor="reg-type" className={labelClass}>What was missed? *</label>
            <select id="reg-type" className={fieldClass} value={type} onChange={e => { setType(e.target.value as AttendanceRequestType); setError('') }}>
              <option value="both">Missed both punch in and out</option>
              <option value="check_in">Missed punch in only</option>
              <option value="check_out">Missed punch out only</option>
            </select>
            {type === 'check_out' && (
              <p className={`text-xs mt-1 ${dayAttendance ? 'text-gray-500' : 'text-amber-600'}`}>
                {dayAttendance
                  ? `Will be added to your check-in at ${format(parseISO(dayAttendance.check_in_at), 'h:mm a')}`
                  : 'No check-in recorded for that date'}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            {type !== 'check_out' && (
              <div>
                <label htmlFor="reg-in" className={labelClass}>Punch in time *</label>
                <input id="reg-in" type="time" className={fieldClass} value={inTime} onChange={e => setInTime(e.target.value)} />
              </div>
            )}
            {type !== 'check_in' && (
              <div>
                <label htmlFor="reg-out" className={labelClass}>Punch out time *</label>
                <input id="reg-out" type="time" className={fieldClass} value={outTime} onChange={e => setOutTime(e.target.value)} />
              </div>
            )}
          </div>

          <div>
            <label htmlFor="reg-reason" className={labelClass}>Reason *</label>
            <textarea
              id="reg-reason"
              rows={2}
              className={`${fieldClass} resize-y`}
              value={reason}
              onChange={e => { setReason(e.target.value); setError('') }}
              placeholder="e.g. Phone battery died before leaving the clinic"
            />
          </div>

          {myRequests.length > 0 && (
            <div className="pt-2 border-t border-gray-100">
              <p className="text-xs font-semibold text-gray-700 mb-2">Your recent requests</p>
              <div className="space-y-2">
                {myRequests.map(r => (
                  <div key={r.id} className="flex items-center gap-2 text-xs">
                    <span className="text-gray-600 flex-1">
                      {format(parseISO(r.request_date), 'MMM d')} — {r.type === 'both' ? 'in & out' : r.type === 'check_in' ? 'punch in' : 'punch out'}
                    </span>
                    <Badge
                      variant={r.status === 'approved' ? 'success' : r.status === 'rejected' ? 'danger' : 'warning'}
                      size="sm"
                    >
                      {r.status}
                    </Badge>
                    {r.status === 'pending' && (
                      <button onClick={() => void withdraw(r.id)} className="text-gray-400 hover:text-red-500" title="Withdraw request">✕</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} icon={<Send size={14} />} onClick={submit}>Send Request</Button>
        </div>
      </div>
    </div>
  )
}
