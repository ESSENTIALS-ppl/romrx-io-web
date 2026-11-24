// @vitest-environment jsdom
// Avery/Grant 4:17 PM ET Nov 24: TERMS_VERSION is terms-2026-12-31-v1 with NO re-consent.
// A user whose consents row is 2026-10-19 is NOT gated; a user with terms-2026-12-31-v1 also passes; no row is gated.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const rows: { terms_version: string }[] = []
const inCalls: unknown[][] = []
const eqCalls: unknown[][] = []

vi.mock('../lib/supabase', () => {
  const q = () => {
    let allowed: string[] | null = null
    const api = {
      select: () => api,
      eq: (...a: unknown[]) => { eqCalls.push(a); if (a[0] === 'terms_version') allowed = [String(a[1])]; return api },
      in: (...a: unknown[]) => { inCalls.push(a); if (a[0] === 'terms_version') allowed = (a[1] as string[]).slice(); return api },
      limit: () => api,
      then: (res: (v: unknown) => unknown) => Promise.resolve({ data: rows.filter(r => allowed === null || allowed.includes(r.terms_version)), error: null }).then(res),
    }
    return api
  }
  return { supabase: { from: () => q(), rpc: vi.fn(async () => ({ error: null })) } }
})
const AUTH = vi.hoisted(() => ({ user: { id: 'u1' }, loading: false, signOut: () => {} }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => AUTH }))

import { TermsReacceptGate } from './TermsReacceptGate'
import { TERMS_VERSION } from '../lib/termsConsent'

let host: HTMLDivElement
let root: Root
beforeEach(() => {
  rows.length = 0; inCalls.length = 0; eqCalls.length = 0
  vi.stubEnv('VITE_TERMS_REACCEPT_GATE', 'on')
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllEnvs() })

async function render() {
  await act(async () => { root.render(<MemoryRouter initialEntries={['/app/dashboard']}><TermsReacceptGate /></MemoryRouter>) })
  for (let i = 0; i < 8; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)) })
  return !!host.querySelector('[role="dialog"]')
}

describe('re-accept gate after the terms-2026-12-31-v1 bump (no re-consent)', () => {
  it('app TERMS_VERSION is terms-2026-12-31-v1', () => { expect(TERMS_VERSION).toBe('terms-2026-12-31-v1') })
  it('a user with a 2026-10-19 consent is NOT gated', async () => {
    rows.push({ terms_version: '2026-10-19' })
    expect(await render()).toBe(false)
    expect(inCalls).toContainEqual(['terms_version', ['2026-10-19', 'terms-2026-12-31-v1']])
    expect(eqCalls.some(a => a[0] === 'terms_version')).toBe(false)
  })
  it('a user with a terms-2026-12-31-v1 consent is NOT gated', async () => {
    rows.push({ terms_version: 'terms-2026-12-31-v1' })
    expect(await render()).toBe(false)
  })
  it('a user with no accepted version (only an older one) IS gated', async () => {
    rows.push({ terms_version: '2026-10-03' })
    expect(await render()).toBe(true)
  })
})
