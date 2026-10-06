// @vitest-environment jsdom
/**
 * Before you start (Jim, Oct 6 2026, 12:16 PM, exact words and order) and the app-wide sound words:
 * countdown = beeps, start signal = beep (never GO), finish/lock = ding (never chime).
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./track', () => ({ track: () => {}, trackPageView: () => {} }))

import { AssessmentPhases } from '../pages/AssessmentPhases'
import { METHOD_LINE, SETUP_STEPS } from '../pages/assessmentMeta'
import { STEPS_PART1 } from '../pages/assessmentSteps1'
import { STEPS_PART2 } from '../pages/assessmentSteps2'
import { METER_COPY } from './meterCopy'
import { HIP_FLEX_STEP } from './hipFlexCopy'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const WARM = /^1\) Walk or march in place for 2 minutes\./
const JIM3 = "Tap Start and move into position during the five-second countdown beeps. After the final beep, begin your move. Then hold for 2.5 seconds, and you'll hear a finishing ding."
const PHONE_DETAIL = 'Tap Measure. Your phone may ask for access. If it does, accept it. Hold the phone where the step shows. Tap Use this number to fill it in. Sound on, volume up, and turn off silent mode so you can hear the beeps.'
const SKIP_DETAIL = "If a position is too difficult or you feel any pain, tap Skip. Your score is based on what you complete. You can always try to redo this position during a reassessment if you're able."

let host: HTMLDivElement
let root: Root
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host) })
afterEach(() => { act(() => root.unmount()); host.remove() })
const noop = () => {}

describe('Before you start (Jim, Oct 6 12:16 PM)', () => {
  it('exactly three cards, in Jim\'s order, with his words', () => {
    expect(SETUP_STEPS.map(s => s.label)).toEqual(['Warm up first - 5 minutes', 'Your phone is the meter, and we call it ROMeter.', 'Skip is always OK'])
    expect(SETUP_STEPS[0].detail).toMatch(WARM)
    expect(SETUP_STEPS[1].detail).toBe(PHONE_DETAIL)
    expect(SETUP_STEPS[1].more).toBe(JIM3)
    expect(SETUP_STEPS[2].detail).toBe(SKIP_DETAIL)
    expect(METHOD_LINE).toBe(JIM3)
  })
  it('renders in order on the setup screen; removed cards and the sub-line are gone', () => {
    act(() => root.render(createElement(AssessmentPhases, {
      phase: 'setup', stepIdx: 0, values: {}, email: '', fullName: '', loading: false, error: '',
      setPhase: noop, setStepIdx: noop, setEmail: noop, setFullName: noop, handleChange: noop, handleNext: noop, handleLeadSubmit: noop,
    } as never)))
    const t = host.textContent ?? ''
    const order = ['Before you start:', 'Warm up first - 5 minutes', 'Your phone is the meter, and we call it ROMeter.', PHONE_DETAIL, JIM3, 'Skip is always OK', SKIP_DETAIL]
    let at = -1
    for (const s of order) { const i = t.indexOf(s); expect(i, s).toBeGreaterThan(at); at = i }
    expect(t.split(JIM3).length - 1).toBe(1)
    for (const gone of ['Typing is always OK', 'Partner', 'Solo tip', 'Each step shows where to hold the phone', 'Meet the ROMeter']) expect(t).not.toContain(gone)
  })
})

describe('sound words (Jim, Oct 6 12:16 PM)', () => {
  it('no GO / Go! and no chime anywhere in step, setup or meter copy', () => {
    const all: string[] = [METHOD_LINE, HIP_FLEX_STEP.tool, ...HIP_FLEX_STEP.position, ...HIP_FLEX_STEP.howTo]
    for (const s of [...STEPS_PART1, ...STEPS_PART2]) all.push(s.title, s.why, s.tool, ...s.position, ...s.howTo, s.mistake, s.mistakeFix, s.meter?.grip ?? '')
    for (const s of SETUP_STEPS) all.push(s.label, s.detail, s.more ?? '')
    for (const v of Object.values(METER_COPY)) if (typeof v === 'string') all.push(v)
    for (const t of all) {
      expect(t).not.toMatch(/\bGO\b|\bGo!/)
      expect(t).not.toMatch(/chime/i)
    }
    expect(METER_COPY.go).toBe('Move')
  })
})
