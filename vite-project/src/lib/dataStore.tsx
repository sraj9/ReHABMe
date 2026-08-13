import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
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

/**
 * An expired/invalid session makes every write fail with a misleading error.
 * Detect it and sign out so the user lands on the login page instead.
 */
function handleAuthFailure(message: string): void {
  if (isSupabaseConfigured && /jwt|token.*(invalid|expired)|expired.*token|not.*authenticated|401/i.test(message)) {
    void supabase.auth.signOut()
  }
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
    const hasLoaded = useRef(false)

    const setAndPersist = (updater: (prev: T[]) => T[]) => {
      setItems(prev => {
        const next = updater(prev)
        saveLocal(storageKey, next)
        return next
      })
    }

    const refresh = useCallback(async () => {
      if (!isSupabaseConfigured) return
      // Background refreshes replace data silently — only the first load
      // shows the loading state
      if (!hasLoaded.current) setLoading(true)
      let query = supabase.from(table).select(select)
      if (orderBy) query = query.order(orderBy.column, { ascending: orderBy.ascending })
      const { data, error: err } = await query
      if (err) {
        handleAuthFailure(err.message)
        setError(err.message)
      } else {
        setError(null)
        setItems((data ?? []) as unknown as T[])
        hasLoaded.current = true
      }
      setLoading(false)
    }, [])

    useEffect(() => {
      void refresh()
    }, [refresh])

    // Keep every open screen current: refetch when the database broadcasts
    // a change to this table (edits from other devices/staff) and when the
    // tab regains focus after being away.
    useEffect(() => {
      if (!isSupabaseConfigured) return

      let disposed = false
      let channel: ReturnType<typeof supabase.channel> | undefined
      let lastToken: string | null = null
      let timer: number | undefined

      const scheduleRefresh = () => {
        window.clearTimeout(timer)
        timer = window.setTimeout(() => void refresh(), 400)
      }

      // RLS filters realtime events by the token presented at channel join —
      // joining before the session is ready silently delivers nothing, so the
      // channel must (re)join whenever the auth token changes.
      const joinChannel = (token: string | null) => {
        if (disposed || (token === lastToken && channel)) return
        lastToken = token
        if (channel) void supabase.removeChannel(channel)
        if (token) supabase.realtime.setAuth(token)
        channel = supabase
          .channel(`db-changes-${table}`)
          .on('postgres_changes', { event: '*', schema: 'public', table }, scheduleRefresh)
          .subscribe()
      }

      void supabase.auth.getSession().then(({ data: { session } }) => {
        joinChannel(session?.access_token ?? null)
      })

      const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (disposed) return
        if (event === 'INITIAL_SESSION' || event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
          const token = session?.access_token ?? null
          if (token !== lastToken) {
            joinChannel(token)
            // Data fetched before login was RLS-filtered to nothing — reload it
            scheduleRefresh()
          }
        }
      })

      const onFocus = () => scheduleRefresh()
      const onVisibility = () => {
        if (document.visibilityState === 'visible') scheduleRefresh()
      }
      window.addEventListener('focus', onFocus)
      document.addEventListener('visibilitychange', onVisibility)

      return () => {
        disposed = true
        window.clearTimeout(timer)
        subscription.unsubscribe()
        if (channel) void supabase.removeChannel(channel)
        window.removeEventListener('focus', onFocus)
        document.removeEventListener('visibilitychange', onVisibility)
      }
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
        { const msg = errorMessage(e); handleAuthFailure(msg); setError(msg) }
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
        { const msg = errorMessage(e); handleAuthFailure(msg); setError(msg) }
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
        { const msg = errorMessage(e); handleAuthFailure(msg); setError(msg) }
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
