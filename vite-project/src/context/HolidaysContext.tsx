import React from 'react'
import { createStore } from '../lib/dataStore'
import type { Holiday } from '../lib/types'

const store = createStore<Holiday>({
  table: 'holidays',
  storageKey: 'rehabme_holidays_v1',
  mockData: [],
  orderBy: { column: 'holiday_date', ascending: true },
})

export function HolidaysProvider({ children }: { children: React.ReactNode }) {
  return <store.Provider>{children}</store.Provider>
}

export function useHolidaysContext() {
  const { items, loading, error, add, update, remove, refresh } = store.useStore()
  return { holidays: items, loading, error, addHoliday: add, updateHoliday: update, deleteHoliday: remove, refresh }
}
