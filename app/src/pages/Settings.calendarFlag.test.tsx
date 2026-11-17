// @vitest-environment jsdom
// P1-12 r6: SHOW_CALENDAR_ICS = false (compiled constant in Settings.tsx, same style as SHOW_EXPORT_MY_DATA).
// Renders the real Settings page with its data hooks mocked, and proves: no "Add to my calendar" button, no help/error line,
// and no request to calendar-ics. Control: the same render shows the export button, so the page did render.
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
import { ADD_TO_CALENDAR_COPY as CAL } from '../lib/addToCalendar'

let host: HTMLDivElement; let root: Root
const fetchSpy = vi.fn(async (..._a: unknown[]) => new Response('BEGIN:VCALENDAR', { status: 200 }))

beforeEach(() => {
  calls.length = 0; fetchSpy.mockClear()
  vi.stubGlobal('fetch', fetchSpy)
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals() })

async function renderSettings() {
  await act(async () => { root.render(<MemoryRouter><Settings /></MemoryRouter>) })
  for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)) })
}

describe('P1-12 SHOW_CALENDAR_ICS = false', () => {
  it('flag off: the Settings render has no Add to my calendar button, help or error line', async () => {
    await renderSettings()
    expect(host.querySelector('[data-testid="your-data-export"]')).not.toBeNull() // control: the page rendered
    expect(host.querySelector('[data-testid="add-to-calendar"]')).toBeNull()
    expect(host.textContent).not.toContain(CAL.button)
    expect(host.textContent).not.toContain(CAL.help)
    expect(host.textContent).not.toContain(CAL.error)
  })

  it('flag off: rendering Settings makes no request to calendar-ics', async () => {
    await renderSettings()
    const urls = fetchSpy.mock.calls.map(c => String(c[0]))
    expect(urls.some(u => u.includes('calendar-ics'))).toBe(false)
    expect(calls.some(c => c.includes('calendar-ics'))).toBe(false)
  })

  it('flag off in source: compiled false, button block and handler both gated', () => {
    const src = readFileSync(join(__dirname, 'Settings.tsx'), 'utf8')
    expect(src).toMatch(/^const SHOW_CALENDAR_ICS = false$/m)
    expect(src).toContain('{SHOW_CALENDAR_ICS && (')
    expect(src).toContain('if (!SHOW_CALENDAR_ICS) return')
    const gate = src.indexOf('{SHOW_CALENDAR_ICS && (')
    expect(src.indexOf('data-testid="add-to-calendar"')).toBeGreaterThan(gate)
    expect(src.indexOf('data-testid="add-to-calendar"') - gate).toBeLessThan(600)
  })
})
