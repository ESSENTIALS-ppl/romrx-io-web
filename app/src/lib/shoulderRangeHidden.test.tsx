// @vitest-environment jsdom
/**
 * Stacy, Oct 6 2026 8:19 PM: the standing Shoulder External Rotation step shows NO "Typical range" line and NO source line
 * (the old Gill 40-75 line is removed; Vairo 2012 tested cadets about 19 lying down, so it is not added). Scoring target 85
 * is unchanged by this (JOINT_SCORE_TARGETS). Other ranged steps keep theirs.
 */
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

describe('Shoulder External Rotation shows no typical range (Stacy, Oct 6 8:19 PM)', () => {
  it('fields carry no range, no source, no note', () => {
    const s = STEPS.find(x => x.id === 'shoulder_er')!
    expect(s.title).toBe('Shoulder External Rotation')
    for (const f of s.fields) {
      expect([f.normalLow, f.normalHigh, f.rangeSource, f.referenceNote, f.unscored]).toEqual([undefined, undefined, undefined, undefined, undefined])
    }
  })
  it('renders no "Typical range", no "Source:", no 85-110 / 40-75, with More help closed and open', () => {
    const idx = STEPS.findIndex(x => x.id === 'shoulder_er')
    act(() => root.render(createElement(AssessmentMeasureScreen, {
      stepIdx: idx, values: {}, loading: false, error: '', gender: null,
      setPhase: noop, setStepIdx: noop, handleNext: noop, handleChange: noop,
    } as never)))
    const bad = /Typical range|Source:|Gill|Vairo|85-110|85 to 110|40-75/
    expect(host.textContent ?? '').not.toMatch(bad)
    expect(host.querySelector('[data-range-source]')).toBeNull()
    expect(host.querySelector('[data-field-note="shoulder_er_l"]')).toBeNull()
    expect(host.querySelector('[data-field-note="shoulder_er_r"]')).toBeNull()
    const more = host.querySelector('[data-more-help]') as HTMLButtonElement | null
    if (more) act(() => { more.click() })
    expect(host.textContent ?? '').not.toMatch(bad)
  })
  it('the other ranged steps keep their line (hip ER, hip IR, shoulder flexion)', () => {
    expect(METER_COPY.typicalRange(140, 180)).toBe('Typical range: 140-180°')
    const shown = STEPS.filter(s => s.fields.some(f => f.rangeSource && f.normalLow != null && !f.unscored && !f.referenceNote)).map(s => s.id)
    expect(shown).toEqual(['hip_er', 'hip_ir', 'shoulder_flex'])
  })
})
