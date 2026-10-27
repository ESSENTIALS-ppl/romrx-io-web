// @vitest-environment jsdom
/** One whole-flow count on every screen (Jim, Oct 26 2026 8:10 and 8:12 PM ET): setup is Step 1, ROMood is Step 2,
 * the measure screens are Step 3 to Step 11. Totals come from STEPS.length + 2. The ROMood eyebrow stays as is. */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, describe, expect, it, vi } from 'vitest'
vi.mock('./track', () => ({ track: () => {}, trackPageView: () => {} }))
vi.mock('./supabase', () => ({ supabase: {} }))
import { AssessmentPhases } from '../pages/AssessmentPhases'
import { AssessmentMeasureScreen } from '../pages/AssessmentMeasureScreen'
import { STEPS } from '../pages/assessmentSteps'
import { romoodStepCounter } from './romood'
import { ROMOOD_COPY } from './romoodCopy'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root | null = null, host: HTMLDivElement
function mount(el: ReturnType<typeof createElement>) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  act(() => { root!.render(el) })
}
afterEach(() => { if (root) act(() => root!.unmount()); root = null; host?.remove() })
const noop = () => {}
const counter = () => host.querySelectorAll('[data-testid="flow-counter"]')

describe('whole-flow counter: all 11 screens', () => {
  const TOTAL = STEPS.length + 2
  it('total is 11', () => { expect(TOTAL).toBe(11) })
  it('setup shows Step 1 of 11, once', () => {
    mount(createElement(AssessmentPhases, {
      phase: 'setup', stepIdx: 0, values: {}, email: '', fullName: '', loading: false, error: '',
      setPhase: noop, setStepIdx: noop, setEmail: noop, setFullName: noop, handleChange: noop, handleNext: noop, handleLeadSubmit: noop,
    }))
    expect(counter().length).toBe(1)
    expect(counter()[0].textContent).toBe(`Step 1 of ${TOTAL}`)
  })
  it('ROMood shows Step 2 of 11 (its eyebrow is unchanged, covered in romood.test.tsx)', () => {
    expect(romoodStepCounter(ROMOOD_COPY.counter, STEPS.length)).toBe(`Step 2 of ${TOTAL}`)
  })
  it.each(STEPS.map((s, i) => [i, s.id] as const))('measure step %i (%s) shows Step i+3 of 11', (i) => {
    mount(createElement(AssessmentMeasureScreen, {
      stepIdx: i, values: {}, loading: false, error: '', gender: null,
      setPhase: noop, setStepIdx: noop, handleNext: noop, handleChange: noop,
    }))
    expect(counter().length).toBe(1)
    expect(counter()[0].textContent).toBe(`Step ${i + 3} of ${TOTAL}`)
  })
  it('no label anywhere uses an em dash', () => {
    expect(`Step 1 of ${TOTAL}${romoodStepCounter('flow', STEPS.length)}`).not.toContain('\u2014')
  })
})
