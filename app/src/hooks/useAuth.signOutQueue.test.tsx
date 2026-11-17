// @vitest-environment jsdom
// P1-26 R2 / Stacy b98b8370 note 2: sign-out really clears the IndexedDB submit queue (real IndexedDB API via fake-indexeddb),
// through the app's own sign-out paths: useAuth().signOut() and the SIGNED_OUT auth event. Also when signOut itself fails (offline).
import 'fake-indexeddb/auto'
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'

const auth = vi.hoisted(() => ({
  listener: null as null | ((e: string, s: unknown) => void),
  signOut: vi.fn(async () => ({ error: null as unknown })),
}))
vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: async () => ({ data: { session: { access_token: 't', user: { id: 'user-a' } } } }),
      onAuthStateChange: (cb: (e: string, s: unknown) => void) => { auth.listener = cb; return { data: { subscription: { unsubscribe: () => {} } } } },
      signOut: () => auth.signOut(),
    },
  },
}))

import { useAuth } from './useAuth'
import { idbQueueStore, postSubmitAssessment, QUEUE_DB, SUBMIT_FAILED_KEY_PREFIX } from '../lib/offlineSubmitQueue'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root, host: HTMLDivElement
let api: ReturnType<typeof useAuth>
function Probe() { api = useAuth(); return null }

async function queueTwo() {
  const down = vi.fn(async () => { throw new TypeError('Failed to fetch') })
  for (const userId of ['user-a', 'user-b']) {
    const r = await postSubmitAssessment({ url: 'https://x.supabase.co/functions/v1/submit-assessment', accessToken: 'tok', apikey: 'k', body: { a: 1 }, fetchImpl: down, flagOn: true, online: false, userId })
    expect(r.queued).toBe(true)
  }
  localStorage.setItem(SUBMIT_FAILED_KEY_PREFIX + 'user-a', '1')
  expect(await idbQueueStore().getAll()).toHaveLength(2) // really in IndexedDB (default store)
}

beforeEach(async () => {
  const st = idbQueueStore(); for (const it of await st.getAll()) await st.delete(it.id)
  expect(indexedDB).toBeDefined(); expect(QUEUE_DB).toBe('romrx-p1-26-offline')
  localStorage.clear()
  auth.signOut.mockReset(); auth.signOut.mockResolvedValue({ error: null })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  await act(async () => { root.render(createElement(Probe)) })
})
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('sign-out clears the real IndexedDB offline queue', () => {
  it('useAuth().signOut(): queue is empty before supabase.auth.signOut is even called', async () => {
    await queueTwo()
    let countAtSignOut = -1
    auth.signOut.mockImplementation(async () => { countAtSignOut = (await idbQueueStore().getAll()).length; return { error: null } })
    await act(async () => { await api.signOut() })
    expect(countAtSignOut).toBe(0)
    expect(await idbQueueStore().getAll()).toHaveLength(0)
    expect(localStorage.getItem(SUBMIT_FAILED_KEY_PREFIX + 'user-a')).toBeNull()
  })
  it('offline sign-out (supabase signOut fails or throws): queue is still cleared', async () => {
    await queueTwo()
    auth.signOut.mockResolvedValue({ error: new Error('Failed to fetch') })
    await act(async () => { await api.signOut() })
    expect(await idbQueueStore().getAll()).toHaveLength(0)
    await queueTwo()
    auth.signOut.mockRejectedValue(new TypeError('Failed to fetch'))
    await act(async () => { await api.signOut().catch(() => {}) })
    expect(await idbQueueStore().getAll()).toHaveLength(0)
  })
  it('SIGNED_OUT auth event (signed out elsewhere, session ended): queue is cleared', async () => {
    await queueTwo()
    await act(async () => { auth.listener!('SIGNED_OUT', null) })
    await vi.waitFor(async () => { expect(await idbQueueStore().getAll()).toHaveLength(0) })
  })
})
