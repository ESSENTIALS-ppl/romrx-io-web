// @vitest-environment jsdom
// Hide combo (F21 / Stacy A6, C9): the combo UI does not render; Unlock/checkout
// sends only { mode: 'base', user_id, email } (plus lead_token on the lead path) with the session token.
// Mocked fetch asserts no pending_sport / sport / add in any request body.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const USER = { id: 'u1', email: 'user@example.com', user_metadata: { add_sport: 'bjj' } }
const SESSION = { access_token: 'user-access-token', user: USER }

function chain(data: unknown = null): unknown {
  const result = { data, error: null }
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

const fromCalls: string[] = []
vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (t: string) => {
      fromCalls.push(t)
      if (t === 'users') return chain({ base_status: 'none' })
      if (t === 'assessments') {
        return chain({
          id: 'a1',
          hip_er_l: 30, hip_er_r: 40,
          hip_ir_l: 20, hip_ir_r: 21,
          hip_abd_l: 10, hip_abd_r: 11,
          hip_flex_l: 90, hip_flex_r: 92,
          shoulder_er_l: 80, shoulder_er_r: 81,
          shoulder_flex_l: 150, shoulder_flex_r: 151,
          ankle_df_l: 8, ankle_df_r: 9,
          cervical_lat_l: 30, cervical_lat_r: 31,
          lumbar_flex: 40, lumbar_ext: 20,
        })
      }
      if (t === 'leads') return chain({ id: 'lead1', email: 'user@example.com', full_name: 'Test', prs_score: 1, tier: 'a' })
      return chain(null)
    },
    auth: {
      getSession: async () => ({ data: { session: SESSION } }),
      onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }),
    },
  },
}))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: USER, session: SESSION, loading: false, signOut: vi.fn() }),
}))
vi.mock('../lib/hipFlexCutover', () => ({ useHipFlexCutover: () => null, loadHipScoredIds: async () => new Set() }))
vi.mock('../lib/hipFlexGate', () => ({ gateAssessment: (a: unknown) => a }))
vi.mock('../lib/track', () => ({ track: vi.fn() }))
vi.mock('../components/ReminderOptIn', () => ({ ReminderOptIn: () => null }))
vi.mock('../components/ResultsSurvey', () => ({ ResultsSurvey: () => null }))
vi.mock('../lib/resultsSurvey', () => ({ SHOW_RESULTS_SURVEY: false }))
vi.mock('../lib/whatChanged', () => ({
  WHAT_CHANGED_COPY: false,
  WHAT_CHANGED_PATH: '/dashboard/what-changed',
  takeJustAssessed: () => false,
}))

import { ResultsPreview } from '../pages/ResultsPreview'
import { Unlock } from '../pages/Unlock'

const TEST_URL = 'https://test-project.supabase.co'
const TEST_ANON = 'test-anon-key'

type FetchCall = { url: string; body: Record<string, unknown> | null }
const fetchCalls: FetchCall[] = []
const fetchSpy = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  const url = String(input)
  let body: Record<string, unknown> | null = null
  if (init?.body) {
    body = JSON.parse(String(init.body)) as Record<string, unknown>
  }
  fetchCalls.push({ url, body })
  if (url.includes('activate-beta-base')) {
    return new Response(JSON.stringify({ error: 'free_unlock_disabled', checkout_required: true }), { status: 402 })
  }
  if (url.includes('create-checkout-session')) {
    const parsed = body ?? {}
    if (parsed.mode === 'unlock') {
      return new Response(JSON.stringify({ error: 'base_required' }), { status: 409 })
    }
    return new Response(JSON.stringify({ url: 'https://checkout.stripe.com/test' }), { status: 200 })
  }
  return new Response('{}', { status: 200 })
})

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  fromCalls.length = 0
  fetchCalls.length = 0
  fetchSpy.mockClear()
  vi.stubGlobal('fetch', fetchSpy)
  vi.stubEnv('VITE_SUPABASE_URL', TEST_URL)
  vi.stubEnv('VITE_SUPABASE_ANON_KEY', TEST_ANON)
  vi.stubEnv('VITE_PACKS_OPEN', 'on')
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
  // prevent jsdom navigation
  Object.defineProperty(window, 'location', { configurable: true, value: { href: 'http://localhost/', assign() {}, replace() {} } })
})
afterEach(() => {
  act(() => root.unmount())
  host.remove()
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

async function settle(n = 12) {
  for (let i = 0; i < n; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)) })
}

function forbiddenBodyKeys(body: Record<string, unknown> | null) {
  if (!body) return []
  return Object.keys(body).filter((k) => /pending_sport|^sport$|^add$|include_pending_sport/i.test(k))
}

describe('hide combo: ResultsPreview', () => {
  it('does not render the combo UI even when ?add=bjj, and checkout body is Base only', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/onboarding/results?add=bjj']}>
          <Routes>
            <Route path="/onboarding/results" element={<ResultsPreview />} />
          </Routes>
        </MemoryRouter>,
      )
    })
    await settle()
    const text = host.textContent ?? ''
    expect(text).toContain('Unlock My Dashboard')
    expect(text).not.toMatch(/Unlock Base \+/)
    expect(text).not.toContain('Unlock Base only')
    expect(text).not.toContain('Combo checkout')
    expect(text).not.toContain('carries your sport intent')

    const btn = Array.from(host.querySelectorAll('button')).find((b) => /Unlock My Dashboard/.test(b.textContent ?? ''))
    expect(btn).toBeTruthy()
    await act(async () => { btn!.dispatchEvent(new MouseEvent('click', { bubbles: true })) })
    await settle()

    expect(fetchCalls.length).toBeGreaterThan(0)
    for (const c of fetchCalls) {
      expect(forbiddenBodyKeys(c.body)).toEqual([])
    }
    const checkout = fetchCalls.filter((c) => c.url.includes('create-checkout-session'))
    expect(checkout, JSON.stringify(fetchCalls)).toHaveLength(1)
    expect(checkout[0].body).toEqual({ mode: 'base', user_id: 'u1', email: 'user@example.com' })
    const activate = fetchCalls.filter((c) => c.url.includes('activate-beta-base'))
    expect(activate).toHaveLength(1)
    expect(activate[0].body).toEqual({})
  })
})

describe('hide combo: Unlock / checkout', () => {
  it('lead path sends only mode, user_id, email and lead_token, even if the account has add_sport', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/unlock/lead-token-1']}>
          <Routes>
            <Route path="/unlock/:token" element={<Unlock />} />
          </Routes>
        </MemoryRouter>,
      )
    })
    await settle()
    const checkout = fetchCalls.filter((c) => c.url.includes('create-checkout-session'))
    expect(checkout, JSON.stringify(fetchCalls)).toHaveLength(1)
    expect(checkout[0].body).toEqual({
      mode: 'base',
      user_id: 'u1',
      email: 'user@example.com',
      lead_token: 'lead-token-1',
    })
    for (const c of fetchCalls) {
      expect(forbiddenBodyKeys(c.body)).toEqual([])
    }
  })

  it('sport-slug 409 fallback starts Base checkout with no pending_sport or add', async () => {
    await act(async () => {
      root.render(
        <MemoryRouter initialEntries={['/unlock/bjj']}>
          <Routes>
            <Route path="/unlock/:token" element={<Unlock />} />
          </Routes>
        </MemoryRouter>,
      )
    })
    await settle()
    const checkout = fetchCalls.filter((c) => c.url.includes('create-checkout-session'))
    expect(checkout, JSON.stringify(fetchCalls)).toHaveLength(2)
    expect(checkout[0].body).toMatchObject({ mode: 'unlock', token: 'bjj' })
    expect(forbiddenBodyKeys(checkout[0].body)).toEqual([])
    expect(checkout[1].body).toEqual({ mode: 'base', user_id: 'u1', email: 'user@example.com' })
    for (const c of fetchCalls) {
      expect(forbiddenBodyKeys(c.body)).toEqual([])
    }
  })
})

describe('hide combo: source', () => {
  it('ResultsPreview and Unlock checkout objects have no pending_sport or add fields', () => {
    const rp = readFileSync(resolve(__dirname, '../pages/ResultsPreview.tsx'), 'utf8')
    const un = readFileSync(resolve(__dirname, '../pages/Unlock.tsx'), 'utf8')
    const rpCode = rp.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
    const unCode = un.split('\n').filter((l) => !l.trim().startsWith('//')).join('\n')
    expect(rpCode).not.toMatch(/body\.pending_sport|body\.add\s*=|handleUnlock\(true\)/)
    expect(rpCode).not.toMatch(/Unlock Base \+|Combo checkout|Unlock Base only/)
    expect(unCode).not.toMatch(/pending_sport/)
    expect(unCode).not.toMatch(/\badd: token\b|\badd: pendingSport\b/)
  })
})
