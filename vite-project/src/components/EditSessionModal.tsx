import { useState } from 'react'
import { format, parseISO } from 'date-fns'
import { Save } from 'lucide-react'
import Button from './ui/Button'
import { useSessionsContext } from '../context/SessionsContext'
import { useStaffContext } from '../context/StaffContext'
import { useToast } from '../context/ToastContext'
import type { PatientSession } from '../lib/types'

interface EditSessionModalProps {
  session: PatientSession
  onClose: () => void
}

/** Admin-only: change a logged session's time, therapist, or notes. */
export default function EditSessionModal({ session, onClose }: EditSessionModalProps) {
  const { updateSession } = useSessionsContext()
  const { staff } = useStaffContext()
  const toast = useToast()

  const [sessionAt, setSessionAt] = useState(format(parseISO(session.session_at), "yyyy-MM-dd'T'HH:mm"))
  const [therapistId, setTherapistId] = useState(session.therapist_id ?? '')
  const [notes, setNotes] = useState(session.notes ?? '')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    if (!sessionAt) {
      setError('Enter the session date and time')
      return
    }
    setSaving(true)
    setError('')
    const therapist = staff.find(s => s.id === therapistId)
    const updated = await updateSession({
      ...session,
      session_at: new Date(sessionAt).toISOString(),
      therapist_id: therapistId || null,
      notes: notes.trim() || null,
      therapist,
    })
    setSaving(false)
    if (!updated) {
      setError('Could not save — the patient may already have a session on that day.')
      return
    }
    toast.success('Session updated')
    onClose()
  }

  const fieldClass =
    'w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent'
  const labelClass = 'block text-xs font-medium text-gray-700 mb-1'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">Edit Session</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          <div>
            <p className="text-sm font-medium text-gray-900">{session.patient?.full_name}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {session.package_id ? session.package?.name ?? 'Package session' : 'Walk-in session'}
            </p>
          </div>
          <div>
            <label htmlFor="edit-session-at" className={labelClass}>Date &amp; Time *</label>
            <input
              id="edit-session-at"
              type="datetime-local"
              className={fieldClass}
              value={sessionAt}
              onChange={e => { setSessionAt(e.target.value); setError('') }}
            />
          </div>
          <div>
            <label htmlFor="edit-session-therapist" className={labelClass}>Therapist</label>
            <select id="edit-session-therapist" className={fieldClass} value={therapistId} onChange={e => setTherapistId(e.target.value)}>
              <option value="">Not specified</option>
              {staff.filter(s => s.is_active || s.id === session.therapist_id).map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="edit-session-notes" className={labelClass}>Notes</label>
            <input id="edit-session-notes" className={fieldClass} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional remark for this visit…" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} icon={<Save size={14} />} onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </div>
    </div>
  )
}
