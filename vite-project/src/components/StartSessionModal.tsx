import { useState } from 'react'
import { Play } from 'lucide-react'
import Button from './ui/Button'
import { usePatientsContext } from '../context/PatientsContext'
import { usePackagesContext } from '../context/PackagesContext'
import { useSessionsContext } from '../context/SessionsContext'
import { useStaffContext } from '../context/StaffContext'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../hooks/useAuth'
import { activePackageFor, sessionsRemaining } from '../lib/packages'

interface StartSessionModalProps {
  onClose: () => void
  /** Preselect a patient (e.g. when opened from PatientDetail) */
  defaultPatientId?: string
}

export default function StartSessionModal({ onClose, defaultPatientId }: StartSessionModalProps) {
  const { patients } = usePatientsContext()
  const { packages } = usePackagesContext()
  const { sessions, addSession } = useSessionsContext()
  const { staff } = useStaffContext()
  const { profile } = useAuth()
  const toast = useToast()

  const [patientId, setPatientId] = useState(defaultPatientId ?? '')
  const [therapistId, setTherapistId] = useState(profile?.role === 'therapist' ? profile.id : '')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const activePackage = patientId ? activePackageFor(patientId, packages, sessions) : undefined
  const remaining = activePackage ? sessionsRemaining(activePackage, sessions) : 0

  const handleStart = async () => {
    if (!patientId) {
      setError('Select a patient')
      return
    }
    setSaving(true)
    setError('')
    const now = new Date().toISOString()
    const patient = patients.find(p => p.id === patientId)
    const therapist = staff.find(s => s.id === therapistId)

    const session = await addSession({
      id: crypto.randomUUID(),
      patient_id: patientId,
      package_id: activePackage?.id ?? null,
      therapist_id: therapistId || undefined,
      session_at: now,
      notes: notes.trim() || undefined,
      created_at: now,
      patient,
      package: activePackage,
      therapist,
    })
    setSaving(false)
    if (!session) {
      setError('Could not log the session. Please try again.')
      return
    }
    if (activePackage) {
      toast.success(`Session logged for ${patient?.full_name} — ${remaining - 1} of ${activePackage.total_sessions} left in ${activePackage.name}`)
    } else {
      toast.success(`Walk-in session logged for ${patient?.full_name}`)
    }
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
          <h2 className="text-lg font-semibold text-gray-900">Start Session</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2">
              <p className="text-xs text-red-600">{error}</p>
            </div>
          )}
          <div>
            <label htmlFor="session-patient" className={labelClass}>Patient *</label>
            <select id="session-patient" className={fieldClass} value={patientId} onChange={e => { setPatientId(e.target.value); setError('') }}>
              <option value="">Select patient...</option>
              {patients.filter(p => p.is_active).map(p => (
                <option key={p.id} value={p.id}>{p.full_name}</option>
              ))}
            </select>
          </div>

          {patientId && (
            activePackage ? (
              <div className="bg-[#3d9cd6]/5 border border-[#3d9cd6]/20 rounded-xl px-4 py-3">
                <p className="text-sm font-semibold text-gray-900">{activePackage.name}</p>
                <div className="flex items-center gap-3 mt-2">
                  <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#3d9cd6] rounded-full"
                      style={{ width: `${((activePackage.total_sessions - remaining) / activePackage.total_sessions) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs font-medium text-gray-600">{remaining} of {activePackage.total_sessions} left</p>
                </div>
                <p className="text-xs text-gray-500 mt-2">This session will use 1 from the package.</p>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
                <p className="text-sm font-medium text-amber-800">No active package</p>
                <p className="text-xs text-amber-700 mt-0.5">This will be logged as a walk-in (pay-per-visit) session.</p>
              </div>
            )
          )}

          <div>
            <label htmlFor="session-therapist" className={labelClass}>Therapist</label>
            <select id="session-therapist" className={fieldClass} value={therapistId} onChange={e => setTherapistId(e.target.value)}>
              <option value="">Not specified</option>
              {staff.filter(s => s.is_active).map(s => (
                <option key={s.id} value={s.id}>{s.full_name}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="session-notes" className={labelClass}>Notes</label>
            <input id="session-notes" className={fieldClass} value={notes} onChange={e => setNotes(e.target.value)} placeholder="Optional remark for this visit…" />
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} icon={<Play size={14} />} onClick={handleStart}>
            Log Session
          </Button>
        </div>
      </div>
    </div>
  )
}
