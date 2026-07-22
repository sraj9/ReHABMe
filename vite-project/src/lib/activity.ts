import { format, parseISO } from 'date-fns'
import { formatCurrency } from './format'
import type { Patient, Appointment, SOAPNote, Invoice, RecentActivity } from './types'

const appointmentTypeLabels: Record<string, string> = {
  initial_assessment: 'Initial assessment',
  follow_up: 'Follow-up',
  physiotherapy: 'Physiotherapy',
  occupational_therapy: 'Occupational therapy',
  speech_therapy: 'Speech therapy',
  hydrotherapy: 'Hydrotherapy',
}

/** Build the dashboard activity feed from real records instead of mock events. */
export function deriveRecentActivity(
  patients: Patient[],
  appointments: Appointment[],
  notes: SOAPNote[],
  invoices: Invoice[],
  limit = 8
): RecentActivity[] {
  const events: RecentActivity[] = []

  for (const patient of patients) {
    events.push({
      id: `patient-${patient.id}`,
      type: 'patient',
      description: `New patient ${patient.full_name} registered`,
      timestamp: patient.created_at,
      user_name: '',
    })
  }

  for (const apt of appointments) {
    events.push({
      id: `appointment-${apt.id}`,
      type: 'appointment',
      description: `${appointmentTypeLabels[apt.type] ?? 'Appointment'} scheduled for ${apt.patient?.full_name ?? 'a patient'} on ${format(parseISO(apt.appointment_date), 'MMM d')}`,
      timestamp: apt.created_at,
      user_name: apt.therapist?.full_name ?? '',
    })
  }

  for (const note of notes) {
    events.push({
      id: `note-${note.id}`,
      type: 'note',
      description: `SOAP note recorded for ${note.patient?.full_name ?? 'a patient'}`,
      timestamp: note.created_at,
      user_name: note.therapist?.full_name ?? '',
    })
  }

  for (const invoice of invoices) {
    events.push({
      id: `invoice-${invoice.id}`,
      type: 'invoice',
      description: `Invoice ${invoice.invoice_number} created for ${invoice.patient?.full_name ?? 'a patient'} — ${formatCurrency(invoice.total_amount)}`,
      timestamp: invoice.created_at,
      user_name: '',
    })
    if (invoice.status === 'paid' && invoice.paid_date) {
      events.push({
        id: `invoice-paid-${invoice.id}`,
        type: 'invoice',
        description: `Invoice ${invoice.invoice_number} paid — ${formatCurrency(invoice.total_amount)}`,
        timestamp: invoice.paid_date,
        user_name: '',
      })
    }
  }

  return events
    .sort((a, b) => b.timestamp.localeCompare(a.timestamp))
    .slice(0, limit)
}
