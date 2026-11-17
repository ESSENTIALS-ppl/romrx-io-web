// @vitest-environment jsdom
// P1-14 r7: SHOW_PUSH = false (compiled constant in Settings.tsx).
// Renders the real Settings page (data hooks mocked) with browser push APIs stubbed, and proves: no push toggle or NEEDS STACY
// text, no Notification.requestPermission, no pushManager.subscribe, no save-push-subscription request. Control: the export button renders.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const calls: string[] = []
function chain(): unknown {
  const result = { data: [], error: null, count: 0 }
  const fn = (..._a: unknown[]) => proxy
  const proxy: unknown = new Proxy(fn, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej)
      return proxy
    },
    apply() { return proxy },
  })
  return proxy
}
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (t: string) => { calls.push(`from:${t}`); return chain() },
    rpc: (n: string) => { calls.push(`rpc:${n}`); return chain() },
    functions: { invoke: async (n: string) => { calls.push(`invoke:${n}`); return { data: null, error: null } } },
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({}) },
  },
}))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, session: { access_token: 'tok', user: { id: 'u1' } }, loading: false, signOut: vi.fn() }),
}))
vi.mock('../hooks/useProfile', () => ({
  useProfile: () => ({ profile: { id: 'u1', full_name: 'Test User' }, loading: false }),
}))
vi.mock('../lib/hipFlexCutover', () => ({ useHipFlexCutover: () => null, loadHipScoredIds: async () => new Set() }))
vi.mock('../components/FeedbackWidget', () => ({ FeedbackWidget: () => null }))
vi.mock('../components/AdsMeasurementSettings', () => ({ AdsMeasurementSettings: () => null }))
vi.mock('../components/MoodSettings', () => ({ MoodSettings: () => null }))
vi.mock('../components/CrisisLine', () => ({ CrisisHelp: () => null }))

import { Settings } from './Settings'
import { PUSH_COPY } from '../lib/pushCopy'

let host: HTMLDivElement; let root: Root
const fetchSpy = vi.fn(async (..._a: unknown[]) => new Response('{}', { status: 200 }))
const requestPermission = vi.fn(async () => 'granted')
const subscribe = vi.fn(async () => ({}))
const getRegistration = vi.fn(async () => ({ pushManager: { subscribe, getSubscription: async () => null } }))
const register = vi.fn(async () => ({}))

beforeEach(() => {
  calls.length = 0; fetchSpy.mockClear(); requestPermission.mockClear(); subscribe.mockClear(); getRegistration.mockClear(); register.mockClear()
  vi.stubGlobal('fetch', fetchSpy)
  vi.stubGlobal('Notification', Object.assign(function Notification() {}, { requestPermission, permission: 'default' }))
  vi.stubGlobal('PushManager', function PushManager() {})
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration, register, ready: new Promise(() => {}), getRegistrations: async () => [] } })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount()); host.remove(); vi.unstubAllGlobals()
  delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker
})

async function renderSettings() {
  await act(async () => { root.render(<MemoryRouter><Settings /></MemoryRouter>) })
  for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)) })
}

describe('P1-14 SHOW_PUSH = false', () => {
  it('flag off: the Settings render has no push toggle and no NEEDS STACY text', async () => {
    await renderSettings()
    expect(host.querySelector('[data-testid="your-data-export"]')).not.toBeNull() // control: the page rendered
    expect(host.querySelector(`[aria-label="${PUSH_COPY.toggleTitle}"]`)).toBeNull()
    expect(host.textContent).not.toContain('NEEDS STACY')
    for (const v of Object.values(PUSH_COPY)) expect(host.textContent).not.toContain(v)
  })

  it('flag off: rendering Settings never prompts, subscribes or calls save-push-subscription', async () => {
    await renderSettings()
    expect(requestPermission).not.toHaveBeenCalled()
    expect(subscribe).not.toHaveBeenCalled()
    expect(getRegistration).not.toHaveBeenCalled()
    expect(fetchSpy.mock.calls.map(c => String(c[0])).some(u => u.includes('save-push-subscription'))).toBe(false)
    expect(calls.some(c => c.includes('save-push-subscription'))).toBe(false)
  })

  it('flag off in source: compiled false, toggle and handler both gated', () => {
    const src = readFileSync(join(__dirname, 'Settings.tsx'), 'utf8')
    expect(src).toMatch(/^const SHOW_PUSH = false$/m)
    expect(src).toContain('if (!SHOW_PUSH) return')
    const gate = src.indexOf('{SHOW_PUSH && (')
    expect(gate).toBeGreaterThan(0)
    expect(src.indexOf('title={PUSH_COPY.toggleTitle}')).toBeGreaterThan(gate)
    expect(src.indexOf('title={PUSH_COPY.toggleTitle}') - gate).toBeLessThan(200)
    expect(src).toContain('{SHOW_PUSH && pushMsg && ')
  })
})
