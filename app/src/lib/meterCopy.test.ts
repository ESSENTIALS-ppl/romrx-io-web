/** Phone meter copy rules: no em/en dashes, no accuracy/medical claims, "Protocol" never "Profile", US spelling. */
import { describe, expect, it } from 'vitest'
import { METER_COPY, MEASUREMENTS_HEADER } from './meterCopy'
import { STEPS } from '../pages/assessmentSteps'
import { STEPS_PART2 } from '../pages/assessmentSteps2'
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
    expect(METER_COPY.live).toBe('Move slowly to your end range, then hold still.')   // Jim 12:16: no GO
    expect(METER_COPY.saved('Left', 48)).toBe('Saved: Left 48°')
    expect(METER_COPY.nextReady('Right')).toBe('Right side ready. Get in position and tap Start.')
    expect(METER_COPY.nextReady('Left')).toBe('Left side ready. Get in position and tap Start.')
    expect(METER_COPY.allSaved(['Left', 'Right'])).toBe('Both sides saved.')
    expect(METER_COPY.denied).toBe('Motion access is off. To use the meter, close and reopen your browser, then tap Allow when asked.')
    expect(METER_COPY.inApp).toBe('The meter may not work inside Instagram or Facebook. Open this page in Safari or Chrome.')
    expect(METER_COPY.typicalRange(40, 60)).toBe('Typical range: 40-60°')
    expect(METHOD_LINE).toBe("Tap Start and move into position during the five-second countdown beeps. After the final beep, begin your move. Then hold for 2.5 seconds, and you'll hear a finishing ding.")   // Jim 12:16
    const setup = SETUP_STEPS.map(s => s.detail)
    expect(setup.join(' ')).not.toMatch(/type your number|typing is always/i)   // Jim, Oct 6 12:12 PM
    expect(setup.join(' ')).not.toMatch(/partner/i)                              // Jim, Oct 6 12:13 PM
  })
  it('no meter step or setup line says "Zero" any more', () => {
    const meterSteps = STEPS.filter(s => s.meter).flatMap(s => [s.tool, ...s.position, ...s.howTo, s.meter?.grip ?? ''])
    for (const t of [...meterSteps, ...setupStrings, ...meterStrings]) expect(t).not.toMatch(/\bZero\b/)
  })
  it('no step at all (including the typed low-back step) names another app', () => {
    for (const s of STEPS) expect([s.tool, ...s.position, ...s.howTo, s.mistakeFix].join(' '), s.id).not.toMatch(/Simple Inclinometer|Measure app|Measure -> Level|\bLevel\b/)
  })
  it('live low-back step (flag OFF path): Stacy-passed lines, verbatim (Oct 5 11:32 PM)', () => {
    const all = (STEPS_PART2.find(s => s.id === 'lumbar'))!
    expect(all.tool).toBe('Type this one in for now. Use any level you have to read the angle. Standing + Floor.')
    const text = [...all.position, ...all.howTo].join(' ')
    for (const t of ['Set your level to 0 while you stand straight.', 'Set your level to 0 while you lie flat.', 'Note the angle at that point.', 'Note the angle at your end range.']) expect(text).toContain(t)
    expect(text).not.toMatch(/\bzero\b|Read the number/i)
  })
  it('step header is Stacy\'s pre-cleared "Your measurements"; setup tip no longer repeats the countdown (Option A covers it)', () => {
    expect(MEASUREMENTS_HEADER).toBe('Your measurements')
    const tip = SETUP_STEPS.find(s => s.label === 'Your phone is the meter, and we call it ROMeter.')!.detail
    expect(tip).not.toMatch(/countdown|Move on GO|Hold until the ding|Get in position/)
    expect(tip).toContain('Sound on, volume up, and turn off silent mode so you can hear the beeps.')   // Jim 12:16
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
