import React from 'react'
import { createStore } from '../lib/dataStore'
import { mockPatients } from '../lib/mockData'
import type { Patient } from '../lib/types'

const store = createStore<Patient>({
  table: 'patients',
  storageKey: 'rehabme_patients_v1',
  mockData: mockPatients,
  generatedFields: ['mrn'],
  orderBy: { column: 'created_at', ascending: false },
})

export function PatientsProvider({ children }: { children: React.ReactNode }) {
  return <store.Provider>{children}</store.Provider>
}

export function usePatientsContext() {
  const { items, loading, error, add, update, remove, refresh } = store.useStore()
  return {
    patients: items,
    loading,
    error,
    addPatient: add,
    updatePatient: update,
    deletePatient: remove,
    refresh,
  }
}
