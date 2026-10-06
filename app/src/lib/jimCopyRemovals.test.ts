/**
 * Jim, Oct 6 2026: no typed-fallback copy (12:12 PM) and no partner copy (12:13 PM). The number boxes and
 * Use this number still work; only the words are gone. desktopNote (waiting on Jim's words) and manualAria
 * (the box's screen-reader label) are kept on purpose.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { METER_COPY } from './meterCopy'
import { HIP_FLEX_STEP } from './hipFlexCopy'
import { SETUP_STEPS } from '../pages/assessmentMeta'
import { STEPS_PART1 } from '../pages/assessmentSteps1'
import { STEPS_PART2 } from '../pages/assessmentSteps2'

const SRC = resolve(__dirname, '..')
const TYPING = /type your number|typing is always|can.t use the (ro)?meter|type it in/i
const PEOPLE = /\bpartner|\bfriend\b|someone else|another person|spotter|buddy/i

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(n => {
    const f = join(dir, n)
    return statSync(f).isDirectory() ? files(f) : /\.(tsx?|jsx?)$/.test(n) && !/\.test\./.test(n) ? [f] : []
  })
}

describe('no typed-fallback copy (Jim, Oct 6 12:12 PM)', () => {
  it('none of the meter status messages say "type your number"', () => {
    for (const k of ['denied', 'inApp', 'error', 'noData'] as const) {
      expect(METER_COPY[k], k).not.toMatch(/type your number/i)
      expect(METER_COPY[k], k).not.toMatch(TYPING)
    }
    for (const [k, v] of Object.entries(METER_COPY)) {
      if (typeof v === 'string' && k !== 'desktopNote' && k !== 'manualPlaceholder') expect(v, k).not.toMatch(/type your number/i)
    }
  })
  it('status messages keep the rest of their words', () => {
    expect(METER_COPY.denied).toMatch(/^Motion access is off\. To use the (ROMeter|meter), close and reopen your browser, then tap Allow when asked\.$/)
    expect(METER_COPY.inApp).toMatch(/^The (ROMeter|meter) may not work inside Instagram or Facebook\. Open this page in Safari or Chrome\.$/)
    expect(METER_COPY.error).toMatch(/^(The ROMeter did not start\. Tap the button again\.|The phone meter did not start\. Tap Turn on the meter again\.)$/)
    expect(METER_COPY.noData).toBe('This device is not sending motion readings.')
  })
  it('no app source outside tests has typed-fallback copy (desktopNote waits on Jim; manualAria is a label)', () => {
    const hits: string[] = []
    for (const f of files(SRC)) {
      readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
        if (TYPING.test(l) && !/manualAria|desktopNote/.test(l)) hits.push(`${f.slice(SRC.length + 1)}:${i + 1}`)
      })
    }
    expect(hits).toEqual([])
  })
})

describe('no partner copy: users hold the phone themselves (Jim, Oct 6 12:13 PM)', () => {
  it('no step copy (every step, setup boxes, SLR) mentions a partner or another person', () => {
    const all: string[] = []
    for (const s of [...STEPS_PART1, ...STEPS_PART2]) all.push(s.title, s.why, s.tool, ...s.position, ...s.howTo, s.mistake, s.mistakeFix, s.meter?.grip ?? '')
    for (const s of SETUP_STEPS) all.push(s.label, s.detail)
    all.push(HIP_FLEX_STEP.tool)
    for (const t of all) {
      expect(t).not.toMatch(/partner/i)
      expect(t).not.toMatch(PEOPLE)
    }
  })
  it('SLR tool line is exactly Jim\'s', () => {
    expect(HIP_FLEX_STEP.tool).toBe('Your phone. Lying on the floor.')
  })
  it('no app source outside tests has partner / other-person copy', () => {
    const hits: string[] = []
    for (const f of files(SRC)) {
      readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (PEOPLE.test(l)) hits.push(`${f.slice(SRC.length + 1)}:${i + 1}`) })
    }
    expect(hits).toEqual([])
  })
})
