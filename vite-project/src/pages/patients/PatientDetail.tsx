import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO, differenceInYears } from 'date-fns'
import {
  ArrowLeft, Edit, Calendar, FileText, Receipt,
  Phone, Mail, MapPin, AlertCircle, Pill, Shield,
  User, UserPlus, Stethoscope, CalendarDays, Pencil, Trash2, Undo2
} from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge, { getAppointmentStatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { usePatientsContext } from '../../context/PatientsContext'
import { useAppointmentsContext } from '../../context/AppointmentsContext'
import { useNotesContext } from '../../context/NotesContext'
import { useInvoicesContext } from '../../context/InvoicesContext'
import { usePaymentsContext } from '../../context/PaymentsContext'
import { usePackagesContext } from '../../context/PackagesContext'
import { useSessionsContext } from '../../context/SessionsContext'
import { formatCurrency } from '../../lib/format'
import { invoiceBalance, effectivePayments } from '../../lib/ledger'
import { sessionsRemaining } from '../../lib/packages'
import StartSessionModal from '../../components/StartSessionModal'
import AssignPackageModal from '../../components/AssignPackageModal'
import EditSessionModal from '../../components/EditSessionModal'
import ConfirmDialog from '../../components/ui/ConfirmDialog'
import { useAuth } from '../../hooks/useAuth'
import { useToast } from '../../context/ToastContext'
import PainTrendChart from './PainTrendChart'
import type { PatientSession, PaymentMethod } from '../../lib/types'

const paymentMethodLabels: Record<PaymentMethod, string> = {
  cash: 'Cash',
  upi: 'UPI',
  card: 'Card',
  bank_transfer: 'Bank Transfer',
  other: 'Other',
}

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'sessions' | 'appointments' | 'notes' | 'billing'>('overview')
  const [showStartSession, setShowStartSession] = useState(false)
  const [showAssignPackage, setShowAssignPackage] = useState(false)
  const [editSession, setEditSession] = useState<PatientSession | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<PatientSession | null>(null)
  // Ticks while the Sessions tab is open so the 1-minute undo window closes visibly
  const [nowMs, setNowMs] = useState(() => Date.now())

  const { patients } = usePatientsContext()
  const { appointments } = useAppointmentsContext()
  const { notes } = useNotesContext()
  const { invoices } = useInvoicesContext()
  const { payments } = usePaymentsContext()
  const { packages } = usePackagesContext()
  const { sessions, deleteSession } = useSessionsContext()
  const { profile } = useAuth()
  const toast = useToast()

  useEffect(() => {
    if (activeTab !== 'sessions') return
    const timer = window.setInterval(() => setNowMs(Date.now()), 10_000)
    return () => window.clearInterval(timer)
  }, [activeTab])

  const isAdmin = profile?.role === 'admin'
  const UNDO_WINDOW_MS = 60_000
  const canUndoSession = (session: PatientSession) =>
    !isAdmin &&
    !!profile &&
    session.created_by === profile.user_id &&
    nowMs - parseISO(session.created_at).getTime() < UNDO_WINDOW_MS

  const handleDeleteSession = async (session: PatientSession, isUndo: boolean) => {
    const removed = await deleteSession(session.id)
    if (removed) {
      toast.success(isUndo ? 'Session removed' : 'Session deleted')
    } else {
      toast.error(isUndo ? 'Could not undo — the 1-minute window may have passed' : 'Could not delete the session')
    }
  }

  const patient = patients.find(p => p.id === id)
  const patientAppointments = appointments.filter(a => a.patient_id === id)
  const patientNotes = notes.filter(n => n.patient_id === id)
  const patientInvoices = invoices.filter(i => i.patient_id === id)
  const patientPayments = payments.filter(p => p.patient_id === id)
  const patientPackages = packages.filter(p => p.patient_id === id)
  const patientSessions = sessions.filter(s => s.patient_id === id)

  // Ledger totals: drafts are not yet owed, so bill only issued invoices
  const totalBilled = patientInvoices.filter(i => i.status !== 'draft').reduce((s, i) => s + i.total_amount, 0)
  const totalReceived = effectivePayments(patientPayments).reduce((s, p) => s + p.amount, 0)
  const totalBalance = patientInvoices
    .filter(i => i.status !== 'draft' && i.status !== 'paid')
    .reduce((s, i) => s + invoiceBalance(i, payments), 0)

  if (!patient) {
    return (
      <div className="text-center py-20">
        <p className="text-gray-500">Patient not found.</p>
        <button onClick={() => navigate('/patients')} className="mt-3 text-[#3d9cd6] hover:underline text-sm">
          Back to patients
        </button>
      </div>
    )
  }

  const age = patient.date_of_birth ? differenceInYears(new Date(), parseISO(patient.date_of_birth)) : null

  const appointmentTypeLabels: Record<string, string> = {
    initial_assessment: 'Initial Assessment',
    follow_up: 'Follow Up',
    physiotherapy: 'Physiotherapy',
    occupational_therapy: 'Occupational Therapy',
    speech_therapy: 'Speech Therapy',
    hydrotherapy: 'Hydrotherapy',
  }

  const tabs = [
    { key: 'overview', label: 'Overview', count: null },
    { key: 'sessions', label: 'Sessions', count: patientSessions.length },
    { key: 'appointments', label: 'Appointments', count: patientAppointments.length },
    { key: 'notes', label: 'SOAP Notes', count: patientNotes.length },
    { key: 'billing', label: 'Billing', count: patientInvoices.length },
  ]

  return (
    <div className="space-y-5">
      {/* Back + actions */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate('/patients')}
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft size={16} />
          Back to Patients
        </button>
        <div className="flex gap-2">
          <Button variant="outline" icon={<Calendar size={15} />} onClick={() => navigate(`/appointments?new=1&patient=${id}`)}>
            Schedule
          </Button>
          <Button icon={<Edit size={15} />} onClick={() => navigate(`/patients/${id}/edit`)}>
            Edit Patient
          </Button>
        </div>
      </div>

      {/* Patient header card */}
      <Card>
        <div className="flex items-start gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[#3d9cd6]/10 flex items-center justify-center text-[#3d9cd6] font-bold text-xl flex-shrink-0">
            {patient.full_name.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{patient.full_name}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span className="text-xs font-mono text-gray-500 bg-gray-100 px-2 py-0.5 rounded">{patient.mrn}</span>
                  <span className="text-xs text-gray-500">
                    {age !== null ? `${age} years • ` : ''}{patient.gender}
                    {patient.date_of_birth ? ` • DOB: ${format(parseISO(patient.date_of_birth), 'MMM d, yyyy')}` : ''}
                  </span>
                </div>
              </div>
              <Badge variant={patient.is_active ? 'success' : 'default'} dot size="md">
                {patient.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-4 mt-3">
              {patient.phone && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Phone size={14} className="text-gray-400" />
                  {patient.phone}
                </div>
              )}
              {patient.email && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <Mail size={14} className="text-gray-400" />
                  {patient.email}
                </div>
              )}
              {patient.city && (
                <div className="flex items-center gap-1.5 text-sm text-gray-600">
                  <MapPin size={14} className="text-gray-400" />
                  {patient.city}, {patient.state}
                </div>
              )}
            </div>

            {patient.primary_diagnosis && (
              <div className="mt-3 flex items-center gap-2">
                <Stethoscope size={14} className="text-[#3d9cd6]" />
                <span className="text-sm text-gray-700 font-medium">{patient.primary_diagnosis}</span>
              </div>
            )}
          </div>

          {/* Quick stats */}
          <div className="hidden md:flex gap-4 flex-shrink-0">
            {[
              { label: 'Sessions', value: patientSessions.length, color: 'text-green-600', bg: 'bg-green-50' },
              { label: 'Appointments', value: patientAppointments.length, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Notes', value: patientNotes.length, color: 'text-purple-600', bg: 'bg-purple-50' },
              { label: 'Invoices', value: patientInvoices.length, color: 'text-amber-600', bg: 'bg-amber-50' },
            ].map(stat => (
              <div key={stat.label} className={`${stat.bg} rounded-xl px-4 py-3 text-center`}>
                <p className={`text-2xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 w-fit">
        {tabs.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key as typeof activeTab)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === tab.key ? 'bg-[#3d9cd6] text-white' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'}`}
          >
            {tab.label}
            {tab.count !== null && (
              <span className={`text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.key ? 'bg-white/20' : 'bg-gray-100'}`}>
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Overview tab */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PainTrendChart notes={patientNotes} />

          {/* Personal Info */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <User size={16} className="text-[#3d9cd6]" />
              <h3 className="text-sm font-semibold text-gray-900">Personal Information</h3>
            </div>
            <dl className="space-y-3">
              {[
                { label: 'Full Name', value: patient.full_name },
                { label: 'Date of Birth', value: patient.date_of_birth ? `${format(parseISO(patient.date_of_birth), 'MMMM d, yyyy')} (${age} yrs)` : '—' },
                { label: 'Gender', value: patient.gender },
                { label: 'Mobile Number', value: patient.phone || '—' },
                { label: 'Email', value: patient.email || '—' },
                { label: 'Address', value: [patient.address, patient.city, patient.state, patient.zip].filter(Boolean).join(', ') || '—' },
              ].map(item => (
                <div key={item.label} className="flex gap-3">
                  <dt className="text-xs font-medium text-gray-500 w-28 flex-shrink-0 pt-0.5">{item.label}</dt>
                  <dd className="text-sm text-gray-900">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          <Card>
            {/* Emergency contact fields were removed from the form — show only
                where older records still carry them */}
            {(patient.emergency_contact_name || patient.emergency_contact_phone) && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <UserPlus size={16} className="text-[#3d9cd6]" />
                  <h3 className="text-sm font-semibold text-gray-900">Emergency Contact</h3>
                </div>
                <dl className="space-y-3 mb-5">
                  <div className="flex gap-3">
                    <dt className="text-xs font-medium text-gray-500 w-28 flex-shrink-0 pt-0.5">Contact Name</dt>
                    <dd className="text-sm text-gray-900">{patient.emergency_contact_name || '—'}</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="text-xs font-medium text-gray-500 w-28 flex-shrink-0 pt-0.5">Contact Phone</dt>
                    <dd className="text-sm text-gray-900">{patient.emergency_contact_phone || '—'}</dd>
                  </div>
                </dl>
              </>
            )}

            <div className="flex items-center gap-2 mb-4">
              <Shield size={16} className="text-[#3d9cd6]" />
              <h3 className="text-sm font-semibold text-gray-900">Insurance</h3>
            </div>
            <dl className="space-y-3">
              {[
                { label: 'Provider', value: patient.insurance_provider || 'Self-pay' },
                { label: 'Policy #', value: patient.insurance_policy_number || '—' },
                { label: 'Group #', value: patient.insurance_group_number || '—' },
                { label: 'Ref. Physician', value: patient.referring_physician || '—' },
              ].map(item => (
                <div key={item.label} className="flex gap-3">
                  <dt className="text-xs font-medium text-gray-500 w-28 flex-shrink-0 pt-0.5">{item.label}</dt>
                  <dd className="text-sm text-gray-900">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Medical Info */}
          <Card className="lg:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              <Stethoscope size={16} className="text-[#3d9cd6]" />
              <h3 className="text-sm font-semibold text-gray-900">Medical Information</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {patient.medical_history && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1">Medical History</p>
                  <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3 leading-relaxed">{patient.medical_history}</p>
                </div>
              )}
              {patient.allergies && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <AlertCircle size={11} className="text-red-500" /> Allergies
                  </p>
                  <p className="text-sm text-gray-700 bg-red-50 rounded-lg p-3">{patient.allergies}</p>
                </div>
              )}
              {patient.medications && (
                <div>
                  <p className="text-xs font-medium text-gray-500 mb-1 flex items-center gap-1">
                    <Pill size={11} className="text-purple-500" /> Current Medications
                  </p>
                  <p className="text-sm text-gray-700 bg-purple-50 rounded-lg p-3">{patient.medications}</p>
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Sessions tab */}
      {activeTab === 'sessions' && (
        <div className="space-y-5">
          <div className="flex justify-end gap-2">
            <Button size="sm" variant="outline" onClick={() => setShowAssignPackage(true)}>
              Assign Package
            </Button>
            <Button size="sm" onClick={() => setShowStartSession(true)}>
              Start Session
            </Button>
          </div>

          {/* Packages */}
          {patientPackages.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {patientPackages.map(pkg => {
                const remaining = sessionsRemaining(pkg, sessions)
                const used = pkg.total_sessions - remaining
                const exhausted = remaining === 0
                return (
                  <Card key={pkg.id}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">{pkg.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          Purchased {format(parseISO(pkg.purchased_at), 'MMM d, yyyy')}
                          {pkg.price > 0 ? ` • ${formatCurrency(pkg.price)}` : ''}
                        </p>
                      </div>
                      <Badge variant={exhausted ? 'default' : 'success'} size="sm" dot={!exhausted}>
                        {exhausted ? 'Completed' : 'Active'}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-3 mt-3">
                      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${exhausted ? 'bg-gray-300' : 'bg-[#3d9cd6]'}`}
                          style={{ width: `${(used / pkg.total_sessions) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs font-medium text-gray-600 flex-shrink-0">{used} of {pkg.total_sessions} used</p>
                    </div>
                  </Card>
                )
              })}
            </div>
          )}

          {/* Session history */}
          <Card padding="none">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-semibold text-gray-900">Session History</h3>
            </div>
            {patientSessions.length === 0 ? (
              <div className="py-12 text-center text-sm text-gray-500">
                No sessions yet — use Start Session when {patient.full_name.split(' ')[0]} visits
              </div>
            ) : (
              <div className="divide-y divide-gray-50">
                {patientSessions.map(session => (
                  <div key={session.id} className="px-5 py-3.5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {format(parseISO(session.session_at), 'MMM d, yyyy • h:mm a')}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {session.therapist?.full_name ?? 'Therapist not specified'}
                        {session.notes ? ` • ${session.notes}` : ''}
                      </p>
                    </div>
                    <Badge variant={session.package_id ? 'info' : 'warning'} size="sm">
                      {session.package_id ? (session.package?.name ?? 'Package') : 'Walk-in'}
                    </Badge>
                    {isAdmin && (
                      <div className="flex gap-1 flex-shrink-0">
                        <button
                          onClick={() => setEditSession(session)}
                          aria-label="Edit session"
                          title="Edit session"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-[#3d9cd6] hover:bg-[#3d9cd6]/10 transition-colors"
                        >
                          <Pencil size={14} />
                        </button>
                        <button
                          onClick={() => setDeleteTarget(session)}
                          aria-label="Delete session"
                          title="Delete session"
                          className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                    {canUndoSession(session) && (
                      <button
                        onClick={() => void handleDeleteSession(session, true)}
                        title="Remove this session — available for 1 minute after logging"
                        className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors flex-shrink-0"
                      >
                        <Undo2 size={13} />
                        Undo
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      )}

      {/* Appointments tab */}
      {activeTab === 'appointments' && (
        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Appointment History</h3>
            <Button size="sm" icon={<CalendarDays size={14} />} onClick={() => navigate(`/appointments?new=1&patient=${id}`)}>
              Schedule New
            </Button>
          </div>
          {patientAppointments.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">No appointments recorded</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {patientAppointments.map(apt => (
                <div key={apt.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="flex-shrink-0">
                    <p className="text-sm font-medium text-gray-900">{format(parseISO(apt.appointment_date), 'MMM d, yyyy')}</p>
                    <p className="text-xs text-gray-500">{apt.appointment_time} &bull; {apt.duration_minutes}min</p>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{appointmentTypeLabels[apt.type]}</p>
                    <p className="text-xs text-gray-500">{apt.therapist?.full_name}</p>
                  </div>
                  <Badge variant={getAppointmentStatusBadge(apt.status)} dot>
                    {apt.status.replace('-', ' ')}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* Notes tab */}
      {activeTab === 'notes' && (
        <div className="space-y-4">
          <div className="flex justify-end">
            <Button size="sm" icon={<FileText size={14} />} onClick={() => navigate(`/notes?new=1&patient=${id}`)}>
              Add SOAP Note
            </Button>
          </div>
          {patientNotes.length === 0 ? (
            <Card>
              <div className="py-8 text-center text-sm text-gray-500">No SOAP notes recorded</div>
            </Card>
          ) : (
            patientNotes.map(note => (
              <Card key={note.id}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-sm font-semibold text-gray-900">{format(parseISO(note.session_date), 'MMMM d, yyyy')}</p>
                    <p className="text-xs text-gray-500">{note.therapist?.full_name}</p>
                  </div>
                  {note.pain_scale !== undefined && (
                    <div className="text-center">
                      <p className="text-xl font-bold text-gray-900">{note.pain_scale}/10</p>
                      <p className="text-xs text-gray-500">Pain Scale</p>
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'S — Subjective', text: note.subjective, color: 'bg-blue-50 border-blue-200' },
                    { label: 'O — Objective', text: note.objective, color: 'bg-green-50 border-green-200' },
                    { label: 'A — Assessment', text: note.assessment, color: 'bg-amber-50 border-amber-200' },
                    { label: 'P — Plan', text: note.plan, color: 'bg-purple-50 border-purple-200' },
                  ].map(section => (
                    <div key={section.label} className={`${section.color} border rounded-lg p-3`}>
                      <p className="text-xs font-semibold text-gray-600 mb-1.5">{section.label}</p>
                      <p className="text-xs text-gray-700 leading-relaxed">{section.text}</p>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      )}

      {/* Billing tab */}
      {activeTab === 'billing' && (
        <div className="space-y-5">
        {/* Ledger summary */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {[
            { label: 'Total Billed', value: totalBilled, color: 'text-gray-900' },
            { label: 'Received', value: totalReceived, color: 'text-green-600' },
            { label: 'Balance Due', value: totalBalance, color: totalBalance > 0 ? 'text-red-600' : 'text-gray-900' },
          ].map(item => (
            <Card key={item.label}>
              <p className="text-xs text-gray-500">{item.label}</p>
              <p className={`text-xl font-bold mt-1 ${item.color}`}>{formatCurrency(item.value)}</p>
            </Card>
          ))}
        </div>

        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-900">Invoice History</h3>
            <Button size="sm" icon={<Receipt size={14} />} onClick={() => navigate(`/billing?new=1&patient=${id}`)}>
              Create Invoice
            </Button>
          </div>
          {patientInvoices.length === 0 ? (
            <div className="py-12 text-center text-sm text-gray-500">No invoices found</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {patientInvoices.map(inv => (
                <div key={inv.id} className="px-5 py-3.5 flex items-center gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{inv.invoice_number}</p>
                    <p className="text-xs text-gray-500">Issued {format(parseISO(inv.issue_date), 'MMM d, yyyy')} &bull; Due {format(parseISO(inv.due_date), 'MMM d, yyyy')}</p>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{formatCurrency(inv.total_amount)}</p>
                  <Badge variant={inv.status === 'paid' ? 'success' : inv.status === 'overdue' ? 'danger' : inv.status === 'sent' ? 'info' : 'default'} dot>
                    {inv.status}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Payment history — see billing tab render below */}
        <Card padding="none">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900">Payment History</h3>
          </div>
          {patientPayments.length === 0 ? (
            <div className="py-10 text-center text-sm text-gray-500">No payments recorded</div>
          ) : (
            <div className="divide-y divide-gray-50">
              {patientPayments.map(payment => (
                <div key={payment.id} className={`px-5 py-3.5 flex items-center gap-4 ${payment.voided ? 'opacity-60' : ''}`}>
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium text-gray-900 ${payment.voided ? 'line-through' : ''}`}>{formatCurrency(payment.amount)} — {paymentMethodLabels[payment.method]}</p>
                    <p className="text-xs text-gray-500">
                      {format(parseISO(payment.paid_at), 'MMM d, yyyy')}
                      {payment.invoice?.invoice_number ? ` • ${payment.invoice.invoice_number}` : ''}
                      {payment.notes ? ` • ${payment.notes}` : ''}
                    </p>
                  </div>
                  <Badge variant={payment.voided ? 'danger' : 'success'} size="sm">{payment.voided ? 'wrong entry' : 'received'}</Badge>
                </div>
              ))}
            </div>
          )}
        </Card>
        </div>
      )}

      {/* Session editing (admin) */}
      {editSession && (
        <EditSessionModal session={editSession} onClose={() => setEditSession(null)} />
      )}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete this session?"
        message={deleteTarget
          ? `The session logged on ${format(parseISO(deleteTarget.session_at), 'MMM d, yyyy • h:mm a')} will be removed${deleteTarget.package_id ? ' and returned to the package' : ''}.`
          : ''}
        onConfirm={() => {
          if (deleteTarget) void handleDeleteSession(deleteTarget, false)
          setDeleteTarget(null)
        }}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Session quick actions */}
      {showStartSession && (
        <StartSessionModal onClose={() => setShowStartSession(false)} defaultPatientId={patient.id} />
      )}
      {showAssignPackage && (
        <AssignPackageModal patient={patient} onClose={() => setShowAssignPackage(false)} />
      )}
    </div>
  )
}
