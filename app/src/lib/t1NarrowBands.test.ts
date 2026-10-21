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

// Jim 11:47 AM ET Oct 21 (narrow the 5) + Quinn t1-quinn-buffers.md 11:47:58 AM ET (Steady line only on those 5).
const SPEC: Record<string, { steady: number; building: number }> = {
  hip_er: { steady: 1.5, building: 0 }, hip_ir: { steady: 1.5, building: 0 }, hip_abd: { steady: 2, building: 0 },
  cervical_flex: { steady: 2.5, building: 0 }, cervical_lat: { steady: 2, building: 0 },
  cervical_rot: { steady: 5, building: 5 }, cervical_ext: { steady: 5, building: 5 },
  shoulder_er: { steady: 5, building: 5 }, ankle_df: { steady: 1, building: 1 },
}

describe('T1 A: per-joint buffer config matches the spec exactly', () => {
  it('narrow joints and buffers', () => {
    expect(JSON.parse(JSON.stringify(NARROW_BAND_CONFIG))).toEqual(SPEC)
  })
  it('the 5 narrowed joints: Building survives (buffer smaller than the band) and Steady-line only', () => {
    for (const k of ['hip_er', 'hip_ir', 'hip_abd', 'cervical_flex', 'cervical_lat']) {
      const t = JOINT_SCORE_TARGETS[k]
      expect(SPEC[k].steady).toBeLessThan(0.1 * t)
      expect(SPEC[k].building).toBe(0)
      expect(bandScoreForJoint(k, 0.9 * t, t)).toBe(2) // the 90% point stays Building
    }
  })
  it('non-narrow joints keep the old rule exactly', () => {
    for (const k of ['shoulder_flex', 'hip_flex', 'lumbar_flex', 'lumbar_ext']) {
      expect(isNarrowJoint(k)).toBe(false)
      const t = JOINT_SCORE_TARGETS[k]
      for (const v of [0, 0.9 * t - 0.01, 0.9 * t, t - 0.01, t, t + 1]) {
        expect(bandScoreForJoint(k, v, t)).toBe(bandScoreFromTargetRatio(v, t))
      }
    }
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
    expect(jointPercent('hip_er', { midline: 27.5 })).toBe(94)        // 27.5 + 1.5 = 29 Steady, real 94.8 -> 94
    expect(jointPercent('cervical_flex', { midline: 47.5 })).toBe(95) // 47.5 + 2.5 = 50 Steady, real 95
    expect(jointPercent('hip_er', { midline: 29 })).toBe(100)         // at target: 100
    for (const [k, { steady }] of Object.entries(SPEC)) {
      const t = JOINT_SCORE_TARGETS[k]
      expect(jointPercent(k, { midline: t - steady })).toBeLessThan(100)
    }
  })
})

describe('T1 C: Protocol gap weight across 1 and 2 assessments', () => {
  it('weight table', () => {
    expect(NARROW_GAP_WEIGHT).toBe(0.5)
    expect(narrowGapWeight('hip_er', 2, null)).toBe(0.5)      // 1 assessment
    expect(narrowGapWeight('hip_er', 2, 2)).toBe(1)           // 2 agreeing
    expect(narrowGapWeight('hip_er', 2, 1)).toBe(0.5)         // 2 disagreeing
    expect(narrowGapWeight('shoulder_flex', 2, null)).toBe(1) // not narrow
  })
  it('weighted gap values (ankle 4 cm, target 6)', () => {
    const g = 1 - 4 / 6
    expect(weightedJointGap('ankle_df', 4, 6)).toBeCloseTo(g * 0.5, 12)        // 1 assessment
    expect(weightedJointGap('ankle_df', 4, 6, 4.2)).toBeCloseTo(g, 12)         // 2 agreeing (both Needs focus)
    expect(weightedJointGap('ankle_df', 4, 6, 5.5)).toBeCloseTo(g * 0.5, 12)   // 2 disagreeing (prev Steady)
    expect(weightedJointGap('ankle_df', 5.2, 6)).toBe(0)                       // Steady via buffer: no gap
    expect(weightedJointGap('shoulder_flex', 120, 140)).toBeCloseTo(1 - 120 / 140, 12)
  })
  it('ordering: a narrow gap ranks below a similar non-narrow gap until confirmed', () => {
    // shoulder_flex 112/140 = gap 0.20 (Needs focus); ankle 3.6/6 = gap 0.40, x0.5 = 0.20 unconfirmed -> tie, ord breaks
    const cur = { shoulder_flex_l: 110, shoulder_flex_r: 120, ankle_df_l: 3.6, ankle_df_r: 4 }
    expect(scoredJointKeysWorstFirst(cur)[0]).toBe('shoulder_flex_l')
    expect(scoredJointKeysWorstFirst(cur, { shoulder_flex_l: 110, shoulder_flex_r: 120, ankle_df_l: 3.5, ankle_df_r: 3.9 })[0]).toBe('ankle_df_l')
    expect(scoredJointKeysWorstFirst(cur, { shoulder_flex_l: 110, shoulder_flex_r: 120, ankle_df_l: 5.5, ankle_df_r: 6 })[0]).toBe('shoulder_flex_l')
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
