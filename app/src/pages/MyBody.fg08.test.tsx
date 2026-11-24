// @vitest-environment jsdom
// FG-08: the real My Body page with its data hooks mocked. With 3 assessments handed back in created_at order (and the
// wrong "latest"), the page orders by assessed_at: header date, comparison and trends use Nov 17 as now and Oct 4 as the
// start. With one assessment, no comparison and no trend render (the existing "one assessment on file" card shows).
import { describe, it, expect, vi, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

vi.mock('../lib/supabase', () => ({ supabase: {} }))
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: { id: 'u1' } }) }))
const profile = vi.hoisted(() => ({ value: null as unknown }))
vi.mock('../hooks/useProfile', () => ({ useProfile: () => profile.value }))
const firstRow = vi.hoisted(() => ({ value: null as unknown }))
vi.mock('../lib/jointHistory', async (orig) => ({
  ...(await orig<typeof import('../lib/jointHistory')>()),
  useJointHistory: () => ({ history: null, startNow: null }),
  useFirstAssessment: () => ({ first: firstRow.value, hipScoredIds: new Set() }),
}))
vi.mock('../components/MoodAverageCard', async (orig) => ({
  ...(await orig<typeof import('../components/MoodAverageCard')>()),
  MoodAverageCard: () => null, MoodScoreDivider: () => null,
}))
vi.mock('../components/ProgressCalendar', () => ({ ProgressCalendar: () => null }))

import { MyBody } from './MyBody'
import { setHipFlexScoredAtMs } from '../lib/hipFlexCutoverState'
import { jointDisplayRowsForAssessment, mobilityRawScoreForAssessment, mobilityScoreForAssessment } from '../lib/mobilityBands'
import * as jh from '../lib/jointHistory'

function mk(id: string, assessed_at: string, created_at: string, f: number) {
  const v = (t: number) => Math.round(t * f * 10) / 10
  return {
    id, user_id: 'u1', assessed_at, created_at,
    hip_er_l: v(23), hip_er_r: v(23), hip_ir_l: v(24), hip_ir_r: v(24), hip_abd_l: v(40), hip_abd_r: v(40),
    hip_flex_l: v(120), hip_flex_r: v(120), shoulder_er_l: v(85), shoulder_er_r: v(85),
    shoulder_flex_l: v(141), shoulder_flex_r: v(141), ankle_df_l: v(6.1), ankle_df_r: v(6.1),
    lumbar_flex: null, lumbar_ext: null, cervical_rot_l: null, cervical_rot_r: null,
    cervical_lat_l: v(37), cervical_lat_r: v(37), cervical_flex: v(39), cervical_ext: v(48),
    thoracic_rot: null, thoracic_rot_l: null, thoracic_rot_r: null,
    rom_total: null, rom_percentile: null, worst_joints: null, red_flag_triggered: false, red_flag_reasons: null,
  }
}
const oct4 = mk('oct4', '2026-10-04T15:00:00Z', '2026-11-24T21:12:25.000Z', 0.5)
const nov10 = mk('nov10', '2026-11-10T15:00:00Z', '2026-11-24T21:12:24.540Z', 0.7)
const nov17 = mk('nov17', '2026-11-17T15:00:00Z', '2026-11-24T21:12:24.540Z', 0.95)

let root: Root | null = null; let host: HTMLDivElement
afterEach(() => { act(() => root?.unmount()); root = null; host?.remove(); setHipFlexScoredAtMs(null) })
async function mount() {
  setHipFlexScoredAtMs(Date.parse('2026-10-01T00:00:00Z'))
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  await act(async () => { root!.render(<MemoryRouter><MyBody /></MemoryRouter>) })
}

describe('FG-08 My Body page', () => {
  it('orders by assessed_at: Where you started = Oct 4, Where you are now = Nov 17, chip vs Nov 10', async () => {
    // The page gets the latest from useProfile (pickFullAssessments already fixed it) but the history in created_at order.
    profile.value = { assessment: nov17, assessments: [oct4, nov10, nov17], jointScores: [], sessionDates: [], loading: false }
    firstRow.value = oct4
    await mount()
    const t = host.querySelector('[data-started-vs-now]')!
    expect(t).not.toBeNull()
    expect(t.querySelector('[data-started-date]')!.textContent).toBe('Oct 4, 2026')
    expect(t.querySelector('[data-now-date]')!.textContent).toBe('Nov 17, 2026')
    const total = [...t.querySelector('[data-compare-total]')!.children].map(c => c.textContent)
    const d = mobilityRawScoreForAssessment(nov17) - mobilityRawScoreForAssessment(oct4)
    expect(total).toEqual(['Body score', `${d > 0 ? '+' : ''}${d}`]) // change only, no absolute score
    expect(t.textContent).not.toMatch(/\/100/)
    // Joint rows unchanged: real start and now values.
    const hipRow = [...t.querySelector('[data-compare-joint="hip_er"]')!.children].map(c => c.textContent)
    expect(hipRow).toEqual(['Hip ER', '50%', `${jointDisplayRowsForAssessment(nov17).find(r => r.key === 'hip_er')!.pct}%`])
    expect(t.querySelectorAll('[data-compare-joint]')).toHaveLength(10)
    expect(host.textContent).toContain('vs Nov 10')
    const hip = host.querySelector('[data-trend="Hip ER"]')!
    expect([...hip.querySelectorAll('li')].map(li => li.getAttribute('data-point-date'))).toEqual([oct4.assessed_at, nov10.assessed_at, nov17.assessed_at])
    expect(hip.querySelector('li')!.textContent).toBe('Oct 4, 2026 50%')
    expect(host.textContent).not.toContain('one assessment on file')
  })
  it('first assessment not yet loaded: falls back to the oldest loaded one', async () => {
    profile.value = { assessment: nov17, assessments: [nov10, nov17], jointScores: [], sessionDates: [], loading: false }
    firstRow.value = null
    await mount()
    expect(host.querySelector('[data-started-date]')!.textContent).toBe('Nov 10, 2026')
  })
  it('single assessment: no comparison, no trend; the existing one-assessment card shows', async () => {
    profile.value = { assessment: nov17, assessments: [nov17], jointScores: [], sessionDates: [], loading: false }
    firstRow.value = nov17
    await mount()
    expect(host.querySelector('[data-started-vs-now]')).toBeNull()
    expect(host.querySelector('[data-joint-trends]')).toBeNull()
    expect(host.textContent).not.toContain('Where you started')
    expect(host.textContent).toContain('You have one assessment on file.')
  })

  // Score-fix (Avery 4:30 PM ET) on rows mirroring test account ebfe4f3d (SCORE-DIAG receipt): Nov 17 unclamped 93 with
  // 2 Needs focus joints (hip flexion, shoulder ER 70 of 85), Nov 10 unclamped 89, also Needs focus.
  function ebfe(id: string, at: string, ankle: number) {
    return { ...mk(id, at, '2026-11-24T21:12:24.540Z', 1), hip_flex_l: 60, hip_flex_r: 60, shoulder_er_l: 70, shoulder_er_r: 70, ankle_df_l: ankle, ankle_df_r: ankle }
  }
  const e10 = ebfe('b0d68db1', '2026-11-10T15:00:00Z', 3.8)
  const e17 = ebfe('a9b06108', '2026-11-17T15:00:00Z', 6.1)
  const e04 = mk('oct4e', '2026-10-04T15:00:00Z', '2026-11-24T21:12:25.000Z', 0.8)
  it('ebfe4f3d mirror: dial stays 89, chip shows +4 vs Nov 10', async () => {
    expect(mobilityRawScoreForAssessment(e17)).toBe(93)
    expect(mobilityRawScoreForAssessment(e10)).toBe(89)
    expect(mobilityScoreForAssessment(e17, null)).toBe(89)
    profile.value = { assessment: e17, assessments: [e04, e10, e17], jointScores: [], sessionDates: [], loading: false }
    firstRow.value = e04
    await mount()
    expect(host.querySelector('[data-testid="body-score-band"]')!.textContent).toMatch(/^89\/100/)
    expect(host.textContent).toContain('+4 vs Nov 10')
  })
  it('chip delta and the Where you started / now total delta come from the same function (bodyScoreChange)', async () => {
    const spy = vi.spyOn(jh, 'bodyScoreChange')
    profile.value = { assessment: e17, assessments: [e04, e10, e17], jointScores: [], sessionDates: [], loading: false }
    firstRow.value = e04
    await mount()
    const pairs = spy.mock.calls.map(([a, b]) => `${(a as { id: string }).id}>${(b as { id: string }).id}`)
    expect(pairs).toContain('b0d68db1>a9b06108') // chip: previous vs latest
    // FG-08 total: buildStartedVsNow calls bodyScoreChange inside the same module (an ESM spy cannot see that call), so
    // check the source and the values instead. MyBody has no other score-change math.
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const lib = readFileSync(join(process.cwd(), 'src', 'lib', 'jointHistory.ts'), 'utf8')
    const page = readFileSync(join(process.cwd(), 'src', 'pages', 'MyBody.tsx'), 'utf8')
    const body = lib.slice(lib.indexOf('export function buildStartedVsNow'), lib.indexOf('export function useFirstAssessment'))
    expect(body).toContain('const total = bodyScoreChange(first, latest)')
    expect(body).not.toMatch(/mobility(Raw)?ScoreForAssessment/)
    expect(page).toContain('bodyScoreChange(previousAssessment, assessment).delta')
    expect(page).not.toContain('mobilityRawScoreForAssessment')
    // Same function: the chip shows bodyScoreChange(Nov 10, latest).delta and the table shows bodyScoreChange(first, latest).delta.
    const chip = jh.bodyScoreChange(e10, e17), total = jh.bodyScoreChange(e04, e17)
    expect(host.textContent).toContain(`+${chip.delta} vs Nov 10`)
    expect(host.querySelector('[data-compare-total-change]')!.textContent).toBe(`${total.delta > 0 ? '+' : ''}${total.delta}`)
    expect(total.now).toBe(chip.now) // both measured from the same latest score
    // The dial is the only Body score number on the page.
    expect(host.querySelector('[data-started-vs-now]')!.textContent).not.toMatch(/\/100/)
    expect((host.textContent!.match(/\d+\/100/g) ?? [])).toEqual(['89/100'])
    spy.mockRestore()
  })
})
