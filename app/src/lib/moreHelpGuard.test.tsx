// @vitest-environment jsdom
/**
 * Stacy guardrail (Oct 6, 11:43): Setup and any not-medical-advice or warm-up text must stay visible,
 * never hidden under "More help". More help may hold only How to Measure, Common mistake and the lock tip.
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./track', () => ({ track: () => {}, trackPageView: () => {} }))

import { AssessmentMeasureScreen } from '../pages/AssessmentMeasureScreen'
import { AssessmentPhases } from '../pages/AssessmentPhases'
import { STEPS } from '../pages/assessmentSteps'
import { SETUP_STEPS } from '../pages/assessmentMeta'
import { ROMeter } from '../pages/ROMeter'
import { ROMETER_COPY } from './rometerCopy'
import { __resetSensorForTests } from './meterSensor'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const SRC = resolve(__dirname, '..')
/** Words that mark safety / not-medical-advice / warm-up text. None of it may live under More help. */
const MUST_STAY_VISIBLE = /medical|advice|warm[ -]?up|stop if|hurts|pain|doctor|injur|Setup/i

let root: Root | null = null, host: HTMLDivElement
function mount(el: ReturnType<typeof createElement>) {
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  act(() => { root!.render(el) })
}
const $ = (sel: string) => host.querySelector(sel) as HTMLElement | null
const noop = () => {}

beforeEach(() => {
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })
  ;(window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = class {}
  __resetSensorForTests()
})
afterEach(() => { if (root) act(() => root!.unmount()); root = null; host?.remove() })

describe('More help never hides Setup, warm-up or not-medical-advice text (Stacy, Oct 6)', () => {
  const meterSteps = STEPS.map((s, i) => [s, i] as const).filter(([s]) => !!s.meter)
  it('there are meter steps to check', () => { expect(meterSteps.length).toBeGreaterThan(0) })

  for (const [step, idx] of meterSteps) {
    it(`${step.id}: Setup always shows; safety or warm-up wording is never behind More help`, () => {
      mount(createElement(AssessmentMeasureScreen, {
        stepIdx: idx, values: {}, loading: false, error: '', gender: null,
        setPhase: noop, setStepIdx: noop, handleNext: noop, handleChange: noop,
      }))
      expect(host.textContent).toContain('Setup')
      for (const line of step.position) expect(host.textContent).toContain(line)
      const safety = [...step.howTo, step.mistake, step.mistakeFix].filter(l => MUST_STAY_VISIBLE.test(l))
      if (safety.length) {
        // A step with safety wording in its help keeps it open: no More help, every line on screen.
        expect($('[data-more-help]')).toBeNull()
        for (const l of safety) expect(host.textContent).toContain(l)
        return
      }
      const toggle = $('[data-more-help]') as HTMLButtonElement
      expect(toggle).toBeTruthy()
      expect(toggle.getAttribute('aria-expanded')).toBe('false')
      expect($('[data-help-body]')).toBeNull()
      expect(host.textContent).toContain('Setup')
      for (const line of step.position) expect(host.textContent).toContain(line)
      act(() => { toggle.click() })
      const body = $('[data-help-body]')!.textContent!
      expect(body).not.toMatch(MUST_STAY_VISIBLE)
      for (const line of step.position) expect(body).not.toContain(line)
    })
  }

  it('the help body in the source renders only How to Measure, Common mistake and the lock tip', () => {
    const s = readFileSync(join(SRC, 'pages', 'AssessmentMeasureScreen.tsx'), 'utf8')
    const start = s.indexOf('data-help-body')
    const end = s.indexOf('</div>)}', start)
    expect(start).toBeGreaterThan(0); expect(end).toBeGreaterThan(start)
    const block = s.slice(start, end)
    expect(block).not.toMatch(/step\.position|SETUP_STEPS|disclaimer|DISCLAIMER|medical|warm/i)
    expect(s.indexOf('>Setup<')).toBeLessThan(s.indexOf('data-more-help'))   // Setup sits above the toggle, outside it
  })

  it('the setup screen shows the warm-up step openly, with no More help', () => {
    const warm = SETUP_STEPS.find(x => /warm/i.test(x.label))!
    expect(warm).toBeTruthy()
    mount(createElement(AssessmentPhases, {
      phase: 'setup', stepIdx: 0, values: {}, email: '', fullName: '', loading: false, error: '',
      setPhase: noop, setStepIdx: noop, setEmail: noop, setFullName: noop, handleChange: noop, handleNext: noop, handleLeadSubmit: noop,
    }))
    expect(host.textContent).toContain(warm.label)
    expect(host.textContent).toContain(warm.detail)
    expect($('[data-more-help]')).toBeNull()
    expect(host.querySelector('details')).toBeNull()
  })

  it('the ROMeter page shows its not-medical-advice line openly, with no More help', () => {
    mount(createElement(ROMeter))
    expect($('[data-rometer-disclaimer]')!.textContent).toContain(ROMETER_COPY.disclaimer)
    expect($('[data-more-help]')).toBeNull()
    expect(host.querySelector('details')).toBeNull()
  })
})

describe('the SLR safety lines stay on screen (Stacy guardrail)', () => {
  // Jim, Oct 6 12:07 PM: his SLR copy replaced both fields that held "Stop if you feel sharp pain." and
  // "Stop at a firm stretch, not at pain.", so the step has no stop line today. SHIP BLOCKER (Stacy): add the
  // cleared "Stop if anything hurts." as an always-visible line once Jim says yes. Until then this checks that
  // any safety wording the step does have is on screen without tapping anything.
  it('hip_flex shows any safety wording without tapping anything', () => {
    const idx = STEPS.findIndex(s => s.id === 'hip_flex')
    mount(createElement(AssessmentMeasureScreen, {
      stepIdx: idx, values: {}, loading: false, error: '', gender: null,
      setPhase: noop, setStepIdx: noop, handleNext: noop, handleChange: noop,
    }))
    const step = STEPS[idx]
    for (const l of [...step.position, ...step.howTo, step.mistake, step.mistakeFix].filter(l => MUST_STAY_VISIBLE.test(l))) {
      expect(host.textContent).toContain(l)
    }
    for (const l of step.position) expect(host.textContent).toContain(l)
  })
})
