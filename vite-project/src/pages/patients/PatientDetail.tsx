import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { format, parseISO, differenceInYears } from 'date-fns'
import {
  ArrowLeft, Edit, Calendar, FileText, Receipt,
  Phone, Mail, MapPin, AlertCircle, Pill, Shield,
  User, UserPlus, Stethoscope, CalendarDays
} from 'lucide-react'
import Card from '../../components/ui/Card'
import Badge, { getAppointmentStatusBadge } from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { usePatientsContext } from '../../context/PatientsContext'
import { useAppointmentsContext } from '../../context/AppointmentsContext'
import { useNotesContext } from '../../context/NotesContext'
import { useInvoicesContext } from '../../context/InvoicesContext'
import { formatCurrency } from '../../lib/format'
import PainTrendChart from './PainTrendChart'

export default function PatientDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState<'overview' | 'appointments' | 'notes' | 'billing'>('overview')

  const { patients } = usePatientsContext()
  const { appointments } = useAppointmentsContext()
  const { notes } = useNotesContext()
  const { invoices } = useInvoicesContext()

  const patient = patients.find(p => p.id === id)
  const patientAppointments = appointments.filter(a => a.patient_id === id)
  const patientNotes = notes.filter(n => n.patient_id === id)
  const patientInvoices = invoices.filter(i => i.patient_id === id)

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

  const age = differenceInYears(new Date(), parseISO(patient.date_of_birth))

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
                  <span className="text-xs text-gray-500">{age} years &bull; {patient.gender} &bull; DOB: {format(parseISO(patient.date_of_birth), 'MMM d, yyyy')}</span>
                </div>
              </div>
              <Badge variant={patient.is_active ? 'success' : 'default'} dot size="md">
                {patient.is_active ? 'Active' : 'Inactive'}
              </Badge>
            </div>

            <div className="flex flex-wrap gap-4 mt-3">
              <div className="flex items-center gap-1.5 text-sm text-gray-600">
                <Phone size={14} className="text-gray-400" />
                {patient.phone}
              </div>
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
                { label: 'Date of Birth', value: `${format(parseISO(patient.date_of_birth), 'MMMM d, yyyy')} (${age} yrs)` },
                { label: 'Gender', value: patient.gender },
                { label: 'Phone', value: patient.phone },
                { label: 'Email', value: patient.email || '—' },
                { label: 'Address', value: patient.address ? `${patient.address}, ${patient.city}, ${patient.state} ${patient.zip}` : '—' },
              ].map(item => (
                <div key={item.label} className="flex gap-3">
                  <dt className="text-xs font-medium text-gray-500 w-28 flex-shrink-0 pt-0.5">{item.label}</dt>
                  <dd className="text-sm text-gray-900">{item.value}</dd>
                </div>
              ))}
            </dl>
          </Card>

          {/* Emergency Contact */}
          <Card>
            <div className="flex items-center gap-2 mb-4">
              <UserPlus size={16} className="text-[#3d9cd6]" />
              <h3 className="text-sm font-semibold text-gray-900">Emergency Contact</h3>
            </div>
            <dl className="space-y-3">
              <div className="flex gap-3">
                <dt className="text-xs font-medium text-gray-500 w-28 flex-shrink-0 pt-0.5">Contact Name</dt>
                <dd className="text-sm text-gray-900">{patient.emergency_contact_name || '—'}</dd>
              </div>
              <div className="flex gap-3">
                <dt className="text-xs font-medium text-gray-500 w-28 flex-shrink-0 pt-0.5">Contact Phone</dt>
                <dd className="text-sm text-gray-900">{patient.emergency_contact_phone || '—'}</dd>
              </div>
            </dl>

            <div className="flex items-center gap-2 mt-5 mb-4">
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
      )}
    </div>
  )
}
