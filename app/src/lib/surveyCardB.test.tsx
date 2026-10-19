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
  it('reassess: 3 taps + optional sentence, health line under the box, no email unless ticked, no thank-you', async () => {
    vi.stubEnv('VITE_SURVEY_CARD_B', 'on')
    act(() => root.render(createElement(SurveyCardB, props(2))))
    await flush()
    expect(host.textContent).toContain(C.intro.reassess)
    await click(C.start)
    expect(host.textContent).toContain(C.questions.reassess[0].prompt)
    await click('Some joints, not others')
    await click('Shorter daily protocol')
    await click('Something else')
    expect(host.textContent).toContain(C.noHealthDetails)
    await click(C.next)
    expect(host.textContent).toContain('Optional: One sentence the team should hear.')
    expect(host.textContent).toContain(C.noHealthDetails)
    const box = host.querySelector('[data-testid="survey-b-recruit"]') as HTMLInputElement
    expect(box.checked).toBe(false)
    await click(C.send)
    await flush()
    expect(inserted).toHaveLength(1)
    const row = inserted[0] as { metadata: { email: string | null; moment: string }; category: string }
    expect(row.category).toBe('survey')
    expect(row.metadata.moment).toBe('reassess')
    expect(row.metadata.email).toBeNull()
    expect(host.textContent).toContain(C.sent)
    expect(host.textContent?.toLowerCase()).not.toMatch(/thank/)
  })
  it('first assessment: first-assess set', async () => {
    vi.stubEnv('VITE_SURVEY_CARD_B', 'on')
    act(() => root.render(createElement(SurveyCardB, props(1))))
    await flush()
    expect(host.textContent).toContain(C.intro.first)
    await click(C.start)
    expect(host.textContent).toContain('Was the assessment worth the time?')
  })
})
