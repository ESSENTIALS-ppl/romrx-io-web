/** Phone meter copy rules: no em/en dashes, no accuracy/medical claims, "Protocol" never "Profile", US spelling. */
import { describe, expect, it } from 'vitest'
import { METER_COPY } from './meterCopy'
import { STEPS } from '../pages/assessmentSteps'
import { SETUP_STEPS } from '../pages/assessmentMeta'

const meterStrings = Object.values(METER_COPY).map(v => (typeof v === 'function' ? (v as (...a: unknown[]) => string)('Left', 90, 'Right') : v))
const stepStrings = STEPS.flatMap(s => [s.tool, ...s.position, ...s.howTo, s.meter?.grip ?? ''])
const setupStrings = SETUP_STEPS.flatMap(s => [s.label, s.detail])
const ALL = [...meterStrings, ...stepStrings, ...setupStrings]

describe('phone meter copy', () => {
  it('no em or en dashes', () => { for (const t of ALL) expect(t).not.toMatch(/[\u2014\u2013]/) })
  it('no accuracy, clinical or medical claims', () => {
    for (const t of ALL) expect(t).not.toMatch(/clinical|accura|precis|goniometer|diagnos|medical|validated|as good as/i)
  })
  it('never "Profile"', () => { for (const t of ALL) expect(t).not.toMatch(/profile/i) })
  it('American spelling', () => { for (const t of ALL) expect(t).not.toMatch(/centre|colour|metre\b|calibrat(e|ion) your/i) })
  it('every degree step except lumbar has a meter grip; ankle (cm) and lumbar are typed only', () => {
    for (const s of STEPS) {
      const deg = s.fields.some(f => f.unit === '°')
      if (s.id === 'lumbar' || !deg) expect(s.meter, s.id).toBeUndefined()
      else expect(s.meter?.grip, s.id).toBeTruthy()
    }
  })
  it('no step still tells people to use another app or read the number off it, except typed-only steps', () => {
    for (const s of STEPS.filter(x => x.meter)) {
      const text = [s.tool, ...s.position, ...s.howTo].join(' ')
      expect(text, s.id).not.toMatch(/Simple Inclinometer|Measure -> Level|Read the number/)
    }
  })
})
