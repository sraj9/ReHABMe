import React from 'react'
import { createStore } from '../lib/dataStore'
import type { Attendance } from '../lib/types'

const store = createStore<Attendance>({
  table: 'attendance',
  storageKey: 'rehabme_attendance_v1',
  mockData: [],
  select: '*, profile:profiles(*)',
  joinedFields: ['profile'],
  orderBy: { column: 'check_in_at', ascending: false },
})

export function AttendanceProvider({ children }: { children: React.ReactNode }) {
  return <store.Provider>{children}</store.Provider>
}

export function useAttendanceContext() {
  const { items, loading, error, add, update, remove, refresh } = store.useStore()
  return {
    attendance: items,
    loading,
    error,
    addAttendance: add,
    updateAttendance: update,
    deleteAttendance: remove,
    refresh,
  }
}
