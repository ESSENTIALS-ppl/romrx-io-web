/** Phone meter copy rules: no em/en dashes, no accuracy/medical claims, "Protocol" never "Profile", US spelling. */
import { describe, expect, it } from 'vitest'
import { METER_COPY } from './meterCopy'
import { STEPS } from '../pages/assessmentSteps'
import { METHOD_LINE, SETUP_STEPS } from '../pages/assessmentMeta'

const meterStrings = [
  ...(Object.values(METER_COPY).filter(v => typeof v === 'string') as string[]),
  METER_COPY.saved('Left', 48), METER_COPY.nextReady('Right'), METER_COPY.nextReady('Extension'),
  METER_COPY.allSaved(['Left', 'Right']), METER_COPY.allSaved(['Flexion', 'Extension']),
  METER_COPY.manualAria('Left'), METER_COPY.typicalRange(60, 90),
]
const stepStrings = STEPS.flatMap(s => [s.tool, ...s.position, ...s.howTo, s.meter?.grip ?? ''])
const setupStrings = SETUP_STEPS.flatMap(s => [s.label, s.detail])
const ALL = [...meterStrings, ...stepStrings, ...setupStrings]

describe('phone meter copy', () => {
  it('no em or en dashes', () => { for (const t of ALL) expect(t).not.toMatch(/[\u2014\u2013]/) })
  it('no accuracy, clinical or medical claims', () => {
    for (const t of ALL) expect(t).not.toMatch(/clinical|accura|precis|goniometer|diagnos|medical|validated|as good as/i)
  })
  it('never "Profile"', () => { for (const t of ALL) expect(t).not.toMatch(/profile/i) })
  it('never "normal" (Stacy: banned word)', () => { for (const t of ALL) expect(t).not.toMatch(/\bnormal\b/i) })
  it('no other apps named on any step or setup line: no Measure app, Level or Simple Inclinometer', () => {
    for (const t of [...meterStrings, ...setupStrings, ...STEPS.filter(x => x.meter).flatMap(s => [s.tool, ...s.position, ...s.howTo, s.mistakeFix])]) {
      expect(t).not.toMatch(/Simple Inclinometer|Measure app|\bLevel\b|Measure -> Level/)
    }
  })
  it('Stacy pre-clear lines, verbatim', () => {
    expect(METER_COPY.startButton).toBe('Turn on the meter')
    expect(METER_COPY.starting).toBe('Turning on the meter...')
    expect(METER_COPY.startNote).toBe('Your phone may ask to use motion. Tap Allow.')
    expect(METER_COPY.zeroButton).toBe('Start')
    expect(METER_COPY.soundLine).toBe('Sound on, volume up. Turn off silent mode to hear the beeps.')
    expect(METER_COPY.zeroCountdown).toBe('Hold still...')
    expect(METER_COPY.live).toBe('GO. Move slowly to your end range, then hold still.')
    expect(METER_COPY.saved('Left', 48)).toBe('Saved: Left 48°')
    expect(METER_COPY.nextReady('Right')).toBe('Right side ready. Get in position and tap Start.')
    expect(METER_COPY.nextReady('Left')).toBe('Left side ready. Get in position and tap Start.')
    expect(METER_COPY.allSaved(['Left', 'Right'])).toBe('Both sides saved.')
    expect(METER_COPY.denied).toBe('Motion access is off. Type your number in the box. To use the meter, close and reopen your browser, then tap Allow when asked.')
    expect(METER_COPY.inApp).toBe('The meter may not work inside Instagram or Facebook. Open this page in Safari or Chrome, or type your number in the box.')
    expect(METER_COPY.typicalRange(40, 60)).toBe('Typical range: 40-60°')
    expect(METHOD_LINE).toBe('Get in position. Tap Start. Hold still for the countdown. Move on GO. Hold until the ding.')
    const setup = SETUP_STEPS.map(s => s.detail)
    expect(setup).toContain("Can't use the meter? Type your number in the box.")
    expect(setup).toContain('A partner can help. They hold the phone and tap the buttons while you move.')
  })
  it('no meter step or setup line says "Zero" any more', () => {
    const meterSteps = STEPS.filter(s => s.meter).flatMap(s => [s.tool, ...s.position, ...s.howTo, s.meter?.grip ?? ''])
    for (const t of [...meterSteps, ...setupStrings, ...meterStrings]) expect(t).not.toMatch(/\bZero\b/)
  })
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
