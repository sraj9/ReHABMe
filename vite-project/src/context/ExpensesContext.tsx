import React from 'react'
import { createStore } from '../lib/dataStore'
import { mockExpenses } from '../lib/mockData'
import type { Expense } from '../lib/types'

const store = createStore<Expense>({
  table: 'expenses',
  storageKey: 'rehabme_expenses_v1',
  mockData: mockExpenses,
  select: '*, recorder:profiles(*)',
  joinedFields: ['recorder'],
  orderBy: { column: 'expense_date', ascending: false },
})

export function ExpensesProvider({ children }: { children: React.ReactNode }) {
  return <store.Provider>{children}</store.Provider>
}

export function useExpensesContext() {
  const { items, loading, error, add, update, remove, refresh } = store.useStore()
  return {
    expenses: items,
    loading,
    error,
    addExpense: add,
    updateExpense: update,
    deleteExpense: remove,
    refresh,
  }
}
