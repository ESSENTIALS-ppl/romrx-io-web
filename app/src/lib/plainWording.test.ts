/**
 * Plain, body-landmark wording on every Base step (Jim, Oct 6 11:45 AM): position and movement lines say
 * 'elbow on the floor', 'inner calf', 'upper body', not anatomy terms. Field labels Flexion / Extension stay
 * (stored keys and input labels), so a line may name them in brackets after the plain words, e.g. 'Chin down (Flexion)'.
 * Step titles and "why" lines are not checked here (titles unchanged on purpose).
 */
import { describe, expect, it } from 'vitest'
import { STEPS_PART1, HIP_ER_PHONE_SPOT } from '../pages/assessmentSteps1'
import { STEPS_PART2 } from '../pages/assessmentSteps2'

const ALL_STEPS = [...STEPS_PART1, ...STEPS_PART2]
const JARGON = /abduct|adduct|lateral|medial|supine|prone|torso|dorsiflex|cobra|hinge|anterior|posterior|sagittal|cervical|lumbar|thoracic|rotat|upper arm|\bflex(ion|ed|es)?\b|\bextension\b/i
/**
 * Strip the allowed bracketed field-label references, e.g. "(Flexion)", and the one Jim-approved, Stacy-PASS cue that says
 * "Rotate" (Quinn's exact shoulder ER words, Oct 6 8:19 PM).
 */
export const SHOULDER_ER_CUE_ROTATE = 'Rotate your hand up and back as far as it goes, keeping your elbow at shoulder height and your back from arching.'
const strip = (t: string) => (t === SHOULDER_ER_CUE_ROTATE ? '' : t.replace(/\((Flexion|Extension)\)/g, ''))

describe('plain wording on every Base step', () => {
  for (const s of ALL_STEPS) {
    it(`${s.id}: setup, how-to, mistake, fix, tool and grip use plain body words`, () => {
      for (const t of [s.tool, ...s.position, ...s.howTo, s.mistake, s.mistakeFix, s.meter?.grip ?? '']) {
        expect(strip(t), `${s.id}: ${t}`).not.toMatch(JARGON)
      }
    })
  }
  it('Flexion / Extension appear only in brackets after plain words, matching the input labels', () => {
    for (const s of ALL_STEPS) for (const t of [...s.position, ...s.howTo]) {
      for (const m of t.matchAll(/\b(Flexion|Extension)\b/g)) expect(t.slice(Math.max(0, m.index! - 1), m.index!), `${s.id}: ${t}`).toBe('(')
    }
  })
  it('hip ER phone spot lives in one constant used by both the setup line and the meter grip', () => {
    const er = STEPS_PART1.find(s => s.id === 'hip_er')!
    expect(er.position).toContain(HIP_ER_PHONE_SPOT.setup)
    expect(er.meter!.grip).toBe(HIP_ER_PHONE_SPOT.grip)
    expect(HIP_ER_PHONE_SPOT.grip).toContain('inner calf')
  })
})
