import React from 'react'
import { createStore } from '../lib/dataStore'
import { supabase } from '../lib/supabase'
import { mockInvoices } from '../lib/mockData'
import type { Invoice } from '../lib/types'

const INVOICE_SELECT = '*, items:invoice_items(*), patient:patients(*)'

// Invoices span two tables: insert the invoice, then its line items, then
// re-select the row so DB triggers (invoice_number, recalculated totals) are reflected.
async function insertInvoice(invoice: Invoice): Promise<Invoice> {
  const { data: created, error } = await supabase
    .from('invoices')
    .insert({
      patient_id: invoice.patient_id,
      appointment_id: invoice.appointment_id ?? null,
      status: invoice.status,
      issue_date: invoice.issue_date,
      due_date: invoice.due_date,
      paid_date: invoice.paid_date ?? null,
      tax_rate: invoice.tax_rate,
      discount_amount: invoice.discount_amount,
      notes: invoice.notes ?? null,
    })
    .select('id')
    .single()
  if (error) throw error

  if (invoice.items.length > 0) {
    const itemRows = invoice.items.map(item => ({
      invoice_id: created.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price,
    }))
    const { error: itemsError } = await supabase.from('invoice_items').insert(itemRows)
    if (itemsError) throw itemsError
  }

  const { data: full, error: selectError } = await supabase
    .from('invoices')
    .select(INVOICE_SELECT)
    .eq('id', created.id)
    .single()
  if (selectError) throw selectError
  return full as unknown as Invoice
}

const store = createStore<Invoice>({
  table: 'invoices',
  storageKey: 'rehabme_invoices_v1',
  mockData: mockInvoices,
  select: INVOICE_SELECT,
  joinedFields: ['patient', 'appointment', 'items'],
  generatedFields: ['invoice_number', 'subtotal', 'tax_amount', 'total_amount'],
  orderBy: { column: 'created_at', ascending: false },
  insertOverride: insertInvoice,
})

export function InvoicesProvider({ children }: { children: React.ReactNode }) {
  return <store.Provider>{children}</store.Provider>
}

export function useInvoicesContext() {
  const { items, loading, error, add, update, remove, refresh } = store.useStore()
  return {
    invoices: items,
    loading,
    error,
    addInvoice: add,
    updateInvoice: update,
    deleteInvoice: remove,
    refresh,
  }
}
