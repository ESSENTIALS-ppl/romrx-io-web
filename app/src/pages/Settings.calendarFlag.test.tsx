// @vitest-environment jsdom
// P1-12 r9: SHOW_CALENDAR_ICS = true (compiled constant in Settings.tsx, same style as SHOW_EXPORT_MY_DATA).
// Renders the real Settings page with its data hooks mocked, and proves: the "Add to my calendar" button and Stacy's help line
// render; a tap GETs {VITE_SUPABASE_URL}/functions/v1/calendar-ics with Bearer <user access token> + apikey; a 200 with
// BEGIN:VCALENDAR downloads romrx-base.ics; a non-200 shows Stacy's error line. The source test is the production-build guard:
// it FAILS if SHOW_CALENDAR_ICS is false.
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
  useAuth: () => ({ user: { id: 'u1' }, session: { access_token: 'user-access-token', user: { id: 'u1' } }, loading: false, signOut: vi.fn() }),
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
import { ADD_TO_CALENDAR_COPY as CAL } from '../lib/addToCalendar'

const TEST_URL = 'https://test-project.supabase.co'
const TEST_ANON = 'test-anon-key'
const STACY_HELP = 'Download a calendar file with a daily session reminder and your next check-in and retest dates. If those dates change, download it again.'
const STACY_ERROR = 'The calendar file could not be downloaded. Please try again.'
const ICS = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n'

let host: HTMLDivElement; let root: Root
let nextResponse: () => Response = () => new Response(ICS, { status: 200 })
const fetchSpy = vi.fn(async (..._a: unknown[]) => nextResponse())
const downloads: { download: string; href: string }[] = []
let blobs: Blob[] = []

beforeEach(() => {
  calls.length = 0; fetchSpy.mockClear(); downloads.length = 0; blobs = []
  nextResponse = () => new Response(ICS, { status: 200 })
  vi.stubGlobal('fetch', fetchSpy)
  vi.stubEnv('VITE_SUPABASE_URL', TEST_URL)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', TEST_ANON)
  ;(URL as unknown as { createObjectURL: (b: Blob) => string }).createObjectURL = (b: Blob) => { blobs.push(b); return 'blob:test-ics' }
  ;(URL as unknown as { revokeObjectURL: (u: string) => void }).revokeObjectURL = () => {}
  vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(function (this: HTMLAnchorElement) {
    downloads.push({ download: this.download, href: this.getAttribute('href') ?? '' })
  })
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks() })

async function settle() { for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)) }) }
async function renderSettings() {
  await act(async () => { root.render(<MemoryRouter><Settings /></MemoryRouter>) })
  await settle()
}
async function tap() {
  const btn = host.querySelector('[data-testid="add-to-calendar"]') as HTMLButtonElement
  expect(btn).not.toBeNull()
  await act(async () => { btn.click() })
  await settle()
}
const calendarCalls = () => fetchSpy.mock.calls.filter(c => String(c[0]).includes('calendar-ics'))

describe('P1-12 SHOW_CALENDAR_ICS = true', () => {
  it('flag on: the button and Stacy help line render, no error line, no request until tapped', async () => {
    await renderSettings()
    expect(host.querySelector('[data-testid="your-data-export"]')).not.toBeNull() // control: the page rendered
    const btn = host.querySelector('[data-testid="add-to-calendar"]')
    expect(btn).not.toBeNull()
    expect(btn!.textContent).toContain('Add to my calendar')
    expect(CAL.help).toBe(STACY_HELP)
    expect(CAL.error).toBe(STACY_ERROR)
    expect(host.textContent).toContain(STACY_HELP)
    expect(host.textContent).not.toContain(STACY_ERROR)
    expect(calendarCalls()).toHaveLength(0)
  })

  it('flag on: a tap GETs {VITE_SUPABASE_URL}/functions/v1/calendar-ics with Bearer <user access token> + apikey', async () => {
    await renderSettings()
    await tap()
    expect(calendarCalls()).toHaveLength(1)
    const [url, init] = calendarCalls()[0] as [string, RequestInit]
    expect(url).toBe(`${TEST_URL}/functions/v1/calendar-ics`)
    expect(init.method).toBe('GET')
    const h = init.headers as Record<string, string>
    expect(h.Authorization).toBe('Bearer user-access-token')
    expect(h.apikey).toBe(TEST_ANON)
  })

  it('flag on: 200 with BEGIN:VCALENDAR downloads romrx-base.ics and shows no error', async () => {
    await renderSettings()
    await tap()
    expect(downloads).toEqual([{ download: 'romrx-base.ics', href: 'blob:test-ics' }])
    expect(blobs).toHaveLength(1)
    expect(blobs[0].type).toContain('text/calendar')
    const text = await new Promise<string>(res => { const r = new FileReader(); r.onload = () => res(String(r.result)); r.readAsText(blobs[0]) })
    expect(text).toBe(ICS)
    expect(host.textContent).not.toContain(STACY_ERROR)
  })

  it('flag on: a non-200 shows Stacy error line and downloads nothing', async () => {
    nextResponse = () => new Response('nope', { status: 500 })
    await renderSettings()
    await tap()
    expect(calendarCalls()).toHaveLength(1)
    expect(downloads).toHaveLength(0)
    expect(host.textContent).toContain(STACY_ERROR)
  })

  it('flag on: a 200 without BEGIN:VCALENDAR shows the error line and downloads nothing', async () => {
    nextResponse = () => new Response('<html>not a calendar</html>', { status: 200 })
    await renderSettings()
    await tap()
    expect(downloads).toHaveLength(0)
    expect(host.textContent).toContain(STACY_ERROR)
  })

  it('production-build guard: FAILS if SHOW_CALENDAR_ICS is false in source; button block and handler still gated', () => {
    const src = readFileSync(join(__dirname, 'Settings.tsx'), 'utf8')
    expect(src).not.toMatch(/^const SHOW_CALENDAR_ICS = false/m)
    expect(src).toMatch(/^const SHOW_CALENDAR_ICS = true$/m)
    expect(src).toContain('{SHOW_CALENDAR_ICS && (')
    expect(src).toContain('if (!SHOW_CALENDAR_ICS) return')
    const gate = src.indexOf('{SHOW_CALENDAR_ICS && (')
    expect(src.indexOf('data-testid="add-to-calendar"')).toBeGreaterThan(gate)
    expect(src.indexOf('data-testid="add-to-calendar"') - gate).toBeLessThan(600)
  })
})
