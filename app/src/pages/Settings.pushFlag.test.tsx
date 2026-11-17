// @vitest-environment jsdom
// P1-14 r10: SHOW_PUSH = true (compiled constant in Settings.tsx). Push is opt-in only.
// Renders the real Settings page (data hooks mocked) with browser push APIs stubbed, and proves: the toggle renders OFF with
// Stacy's title and help; mounting never calls Notification.requestPermission, getRegistration, pushManager.subscribe or
// save-push-subscription; the prompt fires only after a tap. The toggle shows ON only with saved push_reminders = true AND a
// live subscription on this browser (read-only getSubscription). The source test is the production-build guard (fails if false).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const calls: string[] = []
// Per-test saved notification_preferences row (null = no row) and captured upserts, via globalThis because vi.mock is hoisted.
const G = globalThis as unknown as { __prefRow: Record<string, unknown> | null; __upserts: { table: string; row: Record<string, unknown> }[] }
G.__prefRow = null; G.__upserts = []
function chain(table = ''): unknown {
  const result = { data: table === 'notification_preferences' ? G.__prefRow : [], error: null, count: 0 }
  const fn = (..._a: unknown[]) => proxy
  const proxy: unknown = new Proxy(fn, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej)
      if (prop === 'upsert') return (row: Record<string, unknown>) => { G.__upserts.push({ table, row }); return proxy }
      return proxy
    },
    apply() { return proxy },
  })
  return proxy
}
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (t: string) => { calls.push(`from:${t}`); return chain(t) },
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

const TEST_URL = 'https://test-project.supabase.co'
const TEST_VAPID = 'test-vapid-key' // test-only value, not a real key
let host: HTMLDivElement; let root: Root
let saveResponse: () => Response = () => new Response('{"ok":true}', { status: 200 })
const fetchSpy = vi.fn(async (..._a: unknown[]) => saveResponse())
let permissionAnswer = 'granted'
const order: string[] = []
const requestPermission = vi.fn(async () => { order.push('requestPermission'); return permissionAnswer })
const unsubscribe = vi.fn(async () => true)
const sub = { endpoint: 'https://push.example/ep1', toJSON: () => ({ endpoint: 'https://push.example/ep1', keys: { p256dh: 'p', auth: 'a' } }), unsubscribe }
const subscribe = vi.fn(async (_o: unknown) => { order.push('subscribe'); return sub })
let liveSub: typeof sub | null = null
const getSubscription = vi.fn(async () => liveSub)
const getRegistration = vi.fn(async (..._a: unknown[]) => ({ pushManager: { subscribe, getSubscription } }))
const register = vi.fn(async () => ({}))

beforeEach(() => {
  calls.length = 0; order.length = 0; permissionAnswer = 'granted'; liveSub = null; G.__prefRow = null; G.__upserts = []; getSubscription.mockClear()
  saveResponse = () => new Response('{"ok":true}', { status: 200 })
  for (const m of [fetchSpy, requestPermission, subscribe, getRegistration, register, unsubscribe]) m.mockClear()
  vi.stubGlobal('fetch', fetchSpy)
  vi.stubEnv('VITE_SUPABASE_URL', TEST_URL)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'test-anon-key')
  vi.stubEnv('VITE_VAPID_PUBLIC_KEY', TEST_VAPID)
  vi.stubGlobal('Notification', Object.assign(function Notification() {}, { requestPermission, permission: 'default' }))
  vi.stubGlobal('PushManager', function PushManager() {})
  Object.defineProperty(navigator, 'serviceWorker', { configurable: true, value: { getRegistration, register, ready: new Promise(() => {}), getRegistrations: async () => [] } })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(() => {
  act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.unstubAllEnvs()
  delete (navigator as unknown as { serviceWorker?: unknown }).serviceWorker
})

async function settle() { for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)) }) }
async function renderSettings() {
  await act(async () => { root.render(<MemoryRouter><Settings /></MemoryRouter>) })
  await settle()
}
const toggle = () => host.querySelector(`[aria-label="${PUSH_COPY.toggleTitle}"]`) as HTMLButtonElement | null
async function tap() { await act(async () => { toggle()!.click() }); await settle() }
const saveCalls = () => fetchSpy.mock.calls.filter(c => String(c[0]).includes('save-push-subscription'))

describe('P1-14 SHOW_PUSH = true (opt-in only)', () => {
  it('flag on: the toggle renders OFF with Stacy title and help, and no error line', async () => {
    await renderSettings()
    expect(host.querySelector('[data-testid="your-data-export"]')).not.toBeNull() // control: the page rendered
    expect(toggle()).not.toBeNull()
    expect(toggle()!.getAttribute('role')).toBe('switch')
    expect(toggle()!.getAttribute('aria-checked')).toBe('false')
    expect(host.textContent).toContain('Reminder notifications')
    expect(host.textContent).toContain(PUSH_COPY.toggleHelp)
    for (const k of ['denied', 'unsupported', 'deviceLimit', 'genericError'] as const) expect(host.textContent).not.toContain(PUSH_COPY[k])
  })

  it('flag on: mounting Settings never prompts, never subscribes, never calls save-push-subscription (no saved row: worker not touched)', async () => {
    await renderSettings()
    expect(requestPermission).not.toHaveBeenCalled()
    expect(getRegistration).not.toHaveBeenCalled()
    expect(subscribe).not.toHaveBeenCalled()
    expect(saveCalls()).toHaveLength(0)
    expect(calls.some(c => c.includes('save-push-subscription'))).toBe(false)
  })

  it('flag on: saved push_reminders = true with NO live subscription on this browser renders OFF, with no prompt', async () => {
    G.__prefRow = { push_reminders: true, reminder_time: '07:00' }
    await renderSettings()
    expect(getSubscription).toHaveBeenCalledTimes(1) // read-only check
    expect(toggle()!.getAttribute('aria-checked')).toBe('false')
    expect(requestPermission).not.toHaveBeenCalled()
    expect(subscribe).not.toHaveBeenCalled()
    expect(saveCalls()).toHaveLength(0)
  })

  it('flag on: saved push_reminders = true WITH a live subscription renders ON, with no prompt and no subscribe', async () => {
    G.__prefRow = { push_reminders: true, reminder_time: '07:00' }
    liveSub = sub
    await renderSettings()
    expect(toggle()!.getAttribute('aria-checked')).toBe('true')
    expect(requestPermission).not.toHaveBeenCalled()
    expect(subscribe).not.toHaveBeenCalled()
    expect(saveCalls()).toHaveLength(0)
  })

  it('flag on: a live subscription without saved push_reminders = true renders OFF (the account has push off)', async () => {
    G.__prefRow = { push_reminders: false, reminder_time: '07:00' }
    liveSub = sub
    await renderSettings()
    expect(toggle()!.getAttribute('aria-checked')).toBe('false')
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('flag on: saving the form on a device that never subscribed keeps the account push_reminders = true', async () => {
    G.__prefRow = { push_reminders: true, reminder_time: '07:00' }
    await renderSettings()
    expect(toggle()!.getAttribute('aria-checked')).toBe('false')
    const save = Array.from(host.querySelectorAll('button')).find(b => /save/i.test(b.textContent ?? '') && b.className.includes('btn-primary') && b.closest('section, div')?.textContent?.includes('Reminder notifications'))
    expect(save).toBeTruthy()
    await act(async () => { save!.click() }); await settle()
    const np = G.__upserts.filter(u => u.table === 'notification_preferences')
    expect(np).toHaveLength(1)
    expect(np[0].row.push_reminders).toBe(true)
  })

  it('flag on: turning OFF stays account-wide: unsubscribes this browser, tells the server, and the form saves push_reminders = false', async () => {
    G.__prefRow = { push_reminders: true, reminder_time: '07:00' }
    liveSub = sub
    await renderSettings()
    expect(toggle()!.getAttribute('aria-checked')).toBe('true')
    await tap()
    expect(toggle()!.getAttribute('aria-checked')).toBe('false')
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(saveCalls()).toHaveLength(1)
    expect(JSON.parse(String((saveCalls()[0][1] as RequestInit).body))).toEqual({ unsubscribe: true, endpoint: 'https://push.example/ep1' })
    const save = Array.from(host.querySelectorAll('button')).find(b => /save/i.test(b.textContent ?? '') && b.className.includes('btn-primary') && b.closest('section, div')?.textContent?.includes('Reminder notifications'))
    await act(async () => { save!.click() }); await settle()
    const np = G.__upserts.filter(u => u.table === 'notification_preferences')
    expect(np[np.length - 1].row.push_reminders).toBe(false)
    expect(requestPermission).not.toHaveBeenCalled()
  })

  it('flag on: the permission prompt fires only after a tap, then subscribe, then save-push-subscription with the user token', async () => {
    await renderSettings()
    expect(requestPermission).not.toHaveBeenCalled()
    await tap()
    expect(requestPermission).toHaveBeenCalledTimes(1)
    expect(order).toEqual(['requestPermission', 'subscribe'])
    expect(subscribe.mock.calls[0][0]).toMatchObject({ userVisibleOnly: true })
    expect(saveCalls()).toHaveLength(1)
    const [url, init] = saveCalls()[0] as [string, RequestInit]
    expect(url).toBe(`${TEST_URL}/functions/v1/save-push-subscription`)
    expect(init.method).toBe('POST')
    expect((init.headers as Record<string, string>).Authorization).toBe('Bearer tok')
    expect(JSON.parse(String(init.body)).subscription.endpoint).toBe('https://push.example/ep1')
    expect(toggle()!.getAttribute('aria-checked')).toBe('true')
  })

  it('flag on: permission denied shows the denied line, stays OFF, and never subscribes', async () => {
    permissionAnswer = 'denied'
    await renderSettings()
    await tap()
    expect(requestPermission).toHaveBeenCalledTimes(1)
    expect(subscribe).not.toHaveBeenCalled()
    expect(saveCalls()).toHaveLength(0)
    expect(host.textContent).toContain(PUSH_COPY.denied)
    expect(toggle()!.getAttribute('aria-checked')).toBe('false')
  })

  it('flag on: 409 device_limit_reached shows the deviceLimit line (no email), stays OFF, and drops the browser subscription', async () => {
    saveResponse = () => new Response('{"error":"device_limit_reached"}', { status: 409 })
    await renderSettings()
    await tap()
    expect(host.textContent).toContain('Reminders are already on for 10 devices, the most we allow. Turn them off on a device you no longer use.')
    expect(PUSH_COPY.deviceLimit).not.toContain('@')
    expect(unsubscribe).toHaveBeenCalledTimes(1)
    expect(toggle()!.getAttribute('aria-checked')).toBe('false')
  })

  it('flag on: with no VAPID key a tap fails quietly (no_key): no prompt, no subscribe, no message, stays OFF', async () => {
    vi.stubEnv('VITE_VAPID_PUBLIC_KEY', '')
    await renderSettings()
    await tap()
    expect(requestPermission).not.toHaveBeenCalled()
    expect(subscribe).not.toHaveBeenCalled()
    expect(saveCalls()).toHaveLength(0)
    for (const k of ['denied', 'unsupported', 'deviceLimit', 'genericError'] as const) expect(host.textContent).not.toContain(PUSH_COPY[k])
    expect(toggle()!.getAttribute('aria-checked')).toBe('false')
  })

  it('production-build guard: FAILS if SHOW_PUSH is false; prompt only reachable from the tap handler', () => {
    const src = readFileSync(join(__dirname, 'Settings.tsx'), 'utf8')
    expect(src).not.toMatch(/^const SHOW_PUSH = false/m)
    expect(src).toMatch(/^const SHOW_PUSH = true$/m)
    expect(src).toContain('if (!SHOW_PUSH) return')
    const gate = src.indexOf('{SHOW_PUSH && (')
    expect(gate).toBeGreaterThan(0)
    expect(src.indexOf('title={PUSH_COPY.toggleTitle}') - gate).toBeLessThan(200)
    expect(src).toContain('{SHOW_PUSH && pushMsg && ')
    // opt-in: Settings never asks for permission or subscribes itself; enablePush is called once, inside handlePushToggle
    const code = src.split('\n').map(l => l.replace(/\/\/.*$/, '')).join('\n') // comments may name the APIs; code may not
    expect(code).not.toMatch(/requestPermission/)
    expect(code).not.toMatch(/pushManager/)
    expect(src.split('enablePush(').length - 1).toBe(1)
    const h = src.indexOf('const handlePushToggle = async (on: boolean) => {')
    expect(src.indexOf('enablePush(')).toBeGreaterThan(h)
    expect(src.indexOf('enablePush(') - h).toBeLessThan(800)
    expect(src).toContain('onChange={handlePushToggle}')
    expect(src).toMatch(/const \[pushReminders, setPushReminders\] = useState\(false\)/)
    expect(code).not.toMatch(/setPushReminders\(!!data\.push_reminders\)/) // a saved true alone never shows ON
    expect(code).toContain('push_reminders: pushPref')
  })
})
