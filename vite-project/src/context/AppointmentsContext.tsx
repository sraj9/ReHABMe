import React from 'react'
import { createStore } from '../lib/dataStore'
import { mockAppointments } from '../lib/mockData'
import type { Appointment } from '../lib/types'

const store = createStore<Appointment>({
  table: 'appointments',
  storageKey: 'rehabme_appointments_v1',
  mockData: mockAppointments,
  select: '*, patient:patients(*), therapist:profiles(*)',
  joinedFields: ['patient', 'therapist'],
  orderBy: { column: 'appointment_date', ascending: true },
})

export function AppointmentsProvider({ children }: { children: React.ReactNode }) {
  return <store.Provider>{children}</store.Provider>
}

export function useAppointmentsContext() {
  const { items, loading, error, add, update, remove, refresh } = store.useStore()
  return {
    appointments: items,
    loading,
    error,
    addAppointment: add,
    updateAppointment: update,
    deleteAppointment: remove,
    refresh,
  }
}
