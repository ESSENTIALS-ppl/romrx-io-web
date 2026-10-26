// @vitest-environment jsdom
/**
 * Outro video (Grant Oct 21 2026). Signed-in: the outro replaces the 2 s 'done' spinner. Signed-out lead:
 * the outro sits on 'Check your email'. Both appear only AFTER the submit edge (which sends the email
 * before it replies) has returned ok; a failed submit never shows them. Same StepVideo, no autoplay,
 * hidden on error, Continue always visible.
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ session: null as null | { access_token: string; user: { id: string } } }))
const navigate = vi.hoisted(() => vi.fn())
const captured = vi.hoisted(() => ({ props: null as null | Record<string, any> }))

vi.mock('./track', () => ({ track: () => {}, trackPageView: () => {} }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ session: auth.session, loading: false }) }))
vi.mock('../hooks/useProfile', () => ({ useProfile: () => ({ profile: null }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => navigate }))

import { AssessmentPhases } from '../pages/AssessmentPhases'
import { STEPS } from '../pages/assessmentSteps'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let host: HTMLDivElement
let root: Root
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); window.scrollTo = () => {} })
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.doUnmock('../pages/AssessmentPhases'); captured.props = null; auth.session = null })

const noop = () => {}
const base = { stepIdx: 0, values: {}, email: 'a@b.co', fullName: '', loading: false, error: '', setPhase: noop, setStepIdx: noop, setEmail: noop, setFullName: noop, handleChange: noop, handleNext: noop, handleLeadSubmit: noop }
const renderPhase = (phase: string, extra: Record<string, unknown> = {}) => act(() => { root.render(createElement(AssessmentPhases, { ...base, phase, ...extra } as never)) })

describe('outro screens render', () => {
  it('signed-in outro: outro video slot (no autoplay) plus Continue, no done spinner', () => {
    const onOutroContinue = vi.fn()
    renderPhase('outro', { onOutroContinue })
    expect(host.querySelector('[data-step-video="outro"]')).not.toBeNull()
    expect(host.querySelector('.animate-spin')).toBeNull()
    act(() => { host.querySelector('[data-step-video-probe]')!.dispatchEvent(new Event('load')) })
    const v = host.querySelector('video')!
    expect(v.getAttribute('src')).toBe('/videos/outro.mp4')
    expect(v.hasAttribute('autoplay')).toBe(false)
    const c = host.querySelector<HTMLButtonElement>('[data-outro-continue]')!
    act(() => { c.click() })
    expect(onOutroContinue).toHaveBeenCalledTimes(1)
  })
  it('signed-in outro: video error hides the slot, Continue stays', () => {
    renderPhase('outro', { onOutroContinue: noop })
    act(() => { host.querySelector('[data-step-video-probe]')!.dispatchEvent(new Event('error')) })
    expect(host.querySelector('[data-step-video]')).toBeNull()
    expect(host.querySelector('[data-outro-continue]')).not.toBeNull()
  })
  it('lead: outro sits on Check your email; error hides it, Continue stays', () => {
    renderPhase('lead-done')
    expect(host.textContent).toContain('Check your email!')
    expect(host.textContent).toContain('a@b.co')
    expect(host.querySelector('[data-step-video="outro"]')).not.toBeNull()
    expect(host.querySelector('[data-outro-continue]')).not.toBeNull()
    act(() => { host.querySelector('[data-step-video-probe]')!.dispatchEvent(new Event('error')) })
    expect(host.querySelector('[data-step-video]')).toBeNull()
    expect(host.querySelector('[data-outro-continue]')).not.toBeNull()
  })
})

describe('outro shows only after the email-sending submit returned ok', () => {
  async function mountAssessment() {
    vi.resetModules()
    vi.doMock('../pages/AssessmentPhases', () => ({ AssessmentPhases: (p: Record<string, any>) => { captured.props = p; return null } }))
    const { Assessment } = await import('../pages/Assessment')
    act(() => { root.render(createElement(Assessment)) })
  }
  function deferredFetch() {
    let resolve!: (r: unknown) => void
    const fetch = vi.fn(() => new Promise(r => { resolve = r }))
    vi.stubGlobal('fetch', fetch)
    return { fetch, resolve: (body: unknown, ok = true) => resolve({ ok, status: ok ? 200 : 500, json: async () => body }) }
  }
  const toLastStep = () => { for (let i = 0; i < STEPS.length - 1; i++) act(() => { captured.props!.handleNext() }) }

  it('signed-in: no outro while submit-assessment is pending; outro after ok', async () => {
    auth.session = { access_token: 't', user: { id: 'u' } }
    const f = deferredFetch()
    await mountAssessment()
    toLastStep()
    act(() => { captured.props!.handleNext() })
    expect(f.fetch).toHaveBeenCalledTimes(1)
    expect(String((f.fetch.mock.calls[0] as unknown[])[0])).toContain('/functions/v1/submit-assessment')
    expect(captured.props!.phase).not.toBe('outro')
    await act(async () => { f.resolve({ ok: true }) })
    expect(captured.props!.phase).toBe('outro')
    act(() => { captured.props!.onOutroContinue() })
    expect(navigate).toHaveBeenCalledWith('/onboarding/results', { replace: true })
  })
  it('signed-in: failed submit never shows the outro', async () => {
    auth.session = { access_token: 't', user: { id: 'u' } }
    const f = deferredFetch()
    await mountAssessment()
    toLastStep()
    act(() => { captured.props!.handleNext() })
    await act(async () => { f.resolve({ ok: false, error: 'x' }, false) })
    expect(captured.props!.phase).not.toBe('outro')
    expect(captured.props!.error).toBe('x')
  })
  it('lead: Check your email (with outro) only after submit-lead-assessment returned ok', async () => {
    const f = deferredFetch()
    await mountAssessment()
    toLastStep()
    act(() => { captured.props!.handleNext() })
    expect(captured.props!.phase).toBe('lead')
    act(() => { captured.props!.setEmail('lead@x.co') })
    act(() => { captured.props!.handleLeadSubmit({ preventDefault: () => {} }) })
    expect(String((f.fetch.mock.calls[0] as unknown[])[0])).toContain('/functions/v1/submit-lead-assessment')
    expect(captured.props!.phase).toBe('lead')
    await act(async () => { f.resolve({ ok: true, sent: true }) })
    expect(captured.props!.phase).toBe('lead-done')
  })
  it('lead: failed submit stays on the email form', async () => {
    const f = deferredFetch()
    await mountAssessment()
    toLastStep()
    act(() => { captured.props!.handleNext() })
    act(() => { captured.props!.setEmail('lead@x.co') })
    act(() => { captured.props!.handleLeadSubmit({ preventDefault: () => {} }) })
    await act(async () => { f.resolve({ ok: false, error: 'nope' }) })
    expect(captured.props!.phase).toBe('lead')
    expect(captured.props!.error).toBe('nope')
  })
})
