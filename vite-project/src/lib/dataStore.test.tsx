import React from 'react'
import { describe, it, expect } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { createStore } from './dataStore'

interface Item {
  id: string
  name: string
}

const seed: Item[] = [
  { id: '1', name: 'first' },
  { id: '2', name: 'second' },
]

function buildStore(storageKey = 'test_items') {
  return createStore<Item>({
    table: 'items',
    storageKey,
    mockData: seed,
  })
}

function renderStore(store: ReturnType<typeof buildStore>) {
  return renderHook(() => store.useStore(), {
    wrapper: ({ children }: { children: React.ReactNode }) => (
      <store.Provider>{children}</store.Provider>
    ),
  })
}

// Without VITE_SUPABASE_URL set, the store runs in demo mode (mock seed + localStorage)
describe('createStore (demo mode)', () => {
  it('seeds items from mock data', () => {
    const { result } = renderStore(buildStore())
    expect(result.current.items).toEqual(seed)
    expect(result.current.loading).toBe(false)
    expect(result.current.error).toBeNull()
  })

  it('add prepends the item and returns it', async () => {
    const { result } = renderStore(buildStore())
    let returned: Item | null = null
    await act(async () => {
      returned = await result.current.add({ id: '3', name: 'third' })
    })
    expect(returned).toEqual({ id: '3', name: 'third' })
    expect(result.current.items[0]).toEqual({ id: '3', name: 'third' })
    expect(result.current.items).toHaveLength(3)
  })

  it('update replaces the matching item', async () => {
    const { result } = renderStore(buildStore())
    await act(async () => {
      await result.current.update({ id: '2', name: 'renamed' })
    })
    expect(result.current.items.find(i => i.id === '2')?.name).toBe('renamed')
    expect(result.current.items).toHaveLength(2)
  })

  it('remove deletes by id and reports success', async () => {
    const { result } = renderStore(buildStore())
    let ok = false
    await act(async () => {
      ok = await result.current.remove('1')
    })
    expect(ok).toBe(true)
    expect(result.current.items.map(i => i.id)).toEqual(['2'])
  })

  it('persists mutations to localStorage and restores them in a fresh store', async () => {
    const first = renderStore(buildStore('persist_test'))
    await act(async () => {
      await first.result.current.add({ id: '3', name: 'third' })
      await first.result.current.remove('1')
    })
    first.unmount()

    // A new store instance with the same key must restore persisted state, not the seed
    const second = renderStore(buildStore('persist_test'))
    expect(second.result.current.items.map(i => i.id)).toEqual(['3', '2'])
  })
})
