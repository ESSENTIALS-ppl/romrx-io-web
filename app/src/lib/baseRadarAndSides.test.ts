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
import { radarRadius, radarRadiusFloor40, BUILDING_RING_PCT } from './radarScale'
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
  radarSideRowsForAssessment,
  sidePercent,
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

describe('My Body radar (v2: Left/Right outlines) == Joint Breakdown bars', () => {
  it('radar joint set and order is exactly the bar list', () => {
    const a = randomAssessment(rng(1), 'x')
    expect(radarSideRowsForAssessment(a).map(r => r.key)).toEqual(BASE_DISPLAY_JOINTS.map(j => j.key))
    expect(jointDisplayRowsForAssessment(a).map(r => r.key)).toEqual(BASE_DISPLAY_JOINTS.map(j => j.key))
  })

  it('for 500 random assessments: worse side == bar %, sides consistent with side colours', () => {
    const r = rng(20260924)
    let checked = 0
    for (let n = 0; n < 500; n++) {
      const a = randomAssessment(r, `cur-${n}`)
      const rows = randomRows(r, a)
      const bars = jointDisplayRowsForAssessment(a, rows)
      const radar = radarSideRowsForAssessment(a, rows)
      const bands = jointBandsForAssessment(a, rows)
      bars.forEach((bar, i) => {
        const j = BASE_DISPLAY_JOINTS[i]
        const rr = radar[i]
        const num = (k?: string) => (k == null || a[k] == null ? null : Number(a[k]))
        const expected = jointPercent(j.key, { left: num(j.l), right: num(j.r), midline: num(j.single) }, bands.get(j.key) ?? null) ?? 0
        expect([j.key, bar.pct]).toEqual([j.key, expected])
        // worse side (tooltip + dots) === bar %
        expect([j.key, rr.worse]).toEqual([j.key, bar.pct])
        expect([j.key, rr.band]).toEqual([j.key, bar.band])
        if (!rr.measured) { checked++; return }
        if (rr.midline) {
          // one value on both lines
          expect([rr.left, rr.right]).toEqual([bar.pct, bar.pct])
        } else {
          const sb = sideBandsForJoint(j.key, { left: num(j.l), right: num(j.r) }, bar.band)
          expect([rr.leftBand, rr.rightBand]).toEqual([sb.left, sb.right])
          for (const [pct, band] of [[rr.leftPct, rr.leftBand], [rr.rightPct, rr.rightBand]] as const) {
            if (pct == null) continue
            // each side's % sits inside the band its colour shows
            if (band === 3) expect(pct).toBe(100)
            if (band === 2) expect(pct >= 90 && pct <= 99).toBe(true)
            if (band === 1) expect(pct).toBeLessThanOrEqual(89)
          }
          // the worse measured side is the bar %
          const measuredSides = [rr.leftPct, rr.rightPct].filter((x): x is number => x != null)
          expect(Math.min(...measuredSides)).toBe(bar.pct)
          expect(Math.min(rr.left, rr.right)).toBe(bar.pct)
        }
        checked++
      })
    }
    expect(checked).toBe(500 * BASE_DISPLAY_JOINTS.length)
  })

  it('asymmetry separates the lines; worse side, not best side or average', () => {
    const a = { id: 'a', hip_abd_l: 45, hip_abd_r: 90 }
    const row = radarSideRowsForAssessment(a).find(r => r.key === 'hip_abd')!
    expect([row.left, row.right, row.worse, row.band]).toEqual([50, 100, 50, 1])
    expect([row.leftBand, row.rightBand]).toEqual([1, 3])
  })

  it('fixture values (EXPECTED-BANDS.md)', () => {
    const f05 = { id: '05', ankle_df_l: 17.9, ankle_df_r: 19, hip_abd_l: 81, hip_abd_r: 81.5, lumbar_flex: 60.5 }
    const rows = radarSideRowsForAssessment(f05, [{ joint_key: 'ankle_df', score: 1 }, { joint_key: 'hip_abd', score: 2 }])
    const ank = rows.find(r => r.key === 'ankle_df')!
    expect([ank.leftPct, ank.rightPct, ank.worse]).toEqual([89, 95, 89])
    const abd = rows.find(r => r.key === 'hip_abd')!
    expect([abd.leftPct, abd.rightPct, abd.worse]).toEqual([90, 90, 90])
    const lf = rows.find(r => r.key === 'lumbar_flex')!
    expect([lf.midline, lf.left, lf.right]).toEqual([true, 100, 100])
    // fixture 02 Ankle DF 7 / 8.5 cm → L 35 / R 42
    const f02 = radarSideRowsForAssessment({ ankle_df_l: 7, ankle_df_r: 8.5 }).find(r => r.key === 'ankle_df')!
    expect([f02.leftPct, f02.rightPct, f02.worse]).toEqual([35, 42, 35])
  })

  it('sidePercent: floor, capped at 100, clamped into the side band', () => {
    expect(sidePercent('hip_abd', 81, 2)).toBe(90)
    expect(sidePercent('hip_abd', 95, 3)).toBe(100)
    expect(sidePercent('ankle_df', 17.9, 1)).toBe(89)
    expect(sidePercent('ankle_df', null, 1)).toBeNull()
  })

  it('MyBody.tsx renders BaseRadar from radarSideRowsForAssessment with the plain US caption', () => {
    const s = read(join(SRC, 'pages', 'MyBody.tsx'))
    expect(s).toMatch(/<BaseRadar rows=\{radarRows\} \/>/)
    expect(s).toMatch(/Each line is one side of your body, as a % of your Base target\. The dashed circle is Steady\. Dents and gaps between the lines show where to focus\./)
    expect(s).not.toMatch(/\u2014/)
    expect(s).not.toMatch(/recharts/)
    const code = s.replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(code).not.toMatch(/OPTIMAL|optimal|elite/i)
  })

  it('BaseRadar.tsx: Steady target circle, gap tint, 90% ring, Left solid / Right dashed, worse-side band dots', () => {
    const s = read(join(SRC, 'components', 'BaseRadar.tsx'))
    expect(s).toMatch(/data-ring="steady-target"/)
    expect(s).toMatch(/>Steady target</)
    expect(s).toMatch(/data-ring="building-90"/)
    expect(s).toMatch(/const ringR = R \* radius\(BUILDING_RING_PCT\)/)
    expect(s).toMatch(/radius = radarRadius/)
    expect(s).toMatch(/points=\{polygon\(worse\)\} fill="#ffffff"/)
    expect(s).toMatch(/data-series="left"/)
    expect(s).toMatch(/data-series="right"/)
    expect(s).toMatch(/strokeDasharray=\{RIGHT_DASH\}/)
    expect(s).toMatch(/point\(i, n, r\.worse\)/)
    expect(s).toMatch(/BAND_HEX\[r\.band\]/)
    expect(s).toMatch(/Left \{fmt\(act\.leftPct\)\} · Right \{fmt\(act\.rightPct\)\}/)
    expect(s).not.toMatch(/\u2014/)
  })
})

describe('radar scale (quadratic)', () => {
  it('maps 0 → centre, 100 → Steady circle, monotonic, clamps', () => {
    expect(radarRadius(0)).toBe(0)
    expect(radarRadius(100)).toBe(1)
    expect(radarRadius(150)).toBe(1)
    expect(radarRadius(-5)).toBe(0)
    expect(radarRadius(null)).toBe(0)
    for (let p = 1; p <= 100; p++) expect(radarRadius(p)).toBeGreaterThan(radarRadius(p - 1))
  })
  it('89 vs 100 gap is about twice the linear gap; 35 vs 66 stays clearly separate and non-zero', () => {
    const gapTop = radarRadius(100) - radarRadius(89)
    expect(gapTop).toBeGreaterThan(0.2)
    expect(gapTop).toBeGreaterThan(1.8 * 0.11)
    expect(radarRadius(35)).toBeGreaterThan(0.1)
    expect(radarRadius(66) - radarRadius(35)).toBeGreaterThan(0.3)
    expect(radarRadius(BUILDING_RING_PCT)).toBeCloseTo(0.81, 5)
  })
  it('the floor-40 alternative pins low values (why it was not chosen)', () => {
    expect(radarRadiusFloor40(35)).toBe(0)
    expect(radarRadiusFloor40(20)).toBe(radarRadiusFloor40(35))
  })
})

describe('My Body misc', () => {
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
