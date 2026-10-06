// @vitest-environment jsdom
/**
 * Shoulder flexion sitting (Jim, Oct 6 11:54 AM) in the real Base measure screen: the step says sitting in a chair,
 * the cues and the open Setup lines render, and nothing says standing or lying.
 */
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./meterAudio', async (orig) => {
  const real = await orig<typeof import('./meterAudio')>()
  return { ...real, unlockMeterAudio: () => {}, playLockDing: () => {}, playMeterTone: () => Promise.resolve(true) }
})

import { AssessmentMeasureScreen } from '../pages/AssessmentMeasureScreen'
import { STEPS } from '../pages/assessmentSteps'
import { __resetSensorForTests } from './meterSensor'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const SFLEX = STEPS.findIndex(s => s.id === 'shoulder_flex')

let root: Root, host: HTMLDivElement
function mount() {
  const calls: [string, string][] = []
  function Harness() {
    const [values, setValues] = useState<Record<string, string>>({})
    return createElement(AssessmentMeasureScreen, {
      stepIdx: SFLEX, values, loading: false, error: '', gender: null,
      setPhase: () => {}, setStepIdx: () => {}, handleNext: () => {},
      handleChange: (k: string, v: string) => { calls.push([k, v]); setValues(s => ({ ...s, [k]: v })) },
    })
  }
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  act(() => { root.render(createElement(Harness)) })
  return calls
}

beforeEach(() => {
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })
  ;(window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = class {}
  __resetSensorForTests()
})
afterEach(() => { act(() => root.unmount()); host.remove() })

describe('shoulder flexion sitting: what the screen shows', () => {
  it('Setup (open list) says sitting, shows the grip and the countdown line; cues and mistake render; no standing or lying', () => {
    mount()
    const t = host.textContent!
    expect(t).toContain('Your phone. Sitting in a chair with a back.')
    const setup = [...host.querySelectorAll('li')].map(li => li.textContent ?? '')
    for (const line of STEPS[SFLEX].position) {
      const li = [...host.querySelectorAll('li')].find(el => el.textContent?.includes(line))
      expect(li, line).toBeTruthy()
      expect(li!.closest('[data-help-body]'), line).toBeNull()
    }
    expect(setup.some(l => l.includes('Sit tall with your back against the chair'))).toBe(true)
    for (const cue of ["Keep your back against the chair. Don't arch your back or lean back.", 'Keep your wrist straight.', "Don't bend your elbow or turn your arm out.", "Don't shrug your shoulder up to your ear.", 'Arching your back or leaning back to get the arm higher.']) expect(t).toContain(cue)
    expect(t).toContain('Phone in that hand, standing on its long side, in line with your arm. Screen faces out, away from your body.')
    expect(t).not.toMatch(/Your phone\. Standing|Stand tall|lie on your back|lying/i)
  })
})
