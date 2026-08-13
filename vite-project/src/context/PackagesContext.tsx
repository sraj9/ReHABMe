import React from 'react'
import { createStore } from '../lib/dataStore'
import type { SessionPackage } from '../lib/types'

const store = createStore<SessionPackage>({
  table: 'packages',
  storageKey: 'rehabme_packages_v1',
  mockData: [],
  select: '*, patient:patients(*)',
  joinedFields: ['patient'],
  orderBy: { column: 'created_at', ascending: false },
})

export function PackagesProvider({ children }: { children: React.ReactNode }) {
  return <store.Provider>{children}</store.Provider>
}

export function usePackagesContext() {
  const { items, loading, error, add, update, remove, refresh } = store.useStore()
  return {
    packages: items,
    loading,
    error,
    addPackage: add,
    updatePackage: update,
    deletePackage: remove,
    refresh,
  }
}
