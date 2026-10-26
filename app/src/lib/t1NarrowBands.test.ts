/**
 * T1 (Jim, Oct 21 2026 10:53 AM ET, "T1: A plus C"). Spec: Quinn narrow-bands-options.md.
 * A: buffer E below each cutoff on narrow joints, better color wins.
 * C: Protocol weights narrow-joint gaps 0.5 until two assessments in a row show the same band.
 * Hard rule (Jim card 15, ledger L655): no retest step, note or hint anywhere.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  JOINT_SCORE_TARGETS,
  NARROW_BAND_CONFIG,
  NARROW_GAP_WEIGHT,
  bandScoreForJoint,
  bandScoreFromTargetRatio,
  isNarrowJoint,
  jointPercent,
  narrowGapWeight,
  scoredJointKeysWorstFirst,
  weightedJointGap,
} from './mobilityBands'

// Jim 11:47 AM ET Oct 21 (narrow) + Quinn t1-quinn-buffers.md 11:47:58 AM ET, then Jim 4:38 PM ET Oct 21
// "Drop the T1 buffers on the reset moves": only the joints the range reset did NOT change keep a buffer.
const SPEC: Record<string, { steady: number; building: number }> = {
  hip_abd: { steady: 2, building: 0 },
  cervical_rot: { steady: 5, building: 5 },
  shoulder_er: { steady: 5, building: 5 },
}
const RESET_JOINTS = ['cervical_lat', 'cervical_flex', 'cervical_ext', 'hip_er', 'hip_ir', 'shoulder_flex', 'ankle_df']

describe('T1 A: per-joint buffer config matches the spec exactly', () => {
  it('narrow joints and buffers', () => {
    expect(JSON.parse(JSON.stringify(NARROW_BAND_CONFIG))).toEqual(SPEC)
  })
  it('hip abduction: Building survives (buffer smaller than the band) and Steady-line only', () => {
    const t = JOINT_SCORE_TARGETS.hip_abd
    expect(SPEC.hip_abd.steady).toBeLessThan(0.1 * t)
    expect(SPEC.hip_abd.building).toBe(0)
    expect(bandScoreForJoint('hip_abd', 0.9 * t, t)).toBe(2)
  })
  it('reset moves (Jim 4:38 PM) and other non-narrow joints keep the plain 100% / 90% rule exactly', () => {
    for (const k of [...RESET_JOINTS, 'hip_flex', 'lumbar_flex', 'lumbar_ext']) {
      expect(isNarrowJoint(k)).toBe(false)
      expect(isNarrowJoint(`${k}_l`)).toBe(false)
      const t = JOINT_SCORE_TARGETS[k]
      for (const v of [0, 0.9 * t - 0.01, 0.9 * t, t - 0.01, t, t + 1]) {
        expect(bandScoreForJoint(k, v, t)).toBe(bandScoreFromTargetRatio(v, t))
      }
    }
  })
})

describe('90%-edge rounding fix: exactly 90% is Building on every joint (matches SQL numeric)', () => {
  it('reset moves at exactly 0.9 x target', () => {
    expect(bandScoreForJoint('cervical_lat', 33.3, 37)).toBe(2)   // was Needs focus in JS float (0.8999...)
    expect(bandScoreForJoint('cervical_lat_l', 33.3, 37)).toBe(2)
    expect(bandScoreForJoint('hip_ir', 21.6, 24)).toBe(2)
    expect(bandScoreForJoint('shoulder_flex', 126.9, 141)).toBe(2)
    expect(bandScoreForJoint('ankle_df', 5.49, 6.1)).toBe(2)
    expect(bandScoreForJoint('cervical_lat', 33.29, 37)).toBe(1)
  })
})

describe('T1 A: boundary cases at each cutoff for every narrow joint', () => {
  for (const [joint, { steady: Es, building: Eb }] of Object.entries(SPEC)) {
    const t = JOINT_SCORE_TARGETS[joint]
    const b = 0.9 * t
    const d = 0.01
    const cases: Array<[number, number, string]> = [
      [t + d, 3, 'Steady line: just above target'],
      [t, 3, 'Steady line: at target'],
      [t - Es / 2, 3, 'Steady line: inside buffer (better color wins)'],
      [t - Es, 3, 'Steady line: at buffer edge'],
      [t - Es - d, 2, 'Steady line: just below buffer'],
      [b + d, b + d + Es >= t ? 3 : 2, 'Building line: just above 90%'],
      [b, b + Es >= t ? 3 : 2, 'Building line: at 90%'],
      [b - Eb / 2, Eb > 0 ? 2 : (b - Eb / 2 + Es >= t ? 3 : 2), 'Building line: inside buffer'],
      [b - Eb, 2, 'Building line: at buffer edge'],
      [b - Eb - d, 1, 'Building line: just below buffer'],
    ]
    for (const [v, want, label] of cases) {
      it(`${joint} (target ${t}, Steady buffer ${Es}, Building buffer ${Eb}) ${label}: ${v.toFixed(2)} -> ${want}`, () => {
        expect(bandScoreForJoint(joint, v, t)).toBe(want)
        expect(bandScoreForJoint(`${joint}_l`, v, t)).toBe(want)
      })
    }
  }
  it('a buffered Steady shows the real percent, never 100', () => {
    expect(jointPercent('hip_abd', { left: 39, right: 41 })).toBe(97)   // 39 + 2 = 41 Steady, real 97.5 -> 97
    expect(jointPercent('shoulder_er', { left: 80, right: 85 })).toBe(94) // 80 + 5 = 85 Steady, real 94.1 -> 94
    expect(jointPercent('hip_abd', { left: 40, right: 40 })).toBe(100)  // at target: 100
    for (const [k, { steady }] of Object.entries(SPEC)) {
      const t = JOINT_SCORE_TARGETS[k]
      expect(jointPercent(k, { midline: t - steady })).toBeLessThan(100)
    }
  })
})

describe('T1 C: Protocol gap weight across 1 and 2 assessments', () => {
  it('weight table', () => {
    expect(NARROW_GAP_WEIGHT).toBe(0.5)
    expect(narrowGapWeight('shoulder_er', 2, null)).toBe(0.5) // 1 assessment
    expect(narrowGapWeight('shoulder_er', 2, 2)).toBe(1)      // 2 agreeing
    expect(narrowGapWeight('shoulder_er', 2, 1)).toBe(0.5)    // 2 disagreeing
    expect(narrowGapWeight('hip_er', 2, null)).toBe(1)        // reset move: no longer narrow
    expect(narrowGapWeight('shoulder_flex', 2, null)).toBe(1) // not narrow
  })
  it('weighted gap values (shoulder ER 60, target 85)', () => {
    const g = 1 - 60 / 85
    expect(weightedJointGap('shoulder_er', 60, 85)).toBeCloseTo(g * 0.5, 12)       // 1 assessment
    expect(weightedJointGap('shoulder_er', 60, 85, 62)).toBeCloseTo(g, 12)         // 2 agreeing (both Needs focus)
    expect(weightedJointGap('shoulder_er', 60, 85, 84)).toBeCloseTo(g * 0.5, 12)   // 2 disagreeing (prev Steady)
    expect(weightedJointGap('shoulder_er', 81, 85)).toBe(0)                        // Steady via buffer: no gap
    expect(weightedJointGap('ankle_df', 4, 6.1)).toBeCloseTo(1 - 4 / 6.1, 12)      // reset move: full weight
    expect(weightedJointGap('shoulder_flex', 120, 141)).toBeCloseTo(1 - 120 / 141, 12)
  })
  it('ordering: a narrow gap ranks below a similar non-narrow gap until confirmed', () => {
    // shoulder_flex 112.8/141 = gap 0.20 (Needs focus); shoulder ER 51/85 = gap 0.40, x0.5 = 0.20 unconfirmed -> tie, order breaks
    const cur = { shoulder_flex_l: 112.8, shoulder_flex_r: 120, shoulder_er_l: 51, shoulder_er_r: 55 }
    expect(scoredJointKeysWorstFirst(cur)[0]).toBe('shoulder_flex_l')
    expect(scoredJointKeysWorstFirst(cur, { ...cur, shoulder_er_l: 50 })[0]).toBe('shoulder_er_l')
    expect(scoredJointKeysWorstFirst(cur, { ...cur, shoulder_er_l: 84, shoulder_er_r: 85 })[0]).toBe('shoulder_flex_l')
  })
})

describe('T1 hard rule: no retest step, note or hint was added', () => {
  it('no new retest / measure again copy in app source', () => {
    const SRC = resolve(__dirname, '..')
    const hits: string[] = []
    const walk = (d: string) => {
      for (const f of readdirSync(d)) {
        const p = join(d, f)
        if (statSync(p).isDirectory()) { walk(p); continue }
        if (!/\.(ts|tsx)$/.test(f) || /\.test\./.test(f)) continue
        const s = readFileSync(p, 'utf8')
        if (/narrow|NARROW_|T1 option/.test(s) && /(measure again|re-?test|retake|try again)/i.test(s.split('\n').filter(l => /narrow|NARROW_|T1/.test(l)).join('\n'))) hits.push(p)
      }
    }
    walk(SRC)
    expect(hits).toEqual([])
  })
})
