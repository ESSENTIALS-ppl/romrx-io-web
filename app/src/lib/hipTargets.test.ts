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
  bandScoreForJoint,
  narrowBuffer,
  jointBandsForAssessment,
  jointPercent,
  overallBandForAssessment,
} from './mobilityBands'
import { getScore } from '../pages/assessmentMeta'
import { STEPS } from '../pages/assessmentSteps'

const SRC = resolve(__dirname, '..')

// Range reset (Jim Oct 21 2026 4:15 PM ET, range-proposal.md): targets = pooled mean minus 1 SD (WITH Wadhwa 2024 for the neck).
// hip ER 23, hip IR 24 (PMIDs 9742472, 1881956); shoulder flexion 141 (PMID 33046038); ankle 6.1 cm (PMID 41723909);
// neck side bend 37, flexion 39, extension 48 (PMIDs 23829201, 32626769, 33868830, 39677250). hip abd 40, shoulder ER 85, neck rotation 70 unchanged.
describe('Steady targets (range reset Oct 21): hips, shoulder flexion, ankle, neck', () => {
  it('hip ER 23, hip IR 24, hip abduction 40, shoulder flexion 141, ankle 6.1 cm', () => {
    expect(JOINT_SCORE_TARGETS.hip_er).toBe(23)
    expect(JOINT_SCORE_TARGETS.hip_ir).toBe(24)
    expect(JOINT_SCORE_TARGETS.hip_abd).toBe(40)
    expect(JOINT_SCORE_TARGETS.shoulder_flex).toBe(141)
    expect(JOINT_SCORE_TARGETS.ankle_df).toBe(6.1)
  })

  it('shoulder ER 85 (standing goal-post, Oct 6 8:19 PM); shoulder flexion 141', () => {
    expect(JOINT_SCORE_TARGETS.shoulder_er).toBe(85)
    expect(JOINT_SCORE_TARGETS.shoulder_flex).toBe(141)
  })

  it('neck rotation 70 unchanged; neck side bend 37, flexion 39, extension 48 (pooled, with Wadhwa)', () => {
    expect(JOINT_SCORE_TARGETS.cervical_rot).toBe(70)
    expect(JOINT_SCORE_TARGETS.cervical_lat).toBe(37)
    expect(JOINT_SCORE_TARGETS.cervical_flex).toBe(39)
    expect(JOINT_SCORE_TARGETS.cervical_ext).toBe(48)
  })

  it('every other target is unchanged', () => {
    const { hip_er, hip_ir, hip_abd, shoulder_flex, ankle_df, cervical_rot, cervical_lat, shoulder_er, cervical_flex, cervical_ext, ...rest } = JOINT_SCORE_TARGETS
    void hip_er; void hip_ir; void hip_abd; void shoulder_flex; void ankle_df; void cervical_rot; void cervical_lat; void shoulder_er; void cervical_flex; void cervical_ext
    expect(rest).toEqual({
      hip_flex: 120, lumbar_flex: 60, lumbar_ext: 25,
    })
  })

  // [joint, Steady at, just under (Building), lowest Building value on the 0.5 deg input grid, Needs focus]
  // 0.90 x target off the 0.5 grid: hip ER 20.7, hip IR 21.6, shoulder flexion 126.9, neck side bend 33.3; ankle 0.90 x 6.1 = 5.49 cm.
  const CASES: Array<[string, number, number, number, number]> = [
    ['hip_er', 23, 22.5, 21, 20.5],
    ['hip_ir', 24, 23.5, 22, 21.5],
    ['hip_abd', 40, 39, 36, 35.5],
    ['shoulder_flex', 141, 140, 127, 126.5],
    ['ankle_df', 6.1, 6, 5.5, 5.4], // cm
    ['cervical_rot', 70, 69, 63, 62.5],
    ['shoulder_er', 85, 84, 76.5, 76],
    ['cervical_lat', 37, 36.5, 33.5, 33],
  ]
  for (const [joint, steady0, under0, buildingFloor0, needsFocus0] of CASES) {
    const t = JOINT_SCORE_TARGETS[joint]
    // T1 option A (Oct 21): on narrow joints every cutoff sits E lower; shift the cases by E (0 on shoulder flexion)
    const E = narrowBuffer(joint)
    const [steady, under, buildingFloor, needsFocus] = [steady0, under0, buildingFloor0, needsFocus0].map(v => Math.round((v - E) * 100) / 100)
    it(`${joint}: ${steady} → Steady, ${under} → not Steady (Building), ${needsFocus} → Needs focus`, () => {
      expect(bandScoreForJoint(joint, steady, t)).toBe(3)
      expect(bandScoreForJoint(joint, under, t)).toBe(2)
      expect(bandScoreForJoint(joint, buildingFloor, t)).toBe(2)
      expect(bandScoreForJoint(joint, needsFocus, t)).toBe(1)
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

  // Neck flexion / extension are single (midline) fields. Scoring target now equals the step normalLow (fixes 53/64 shown vs 50/60 scored).
  for (const [joint, steady, under, buildingFloor, needsFocus] of [['cervical_flex', 39, 38.5, 35.5, 35], ['cervical_ext', 48, 47.5, 43.5, 43]] as const) {
    it(`${joint}: ${steady} Steady, ${under} Building, ${buildingFloor} Building, ${needsFocus} Needs focus; target equals normalLow`, () => {
      const t = JOINT_SCORE_TARGETS[joint]
      expect([bandScoreFromTargetRatio(steady, t), bandScoreFromTargetRatio(under, t), bandScoreFromTargetRatio(buildingFloor, t), bandScoreFromTargetRatio(needsFocus, t)]).toEqual([3, 2, 2, 1])
      const f = STEPS.flatMap(s => s.fields).find(x => x.key === joint)!
      expect(f.normalLow).toBe(t)
      expect(jointBandsForAssessment({ [joint]: steady }).get(joint)).toBe(3)
      expect(jointBandsForAssessment({ [joint]: under }).get(joint)).toBe(2)
    })
  }

  it('every ranged step: scoring target equals the step normalLow (Typical range text and band agree)', () => {
    for (const f of STEPS.flatMap(s => s.fields)) {
      if (f.normalLow == null || f.key.startsWith('lumbar_') || f.key.startsWith('hip_flex')) continue
      expect([f.key, f.normalLow]).toEqual([f.key, JOINT_SCORE_TARGETS[f.key.replace(/_(l|r)$/, '')]])
    }
  })

  it('ankle step shows Typical range 6.1-12.9 cm (McBride 2026, PMID 41723909, all ages)', () => {
    const ankle = STEPS.find(s => s.fields.some(f => f.key === 'ankle_df_l'))!
    for (const f of ankle.fields) {
      const field = f as typeof f & { rangeSource?: string }
      expect([field.normalLow, field.normalHigh, field.rangeSource, f.referenceNote]).toEqual([6.1, 12.9, 'McBride et al., 2026', undefined])
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
    expect(getScore('35', step.fields[0])).toBe(3) // T1 option A: 35 + 5 buffer reaches 40
    expect(getScore('34', step.fields[1])).toBe(2)
  })
})

describe('neck: NO typical range on screen (Jim, Oct 6)', () => {
  const neckSteps = STEPS.filter(s => s.fields.some(f => f.key.startsWith('cervical_')))

  it('side bend and flexion/extension steps exist; no Base step collects neck rotation', () => {
    const keys = neckSteps.flatMap(s => s.fields.map(f => f.key))
    expect(keys).toEqual(expect.arrayContaining(['cervical_lat_l', 'cervical_lat_r', 'cervical_flex', 'cervical_ext']))
    expect(keys.some(k => k.startsWith('cervical_rot'))).toBe(false)
  })

  it('side bend shows Typical range 37-52 (pooled, with Wadhwa 2024)', () => {
    const lat = STEPS.find(s => s.id === 'cervical_lat')!
    for (const f of lat.fields) {
      const field = f as typeof f & { rangeSource?: string }
      expect([f.key, f.normalLow, f.normalHigh, field.rangeSource]).toEqual([f.key, 37, 52, 'Pooled: Tousignant-Laflamme 2013, Wolan-Nieroda 2020, Canovas-Ambit 2021, Wadhwa 2024'])
    }
  })

  it('side bend is scored live against 37', () => {
    const lat = STEPS.find(s => s.id === 'cervical_lat')!
    expect(getScore('37', lat.fields[0])).toBe(3)
    expect(getScore('36', lat.fields[1])).toBe(2)
  })
})
