/**
 * Hip flexion hotfix (Oct 3, 2026): the Base step is a straight-leg raise, so it
 * is never judged low or high. Guards: copy rules (Stacy), no 100-120 range
 * shown, and the safe fallback (no band, no %, not in /100, not a weak spot).
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  HIP_FLEX_UNSCORED_FALLBACK,
  isUnscoredJoint,
  jointBandsForAssessment,
  jointPercent,
  jointPercentsForAssessment,
  jointDisplayRowsForAssessment,
  radarSideRowsForAssessment,
  mobilityScoreForAssessment,
  overallBandForAssessment,
  overallBandFromJointScores,
  sideBandsForJoint,
  sidePercent,
  topProblemAreas,
  topProblemAreasForAssessment,
  scoredJointKeysWorstFirst,
} from './mobilityBands'
import {
  HIP_FLEX_FALLBACK_LINE,
  HIP_FLEX_LEFT_RIGHT_DIFFERENT,
  HIP_FLEX_RESULT_LINE_SEX_KNOWN,
  HIP_FLEX_STEP,
  HIP_FLEX_WHY_SEX_KNOWN,
  HIP_FLEX_INPUT_NOTE_SEX_KNOWN,
  HIP_FLEX_INPUT_NOTE_FALLBACK,
  HIP_FLEX_HONESTY_LINE,
  hipFlexLegsDiffer,
  hipFlexSexKnown,
  hipFlexScreenCopy,
  hipFlexWhy,
  hipFlexInputNote,
  hipFlexShowSexKnownCopy,
} from './hipFlexCopy'
import { STEPS } from '../pages/assessmentSteps'
import { getScore } from '../pages/assessmentMeta'

const SRC = resolve(__dirname, '..')
const BANNED = /\b(normal|required|tight|injury|injuries|risk)\b/i

const ALL_COPY = [
  HIP_FLEX_FALLBACK_LINE,
  HIP_FLEX_LEFT_RIGHT_DIFFERENT,
  HIP_FLEX_RESULT_LINE_SEX_KNOWN,
  HIP_FLEX_STEP.why,
  HIP_FLEX_STEP.tool,
  HIP_FLEX_WHY_SEX_KNOWN,
  HIP_FLEX_INPUT_NOTE_SEX_KNOWN,
  HIP_FLEX_INPUT_NOTE_FALLBACK,
  HIP_FLEX_HONESTY_LINE,
  HIP_FLEX_STEP.mistake,
  HIP_FLEX_STEP.mistakeFix,
  ...HIP_FLEX_STEP.position,
  ...HIP_FLEX_STEP.howTo,
]

describe('hip flexion copy (Stacy rules)', () => {
  it('uses none of: normal, required, tight, injury, risk', () => {
    for (const t of ALL_COPY) expect(t).not.toMatch(BANNED)
  })
  it('no em or en dashes', () => {
    for (const t of ALL_COPY) expect(t).not.toMatch(/[\u2014\u2013]/)
  })
  it('exact required phrases', () => {
    expect(HIP_FLEX_RESULT_LINE_SEX_KNOWN).toBe('Compared with published averages for healthy adults of your sex (Youdas et al., 2005)')
    expect(HIP_FLEX_LEFT_RIGHT_DIFFERENT).toBe('Left and right are different')
  })
  it('instruction: straight-leg raise on the back, hand under low back, stop at a firm stretch', () => {
    const all = [...HIP_FLEX_STEP.position, ...HIP_FLEX_STEP.howTo].join(' ')
    expect(all).toMatch(/on your back/)
    expect(all).toMatch(/hand under the small of your low back/)
    expect(all).toMatch(/firm stretch/)
    expect(all).toMatch(/knee completely straight/)
  })
  it('stop cues: firm stretch, or sooner when the low back presses down onto the hand; sharp pain; never "lifts off your hand"', () => {
    const how = HIP_FLEX_STEP.howTo.join(' ')
    expect(how).toContain('Stop when you feel a firm stretch behind the thigh, or sooner when your low back presses down onto your hand.')
    expect(how).toContain('Stop if you feel sharp pain.')
    expect(HIP_FLEX_STEP.mistake).toContain('press down')
    expect(HIP_FLEX_STEP.mistakeFix).toContain('Stop at a firm stretch, not at pain.')
    expect(HIP_FLEX_STEP.mistakeFix).toContain('when your low back presses down onto your hand')
    const all = [...ALL_COPY].join(' ')
    expect(all).not.toMatch(/lifts? off your hand/i)
  })
  it('does not claim the active raise equals the passive published values', () => {
    for (const t of ALL_COPY) expect(t).not.toMatch(/equivalent|same as|matches the published/i)
  })
  it('the live step shows no degree number as a normal or target', () => {
    const step = STEPS.find(s => s.id === 'hip_flex')!
    const text = [step.title, step.why, ...step.position, ...step.howTo, step.mistake, step.mistakeFix].join(' ')
    expect(text).not.toMatch(BANNED)
    expect(text).not.toMatch(/\b(100|120|68)\b/)
    for (const f of step.fields) {
      expect(f.unscored).toBe(true)
      expect(f.normalLow).toBeUndefined()
      expect(f.normalHigh).toBeUndefined()
      expect(f.riskBelow).toBeUndefined()
    }
  })
  it('measure screen only prints a range when a field has one', () => {
    const s = readFileSync(join(SRC, 'pages', 'AssessmentMeasure.tsx'), 'utf8')
    expect(s).toMatch(/!field\.unscored && field\.normalLow != null/)
  })
})

describe('Stacy edit (Oct 4): while HIP_FLEX_UNSCORED_FALLBACK is true, the sex-known copy renders for NO ONE', () => {
  const FORBIDDEN = /your sex|compared by sex|compared with|passive|rough guide|youdas|published (averages|passive)|men and women/i
  const GENDERS = ['male', 'female', 'Female', ' male ', 'MALE', '', 'prefer_not_to_say', 'other', null, undefined, '  ']

  it('the flag is on', () => {
    expect(HIP_FLEX_UNSCORED_FALLBACK).toBe(true)
  })

  it('exact fallback line: "Saved for each leg, not scored." (no Youdas sentence)', () => {
    expect(HIP_FLEX_FALLBACK_LINE).toBe('Saved for each leg, not scored.')
  })

  it('every gender gets the neutral why line, the "Saved for each leg" note and the fallback line', () => {
    for (const g of GENDERS) {
      const c = hipFlexScreenCopy(g as string, 60, 60)
      expect(c.why).toBe(HIP_FLEX_STEP.why)
      expect(c.inputNote).toBe('Saved for each leg')
      expect(c.lines).toEqual(['Saved for each leg, not scored.'])
      expect(hipFlexWhy(g as string)).toBe(HIP_FLEX_STEP.why)
      expect(hipFlexInputNote(g as string)).toBe('Saved for each leg')
      expect(hipFlexShowSexKnownCopy(g as string)).toBe(false)
    }
  })

  it('no "your sex", "Compared by sex", "passive", "rough guide", Youdas anywhere in returned copy, for any gender, with or without a left/right gap', () => {
    for (const g of GENDERS) {
      for (const [l, r] of [[60, 60], [70, 55], [null, null], [NaN, 40]] as const) {
        const c = hipFlexScreenCopy(g as string, l, r)
        const all = [c.why, c.inputNote, ...c.lines].join(' | ')
        expect(all).not.toMatch(FORBIDDEN)
      }
    }
  })

  it('the base step text and the screens that render hip copy contain none of it', () => {
    const step = STEPS.find(s => s.id === 'hip_flex')!
    const text = [step.title, step.why, ...step.position, ...step.howTo, step.mistake, step.mistakeFix, HIP_FLEX_FALLBACK_LINE, HIP_FLEX_LEFT_RIGHT_DIFFERENT].join(' ')
    expect(text).not.toMatch(FORBIDDEN)
    for (const f of ['MyBody.tsx', 'MyProtocol.tsx', 'AssessmentMeasure.tsx', 'AssessmentMeasureScreen.tsx', 'assessmentMeta.ts', 'assessmentSteps2.ts']) {
      const src = readFileSync(join(SRC, 'pages', f), 'utf8')
      expect(src).not.toMatch(/youdas|compared by sex|rough guide|your sex/i)
    }
  })

  it('the sex-known strings stay in the file (unused while the flag is on) for the follow-up', () => {
    expect(HIP_FLEX_WHY_SEX_KNOWN).toContain('adults of your sex')
    expect(HIP_FLEX_INPUT_NOTE_SEX_KNOWN).toBe('Compared by sex after you finish')
    expect(HIP_FLEX_HONESTY_LINE).toContain('rough guide')
    expect(HIP_FLEX_RESULT_LINE_SEX_KNOWN).toContain('Youdas')
    const src = readFileSync(join(SRC, 'lib', 'hipFlexCopy.ts'), 'utf8')
    expect(src).toMatch(/!HIP_FLEX_UNSCORED_FALLBACK && hipFlexSexKnown/)
  })

  it('hipFlexSexKnown itself is unchanged (male/female only)', () => {
    expect(hipFlexSexKnown('male')).toBe(true)
    expect(hipFlexSexKnown('Female')).toBe(true)
    for (const g of ['', 'other', 'prefer_not_to_say', null, undefined]) expect(hipFlexSexKnown(g as string)).toBe(false)
  })

  it('the honesty line is not in the base step text', () => {
    const base = [HIP_FLEX_STEP.why, ...HIP_FLEX_STEP.position, ...HIP_FLEX_STEP.howTo, HIP_FLEX_STEP.mistake, HIP_FLEX_STEP.mistakeFix].join(' ')
    expect(base).not.toContain('rough guide')
  })

  it('left and right are different shows for everyone when the legs are 10 degrees apart', () => {
    for (const g of ['male', '']) {
      expect(hipFlexScreenCopy(g, 70, 55).lines).toContain('Left and right are different')
      expect(hipFlexScreenCopy(g, 70, 65).lines).not.toContain('Left and right are different')
    }
  })

  it('the measure screen is wired to the pure function and the profile gender', () => {
    const screen = readFileSync(join(SRC, 'pages', 'AssessmentMeasureScreen.tsx'), 'utf8')
    expect(screen).toMatch(/hipFlexScreenCopy\(p\.gender/)
    expect(screen).toMatch(/referenceNote: hipCopy\.inputNote/)
    const a = readFileSync(join(SRC, 'pages', 'Assessment.tsx'), 'utf8')
    expect(a).toMatch(/gender=\{profile\?\.gender\}/)
    const steps = STEPS.find(s => s.id === 'hip_flex')!
    for (const f of steps.fields) expect(f.referenceNote).toBeUndefined()
  })
})

describe('left and right are different', () => {
  it('only when the legs differ by 10 degrees or more, and both are entered', () => {
    expect(hipFlexLegsDiffer(60, 49)).toBe(true)
    expect(hipFlexLegsDiffer(60, 50)).toBe(true)
    expect(hipFlexLegsDiffer(60, 51)).toBe(false)
    expect(hipFlexLegsDiffer(60, null)).toBe(false)
    expect(hipFlexLegsDiffer(NaN, 60)).toBe(false)
  })
})

describe('safe fallback: hip flexion is never judged', () => {
  it('constant is on and covers hip_flex only', () => {
    expect(HIP_FLEX_UNSCORED_FALLBACK).toBe(true)
    expect(isUnscoredJoint('hip_flex')).toBe(true)
    expect(isUnscoredJoint('hip_flex_l')).toBe(true)
    expect(isUnscoredJoint('hip_flex_r')).toBe(true)
    expect(isUnscoredJoint('hip_abd')).toBe(false)
    expect(isUnscoredJoint('shoulder_flex_l')).toBe(false)
  })

  // Average man ~68 deg, average woman ~76 deg: the old 120 target called both "Needs focus".
  const avgMan = { hip_flex_l: 68, hip_flex_r: 68 }
  const FULL_STEADY = {
    hip_er_l: 50, hip_er_r: 50, hip_ir_l: 50, hip_ir_r: 50, hip_abd_l: 95, hip_abd_r: 95,
    shoulder_er_l: 95, shoulder_er_r: 95, shoulder_flex_l: 180, shoulder_flex_r: 180,
    ankle_df_l: 21, ankle_df_r: 21, cervical_lat_l: 46, cervical_lat_r: 46,
    lumbar_flex: 65, lumbar_ext: 28, cervical_flex: 52, cervical_ext: 65,
  }

  it('no band, no %, no side bands for hip flexion', () => {
    expect(jointBandsForAssessment(avgMan).has('hip_flex')).toBe(false)
    expect(jointPercent('hip_flex', { left: 68, right: 68 })).toBeNull()
    expect(jointPercentsForAssessment(avgMan).has('hip_flex')).toBe(false)
    expect(sideBandsForJoint('hip_flex', { left: 68, right: 40 }, 1)).toEqual({ left: null, right: null })
    expect(sidePercent('hip_flex', 68, null)).toBeNull()
  })

  it('persisted joint_scores rows for hip_flex (old 120 target) are ignored', () => {
    const rows = [{ joint_key: 'hip_flex', score: 1 }]
    expect(jointBandsForAssessment(avgMan, rows).has('hip_flex')).toBe(false)
    expect(overallBandForAssessment(avgMan, rows)).toBeNull()
    expect(overallBandFromJointScores(rows)).toBeNull()
    expect(mobilityScoreForAssessment(avgMan, rows)).toBe(100)
  })

  it('a Steady user with a straight-leg raise of 68 deg stays Steady 100/100', () => {
    const a = { ...FULL_STEADY, ...avgMan }
    const rows = [{ joint_key: 'hip_flex', score: 1 }, { joint_key: 'hip_er', score: 3 }]
    expect(overallBandForAssessment(a, rows)).toBe(3)
    expect(mobilityScoreForAssessment(a, rows)).toBe(100)
    expect(mobilityScoreForAssessment(a)).toBe(mobilityScoreForAssessment(FULL_STEADY))
  })

  it('hip flexion value does not change the /100 or the band at all', () => {
    const base = mobilityScoreForAssessment(FULL_STEADY)
    for (const v of [0, 30, 68, 100, 120, 170]) {
      const a = { ...FULL_STEADY, hip_flex_l: v, hip_flex_r: v }
      expect(mobilityScoreForAssessment(a)).toBe(base)
      expect(overallBandForAssessment(a)).toBe(3)
    }
  })

  it('never a weak spot: dropped from worst_joints / top problem areas', () => {
    expect(topProblemAreas(['hip_flex_l', 'hip_flex_r', 'ankle_df_l', 'hip_ir_l', 'hip_abd_l'])).toEqual(['ankle_df_l', 'hip_ir_l', 'hip_abd_l'])
  })

  describe('top three problem areas come from SCORED joints only (hip removed BEFORE the cut)', () => {
    const base = {
      hip_er_l: 50, hip_er_r: 50, hip_ir_l: 50, hip_ir_r: 50, hip_abd_l: 95, hip_abd_r: 95,
      shoulder_er_l: 95, shoulder_er_r: 95, shoulder_flex_l: 180, shoulder_flex_r: 180,
      ankle_df_l: 21, ankle_df_r: 21, cervical_lat_l: 46, cervical_lat_r: 46,
      lumbar_flex: 65, lumbar_ext: 28, cervical_flex: 52, cervical_ext: 65,
    }
    const hasHip = (keys: string[]) => keys.some(k => k.startsWith('hip_flex'))

    it('hip flexion is the LOWEST score: top 3 are the next three scored joints, hip never appears', () => {
      const a = {
        ...base,
        hip_flex_l: 10, hip_flex_r: 15,          // lowest of all (about 8%)
        shoulder_er_l: 48,                        // 53%
        shoulder_flex_l: 100,                     // 56%
        hip_abd_l: 24.5,                          // 61% (target 40)
        worst_joints: ['hip_flex_l', 'hip_flex_r', 'shoulder_er_l', 'shoulder_flex_l', 'hip_abd_l'],
      }
      const top = topProblemAreasForAssessment(a)
      expect(top).toEqual(['shoulder_er_l', 'shoulder_flex_l', 'hip_abd_l'])
      expect(hasHip(top)).toBe(false)
    })

    it('persisted worst_joints that spent its 5 slots on hip: still a full top 3 (never 2)', () => {
      const a = {
        ...base,
        hip_flex_l: 60, hip_flex_r: 62,
        shoulder_flex_l: 80, shoulder_flex_r: 85,   // 44% / 47%
        hip_abd_l: 20,                              // 50% (target 40)
        shoulder_er_l: 48,                          // 53%
        worst_joints: ['shoulder_flex_l', 'shoulder_flex_r', 'hip_flex_l', 'hip_flex_r', 'hip_abd_l'],
      }
      // Old behavior: dedupe + drop hip AFTER the cut left only 2 items.
      expect(topProblemAreas(a.worst_joints)).toHaveLength(2)
      const top = topProblemAreasForAssessment(a)
      expect(top).toEqual(['shoulder_flex_l', 'hip_abd_l', 'shoulder_er_l'])
      expect(hasHip(top)).toBe(false)
    })

    it('no persisted worst_joints at all: ranked from the scored joints, hip excluded first', () => {
      const a = { ...base, hip_flex_l: 0, hip_flex_r: 0, ankle_df_l: 10, shoulder_er_r: 40, hip_ir_r: 17 } // 17 / 26 = 65%
      expect(scoredJointKeysWorstFirst(a).some(k => k.startsWith('hip_flex'))).toBe(false)
      expect(topProblemAreasForAssessment({ ...a, worst_joints: null })).toEqual(['shoulder_er_r', 'ankle_df_l', 'hip_ir_r'])
      expect(topProblemAreasForAssessment({ ...a, worst_joints: [] })).toEqual(['shoulder_er_r', 'ankle_df_l', 'hip_ir_r'])
    })

    it('fewer than 3 scored joints: returns only those, never hip', () => {
      const a = { hip_flex_l: 5, hip_flex_r: 5, ankle_df_l: 10, ankle_df_r: 12, lumbar_ext: 20, worst_joints: ['hip_flex_l', 'hip_flex_r', 'ankle_df_l'] }
      expect(topProblemAreasForAssessment(a)).toEqual(['ankle_df_l', 'lumbar_ext'])
      expect(topProblemAreasForAssessment({ hip_flex_l: 5, hip_flex_r: 5, worst_joints: ['hip_flex_l'] })).toEqual([])
      expect(topProblemAreasForAssessment({ hip_flex_l: 5, ankle_df_r: 9, worst_joints: ['hip_flex_l'] })).toEqual(['ankle_df_r'])
      expect(topProblemAreasForAssessment(null)).toEqual([])
    })

    it('MyBody and MyProtocol both pick via the scored-only helper', () => {
      for (const f of ['MyBody.tsx', 'MyProtocol.tsx']) {
        expect(readFileSync(join(SRC, 'pages', f), 'utf8')).toMatch(/topProblemAreasForAssessment\(/)
      }
    })
  })

  it('My Body rows flag it unscored and the radar axis is left out by the page', () => {
    const rows = jointDisplayRowsForAssessment({ ...FULL_STEADY, ...avgMan })
    const hip = rows.find(r => r.key === 'hip_flex')!
    expect(hip.unscored).toBe(true)
    expect(hip.band).toBeNull()
    expect(hip.left).toBe(68)
    expect(rows.filter(r => r.unscored).map(r => r.key)).toEqual(['hip_flex'])
    expect(radarSideRowsForAssessment({ ...FULL_STEADY, ...avgMan }).find(r => r.key === 'hip_flex')!.unscored).toBe(true)
    const page = readFileSync(join(SRC, 'pages', 'MyBody.tsx'), 'utf8')
    expect(page).toMatch(/radarSideRowsForAssessment\(assessment, jointScores\)\.filter\(r => !r\.unscored\)/)
  })

  it('My Protocol never ranks it; ResultsPreview never flags its asymmetry', () => {
    const proto = readFileSync(join(SRC, 'pages', 'MyProtocol.tsx'), 'utf8')
    expect(proto).toMatch(/\.filter\(s => !isUnscoredJoint\(s\.def\.key\)\)/)
    const rp = readFileSync(join(SRC, 'pages', 'ResultsPreview.tsx'), 'utf8')
    expect(rp).toMatch(/JOINT_LABELS\[j\.key\] && !isUnscoredJoint\(j\.key\)/)
  })

  it('live measure-screen chip is off for hip flexion', () => {
    expect(getScore('68', { key: 'hip_flex_l', label: 'Left', unscored: true })).toBeNull()
    expect(getScore('68', { key: 'hip_flex_r', label: 'Right' })).toBeNull()
    expect(getScore('35', { key: 'hip_abd_l', label: 'Left' })).toBe(1) // 35 / 40 = 0.875
  })
})
