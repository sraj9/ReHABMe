import { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format, parseISO } from 'date-fns'
import { Plus, Search, FileText, ChevronDown, ChevronUp, Trash2 } from 'lucide-react'
import Card from '../../components/ui/Card'
import Button from '../../components/ui/Button'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import Pagination from '../../components/ui/Pagination'
import { useNotesContext } from '../../context/NotesContext'
import { usePatientsContext } from '../../context/PatientsContext'
import { useStaffContext } from '../../context/StaffContext'
import { useToast } from '../../context/ToastContext'
import type { SOAPNote } from '../../lib/types'

const PAGE_SIZE = 8

export default function NotesList() {
  const navigate = useNavigate()
  const { notes, loading, addNote, updateNote, deleteNote } = useNotesContext()
  const toast = useToast()
  const [searchParams, setSearchParams] = useSearchParams()
  const [search, setSearch] = useState('')
  const [expandedNote, setExpandedNote] = useState<string | null>(null)
  // Deep links like /notes?new=1&patient=<id> open the form prefilled on mount
  const [showForm, setShowForm] = useState(() => searchParams.get('new') === '1')
  const [editNote, setEditNote] = useState<SOAPNote | undefined>(undefined)
  const [page, setPage] = useState(1)
  const [deleteTarget, setDeleteTarget] = useState<SOAPNote | null>(null)
  const [prefillPatientId, setPrefillPatientId] = useState<string | undefined>(() =>
    searchParams.get('new') === '1' ? searchParams.get('patient') ?? undefined : undefined
  )

  const filtered = notes.filter(n =>
    (n.patient?.full_name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    (n.therapist?.full_name.toLowerCase().includes(search.toLowerCase()) ?? false) ||
    n.subjective.toLowerCase().includes(search.toLowerCase()) ||
    n.assessment.toLowerCase().includes(search.toLowerCase())
  )

  // Clamp rather than reset-in-effect so search changes can't leave us past the last page
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const paged = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const getPainColor = (scale: number) => {
    if (scale <= 3) return 'text-green-600 bg-green-50'
    if (scale <= 6) return 'text-amber-600 bg-amber-50'
    return 'text-red-600 bg-red-50'
  }

  const handleOpenNew = () => {
    setPrefillPatientId(undefined)
    setEditNote(undefined)
    setShowForm(true)
  }

  const handleOpenEdit = (note: SOAPNote) => {
    setEditNote(note)
    setShowForm(true)
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    const ok = await deleteNote(deleteTarget.id)
    if (ok && expandedNote === deleteTarget.id) setExpandedNote(null)
    setDeleteTarget(null)
    if (ok) {
      toast.success('SOAP note deleted')
    } else {
      toast.error('Could not delete the SOAP note')
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-gray-500">{notes.length} SOAP notes total</p>
        <Button icon={<Plus size={16} />} onClick={handleOpenNew}>
          New SOAP Note
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          type="text"
          placeholder="Search by patient, therapist, or content..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2.5 text-sm border border-gray-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent"
        />
      </div>

      {/* Notes list */}
      {filtered.length === 0 ? (
        <Card>
          <div className="py-12 text-center text-sm text-gray-500">{loading ? 'Loading SOAP notes…' : 'No SOAP notes found'}</div>
        </Card>
      ) : (
        <div className="space-y-3">
          {paged.map(note => (
            <Card key={note.id} padding="none">
              {/* Note header */}
              <button
                className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 transition-colors text-left"
                onClick={() => setExpandedNote(expandedNote === note.id ? null : note.id)}
              >
                {/* Patient avatar */}
                <div className="w-10 h-10 rounded-full bg-[#3d9cd6]/10 flex items-center justify-center text-[#3d9cd6] font-semibold text-sm flex-shrink-0">
                  {note.patient?.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-0.5">
                    <p className="text-sm font-semibold text-gray-900">{note.patient?.full_name}</p>
                    <span className="text-gray-300">·</span>
                    <p className="text-xs text-gray-500">{format(parseISO(note.session_date), 'MMMM d, yyyy')}</p>
                  </div>
                  <p className="text-xs text-gray-500">
                    {note.therapist?.full_name}
                    {note.pain_scale !== undefined && <span> · Pain: {note.pain_scale}/10</span>}
                  </p>
                  <p className="text-xs text-gray-600 mt-1 truncate">{note.subjective}</p>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0">
                  {note.pain_scale !== undefined && (
                    <div className={`text-center px-2.5 py-1 rounded-lg ${getPainColor(note.pain_scale)}`}>
                      <p className="text-lg font-bold leading-none">{note.pain_scale}</p>
                      <p className="text-xs opacity-70 leading-none mt-0.5">Pain</p>
                    </div>
                  )}
                  <div className="text-gray-400">
                    {expandedNote === note.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </div>
                </div>
              </button>

              {/* Expanded content */}
              {expandedNote === note.id && (
                <div className="px-5 pb-5 border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      { label: 'S — Subjective', text: note.subjective, color: 'bg-blue-50 border-blue-200 text-blue-800' },
                      { label: 'O — Objective', text: note.objective, color: 'bg-green-50 border-green-200 text-green-800' },
                      { label: 'A — Assessment', text: note.assessment, color: 'bg-amber-50 border-amber-200 text-amber-800' },
                      { label: 'P — Plan', text: note.plan, color: 'bg-purple-50 border-purple-200 text-purple-800' },
                    ].map(section => (
                      <div key={section.label} className={`${section.color} border rounded-xl p-4`}>
                        <p className="text-xs font-bold mb-2 uppercase tracking-wide opacity-70">{section.label}</p>
                        <p className="text-sm leading-relaxed">{section.text}</p>
                      </div>
                    ))}
                  </div>

                  {(note.functional_goals || note.next_session_plan) && (
                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {note.functional_goals && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Functional Goals</p>
                          <p className="text-sm text-gray-700">{note.functional_goals}</p>
                        </div>
                      )}
                      {note.next_session_plan && (
                        <div className="bg-gray-50 rounded-xl p-4">
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Next Session Plan</p>
                          <p className="text-sm text-gray-700">{note.next_session_plan}</p>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex justify-end gap-2 mt-4">
                    <Button size="sm" variant="outline" onClick={() => navigate(`/patients/${note.patient_id}`)}>
                      View Patient
                    </Button>
                    <button
                      onClick={() => setDeleteTarget(note)}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                    >
                      <Trash2 size={12} />
                      Delete
                    </button>
                    <Button size="sm" icon={<FileText size={13} />} onClick={() => handleOpenEdit(note)}>
                      Edit Note
                    </Button>
                  </div>
                </div>
              )}
            </Card>
          ))}

          {filtered.length > PAGE_SIZE && (
            <Card padding="none">
              <Pagination page={currentPage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} label="notes" />
            </Card>
          )}
        </div>
      )}

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete SOAP note?"
        message={`This will permanently delete the note for ${deleteTarget?.patient?.full_name ?? 'this patient'} from ${deleteTarget ? format(parseISO(deleteTarget.session_date), 'MMM d, yyyy') : ''}.`}
        onConfirm={confirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* New / edit note modal */}
      {showForm && (
        <NoteFormModal
          onClose={() => {
            setShowForm(false)
            setEditNote(undefined)
            setPrefillPatientId(undefined)
            if (searchParams.get('new')) setSearchParams({}, { replace: true })
          }}
          editNote={editNote}
          addNote={addNote}
          updateNote={updateNote}
          defaultPatientId={prefillPatientId}
        />
      )}
    </div>
  )
}

interface NoteFormModalProps {
  onClose: () => void
  editNote?: SOAPNote
  addNote: (note: SOAPNote) => Promise<SOAPNote | null>
  updateNote: (note: SOAPNote) => Promise<SOAPNote | null>
  defaultPatientId?: string
}

function NoteFormModal({ onClose, editNote, addNote, updateNote, defaultPatientId }: NoteFormModalProps) {
  const { patients } = usePatientsContext()
  const { staff } = useStaffContext()
  const toast = useToast()
  const isEdit = !!editNote

  const [form, setForm] = useState({
    patient_id: editNote?.patient_id ?? defaultPatientId ?? '',
    therapist_id: editNote?.therapist_id ?? '',
    session_date: editNote?.session_date ?? '',
    pain_scale: editNote?.pain_scale !== undefined ? String(editNote.pain_scale) : '0',
    subjective: editNote?.subjective ?? '',
    objective: editNote?.objective ?? '',
    assessment: editNote?.assessment ?? '',
    plan: editNote?.plan ?? '',
    functional_goals: editNote?.functional_goals ?? '',
    next_session_plan: editNote?.next_session_plan ?? '',
  })

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const validate = (): boolean => {
    const errs: Record<string, string> = {}
    if (!form.patient_id) errs.patient_id = 'Patient is required'
    if (!form.therapist_id) errs.therapist_id = 'Therapist is required'
    if (!form.session_date) errs.session_date = 'Session date is required'
    if (!form.subjective.trim()) errs.subjective = 'Subjective is required'
    if (!form.objective.trim()) errs.objective = 'Objective is required'
    if (!form.assessment.trim()) errs.assessment = 'Assessment is required'
    if (!form.plan.trim()) errs.plan = 'Plan is required'
    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSave = async () => {
    if (!validate()) return
    setSaving(true)
    setSubmitError('')
    const now = new Date().toISOString()

    let result
    if (isEdit && editNote) {
      result = await updateNote({
        ...editNote,
        patient_id: form.patient_id,
        therapist_id: form.therapist_id,
        patient: patients.find(p => p.id === form.patient_id),
        therapist: staff.find(s => s.id === form.therapist_id),
        session_date: form.session_date,
        pain_scale: form.pain_scale ? parseInt(form.pain_scale) : undefined,
        subjective: form.subjective,
        objective: form.objective,
        assessment: form.assessment,
        plan: form.plan,
        functional_goals: form.functional_goals,
        next_session_plan: form.next_session_plan,
        updated_at: now,
      })
    } else {
      result = await addNote({
        id: `note-${Date.now()}`,
        patient_id: form.patient_id,
        therapist_id: form.therapist_id,
        patient: patients.find(p => p.id === form.patient_id),
        therapist: staff.find(s => s.id === form.therapist_id),
        session_date: form.session_date,
        pain_scale: form.pain_scale ? parseInt(form.pain_scale) : undefined,
        subjective: form.subjective,
        objective: form.objective,
        assessment: form.assessment,
        plan: form.plan,
        functional_goals: form.functional_goals,
        next_session_plan: form.next_session_plan,
        created_at: now,
        updated_at: now,
      })
    }
    setSaving(false)
    if (!result) {
      setSubmitError('Could not save the note. Please check your connection and try again.')
      return
    }
    toast.success(isEdit ? 'SOAP note updated' : 'SOAP note saved')
    onClose()
  }

  const fieldClass = (hasError?: boolean) =>
    `w-full px-3 py-2 rounded-lg border ${hasError ? 'border-red-400' : 'border-gray-300'} text-sm focus:outline-none focus:ring-2 focus:ring-[#3d9cd6] focus:border-transparent`
  const labelClass = "block text-xs font-medium text-gray-700 mb-1"
  const errorClass = "text-xs text-red-500 mt-1"

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-3xl bg-white rounded-2xl shadow-xl flex flex-col max-h-[90vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 className="text-lg font-semibold text-gray-900">{isEdit ? 'Edit SOAP Note' : 'New SOAP Note'}</h2>
          <button onClick={onClose} aria-label="Close dialog" className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-1">
              <label className={labelClass} htmlFor="note-patient_id">Patient *</label>
              <select
                id="note-patient_id"
                className={fieldClass(!!errors.patient_id)}
                value={form.patient_id}
                onChange={e => { setForm(f => ({ ...f, patient_id: e.target.value })); setErrors(er => ({ ...er, patient_id: '' })) }}
              >
                <option value="">Select patient...</option>
                {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
              </select>
              {errors.patient_id && <p className={errorClass}>{errors.patient_id}</p>}
            </div>
            <div className="sm:col-span-1">
              <label className={labelClass} htmlFor="note-therapist_id">Therapist *</label>
              <select
                id="note-therapist_id"
                className={fieldClass(!!errors.therapist_id)}
                value={form.therapist_id}
                onChange={e => { setForm(f => ({ ...f, therapist_id: e.target.value })); setErrors(er => ({ ...er, therapist_id: '' })) }}
              >
                <option value="">Select therapist...</option>
                {staff.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}
              </select>
              {errors.therapist_id && <p className={errorClass}>{errors.therapist_id}</p>}
            </div>
            <div>
              <label className={labelClass} htmlFor="note-session_date">Session Date *</label>
              <input
                id="note-session_date"
                type="date"
                className={fieldClass(!!errors.session_date)}
                value={form.session_date}
                onChange={e => { setForm(f => ({ ...f, session_date: e.target.value })); setErrors(er => ({ ...er, session_date: '' })) }}
              />
              {errors.session_date && <p className={errorClass}>{errors.session_date}</p>}
            </div>
          </div>

          <div>
            <label className={labelClass} htmlFor="note-pain_scale">Pain Scale (0-10)</label>
            <div className="flex items-center gap-3">
              <input
                id="note-pain_scale"
                type="range"
                min="0"
                max="10"
                value={form.pain_scale || 0}
                onChange={e => setForm(f => ({ ...f, pain_scale: e.target.value }))}
                className="flex-1 accent-[#3d9cd6]"
              />
              <span className="text-sm font-bold text-gray-900 w-8 text-center">{form.pain_scale || 0}</span>
            </div>
          </div>

          {[
            { key: 'subjective', label: 'S — Subjective', placeholder: "Patient's description of symptoms, complaints, pain..." },
            { key: 'objective', label: 'O — Objective', placeholder: 'Measurable findings: ROM, strength, vital signs, test results...' },
            { key: 'assessment', label: 'A — Assessment', placeholder: 'Clinical interpretation and diagnosis...' },
            { key: 'plan', label: 'P — Plan', placeholder: 'Treatment plan, next steps, goals...' },
          ].map(section => (
            <div key={section.key}>
              <label className={`${labelClass} font-semibold`} htmlFor={`note-${section.key}`}>{section.label} *</label>
              <textarea
                id={`note-${section.key}`}
                className={`${fieldClass(!!errors[section.key])} resize-y`}
                rows={3}
                value={form[section.key as keyof typeof form]}
                onChange={e => { setForm(f => ({ ...f, [section.key]: e.target.value })); setErrors(er => ({ ...er, [section.key]: '' })) }}
                placeholder={section.placeholder}
              />
              {errors[section.key] && <p className={errorClass}>{errors[section.key]}</p>}
            </div>
          ))}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className={labelClass} htmlFor="note-functional_goals">Functional Goals</label>
              <textarea id="note-functional_goals" className={`${fieldClass()} resize-y`} rows={2} value={form.functional_goals} onChange={e => setForm(f => ({ ...f, functional_goals: e.target.value }))} placeholder="Long-term functional goals..." />
            </div>
            <div>
              <label className={labelClass} htmlFor="note-next_session_plan">Next Session Plan</label>
              <textarea id="note-next_session_plan" className={`${fieldClass()} resize-y`} rows={2} value={form.next_session_plan} onChange={e => setForm(f => ({ ...f, next_session_plan: e.target.value }))} placeholder="Plan for the next session..." />
            </div>
          </div>
        </div>
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          {submitError && <p className="text-xs text-red-600 mr-auto">{submitError}</p>}
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button loading={saving} onClick={handleSave}>{isEdit ? 'Save Changes' : 'Save SOAP Note'}</Button>
        </div>
      </div>
    </div>
  )
}
