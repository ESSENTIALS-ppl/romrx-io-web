// @vitest-environment jsdom
/** Jim, Oct 6 12:29 PM: the Shoulder Extension step SHOWS "Typical range: 40-75°" with "Gill et al., 2020", same format as other steps. */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./track', () => ({ track: () => {}, trackPageView: () => {} }))

import { AssessmentMeasureScreen } from '../pages/AssessmentMeasureScreen'
import { STEPS } from '../pages/assessmentSteps'
import { METER_COPY } from './meterCopy'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let host: HTMLDivElement
let root: Root
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host) })
afterEach(() => { act(() => root.unmount()); host.remove() })
const noop = () => {}

describe('Shoulder Extension range is shown (Jim, Oct 6 12:29 PM)', () => {
  it('fields carry 40-75 and Gill et al., 2020', () => {
    const s = STEPS.find(x => x.id === 'shoulder_er')!
    expect(s.title).toBe('Shoulder Extension')
    for (const f of s.fields) {
      expect([f.normalLow, f.normalHigh, f.rangeSource, f.unscored]).toEqual([40, 75, 'Gill et al., 2020', undefined])
    }
  })
  it('renders "Typical range: 40-75°" and the Gill source with More help closed, like other ranged steps', () => {
    const idx = STEPS.findIndex(x => x.id === 'shoulder_er')
    act(() => root.render(createElement(AssessmentMeasureScreen, {
      stepIdx: idx, values: {}, loading: false, error: '', gender: null,
      setPhase: noop, setStepIdx: noop, handleNext: noop, handleChange: noop,
    } as never)))
    const t = host.textContent ?? ''
    expect(METER_COPY.typicalRange(40, 75)).toBe('Typical range: 40-75°')
    expect(t).toContain('Typical range: 40-75°')
    expect(t).toContain('Gill et al., 2020')
    const help = host.querySelector('[data-help-body]')
    if (help) expect(help.textContent ?? '').not.toContain('Typical range: 40-75°')
  })
})
