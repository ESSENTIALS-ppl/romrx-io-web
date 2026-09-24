/**
 * Radar + My Protocol L/R follow-up to Base Fix A (2026-09-24).
 * - The My Body radar plots EXACTLY the Joint Breakdown bar % (same joints,
 *   same order, same band, fixed 0..100 scale with full ring = Steady).
 * - My Protocol Left/Right numbers are coloured by Base band (side / JOINT_SCORE_TARGETS),
 *   never by the old riskBelow/normalMin thresholds, and never contradict the card band.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  ASSESSMENT_JOINTS,
  BAND_HEX,
  BAND_TONE,
  BASE_DISPLAY_JOINTS,
  JOINT_SCORE_TARGETS,
  bandScoreFromTargetRatio,
  formatMeasure,
  jointBandsForAssessment,
  jointDisplayRowsForAssessment,
  jointPercent,
  jointUnit,
  radarDataForAssessments,
  sideBandsForJoint,
  valueToneClass,
  type BandScore,
  type JointScoreRow,
} from './mobilityBands'

const SRC = resolve(__dirname, '..')
const read = (p: string) => readFileSync(p, 'utf8')

// Deterministic PRNG so failures reproduce.
function rng(seed: number) {
  let s = seed >>> 0
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 2 ** 32)
}

function randomAssessment(r: () => number, id: string) {
  const a: Record<string, number | string | null> = { id }
  for (const j of ASSESSMENT_JOINTS) {
    const t = JOINT_SCORE_TARGETS[j.key]
    const val = () => {
      const x = r()
      if (x < 0.06) return null // unmeasured
      // spread across all bands, with exact boundary hits
      if (x < 0.16) return t
      if (x < 0.26) return t * 0.9
      const v = Math.round(t * (0.3 + r() * 0.9) * 10) / 10
      return x < 0.3 ? String(v) : v // numeric strings as PostgREST can return
    }
    if (j.single) a[j.single] = val()
    else { a[j.l!] = val(); a[j.r!] = val() }
  }
  return a
}

function randomRows(r: () => number, a: Record<string, unknown>): JointScoreRow[] | null {
  if (r() < 0.3) return null
  // persisted joint_scores as compute_joint_scores() would write them (formula-true)
  const bands = jointBandsForAssessment(a)
  return [...bands].map(([joint_key, score]) => ({ joint_key, score }))
}

describe('My Body radar == Joint Breakdown bars', () => {
  it('radar joint set and order is exactly the bar list', () => {
    const a = randomAssessment(rng(1), 'x')
    const radar = radarDataForAssessments([a], a, null)
    expect(radar.map(r => r.key)).toEqual(BASE_DISPLAY_JOINTS.map(j => j.key))
    expect(jointDisplayRowsForAssessment(a).map(r => r.key)).toEqual(BASE_DISPLAY_JOINTS.map(j => j.key))
  })

  it('for 500 random assessments the radar value, band and bar % are identical and in-band', () => {
    const r = rng(20260924)
    let checked = 0
    for (let n = 0; n < 500; n++) {
      const a = randomAssessment(r, `cur-${n}`)
      const older = randomAssessment(r, `old-${n}`)
      const rows = randomRows(r, a)
      const bars = jointDisplayRowsForAssessment(a, rows)
      const radar = radarDataForAssessments([a, older], a, rows)
      const bands = jointBandsForAssessment(a, rows)
      bars.forEach((bar, i) => {
        const j = BASE_DISPLAY_JOINTS[i]
        // independent recomputation: worse side / Base target, band-clamped
        const num = (k?: string) => (k == null || a[k] == null ? null : Number(a[k]))
        const expected = jointPercent(j.key, { left: num(j.l), right: num(j.r), midline: num(j.single) }, bands.get(j.key) ?? null) ?? 0
        expect([j.key, bar.pct]).toEqual([j.key, expected])
        expect([j.key, radar[i].v0]).toEqual([j.key, bar.pct])
        expect([j.key, radar[i].band]).toEqual([j.key, bar.band])
        // older series uses its own values (formula bands)
        expect(radar[i].v1).toBe(jointDisplayRowsForAssessment(older, null)[i].pct)
        // scale: 0..100; full ring (100) iff Steady
        expect(bar.pct).toBeGreaterThanOrEqual(0)
        expect(bar.pct).toBeLessThanOrEqual(100)
        if (bar.band === 3) expect(bar.pct).toBe(100)
        if (bar.band === 2) expect(bar.pct >= 90 && bar.pct <= 99).toBe(true)
        if (bar.band === 1) expect(bar.pct).toBeLessThanOrEqual(89)
        checked++
      })
    }
    expect(checked).toBe(500 * BASE_DISPLAY_JOINTS.length)
  })

  it('radar uses worse side, not best side or L/R average', () => {
    const a = { id: 'a', hip_abd_l: 45, hip_abd_r: 90 } // worse 45/90 = 50%
    const row = radarDataForAssessments([a], a, null).find(r => r.key === 'hip_abd')!
    expect(row.v0).toBe(50)
    expect(row.band).toBe(1)
  })

  it('fixture values (EXPECTED-BANDS.md): 05 Ankle DF 17.9/19 → 89%, 03 Hip Abd 81/81.5 → 90%', () => {
    const f05 = { id: '05', ankle_df_l: 17.9, ankle_df_r: 19, hip_abd_l: 81, hip_abd_r: 81.5 }
    const rows = radarDataForAssessments([f05], f05, [{ joint_key: 'ankle_df', score: 1 }, { joint_key: 'hip_abd', score: 2 }])
    expect(rows.find(r => r.key === 'ankle_df')!.v0).toBe(89)
    expect(rows.find(r => r.key === 'hip_abd')!.v0).toBe(90)
  })

  it('MyBody.tsx: fixed 0..100 radar scale, band-coloured dots, bars + radar from the same rows', () => {
    const s = read(join(SRC, 'pages', 'MyBody.tsx'))
    expect(s).toMatch(/<PolarRadiusAxis domain=\{\[0, 100\]\}/)
    expect(s).toMatch(/BAND_HEX\[band\]/)
    expect(s).toMatch(/jointRows\.map\(row => <JointBar/)
    const code = s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(code).not.toMatch(/OPTIMAL|optimal|elite/i)
    // no band colour reused as a radar series colour (cobalt/amber read as Steady/Building)
    expect(s).not.toMatch(/RADAR_COLORS = \[[^\]]*#1D4ED8/i)
    expect(s).not.toMatch(/#f59e0b/i)
  })

  it('BAND_HEX hues match BAND_TONE families', () => {
    expect(BAND_HEX[1]).toBe('#DC2626')
    expect(BAND_HEX[2]).toBe('#EAB308')
    expect(BAND_HEX[3]).toBe('#1D4ED8')
  })

  it('Steady joint name uses the cobalt band colour (not black ink)', () => {
    expect(BAND_TONE[3].label).toBe('text-cobalt')
    expect(BAND_TONE[1].label).toMatch(/red/)
    expect(BAND_TONE[2].label).toMatch(/yellow/)
  })
})

describe('My Protocol Left/Right colours follow Base bands', () => {
  it('each side band = side / JOINT_SCORE_TARGETS (formula-true rows)', () => {
    const r = rng(7)
    for (let n = 0; n < 2000; n++) {
      const j = ASSESSMENT_JOINTS.filter(x => x.l)[Math.floor(r() * 9)]
      const t = JOINT_SCORE_TARGETS[j.key]
      const L = Math.round(t * (0.5 + r() * 0.7) * 10) / 10
      const R = Math.round(t * (0.5 + r() * 0.7) * 10) / 10
      const card = bandScoreFromTargetRatio(Math.min(L, R), t)
      const sides = sideBandsForJoint(j.key, { left: L, right: R }, card)
      expect(sides.left).toBe(bandScoreFromTargetRatio(L, t))
      expect(sides.right).toBe(bandScoreFromTargetRatio(R, t))
    }
  })

  it('worse side always equals the card band and no side is below it (even with stale persisted band)', () => {
    const r = rng(11)
    for (let n = 0; n < 2000; n++) {
      const t = JOINT_SCORE_TARGETS.hip_abd
      const L = Math.round(t * (0.5 + r() * 0.7) * 10) / 10
      const R = Math.round(t * (0.5 + r() * 0.7) * 10) / 10
      const card = (1 + Math.floor(r() * 3)) as BandScore
      const s = sideBandsForJoint('hip_abd', { left: L, right: R }, card)
      expect(Math.min(s.left!, s.right!)).toBe(card)
      expect(s.left! >= card && s.right! >= card).toBe(true)
      expect(L <= R ? s.left : s.right).toBe(card)
    }
  })

  it('fixture 03 Hip Abd L 81 on a Building card is yellow, not cobalt', () => {
    const s = sideBandsForJoint('hip_abd', { left: 81, right: 81.5 }, 2)
    expect(s).toEqual({ left: 2, right: 2 })
    expect(valueToneClass(s.left)).toBe(BAND_TONE[2].color)
    expect(valueToneClass(s.left)).not.toMatch(/cobalt/)
  })

  it('fixture 05 Ankle DF: L 17.9 red (Needs focus = card), R 19 yellow (Building)', () => {
    expect(sideBandsForJoint('ankle_df', { left: 17.9, right: 19 }, 1)).toEqual({ left: 1, right: 2 })
  })

  it('MyProtocol.tsx: no riskBelow/normalMin/normalMax left; sides use the shared helper; target from JOINT_SCORE_TARGETS', () => {
    const s = read(join(SRC, 'pages', 'MyProtocol.tsx'))
    expect(s).not.toMatch(/riskBelow|normalMin|normalMax/)
    expect(s).not.toMatch(/Below Normal|>Normal</)
    expect(s).toMatch(/sideBandsForJoint\(def\.key, \{ left, right \}, band\)/)
    expect(s).toMatch(/valueToneClass\(sideBands\.left\)/)
    expect(s).toMatch(/valueToneClass\(sideBands\.right\)/)
    expect(s).toMatch(/JOINT_SCORE_TARGETS\[def\.key\]/)
    expect(s).not.toMatch(/\{asymmetry\}\{def\.unit\}/)
  })
})

describe('units + number formatting (Reid Field cosmetics)', () => {
  it('Ankle DF is cm (knee-to-wall input + JOINT_SCORE_TARGETS 20cm); others degrees', () => {
    expect(jointUnit('ankle_df')).toBe('cm')
    expect(jointUnit('ankle_df_l')).toBe('cm')
    expect(jointUnit('hip_abd')).toBe('°')
    const steps = read(join(SRC, 'pages', 'assessmentSteps2.ts'))
    expect(steps).toMatch(/key: 'ankle_df_l', label: 'Left', unit: 'cm'/)
    const row = jointDisplayRowsForAssessment({ ankle_df_l: 17.9, ankle_df_r: 19 }).find(r => r.key === 'ankle_df')!
    expect(row.unit).toBe('cm')
  })
  it('gap float noise is rounded to 1 decimal', () => {
    expect(formatMeasure(19 - 17.9)).toBe('1.1')
    expect(formatMeasure(81.5 - 81)).toBe('0.5')
    expect(formatMeasure(3)).toBe('3')
    expect(formatMeasure(null)).toBe('-')
  })
})
