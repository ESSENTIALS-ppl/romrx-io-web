// @vitest-environment jsdom
/**
 * Jim, Oct 6 12:26 PM: "We don't want you hurt, so stop if anything hurts." shows on every Base step with
 * More help closed, under the Setup list, outside any collapsible.
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./track', () => ({ track: () => {}, trackPageView: () => {} }))

import { AssessmentMeasureScreen } from '../pages/AssessmentMeasureScreen'
import { STEPS } from '../pages/assessmentSteps'
import { STOP_LINE } from './stopLine'
import { METER_COPY } from './meterCopy'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let host: HTMLDivElement
let root: Root
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host) })
afterEach(() => { act(() => root.unmount()); host.remove() })
const noop = () => {}

describe('stop line on every Base step (Jim, Oct 6 12:26 PM)', () => {
  it('exact words', () => {
    expect(STOP_LINE).toBe("We don't want you hurt, so stop if anything hurts.")
    expect(STEPS.length).toBeGreaterThanOrEqual(9)
  })
  for (const [idx, step] of STEPS.entries()) {
    it(`${step.id}: visible with More help closed, right after Setup, not in a collapsible`, () => {
      act(() => root.render(createElement(AssessmentMeasureScreen, {
        stepIdx: idx, values: {}, loading: false, error: '', gender: null,
        setPhase: noop, setStepIdx: noop, handleNext: noop, handleChange: noop,
      } as never)))
      const lines = host.querySelectorAll('[data-stop-line]')
      expect(lines.length).toBe(1)
      const el = lines[0] as HTMLElement
      expect(el.textContent).toBe(STOP_LINE)
      expect(el.closest('details, [data-help-body]')).toBeNull()
      const more = host.querySelector('[data-more-help]')
      if (more) expect(more.getAttribute('aria-expanded') ?? 'false').not.toBe('true')
      const t = host.textContent ?? ''
      expect(t.indexOf(step.position[step.position.length - 1])).toBeLessThan(t.indexOf(STOP_LINE))
    })
  }
  it('the angle-step button says exactly Measure', () => {
    expect(METER_COPY.measureButton).toBe('Measure')
  })
})
