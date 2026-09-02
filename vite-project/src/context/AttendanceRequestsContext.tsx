import React from 'react'
import { createStore } from '../lib/dataStore'
import type { AttendanceRequest } from '../lib/types'

const store = createStore<AttendanceRequest>({
  table: 'attendance_requests',
  storageKey: 'rehabme_attendance_requests_v1',
  mockData: [],
  select: '*, profile:profiles!attendance_requests_profile_id_fkey(*), reviewer:profiles!attendance_requests_reviewed_by_fkey(*)',
  joinedFields: ['profile', 'reviewer'],
  orderBy: { column: 'created_at', ascending: false },
})

export function AttendanceRequestsProvider({ children }: { children: React.ReactNode }) {
  return <store.Provider>{children}</store.Provider>
}

export function useAttendanceRequestsContext() {
  const { items, loading, error, add, update, remove, refresh } = store.useStore()
  return {
    requests: items,
    loading,
    error,
    addRequest: add,
    updateRequest: update,
    deleteRequest: remove,
    refresh,
  }
}
