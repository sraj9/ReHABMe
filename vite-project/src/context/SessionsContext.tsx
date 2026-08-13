import React from 'react'
import { createStore } from '../lib/dataStore'
import type { PatientSession } from '../lib/types'

const store = createStore<PatientSession>({
  table: 'patient_sessions',
  storageKey: 'rehabme_sessions_v1',
  mockData: [],
  select: '*, patient:patients(*), package:packages(*), therapist:profiles(*)',
  joinedFields: ['patient', 'package', 'therapist'],
  orderBy: { column: 'session_at', ascending: false },
})

export function SessionsProvider({ children }: { children: React.ReactNode }) {
  return <store.Provider>{children}</store.Provider>
}

export function useSessionsContext() {
  const { items, loading, error, add, update, remove, refresh } = store.useStore()
  return {
    sessions: items,
    loading,
    error,
    addSession: add,
    updateSession: update,
    deleteSession: remove,
    refresh,
  }
}
