// @vitest-environment jsdom
// FG-23: SHOW_UNITS = false (compiled constant in Settings.tsx, same style as FG-04).
// There is no metric/imperial control in Base Settings today (values are in degrees).
// This test proves none renders, and the source guard FAILS if SHOW_UNITS is true.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

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
    from: () => chain(),
    rpc: () => chain(),
    functions: { invoke: async () => ({ data: null, error: null }) },
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

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

async function settle() { for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)) }) }
async function renderSettings() {
  await act(async () => { root.render(<MemoryRouter><Settings /></MemoryRouter>) })
  await settle()
}

describe('FG-23 SHOW_UNITS = false', () => {
  it('flag off: no Units, Metric or Imperial control renders; other Settings fields still render', async () => {
    await renderSettings()
    expect(host.querySelector('[data-testid="your-data-export"]')).not.toBeNull() // control: the page rendered
    expect(host.textContent).toContain('Full name')
    expect(host.textContent).toContain('Age group')
    expect(host.textContent).toContain('Save profile')
    expect(host.textContent).toContain('Email')
    expect(host.textContent).toContain('Subscription')
    expect(host.textContent).not.toMatch(/\bUnits\b/)
    expect(host.textContent).not.toMatch(/\bMetric\b/)
    expect(host.textContent).not.toMatch(/\bImperial\b/)
  })

  it('production-build guard: FAILS if SHOW_UNITS is true in source; no un-gated units control was added', () => {
    const src = readFileSync(join(__dirname, 'Settings.tsx'), 'utf8')
    expect(src).not.toMatch(/^const SHOW_UNITS = true/m)
    expect(src).toMatch(/^const SHOW_UNITS = false$/m)
    expect(src).toContain('{SHOW_UNITS && null}')
    // Do not invent a units form. There must be no customer-facing Units/Metric/Imperial control in this file.
    expect(src).not.toMatch(/>Units</)
    expect(src).not.toMatch(/>Metric</)
    expect(src).not.toMatch(/>Imperial</)
  })
})
