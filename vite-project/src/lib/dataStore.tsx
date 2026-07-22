import React, { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from './supabase'

export interface StoreValue<T extends { id: string }> {
  items: T[]
  loading: boolean
  error: string | null
  add: (item: T) => Promise<T | null>
  update: (item: T) => Promise<T | null>
  remove: (id: string) => Promise<boolean>
  refresh: () => Promise<void>
}

interface StoreConfig<T extends { id: string }> {
  table: string
  /** localStorage key used to persist demo-mode data across reloads */
  storageKey: string
  mockData: T[]
  /** Supabase select string, e.g. '*, patient:patients(*)' */
  select?: string
  /** Fields populated by joins — kept in local state but never written to the database */
  joinedFields?: (keyof T)[]
  /** Columns owned by database triggers/sequences (mrn, invoice_number, …) — never written */
  generatedFields?: (keyof T)[]
  orderBy?: { column: string; ascending: boolean }
  /** Supabase-mode insert override for entities that span multiple tables */
  insertOverride?: (item: T) => Promise<T>
}

function loadLocal<T>(key: string, fallback: T[]): T[] {
  try {
    const raw = localStorage.getItem(key)
    if (raw) return JSON.parse(raw) as T[]
  } catch {
    // corrupted entry — fall back to seed data
  }
  return fallback
}

function saveLocal<T>(key: string, items: T[]) {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch {
    // storage full/unavailable — demo data just won't persist
  }
}

function errorMessage(e: unknown): string {
  if (e instanceof Error) return e.message
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message)
  return String(e)
}

export function createStore<T extends { id: string }>(config: StoreConfig<T>) {
  const { table, storageKey, mockData, select = '*', joinedFields = [], generatedFields = [], orderBy } = config

  const Ctx = createContext<StoreValue<T> | null>(null)

  const stripForWrite = (item: T, isInsert: boolean): Record<string, unknown> => {
    const row = { ...item } as Record<string, unknown>
    delete row.id
    delete row.created_at
    delete row.updated_at
    for (const field of joinedFields) delete row[field as string]
    for (const field of generatedFields) delete row[field as string]
    if (isInsert) {
      // undefined optional fields would be sent as missing anyway; normalize for clarity
      for (const key of Object.keys(row)) {
        if (row[key] === undefined) row[key] = null
      }
    }
    return row
  }

  function Provider({ children }: { children: React.ReactNode }) {
    const [items, setItems] = useState<T[]>(() =>
      isSupabaseConfigured ? [] : loadLocal(storageKey, mockData)
    )
    const [loading, setLoading] = useState(isSupabaseConfigured)
    const [error, setError] = useState<string | null>(null)

    const setAndPersist = (updater: (prev: T[]) => T[]) => {
      setItems(prev => {
        const next = updater(prev)
        saveLocal(storageKey, next)
        return next
      })
    }

    const refresh = useCallback(async () => {
      if (!isSupabaseConfigured) return
      setLoading(true)
      setError(null)
      let query = supabase.from(table).select(select)
      if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending })
      const { data, error: err } = await query
      if (err) {
        setError(err.message)
      } else {
        setItems((data ?? []) as unknown as T[])
      }
      setLoading(false)
    }, [])

    useEffect(() => {
      void refresh()
    }, [refresh])

    const add = async (item: T): Promise<T | null> => {
      if (!isSupabaseConfigured) {
        setAndPersist(prev => [item, ...prev])
        return item
      }
      try {
        let created: T
        if (config.insertOverride) {
          created = await config.insertOverride(item)
        } else {
          const { data, error: err } = await supabase
            .from(table)
            .insert(stripForWrite(item, true))
            .select(select)
            .single()
          if (err) throw err
          created = data as unknown as T
        }
        setItems(prev => [created, ...prev])
        setError(null)
        return created
      } catch (e) {
        setError(errorMessage(e))
        return null
      }
    }

    const update = async (item: T): Promise<T | null> => {
      if (!isSupabaseConfigured) {
        setAndPersist(prev => prev.map(existing => (existing.id === item.id ? item : existing)))
        return item
      }
      try {
        const { data, error: err } = await supabase
          .from(table)
          .update(stripForWrite(item, false))
          .eq('id', item.id)
          .select(select)
          .single()
        if (err) throw err
        const updated = data as unknown as T
        setItems(prev => prev.map(existing => (existing.id === updated.id ? updated : existing)))
        setError(null)
        return updated
      } catch (e) {
        setError(errorMessage(e))
        return null
      }
    }

    const remove = async (id: string): Promise<boolean> => {
      if (!isSupabaseConfigured) {
        setAndPersist(prev => prev.filter(existing => existing.id !== id))
        return true
      }
      try {
        const { error: err } = await supabase.from(table).delete().eq('id', id)
        if (err) throw err
        setItems(prev => prev.filter(existing => existing.id !== id))
        setError(null)
        return true
      } catch (e) {
        setError(errorMessage(e))
        return false
      }
    }

    return (
      <Ctx.Provider value={{ items, loading, error, add, update, remove, refresh }}>
        {children}
      </Ctx.Provider>
    )
  }

  function useStore(): StoreValue<T> {
    const ctx = useContext(Ctx)
    if (!ctx) throw new Error(`useStore for "${table}" must be used within its Provider`)
    return ctx
  }

  return { Provider, useStore }
}
