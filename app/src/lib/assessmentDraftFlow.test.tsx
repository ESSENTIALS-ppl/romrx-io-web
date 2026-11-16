// @vitest-environment jsdom
/**
 * Assessment page with progress saving: the final-step order (Vera D3), Resume, Start over and signed-out behavior.
 * The store is a fake; the draft rules themselves are in assessmentDraft.test.ts.
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({ session: null as null | { access_token: string; user: { id: string } } }))
const captured = vi.hoisted(() => ({ props: null as null | Record<string, any> }))
const log = vi.hoisted(() => ({ events: [] as string[], loaded: null as unknown, saveGate: null as null | Promise<void> }))

vi.mock('./track', () => ({ track: () => {}, trackPageView: () => {} }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ session: auth.session, loading: false }) }))
vi.mock('../hooks/useProfile', () => ({ useProfile: () => ({ profile: null }) }))
vi.mock('react-router-dom', () => ({ useNavigate: () => vi.fn() }))
vi.mock('./assessmentDraftStore', () => ({
  supabaseDraftStore: {
    save: async () => { log.events.push('save-start'); if (log.saveGate) await log.saveGate; log.events.push('save-done'); return true },
    load: async () => { log.events.push('load'); return log.loaded },
    remove: async () => { log.events.push('remove'); return true },
    newestAssessmentAt: async () => null,
  },
}))

import { STEPS } from '../pages/assessmentSteps'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let host: HTMLDivElement
let root: Root
const UID = 'a1111111-1111-4111-8111-111111111111'
beforeEach(() => {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); window.scrollTo = () => {}
  log.events = []; log.loaded = null; log.saveGate = null; localStorage.clear()
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllGlobals(); vi.doUnmock('../pages/AssessmentPhases'); captured.props = null; auth.session = null })

async function mount() {
  vi.resetModules()
  vi.doMock('../pages/AssessmentPhases', () => ({ AssessmentPhases: (p: Record<string, any>) => { captured.props = p; return null } }))
  const { Assessment } = await import('../pages/Assessment')
  act(() => { root.render(createElement(Assessment)) })
  await act(async () => {})
}
const row = (completed: string[], stepIdx: number) => {
  const now = new Date().toISOString()
  return { step_values: { hip_er_l: 40, hip_er_r: 41 }, completed_steps: completed, step_idx: stepIdx, client_saved_at: now, created_at: now, updated_at: now, expires_at: new Date(Date.now() + 40 * 3600e3).toISOString() }
}

describe('final step order (Vera D3)', () => {
  it('the submit POST waits for the last progress save, and the row is deleted only after a good submit', async () => {
    auth.session = { access_token: 't', user: { id: UID } }
    let release!: () => void
    const fetchMock = vi.fn(async () => { log.events.push('submit'); return { ok: true, status: 200, json: async () => ({ ok: true }) } })
    vi.stubGlobal('fetch', fetchMock)
    await mount()
    for (let i = 0; i < STEPS.length - 1; i++) await act(async () => { await captured.props!.handleNext() })
    log.events.length = 0
    log.saveGate = new Promise<void>(r => { release = r })
    let finalNext!: Promise<void>
    await act(async () => { finalNext = captured.props!.handleNext(); await Promise.resolve() })
    expect(log.events).toContain('save-start')
    expect(fetchMock).not.toHaveBeenCalled()            // held back while the last save is in flight
    await act(async () => { release(); await finalNext })
    const i = (e: string) => log.events.indexOf(e)
    expect(i('save-done')).toBeGreaterThan(-1)
    expect(i('submit')).toBeGreaterThan(i('save-done'))
    expect(i('remove')).toBeGreaterThan(i('submit'))
  })
  it('a failed submit keeps the draft: no delete, and saving still works', async () => {
    auth.session = { access_token: 't', user: { id: UID } }
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false, status: 500, json: async () => ({ ok: false, error: 'x' }) })))
    await mount()
    for (let i = 0; i < STEPS.length; i++) await act(async () => { await captured.props!.handleNext() })
    expect(captured.props!.error).toBe('x')
    expect(log.events).not.toContain('remove')
    log.events.length = 0
    await act(async () => { captured.props!.handleChange('hip_er_l', '33'); await captured.props!.handleNext() })
    expect(log.events).toContain('save-start')
  })
  it('Skip on the last step submits the skipped step as empty (the old stale value bug)', async () => {
    auth.session = { access_token: 't', user: { id: UID } }
    const bodies: string[] = []
    vi.stubGlobal('fetch', vi.fn(async (_u: string, init: { body: string }) => { bodies.push(init.body); return { ok: true, status: 200, json: async () => ({ ok: true }) } }))
    await mount()
    const last = STEPS[STEPS.length - 1]
    for (let i = 0; i < STEPS.length - 1; i++) await act(async () => { await captured.props!.handleNext() })
    await act(async () => { captured.props!.handleChange(last.fields[0].key, '55') })
    await act(async () => { await captured.props!.handleNext({ skipped: true }) })
    expect(JSON.parse(bodies[0])[last.fields[0].key]).toBeNull()
  })
})

describe('Resume and Start over', () => {
  it('a live draft with finished steps opens Resume, then Resume goes to the next step with the saved values', async () => {
    auth.session = { access_token: 't', user: { id: UID } }
    log.loaded = row(['hip_er', 'hip_ir', 'shoulder_er'], 3)
    await mount()
    expect(captured.props!.phase).toBe('resume')
    expect(captured.props!.resume).toMatchObject({ done: 3, total: STEPS.length })
    await act(async () => { captured.props!.resume.onResume() })
    expect(captured.props!.phase).toBe('measure')
    expect(captured.props!.stepIdx).toBe(3)
    expect(captured.props!.values.hip_er_l).toBe('40')
  })
  it('a draft with no finished step does not open Resume', async () => {
    auth.session = { access_token: 't', user: { id: UID } }
    log.loaded = row([], 0)
    await mount()
    expect(captured.props!.phase).toBe('setup')
  })
  it('Start over asks twice, then deletes the draft and returns to the start', async () => {
    auth.session = { access_token: 't', user: { id: UID } }
    log.loaded = row(['hip_er'], 1)
    await mount()
    await act(async () => { captured.props!.resume.onStartOver() })
    expect(log.events).not.toContain('remove')
    await act(async () => { captured.props!.resume.onStartOver() })
    expect(log.events).toContain('remove')
    expect(captured.props!.phase).toBe('setup')
    expect(captured.props!.values).toEqual({})
  })
})

describe('signed out', () => {
  it('no server call, no device copy, no Resume', async () => {
    vi.stubGlobal('fetch', vi.fn())
    await mount()
    expect(log.events).toEqual([])
    for (let i = 0; i < 3; i++) await act(async () => { await captured.props!.handleNext() })
    expect(log.events).toEqual([])
    expect(localStorage.length).toBe(0)
    expect(captured.props!.phase).not.toBe('resume')
  })
})
