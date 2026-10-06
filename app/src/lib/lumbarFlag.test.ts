/**
 * Base low-back removal flag (VITE_BASE_LUMBAR_REMOVED). OFF by default (production); ON only in the
 * base-meter draft build. ON: no lumbar step, nothing saved for it (never 0), the /100 and bands are over
 * the measured joints only, My Body shows "Low back: not measured" and drops unmeasured lumbar radar axes.
 * Stored lumbar values are kept and scored as before.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'

const SRC = resolve(__dirname, '..')
afterEach(() => { vi.unstubAllEnvs(); vi.resetModules() })

const OTHER = {
  hip_er_l: 40, hip_er_r: 38, hip_ir_l: 35, hip_ir_r: 30, shoulder_er_l: 90, shoulder_er_r: 85,
  shoulder_flex_l: 170, shoulder_flex_r: 165, cervical_lat_l: 40, cervical_lat_r: 42,
  cervical_flex: 50, cervical_ext: 60, hip_abd_l: 40, hip_abd_r: 38, ankle_df_l: 10, ankle_df_r: 11,
}

describe('flag value', () => {
  it('OFF when the env var is unset (production default): lumbar step still offered', async () => {
    vi.stubEnv('VITE_BASE_LUMBAR_REMOVED', '')
    const { baseLumbarRemoved } = await import('./lumbarFlag')
    const { STEPS } = await import('../pages/assessmentSteps')
    expect(baseLumbarRemoved()).toBe(false)
    expect(STEPS.some(s => s.id === 'lumbar')).toBe(true)
  })
  it('ON only for exactly "1": lumbar step gone, step count drops by one, no lumbar field anywhere', async () => {
    vi.stubEnv('VITE_BASE_LUMBAR_REMOVED', '1')
    const { baseLumbarRemoved } = await import('./lumbarFlag')
    const { STEPS } = await import('../pages/assessmentSteps')
    expect(baseLumbarRemoved()).toBe(true)
    expect(STEPS.some(s => s.id === 'lumbar')).toBe(false)
    expect(STEPS.flatMap(s => s.fields.map(f => f.key)).filter(k => k.startsWith('lumbar'))).toEqual([])
    expect(STEPS.length).toBe(9)
  })
  it('"true" or "0" do not turn it on', async () => {
    for (const v of ['true', '0', 'yes']) {
      vi.stubEnv('VITE_BASE_LUMBAR_REMOVED', v)
      const { baseLumbarRemoved } = await import('./lumbarFlag')
      expect(baseLumbarRemoved()).toBe(false)
    }
  })
  it('production build config never sets it (netlify.toml has no VITE_BASE_LUMBAR_REMOVED)', () => {
    const toml = readFileSync(resolve(SRC, '..', '..', 'netlify.toml'), 'utf8')
    expect(toml).not.toMatch(/VITE_BASE_LUMBAR_REMOVED/)
  })
})

describe('scoring with no lumbar (null, never 0)', () => {
  it('the /100, overall band and problem areas equal an assessment that never had lumbar', async () => {
    const m = await import('./mobilityBands')
    const withNulls = { ...OTHER, lumbar_flex: null, lumbar_ext: null }
    expect(m.mobilityScoreForAssessment(withNulls)).toBe(m.mobilityScoreForAssessment(OTHER))
    expect(m.overallBandForAssessment(withNulls)).toBe(m.overallBandForAssessment(OTHER))
    expect(m.scoredJointKeysWorstFirst(withNulls)).toEqual(m.scoredJointKeysWorstFirst(OTHER))
    expect(m.scoredJointKeysWorstFirst(withNulls).some(k => k.startsWith('lumbar'))).toBe(false)
    // and a real 0 would have been different (proves null is not treated as 0)
    expect(m.mobilityScoreForAssessment({ ...OTHER, lumbar_flex: 0, lumbar_ext: 0 })).toBeLessThan(m.mobilityScoreForAssessment(OTHER))
  })
  it('unmeasured lumbar rows carry pct null and no band (mobilityBands no longer fakes 0)', async () => {
    const m = await import('./mobilityBands')
    const rows = m.jointDisplayRowsForAssessment(OTHER)
    for (const k of ['lumbar_flex', 'lumbar_ext']) {
      const r = rows.find(x => x.key === k)!
      expect(r.pct).toBeNull(); expect(r.band).toBeNull(); expect(r.midline).toBeNull()
    }
    const radar = m.radarSideRowsForAssessment(OTHER).filter(r => r.key.startsWith('lumbar'))
    for (const r of radar) { expect(r.measured).toBe(false); expect(r.leftPct).toBeNull() }
  })
  it('old user with stored lumbar keeps it: same rows, % and score as before', async () => {
    const m = await import('./mobilityBands')
    const old = { ...OTHER, lumbar_flex: 65, lumbar_ext: 28 }
    const rows = m.jointDisplayRowsForAssessment(old)
    expect(rows.find(r => r.key === 'lumbar_flex')!.pct).toBe(100)
    expect(rows.find(r => r.key === 'lumbar_ext')!.pct).toBe(100)
    const { lumbarNotMeasured } = await import('./lumbarFlag')
    expect(lumbarNotMeasured(old)).toBe(false)
    expect(lumbarNotMeasured(OTHER)).toBe(true)
    expect(lumbarNotMeasured({ ...OTHER, lumbar_flex: 0 })).toBe(false)   // a real stored 0 is a value
  })
})

describe('My Body wiring', () => {
  const page = readFileSync(join(SRC, 'pages', 'MyBody.tsx'), 'utf8')
  it('bar never prints a fake 0 for null pct when flag OFF it renders exactly as before (pct ?? 0)', () => {
    expect(page).toMatch(/const pct = row\.pct \?\? 0/)
  })
  it('flag ON: lumbar rows replaced by "Low back: not measured"; unmeasured lumbar radar axes dropped', async () => {
    expect(page).toMatch(/hideLumbar = lumbarOff && lumbarNotMeasured\(assessment\)/)
    expect(page).toMatch(/!\(lumbarOff && isLumbarKey\(r\.key\) && !r\.measured\)/)
    expect(page).toMatch(/\{LOW_BACK_NOT_MEASURED\}/)
    const { LOW_BACK_NOT_MEASURED } = await import('./lumbarFlag')
    expect(LOW_BACK_NOT_MEASURED).toBe('Low back: not measured')
  })
})
