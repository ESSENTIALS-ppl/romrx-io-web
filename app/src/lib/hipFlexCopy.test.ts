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
  jointPercentsForAssessment,
  jointDisplayRowsForAssessment,
  radarSideRowsForAssessment,
  mobilityScoreForAssessment,
  overallBandForAssessment,
  sideBandsForJoint,
  JOINT_SCORE_TARGETS,
} from './mobilityBands'
import { gateAssessment, gateJointScores } from './hipFlexGate'
import { hipFlexScoredFor, setHipFlexScoredAtMs } from './hipFlexCutoverState'
import {
  HIP_FLEX_LEFT_RIGHT_DIFFERENT,
  HIP_FLEX_RESULT_LINE_SEX_KNOWN,
  HIP_FLEX_STEP,
  HIP_FLEX_TYPICAL_RANGE,
  HIP_FLEX_RANGE_SOURCE,
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
  it("Jim's SLR copy, exact (Oct 6 12:07 PM decision; Stacy PASS Oct 6 12:07)", () => {
    expect(HIP_FLEX_STEP.position).toEqual([
      'Lie flat on your back, legs straight out, the backs of your knees resting on the floor.',
      'Place your phone flat on top of your thigh, midway between your hip and knee. It stays on that spot the whole time you lift your leg.',
      'Tap Start, then keep your leg flat on the ground and hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.',
    ])
    expect(HIP_FLEX_STEP.howTo).toEqual([
      "Slowly lift one leg, keeping the knee straight, until you can't go higher without bending the knee or lifting your hips.",
      'Pause for 2.5 seconds so the meter can lock in the range.',
      'Tap Use this number for this leg. Lower the leg slowly. Tap Start again and repeat with the other leg. Each leg gets its own number.',
    ])
    expect(HIP_FLEX_STEP.mistake).toBe('Your other leg lifts, your knee bends, or your hips come up.')
    expect(HIP_FLEX_STEP.mistakeFix).toBe('Keep your other leg flat on the floor, your knee straight and your hips down. If any of these change, redo the lift.')
    expect(HIP_FLEX_STEP.meterGrip).toBe('Phone flat on top of your mid-thigh. It stays there the whole lift.')
    // Kept unchanged
    expect(HIP_FLEX_STEP.why).toBe('You raise one straight leg and read the angle. Each leg is measured on its own, so you can see both sides.')
    expect(HIP_FLEX_STEP.tool).toBe('Your phone. Lying on the floor.')
    expect(HIP_FLEX_TYPICAL_RANGE).toBe('Typical range: 120°')
    expect(HIP_FLEX_RANGE_SOURCE).toBe('Source: Youdas et al., 2005')
    const step = STEPS.find(s => s.id === 'hip_flex')!
    expect(step.title).toBe('Hip Flexion (Straight-Leg Raise)')
    expect(step.position).toEqual([...HIP_FLEX_STEP.position])
    expect(step.howTo).toEqual([...HIP_FLEX_STEP.howTo])
    expect(step.mistake).toBe(HIP_FLEX_STEP.mistake)
    expect(step.mistakeFix).toBe(HIP_FLEX_STEP.mistakeFix)
    expect(step.meter?.grip).toBe(HIP_FLEX_STEP.meterGrip)
    expect(step.fields.map(f => [f.key, f.label])).toEqual([['hip_flex_l', 'Left leg'], ['hip_flex_r', 'Right leg']])
  })
  it('no hand, low back or "presses down" anywhere in the SLR step (Jim, Oct 6 12:07 PM)', () => {
    const strings: string[] = []
    const walk = (v: unknown) => {
      if (typeof v === 'string') strings.push(v)
      else if (Array.isArray(v)) v.forEach(walk)
      else if (v && typeof v === 'object') Object.values(v).forEach(walk)
    }
    walk(HIP_FLEX_STEP)
    const step = STEPS.find(s => s.id === 'hip_flex')!
    walk([step.title, step.why, step.tool, step.position, step.howTo, step.mistake, step.mistakeFix, step.meter])
    expect(strings.length).toBeGreaterThanOrEqual(10)
    for (const t of strings) {
      expect(t).not.toMatch(/hand/i)
      expect(t).not.toMatch(/low(er)? back|small of your back/i)
      expect(t).not.toMatch(/press(es)? down/i)
    }
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
      expect(f.normalLow).toBeUndefined()
      expect(f.normalHigh).toBeUndefined()
      expect(f.riskBelow).toBeUndefined()
    }
  })
  it('measure screen only prints a range when a field has one', () => {
    const s = readFileSync(join(SRC, 'pages', 'AssessmentMeasure.tsx'), 'utf8')
    expect(s).toMatch(/field\.rangeSource && field\.normalLow != null/)
  })
})

describe('FG-36: hip flexion is scored against one target, so the sex-known copy still renders for NO ONE', () => {
  const FORBIDDEN = /your sex|compared by sex|compared with|passive|rough guide|youdas|published (averages|passive)|men and women/i
  const GENDERS = ['male', 'female', 'Female', ' male ', 'MALE', '', 'prefer_not_to_say', 'other', null, undefined, '  ']

  it('the global unscored flag is off (hip flexion is scored); older assessments are gated per assessment instead', () => {
    expect(HIP_FLEX_UNSCORED_FALLBACK).toBe(false)
  })

  it('the "Saved for each leg, not scored." line is gone from the copy and from every screen', () => {
    for (const f of ['lib/hipFlexCopy.ts', 'pages/MyBody.tsx', 'pages/MyProtocol.tsx', 'pages/AssessmentMeasureScreen.tsx', 'pages/assessmentSteps2.ts']) {
      expect(readFileSync(join(SRC, f), 'utf8')).not.toMatch(/not scored/i)
    }
  })

  it('every gender gets the neutral why line and the "Saved for each leg" note, and no extra line', () => {
    for (const g of GENDERS) {
      const c = hipFlexScreenCopy(g as string, 60, 60)
      expect(c.why).toBe(HIP_FLEX_STEP.why)
      expect(c.inputNote).toBe('Saved for each leg')
      expect(c.lines).toEqual([])
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
    const text = [step.title, step.why, ...step.position, ...step.howTo, step.mistake, step.mistakeFix, HIP_FLEX_LEFT_RIGHT_DIFFERENT].join(' ')
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
    expect(src).toMatch(/HIP_FLEX_SEX_COPY && hipFlexSexKnown/)
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
    expect(screen).toMatch(/referenceNote: SHOW_SLR_TYPICAL_RANGE \? HIP_FLEX_TYPICAL_RANGE : hipCopy\.inputNote/)
    expect(screen).toMatch(/SHOW_SLR_TYPICAL_RANGE && <p data-range-source>\{HIP_FLEX_RANGE_SOURCE\}/)
    const a = readFileSync(join(SRC, 'pages', 'Assessment.tsx'), 'utf8')
    expect(a).toMatch(/gender=\{profile\?\.gender\}/)
    const steps = STEPS.find(s => s.id === 'hip_flex')!
    for (const f of steps.fields) expect(f.referenceNote).toBeUndefined()
  })
})

describe('straight-leg raise typical range (Grant, Oct 5 11:14 PM: OFF)', () => {
  it('toggle is OFF: no number and no source line for SLR', async () => {
    const m = await import('./hipFlexCopy')
    expect(m.SHOW_SLR_TYPICAL_RANGE).toBe(true)
    expect(m.HIP_FLEX_TYPICAL_RANGE).toBe('Typical range: 120°')
    const step = STEPS.find(s => s.id === 'hip_flex')!
    for (const f of step.fields) { expect(f.rangeSource).toBeUndefined(); expect(f.normalLow).toBeUndefined() }
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

describe('FG-36: hip flexion is scored at 120, from the cutover (scoring_cutovers.hip_flex_scored)', () => {
  const full = {
    hip_er_l: 30, hip_er_r: 30, hip_ir_l: 30, hip_ir_r: 30, hip_abd_l: 45, hip_abd_r: 45,
    shoulder_er_l: 90, shoulder_er_r: 90, shoulder_flex_l: 150, shoulder_flex_r: 150,
    ankle_df_l: 8, ankle_df_r: 8, cervical_lat_l: 40, cervical_lat_r: 40, cervical_flex: 45, cervical_ext: 50,
  }
  const POST = '2026-11-05T12:00:00Z'
  const PRE = '2026-10-20T12:00:00Z'
  const CUT = Date.parse('2026-11-03T00:00:00Z')
  const lowRaise = { ...full, hip_flex_l: 68, hip_flex_r: 68 }
  const goodRaise = { ...full, hip_flex_l: 125, hip_flex_r: 125 }

  it('no joint is unscored and the target is 120', () => {
    expect(isUnscoredJoint('hip_flex')).toBe(false)
    expect(isUnscoredJoint('hip_flex_l')).toBe(false)
    expect(JOINT_SCORE_TARGETS.hip_flex).toBe(120)
  })

  it('on an assessment at or after the cutover: 68 deg is Needs focus and hip flexion is in the /100; 125 deg is Steady', () => {
    setHipFlexScoredAtMs(CUT)
    try {
      const low = gateAssessment({ ...lowRaise, assessed_at: POST })
      expect(jointBandsForAssessment(low).get('hip_flex')).toBe(1)
      expect(jointPercentsForAssessment(low).has('hip_flex')).toBe(true)
      expect(mobilityScoreForAssessment(low)).toBeLessThan(mobilityScoreForAssessment({ ...goodRaise, assessed_at: POST }))
      expect(overallBandForAssessment(low)).toBe(1)
      const good = gateAssessment({ ...goodRaise, assessed_at: POST })
      expect(jointBandsForAssessment(good).get('hip_flex')).toBe(3)
      expect(overallBandForAssessment(good)).toBe(3)
      expect(radarSideRowsForAssessment(good).find(r => r.key === 'hip_flex')!.measured).toBe(true)
      expect(sideBandsForJoint('hip_flex_l', { left: 125, right: 125 }, 3).left).toBe(3)
    } finally { setHipFlexScoredAtMs(null) }
  })

  it('an older assessment renders exactly as before: hip flexion removed from bands, %, /100, worst joints and the My Body bar', () => {
    setHipFlexScoredAtMs(CUT)
    try {
      const old = gateAssessment({ ...lowRaise, assessed_at: PRE, worst_joints: ['hip_flex_l', 'ankle_df_l'] })
      expect(old.hip_flex_l).toBeNull()
      expect(jointBandsForAssessment(old).has('hip_flex')).toBe(false)
      expect(jointPercentsForAssessment(old).has('hip_flex')).toBe(false)
      expect(mobilityScoreForAssessment(old)).toBe(mobilityScoreForAssessment(full))
      expect(overallBandForAssessment(old)).toBe(overallBandForAssessment(full))
      expect(old.worst_joints).toEqual(['ankle_df_l'])
      expect(jointDisplayRowsForAssessment(old).find(r => r.key === 'hip_flex')!.left).toBeNull()
      const rows = [{ joint_key: 'hip_flex', score: 1 }, { joint_key: 'hip_abd', score: 3 }]
      expect(gateJointScores(old, rows)).toEqual([{ joint_key: 'hip_abd', score: 3 }])
      expect(gateJointScores({ ...lowRaise, assessed_at: POST }, rows)).toEqual(rows)
    } finally { setHipFlexScoredAtMs(null) }
  })

  it('cutover unknown (row, table or read access missing): EVERYTHING is pre-cutover, even a brand-new row', () => {
    setHipFlexScoredAtMs(null)
    const a = gateAssessment({ ...lowRaise, assessed_at: POST })
    expect(a.hip_flex_l).toBeNull()
    expect(jointBandsForAssessment(a).has('hip_flex')).toBe(false)
    expect(hipFlexScoredFor({ assessed_at: POST })).toBe(false)
  })

  it('the boundary: exactly at the cutover counts, one second before does not; created_at is used when assessed_at is missing', () => {
    setHipFlexScoredAtMs(CUT)
    try {
      expect(hipFlexScoredFor({ assessed_at: '2026-11-03T00:00:00Z' })).toBe(true)
      expect(hipFlexScoredFor({ assessed_at: '2026-11-02T23:59:59Z' })).toBe(false)
      expect(hipFlexScoredFor({ created_at: '2026-11-04T00:00:00Z' })).toBe(true)
    } finally { setHipFlexScoredAtMs(null) }
  })

  it('the loader reads one row, never caches a miss, and the pages use the gate', () => {
    const loader = readFileSync(join(SRC, 'lib', 'hipFlexCutover.ts'), 'utf8')
    expect(loader).toMatch(/from\('scoring_cutovers'\)\.select\('effective_at'\)\.eq\('key', 'hip_flex_scored'\)/)
    expect(readFileSync(join(SRC, 'hooks', 'useProfile.ts'), 'utf8')).toMatch(/gateAssessment\(rawAssessment\)/)
    expect(readFileSync(join(SRC, 'pages', 'ResultsPreview.tsx'), 'utf8')).toMatch(/gateAssessment\(rawAssessment\)/)
    expect(readFileSync(join(SRC, 'pages', 'Settings.tsx'), 'utf8')).toMatch(/rawHistory\.map\(a => gateAssessment\(a\)\)/)
    const page = readFileSync(join(SRC, 'pages', 'MyBody.tsx'), 'utf8')
    expect(page).toMatch(/r\.key !== 'hip_flex' \|\| r\.left != null \|\| r\.right != null/)
    expect(page).toMatch(/r\.key !== 'hip_flex' \|\| r\.measured/)
  })

  it('live measure-screen chip works for hip flexion (target 120)', () => {
    expect(getScore('68', { key: 'hip_flex_l', label: 'Left' })).toBe(1)
    expect(getScore('130', { key: 'hip_flex_r', label: 'Right' })).toBe(3)
  })
})
