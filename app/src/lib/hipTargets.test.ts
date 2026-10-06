/**
 * Hip Steady targets (Jim decisions, Oct 6 2026).
 *  - Seated hip rotation reads Steady once inside the typical range (Simoneau et al. 1998, Quinn option B1):
 *    hip ER 29 and hip IR 26, replacing 45.
 *  - Standing hip abduction is scored against 40, replacing 90, and shows NO typical range on screen.
 * Mirrored in public.compute_joint_scores() and romrxbjj-v2 compute-tiers / submit-lead-assessment JOINT_TARGETS.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  JOINT_SCORE_TARGETS,
  bandScoreFromTargetRatio,
  jointBandsForAssessment,
  jointPercent,
  overallBandForAssessment,
} from './mobilityBands'
import { getScore } from '../pages/assessmentMeta'
import { STEPS } from '../pages/assessmentSteps'

const SRC = resolve(__dirname, '..')

describe('hip Steady targets (Oct 6)', () => {
  it('hip ER 29, hip IR 26, hip abduction 40', () => {
    expect(JOINT_SCORE_TARGETS.hip_er).toBe(29)
    expect(JOINT_SCORE_TARGETS.hip_ir).toBe(26)
    expect(JOINT_SCORE_TARGETS.hip_abd).toBe(40)
  })

  it('every other target is unchanged', () => {
    const { hip_er, hip_ir, hip_abd, ...rest } = JOINT_SCORE_TARGETS
    void hip_er; void hip_ir; void hip_abd
    expect(rest).toEqual({
      hip_flex: 120, shoulder_er: 90, shoulder_flex: 180, ankle_df: 20, cervical_rot: 80,
      cervical_lat: 45, lumbar_flex: 60, lumbar_ext: 25, cervical_flex: 50, cervical_ext: 60,
    })
  })

  // [joint, Steady at, just under (Building), lowest Building value on the 0.5 deg input grid, Needs focus]
  // (hip IR: 0.90 x 26 = 23.4 is off the 0.5 grid; in JS 23.4 / 26 is 0.8999..., so 23.5 is the first Building value)
  const CASES: Array<[string, number, number, number, number]> = [
    ['hip_er', 29, 28, 26.5, 26],
    ['hip_ir', 26, 25, 23.5, 23],
    ['hip_abd', 40, 39, 36, 35.5],
  ]
  for (const [joint, steady, under, buildingFloor, needsFocus] of CASES) {
    const t = JOINT_SCORE_TARGETS[joint]
    it(`${joint}: ${steady} → Steady, ${under} → not Steady (Building), ${needsFocus} → Needs focus`, () => {
      expect(bandScoreFromTargetRatio(steady, t)).toBe(3)
      expect(bandScoreFromTargetRatio(under, t)).toBe(2)
      expect(bandScoreFromTargetRatio(buildingFloor, t)).toBe(2)
      expect(bandScoreFromTargetRatio(needsFocus, t)).toBe(1)
      // live measure-screen chip, per side
      expect(getScore(String(steady), { key: `${joint}_l`, label: 'Left' })).toBe(3)
      expect(getScore(String(under), { key: `${joint}_r`, label: 'Right' })).toBe(2)
      expect(getScore(String(needsFocus), { key: `${joint}_l`, label: 'Left' })).toBe(1)
      // My Body / My Protocol joint band: worse side decides
      expect(jointBandsForAssessment({ [`${joint}_l`]: steady, [`${joint}_r`]: steady + 10 }).get(joint)).toBe(3)
      expect(jointBandsForAssessment({ [`${joint}_l`]: steady + 10, [`${joint}_r`]: under }).get(joint)).toBe(2)
      // per-joint %
      expect(jointPercent(joint, { left: steady, right: steady })).toBe(100)
      expect(jointPercent(joint, { left: under, right: steady })).toBeLessThan(100)
    })
  }

  it('a person at the low end of the typical rotation range and 40 deg abduction is Steady on the hips', () => {
    const a = { hip_er_l: 29, hip_er_r: 31, hip_ir_l: 26, hip_ir_r: 27, hip_abd_l: 40, hip_abd_r: 42 }
    const bands = jointBandsForAssessment(a)
    expect([bands.get('hip_er'), bands.get('hip_ir'), bands.get('hip_abd')]).toEqual([3, 3, 3])
    expect(overallBandForAssessment(a)).toBe(3)
  })

  it('old 45 / 90 numbers are no longer needed for Steady', () => {
    expect(bandScoreFromTargetRatio(30, JOINT_SCORE_TARGETS.hip_er)).toBe(3)
    expect(bandScoreFromTargetRatio(27, JOINT_SCORE_TARGETS.hip_ir)).toBe(3)
    expect(bandScoreFromTargetRatio(45, JOINT_SCORE_TARGETS.hip_abd)).toBe(3)
  })
})

describe('hip abduction: NO typical range on screen (Jim, Oct 6)', () => {
  const step = STEPS.find(s => s.id === 'hip_abd')!

  it('the step exists with left and right fields', () => {
    expect(step.fields.map(f => f.key)).toEqual(['hip_abd_l', 'hip_abd_r'])
  })

  it('no range numbers, no reference note, no range source on either field', () => {
    for (const f of step.fields) {
      const field = f as typeof f & { rangeSource?: string }
      expect([f.key, f.normalLow, f.normalHigh, f.referenceNote, field.rangeSource]).toEqual([f.key, undefined, undefined, undefined, undefined])
    }
  })

  it('the measure screen only prints a range when the field carries normalLow and normalHigh', () => {
    const s = readFileSync(join(SRC, 'pages', 'AssessmentMeasure.tsx'), 'utf8')
    expect(s).toMatch(/field\.normalLow != null && field\.normalHigh != null/)
  })

  it('hip abduction is still scored live (band chip shows, no range text)', () => {
    expect(getScore('40', step.fields[0])).toBe(3)
    expect(getScore('39', step.fields[1])).toBe(2)
  })
})
