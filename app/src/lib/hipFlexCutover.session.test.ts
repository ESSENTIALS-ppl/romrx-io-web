import { beforeEach, describe, expect, it, vi } from 'vitest'

// A signed-out visitor must not call scoring_cutovers (RLS allows signed-in users only, so it was a 401 in the console).
const h = vi.hoisted(() => ({
  session: null as null | { user: { id: string } },
  from: vi.fn(),
  getSession: vi.fn(),
}))
vi.mock('./supabase', () => ({
  supabase: {
    auth: { getSession: h.getSession, onAuthStateChange: vi.fn(() => ({ data: { subscription: { unsubscribe: vi.fn() } } })) },
    from: h.from,
  },
}))

import { loadHipFlexScoredAt } from './hipFlexCutover'
import { hipFlexScoredAtMs, hipFlexScoredFor, setHipFlexScoredAtMs } from './hipFlexCutoverState'

function rowReturns(effective_at: string | null, error: unknown = null) {
  h.from.mockReturnValue({ select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: effective_at ? { effective_at } : null, error }) }) }) })
}

beforeEach(() => {
  setHipFlexScoredAtMs(null)
  h.from.mockReset()
  h.session = null
  h.getSession.mockReset()
  h.getSession.mockImplementation(async () => ({ data: { session: h.session } }))
})

describe('loadHipFlexScoredAt session check', () => {
  it('signed out: makes no scoring_cutovers request and stays pre-cutover (hip not scored for anything)', async () => {
    rowReturns('2026-11-03T02:33:59.927Z')
    await loadHipFlexScoredAt()
    expect(h.from).not.toHaveBeenCalled()
    expect(hipFlexScoredAtMs()).toBeNull()
    expect(hipFlexScoredFor({ created_at: '2030-01-01T00:00:00Z' })).toBe(false)
  })

  it('signed in: reads the cutover once and sets it', async () => {
    h.session = { user: { id: 'u1' } }
    rowReturns('2026-11-03T02:33:59.927Z')
    await loadHipFlexScoredAt()
    expect(h.from).toHaveBeenCalledWith('scoring_cutovers')
    expect(hipFlexScoredAtMs()).toBe(Date.parse('2026-11-03T02:33:59.927Z'))
  })

  it('a skipped signed-out read is not remembered: after sign-in the next call reads it', async () => {
    rowReturns('2026-11-03T02:33:59.927Z')
    await loadHipFlexScoredAt()
    expect(h.from).not.toHaveBeenCalled()
    h.session = { user: { id: 'u1' } }
    await loadHipFlexScoredAt()
    expect(h.from).toHaveBeenCalledTimes(1)
    expect(hipFlexScoredAtMs()).not.toBeNull()
  })

  it('signed in but the read fails or the row is missing: stays pre-cutover (fail safe kept)', async () => {
    h.session = { user: { id: 'u1' } }
    rowReturns(null, { message: 'denied' })
    await loadHipFlexScoredAt()
    expect(hipFlexScoredAtMs()).toBeNull()
    rowReturns(null)
    await loadHipFlexScoredAt()
    expect(hipFlexScoredAtMs()).toBeNull()
  })

  it('getSession throwing is swallowed: stays pre-cutover and no request', async () => {
    h.getSession.mockRejectedValue(new Error('boom'))
    await loadHipFlexScoredAt()
    expect(h.from).not.toHaveBeenCalled()
    expect(hipFlexScoredAtMs()).toBeNull()
  })
})
