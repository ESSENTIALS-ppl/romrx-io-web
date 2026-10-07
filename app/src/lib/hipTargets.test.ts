/**
 * Steady targets changed by Jim's decisions of Oct 6 2026 (sources: ledger/ROMRX-ASSESSMENT-STUDY-REFERENCE.md).
 *  - Seated hip rotation reads Steady once inside the typical range (Simoneau et al. 1998, Quinn option B1):
 *    hip ER 29 and hip IR 26, replacing 45.
 *  - Standing hip abduction is scored against 40, replacing 90, and shows NO typical range on screen.
 *  - Shoulder flexion 140, replacing 180 (Gill et al. 2020, mean minus 1 SD).
 *  - Ankle knee-to-wall 6 cm, replacing 20 (mean minus 1 SD, Konor 2012 / McBride 2026), no range shown.
 *  - Neck rotation 70 (was 80) and neck side bend 38 (was 45): Swinkels & Swinkels-Meewisse 2014, Spine, PMID 24573069
 *    (rotation mean minus 1 SD for ages 20-49; side bend 20-29 mean minus 1 SD). Neck flexion 50 / extension 60 unchanged.
 *    No typical range on screen for the neck.
 *  - Shoulder ER 85 (Oct 6 8:19 PM, Jim-approved, Quinn): standing goal-post test. Replaces 40 (lying tucked-elbow test,
 *    11:45 AM). No typical range is shown on the measure screen (Stacy, Oct 6 8:19 PM).
 * Mirrored in public.compute_joint_scores() and romrxbjj-v2 compute-tiers JOINT_TARGETS / submit-lead-assessment email.ts.
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

describe('Steady targets (Oct 6): hips, shoulder flexion, ankle, neck', () => {
  it('hip ER 29, hip IR 26, hip abduction 40, shoulder flexion 140, ankle 6 cm', () => {
    expect(JOINT_SCORE_TARGETS.hip_er).toBe(29)
    expect(JOINT_SCORE_TARGETS.hip_ir).toBe(26)
    expect(JOINT_SCORE_TARGETS.hip_abd).toBe(40)
    expect(JOINT_SCORE_TARGETS.shoulder_flex).toBe(140)
    expect(JOINT_SCORE_TARGETS.ankle_df).toBe(6)
  })

  it('shoulder ER 85 (standing goal-post, Oct 6 8:19 PM); shoulder flexion stays 140', () => {
    expect(JOINT_SCORE_TARGETS.shoulder_er).toBe(85)
    expect(JOINT_SCORE_TARGETS.shoulder_flex).toBe(140)
  })

  it('neck rotation 70, neck side bend 38; neck flexion 50 and extension 60 unchanged', () => {
    expect(JOINT_SCORE_TARGETS.cervical_rot).toBe(70)
    expect(JOINT_SCORE_TARGETS.cervical_lat).toBe(38)
    expect(JOINT_SCORE_TARGETS.cervical_flex).toBe(50)
    expect(JOINT_SCORE_TARGETS.cervical_ext).toBe(60)
  })

  it('every other target is unchanged', () => {
    const { hip_er, hip_ir, hip_abd, shoulder_flex, ankle_df, cervical_rot, cervical_lat, shoulder_er, ...rest } = JOINT_SCORE_TARGETS
    void hip_er; void hip_ir; void hip_abd; void shoulder_flex; void ankle_df; void cervical_rot; void cervical_lat; void shoulder_er
    expect(rest).toEqual({
      hip_flex: 120, lumbar_flex: 60, lumbar_ext: 25, cervical_flex: 50, cervical_ext: 60,
    })
  })

  // [joint, Steady at, just under (Building), lowest Building value on the 0.5 deg input grid, Needs focus]
  // (hip IR: 0.90 x 26 = 23.4 is off the 0.5 grid; in JS 23.4 / 26 is 0.8999..., so 23.5 is the first Building value)
  const CASES: Array<[string, number, number, number, number]> = [
    ['hip_er', 29, 28, 26.5, 26],
    ['hip_ir', 26, 25, 23.5, 23],
    ['hip_abd', 40, 39, 36, 35.5],
    ['shoulder_flex', 140, 139, 126, 125.5],
    ['ankle_df', 6, 5.5, 5.4, 5], // cm
    ['cervical_rot', 70, 69, 63, 62.5],
    ['shoulder_er', 85, 84, 76.5, 76],
    ['cervical_lat', 38, 37.5, 34.5, 34], // 0.90 x 38 = 34.2, off the 0.5 grid
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

  it('old 45 / 90 / 180 / 20 numbers are no longer needed for Steady', () => {
    expect(bandScoreFromTargetRatio(30, JOINT_SCORE_TARGETS.hip_er)).toBe(3)
    expect(bandScoreFromTargetRatio(27, JOINT_SCORE_TARGETS.hip_ir)).toBe(3)
    expect(bandScoreFromTargetRatio(45, JOINT_SCORE_TARGETS.hip_abd)).toBe(3)
    expect(bandScoreFromTargetRatio(160, JOINT_SCORE_TARGETS.shoulder_flex)).toBe(3) // Gill 2020 average adult
    expect(bandScoreFromTargetRatio(9.5, JOINT_SCORE_TARGETS.ankle_df)).toBe(3)       // Konor 2012 average adult
    expect(bandScoreFromTargetRatio(85, JOINT_SCORE_TARGETS.shoulder_er)).toBe(3)     // standing goal-post target 85
    expect(bandScoreFromTargetRatio(75, JOINT_SCORE_TARGETS.shoulder_er)).toBe(1)     // a top-of-range tucked-elbow reading is not Steady at 85
    expect(bandScoreFromTargetRatio(71, JOINT_SCORE_TARGETS.cervical_rot)).toBe(3)    // Swinkels 2014 50-59 mean rotation
    expect(bandScoreFromTargetRatio(38, JOINT_SCORE_TARGETS.cervical_lat)).toBe(3)    // Swinkels 2014 50-59 mean side bend
  })

  it('ankle step shows no typical range (only the "Best of 3, in cm" note)', () => {
    const ankle = STEPS.find(s => s.fields.some(f => f.key === 'ankle_df_l'))!
    for (const f of ankle.fields) {
      const field = f as typeof f & { rangeSource?: string }
      expect(field.rangeSource).toBeUndefined()
      expect(f.referenceNote).toBe('Best of 3, in cm')
    }
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

describe('neck: NO typical range on screen (Jim, Oct 6)', () => {
  const neckSteps = STEPS.filter(s => s.fields.some(f => f.key.startsWith('cervical_')))

  it('side bend and flexion/extension steps exist; no Base step collects neck rotation', () => {
    const keys = neckSteps.flatMap(s => s.fields.map(f => f.key))
    expect(keys).toEqual(expect.arrayContaining(['cervical_lat_l', 'cervical_lat_r', 'cervical_flex', 'cervical_ext']))
    expect(keys.some(k => k.startsWith('cervical_rot'))).toBe(false)
  })

  it('no range numbers and no range source on the side-bend fields', () => {
    const lat = STEPS.find(s => s.id === 'cervical_lat')!
    for (const f of lat.fields) {
      const field = f as typeof f & { rangeSource?: string }
      expect([f.key, f.normalLow, f.normalHigh, field.rangeSource]).toEqual([f.key, undefined, undefined, undefined])
    }
  })

  it('side bend is still scored live against 38', () => {
    const lat = STEPS.find(s => s.id === 'cervical_lat')!
    expect(getScore('38', lat.fields[0])).toBe(3)
    expect(getScore('37', lat.fields[1])).toBe(2)
  })
})
