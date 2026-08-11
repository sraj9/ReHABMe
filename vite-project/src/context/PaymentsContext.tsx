import React from 'react'
import { createStore } from '../lib/dataStore'
import { mockPayments } from '../lib/mockData'
import type { Payment } from '../lib/types'

const store = createStore<Payment>({
  table: 'payments',
  storageKey: 'rehabme_payments_v1',
  mockData: mockPayments,
  select: '*, patient:patients(*), invoice:invoices(*), receiver:profiles(*)',
  joinedFields: ['patient', 'invoice', 'receiver'],
  orderBy: { column: 'paid_at', ascending: false },
})

export function PaymentsProvider({ children }: { children: React.ReactNode }) {
  return <store.Provider>{children}</store.Provider>
}

export function usePaymentsContext() {
  const { items, loading, error, add, update, remove, refresh } = store.useStore()
  return {
    payments: items,
    loading,
    error,
    addPayment: add,
    updatePayment: update,
    deletePayment: remove,
    refresh,
  }
}
