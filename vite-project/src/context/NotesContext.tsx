import React from 'react'
import { createStore } from '../lib/dataStore'
import { mockSOAPNotes } from '../lib/mockData'
import type { SOAPNote } from '../lib/types'

const store = createStore<SOAPNote>({
  table: 'soap_notes',
  storageKey: 'rehabme_notes_v2',
  mockData: mockSOAPNotes,
  select: '*, patient:patients(*), therapist:profiles(*)',
  joinedFields: ['patient', 'therapist', 'appointment'],
  orderBy: { column: 'session_date', ascending: false },
})

export function NotesProvider({ children }: { children: React.ReactNode }) {
  return <store.Provider>{children}</store.Provider>
}

export function useNotesContext() {
  const { items, loading, error, add, update, remove, refresh } = store.useStore()
  return {
    notes: items,
    loading,
    error,
    addNote: add,
    updateNote: update,
    deleteNote: remove,
    refresh,
  }
}
