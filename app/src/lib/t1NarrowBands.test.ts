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
  NARROW_BAND_BUFFER,
  NARROW_GAP_WEIGHT,
  bandScoreForJoint,
  bandScoreFromTargetRatio,
  narrowBuffer,
  narrowGapWeight,
  scoredJointKeysWorstFirst,
  weightedJointGap,
} from './mobilityBands'

const SPEC: Record<string, number> = {
  cervical_rot: 5, cervical_lat: 5, cervical_flex: 5, cervical_ext: 5,
  hip_er: 5, hip_ir: 5, hip_abd: 5, shoulder_er: 5, ankle_df: 1,
}

describe('T1 A: buffer table matches the spec exactly', () => {
  it('narrow joints and buffers', () => {
    expect({ ...NARROW_BAND_BUFFER }).toEqual(SPEC)
  })
  it('non-narrow joints keep the old rule exactly (E = 0)', () => {
    for (const k of ['shoulder_flex', 'hip_flex', 'lumbar_flex', 'lumbar_ext']) {
      expect(narrowBuffer(k)).toBe(0)
      const t = JOINT_SCORE_TARGETS[k]
      for (const v of [0, 0.9 * t - 0.01, 0.9 * t, t - 0.01, t, t + 1]) {
        expect(bandScoreForJoint(k, v, t)).toBe(bandScoreFromTargetRatio(v, t))
      }
    }
  })
})

describe('T1 A: boundary cases at each cutoff for every narrow joint', () => {
  for (const [joint, E] of Object.entries(SPEC)) {
    const t = JOINT_SCORE_TARGETS[joint]
    const b = 0.9 * t
    const d = 0.01
    // [value, expected, label]
    const cases: Array<[number, number, string]> = [
      [t + d, 3, 'Steady cutoff: just above target'],
      [t, 3, 'Steady cutoff: at target'],
      [t - E / 2, 3, 'Steady cutoff: inside buffer (better color wins)'],
      [t - E, 3, 'Steady cutoff: at buffer edge'],
      [t - E - d, 2, 'Steady cutoff: just below buffer'],
      [b + d, 2, 'Building cutoff: just above 90%'],
      [b, 2, 'Building cutoff: at 90%'],
      [b - E / 2, 2, 'Building cutoff: inside buffer (better color wins)'],
      [b - E, 2, 'Building cutoff: at buffer edge'],
      [b - E - d, 1, 'Building cutoff: just below buffer'],
    ]
    // Where E is wider than the Building band (hip ER/IR/abd, neck flexion and side bend), the buffer swallows the
    // upper part of Building, so the old 90% point is already Steady (Quinn: "nearly 2-color"). Expectation says so.
    for (const [v, want0, label] of cases) {
      const want = want0 === 2 && v + E >= t - 1e-9 ? 3 : want0
      it(`${joint} (target ${t}, E ${E}) ${label}: ${v.toFixed(2)} -> ${want}`, () => {
        expect(bandScoreForJoint(joint, v, t)).toBe(want)
        expect(bandScoreForJoint(`${joint}_l`, v, t)).toBe(want)
      })
    }
  }
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
