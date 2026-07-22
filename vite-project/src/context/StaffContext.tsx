import React from 'react'
import { createStore } from '../lib/dataStore'
import { mockStaff } from '../lib/mockData'
import type { StaffProfile } from '../lib/types'

const store = createStore<StaffProfile>({
  table: 'profiles',
  storageKey: 'rehabme_staff_v1',
  mockData: mockStaff,
  orderBy: { column: 'full_name', ascending: true },
})

export function StaffProvider({ children }: { children: React.ReactNode }) {
  return <store.Provider>{children}</store.Provider>
}

export function useStaffContext() {
  const { items, loading, error, add, update, remove, refresh } = store.useStore()
  return {
    staff: items,
    loading,
    error,
    addStaff: add,
    updateStaff: update,
    deleteStaff: remove,
    refresh,
  }
}
