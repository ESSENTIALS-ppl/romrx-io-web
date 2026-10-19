// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./track', () => ({ track: () => {}, trackPageView: () => {} }))
const inserted: unknown[] = []
vi.mock('./supabase', () => {
  const q: Record<string, unknown> = {}
  for (const k of ['select', 'eq', 'order', 'limit']) q[k] = () => q
  q.maybeSingle = async () => ({ data: null, error: null })
  return { supabase: { from: () => ({ ...q, insert: async (row: unknown) => { inserted.push(row); return { error: null } } }) } }
})

import { SurveyCardB } from '../components/SurveyCardB'
import { SURVEY_B_COPY as C } from './surveyB'
import { markPromptShown, setPromptVisible } from './promptSession'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let host: HTMLDivElement
let root: Root
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); localStorage.clear(); sessionStorage.clear(); inserted.length = 0 })
afterEach(() => { act(() => root.unmount()); host.remove(); vi.unstubAllEnvs() })

const props = (n = 2) => ({
  userId: 'u1', email: 'a@x.com', overallBand: 2 as const, bandMix: { needs_focus: 1, building: 1, steady: 1 }, top3: ['hip_ir'],
  assessments: Array.from({ length: n }, (_, i) => ({ id: `a${n - i}`, assessed_at: new Date(Date.now() - (i ? 40 : 1) * 24 * 36e5 / 24 * (i ? 24 : 1)).toISOString() })),
})
const flush = async () => { await act(async () => { await new Promise(r => setTimeout(r, 0)) }) }
const click = async (text: string) => {
  const b = [...host.querySelectorAll('button')].find(x => x.textContent === text)
  if (!b) throw new Error(`no button ${text}`)
  await act(async () => { b.click() })
}

describe('SurveyCardB', () => {
  it('flag off (default): renders nothing', async () => {
    vi.stubEnv('VITE_SURVEY_CARD_B', '')
    act(() => root.render(createElement(SurveyCardB, props())))
    await flush()
    expect(host.querySelector('[data-testid="survey-card-b"]')).toBeNull()
  })
  it('flag on, another prompt this session or banner on screen: nothing', async () => {
    vi.stubEnv('VITE_SURVEY_CARD_B', 'on')
    markPromptShown('terms_reaccept')
    act(() => root.render(createElement(SurveyCardB, props())))
    await flush()
    expect(host.querySelector('[data-testid="survey-card-b"]')).toBeNull()
    sessionStorage.clear(); setPromptVisible('consent_banner', true)
    act(() => root.render(createElement(SurveyCardB, { ...props(), userId: 'u2' })))
    await flush()
    expect(host.querySelector('[data-testid="survey-card-b"]')).toBeNull()
  })
  it('first assessment: Card 1, 3 taps send, then the after line', async () => {
    vi.stubEnv('VITE_SURVEY_CARD_B', 'on')
    act(() => root.render(createElement(SurveyCardB, props(1))))
    await flush()
    expect(host.textContent).toContain('Quick question')
    await click('Easy'); await click('Mostly'); await click('Maybe')
    await flush()
    expect(inserted).toHaveLength(1)
    expect((inserted[0] as { metadata: { moment: string; email: string | null } }).metadata).toMatchObject({ moment: 'first', email: null })
    expect(host.textContent).toContain(C.first.after)
  })
  it('cycle 2: Quinn card with health line under the text box', async () => {
    vi.stubEnv('VITE_SURVEY_CARD_B', 'on')
    act(() => root.render(createElement(SurveyCardB, props(2))))
    await flush()
    expect(host.textContent).toContain('Help shape ROMRx')
    expect(host.textContent).toContain('How easy was this check-in to film?')
    expect(host.textContent).toContain(C.cycles.noHealth)
    expect(host.querySelector('[data-testid="survey-b-chat-note"]')).toBeNull()
  })
  it('cycle 4: chat note shown; email only on Yes', async () => {
    vi.stubEnv('VITE_SURVEY_CARD_B', 'on')
    act(() => root.render(createElement(SurveyCardB, props(4))))
    await flush()
    expect(host.querySelector('[data-testid="survey-b-chat-note"]')?.textContent).toBe(C.cycles.byCycle[4].q2SmallPrint)
    await click('Weekly'); await click('Yes'); await click(C.cycles.send)
    await flush()
    expect((inserted[0] as { metadata: { email: string | null } }).metadata.email).toBe('a@x.com')
    expect(host.textContent).toContain(C.cycles.footer)
  })
  it('cycle 5+: Card 2 co-builder', async () => {
    vi.stubEnv('VITE_SURVEY_CARD_B', 'on')
    act(() => root.render(createElement(SurveyCardB, props(5))))
    await flush()
    expect(host.textContent).toContain('Help shape ROMRx')
    expect(host.textContent).toContain(C.reassess.body)
    expect(host.textContent).toContain(C.reassess.smallPrint)
    await click('Progress tracking'); await click(C.reassess.send)
    await flush()
    expect((inserted[0] as { metadata: { email: string | null } }).metadata.email).toBeNull()
    expect(host.textContent).toContain(C.reassess.after)
  })
})
