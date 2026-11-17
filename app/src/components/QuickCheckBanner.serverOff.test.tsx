// @vitest-environment jsdom
// QUICK_CHECK_ON is a compiled client constant (true in this build). The server side (submit-assessment quick path,
// user_mobility_schedule, the lifecycle QUICK_CHECK_ON env) may still be off. Then the client must stay quiet:
// no day 7 / day 14 banner, no error text, nothing thrown to the user.
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

type Res = { data: unknown; error: unknown }
const mode = vi.hoisted(() => ({ schedule: { data: null, error: null } as Res, quick: { data: [], error: null } as Res, reject: false }))
function builder(table: string) {
  const res = (): Promise<Res> => mode.reject ? Promise.reject(new Error('fetch failed'))
    : Promise.resolve(table === 'user_mobility_schedule' ? mode.schedule : table === 'assessments' ? mode.quick : { data: null, error: null })
  const b: Record<string, unknown> = {}
  for (const m of ['select', 'eq', 'gt', 'order']) b[m] = () => b
  b.maybeSingle = res
  b.limit = res
  return b
}
vi.mock('../lib/supabase', () => ({ supabase: { from: (t: string) => builder(t) } }))

import { QuickCheckBanner } from './QuickCheckBanner'
import { QUICK_CHECK_ON, QUICK_CHECK_COPY as Q, GENERIC_ERROR, quickCheckPageGate, quickSubmitOutcome } from '../lib/quickCheck'

let root: Root | null = null, host: HTMLDivElement | null = null
async function mount() {
  const h = document.createElement('div'); document.body.appendChild(h); host = h; const r = createRoot(h); root = r
  await act(async () => { r.render(createElement(MemoryRouter, null, createElement(QuickCheckBanner, { userId: 'u1' }))) })
  await act(async () => { await Promise.resolve(); await Promise.resolve() })
}
afterEach(() => { if (root) { const r = root; act(() => r.unmount()) } host?.remove(); root = null; host = null; mode.schedule = { data: null, error: null }; mode.quick = { data: [], error: null }; mode.reject = false })

function quiet() {
  const host = document.body.lastElementChild as HTMLDivElement
  expect(host.querySelector('[data-testid="quick-check-banner"]')).toBeNull()
  expect(host.textContent).not.toContain(Q.bannerTitle)
  expect(host.textContent).not.toContain(GENERIC_ERROR)
  expect(host.querySelector('[role="alert"]')).toBeNull()
}

describe('QUICK_CHECK_ON client true, server side off: quiet', () => {
  it('the client constant is true in this build', () => { expect(QUICK_CHECK_ON).toBe(true) })
  it('no day 7 / day 14 data (no schedule row): no banner, nothing shown', async () => {
    await mount(); quiet(); expect(host!.innerHTML).toBe('')
  })
  it('schedule table missing or read error (404 / PGRST205): no banner, no error', async () => {
    mode.schedule = { data: null, error: { code: 'PGRST205', message: 'Could not find the table', status: 404 } }
    await mount(); quiet(); expect(host!.innerHTML).toBe('')
  })
  it('quick-row read fails (check_kind column missing): no banner, no error', async () => {
    const d = new Date(Date.now() - 9 * 86400000).toISOString()
    mode.schedule = { data: { next_check_at: d, next_retest_at: new Date(Date.now() + 30 * 86400000).toISOString(), check_joints: ['hip_l'], last_assessed_at: d, last_assessment_id: 'a1' }, error: null }
    mode.quick = { data: null, error: { code: '42703', message: 'column check_kind does not exist' } }
    await mount(); quiet(); expect(host!.innerHTML).toBe('')
  })
  it('the request itself rejects (network / function down): nothing thrown, nothing shown', async () => {
    mode.reject = true
    await mount(); quiet(); expect(host!.innerHTML).toBe('')
  })
  it('page gate with no schedule goes to Today (no intro form)', () => {
    expect(quickCheckPageGate(null)).toBe('today')
  })
  it('submit-assessment server off (404 or disabled) goes to Today quietly, not an error line', () => {
    expect(quickSubmitOutcome(404, null)).toEqual({ kind: 'today' })
    expect(quickSubmitOutcome(404, { error: 'Not Found' })).toEqual({ kind: 'today' })
    expect(quickSubmitOutcome(403, { error: 'Quick check disabled' })).toEqual({ kind: 'today' })
    expect(quickSubmitOutcome(503, { ok: false, disabled: true })).toEqual({ kind: 'today' })
    expect(quickSubmitOutcome(400, { error: 'No quick re-check is scheduled' })).toEqual({ kind: 'today' })
  })
})
