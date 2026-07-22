import { describe, it, expect } from 'vitest'
import { deriveRecentActivity } from './activity'
import type { Patient, Appointment, SOAPNote, Invoice } from './types'

function makePatient(overrides: Partial<Patient> = {}): Patient {
  return {
    id: 'p1',
    mrn: 'MRN-2026-001',
    full_name: 'Jane Smith',
    date_of_birth: '1990-01-01',
    gender: 'female',
    phone: '555-0100',
    is_active: true,
    created_at: '2026-07-01T10:00:00Z',
    updated_at: '2026-07-01T10:00:00Z',
    ...overrides,
  }
}

function makeAppointment(overrides: Partial<Appointment> = {}): Appointment {
  return {
    id: 'a1',
    patient_id: 'p1',
    therapist_id: 't1',
    appointment_date: '2026-07-10',
    appointment_time: '09:00',
    duration_minutes: 60,
    type: 'physiotherapy',
    status: 'scheduled',
    created_at: '2026-07-02T09:00:00Z',
    updated_at: '2026-07-02T09:00:00Z',
    ...overrides,
  }
}

function makeNote(overrides: Partial<SOAPNote> = {}): SOAPNote {
  return {
    id: 'n1',
    patient_id: 'p1',
    therapist_id: 't1',
    session_date: '2026-07-03',
    subjective: 's',
    objective: 'o',
    assessment: 'a',
    plan: 'p',
    created_at: '2026-07-03T11:00:00Z',
    updated_at: '2026-07-03T11:00:00Z',
    ...overrides,
  }
}

function makeInvoice(overrides: Partial<Invoice> = {}): Invoice {
  return {
    id: 'i1',
    invoice_number: 'INV-2026-001',
    patient_id: 'p1',
    status: 'draft',
    issue_date: '2026-07-04',
    due_date: '2026-08-03',
    subtotal: 1000,
    tax_rate: 0,
    tax_amount: 0,
    discount_amount: 0,
    total_amount: 1000,
    items: [],
    created_at: '2026-07-04T12:00:00Z',
    updated_at: '2026-07-04T12:00:00Z',
    ...overrides,
  }
}

describe('deriveRecentActivity', () => {
  it('merges all entity types sorted newest first', () => {
    const events = deriveRecentActivity(
      [makePatient()],
      [makeAppointment()],
      [makeNote()],
      [makeInvoice()]
    )
    expect(events.map(e => e.type)).toEqual(['invoice', 'note', 'appointment', 'patient'])
  })

  it('adds a separate paid event for paid invoices', () => {
    const events = deriveRecentActivity([], [], [], [
      makeInvoice({ status: 'paid', paid_date: '2026-07-20' }),
    ])
    expect(events).toHaveLength(2)
    expect(events[0].description).toContain('paid')
    expect(events[0].timestamp).toBe('2026-07-20')
  })

  it('respects the limit', () => {
    const patients = Array.from({ length: 12 }, (_, i) =>
      makePatient({ id: `p${i}`, created_at: `2026-07-${String(i + 1).padStart(2, '0')}T10:00:00Z` })
    )
    expect(deriveRecentActivity(patients, [], [], [])).toHaveLength(8)
    expect(deriveRecentActivity(patients, [], [], [], 3)).toHaveLength(3)
  })

  it('describes events with patient names and amounts', () => {
    const [event] = deriveRecentActivity([], [], [], [
      makeInvoice({ patient: makePatient({ full_name: 'John Miller' }), total_amount: 2500 }),
    ])
    expect(event.description).toContain('John Miller')
    expect(event.description).toContain('₹2,500')
  })
})
