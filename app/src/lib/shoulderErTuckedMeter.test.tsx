// @vitest-environment jsdom
/**
 * Shoulder ER, tucked elbow lying on your back (Jim, Oct 6 11:45 AM), end to end in the real Base measure screen:
 * shows the new grip and typical range, zeroes with the forearm pointing at the ceiling, and locks at 30, 45 and 75
 * as the hand falls outward, positive, for both arms. Synthetic deviceorientation readings for that pose.
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
import { __resetSensorForTests, feedOrientation } from './meterSensor'
import { METER_COPY } from './meterCopy'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const SER = STEPS.findIndex(s => s.id === 'shoulder_er')
const D = Math.PI / 180

/**
 * W3C (alpha, beta, gamma) for the phone in that hand along the forearm, on its edge, screen facing your head, while
 * lying face up (head north): forearm up at 0, hand falls outward by deg (left arm toward east, right arm toward west).
 * Device x, y, z columns of the device->earth matrix after a turn about the north axis.
 */
function forearmEuler(arm: 'left' | 'right', deg: number): [number, number, number] {
  const c = Math.cos(deg * D), s = Math.sin(deg * D), m = arm === 'left' ? 1 : -1
  const y = [m * s, 0, c]                    // long edge: from straight up toward the outside
  const z = [0, 1, 0]                        // screen faces your head
  const x = [y[1] * z[2] - y[2] * z[1], y[2] * z[0] - y[0] * z[2], y[0] * z[1] - y[1] * z[0]]
  const R = [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]]
  const beta = Math.asin(Math.max(-1, Math.min(1, R[2][1])))
  if (Math.cos(beta) < 1e-9) return [Math.atan2(R[1][0], R[0][0]) / D, beta / D, 0]
  return [Math.atan2(-R[0][1], R[1][1]) / D, beta / D, Math.atan2(-R[2][0], R[2][2]) / D]
}

let root: Root, host: HTMLDivElement
let arm: 'left' | 'right' = 'left'
function mount() {
  const calls: [string, string][] = []
  function Harness() {
    const [values, setValues] = useState<Record<string, string>>({})
    return createElement(AssessmentMeasureScreen, {
      stepIdx: SER, values, loading: false, error: '', gender: null,
      setPhase: () => {}, setStepIdx: () => {}, handleNext: () => {},
      handleChange: (k: string, v: string) => { calls.push([k, v]); setValues(s => ({ ...s, [k]: v })) },
    })
  }
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  act(() => { root.render(createElement(Harness)) })
  return calls
}
const btn = (text: string) => [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === text || b.textContent?.trim().endsWith(` ${text}`)) as HTMLButtonElement | undefined
const click = (el: Element | null | undefined) => act(() => { (el as HTMLElement).click() })
const feed = (deg: number, n = 1) => act(() => { const [a, b, g] = forearmEuler(arm, deg); for (let i = 0; i < n; i++) feedOrientation(a, b, g) })
const advance = (ms: number, deg: number) => { for (let t = 0; t < ms; t += 50) { feed(deg); act(() => { vi.advanceTimersByTime(50) }) } }
/** Locked, and the big number shows deg. Uses data hooks and METER_COPY, not badge wording, so it does not depend on layout copy. */
function expectLockedAt(deg: number) {
  expect(host.querySelector('[data-locked-badge]')!.className).not.toContain('opacity-0')
  expect(parseInt(host.querySelector('[data-meter-number]')!.textContent!.replace(/[^0-9-]/g, ''), 10)).toBe(deg)
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] })
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })
  ;(window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = class {}
  __resetSensorForTests()
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers() })

describe('shoulder_er meter, tucked elbow lying on your back', () => {
  it('shows the new grip and Typical range: 40-75°, never "upper arm"', () => {
    mount()
    expect(host.textContent).toContain('Phone in that hand, along your forearm like a ruler, on its edge, screen facing your head. Wrist straight and stiff.')
    expect(host.textContent).toContain('Typical range: 40-75°')
    expect(host.querySelector('h2')!.textContent).toBe('Shoulder Extension')        // display title only; key stays shoulder_er
    expect(host.textContent).not.toContain('Shoulder External Rotation')
    expect(host.textContent).toContain('elbow on the floor')
    expect(host.textContent).not.toMatch(/upper arm/i)
  })

  for (const which of ['left', 'right'] as const) {
    it(`${which} arm: zero with the forearm up, hand falls 30, 45, 75 -> locks at each; Use saves 75`, async () => {
      arm = which
      const calls = mount()
      const key = which === 'left' ? 'shoulder_er_l' : 'shoulder_er_r'
      if (which === 'right') click(host.querySelector('[data-measure-btn="shoulder_er_r"]'))
      click(btn(METER_COPY.startButton))
      await act(async () => { await Promise.resolve(); await Promise.resolve() })
      feed(0, 12)
      for (const deg of [30, 45, 75]) {
        click(btn(METER_COPY.zeroButton)); advance(5900, 0)          // countdown, zero with the forearm pointing at the ceiling
        advance(400, deg / 2); advance(3000, deg)
        expectLockedAt(deg)
        if (deg !== 75) { click(btn(METER_COPY.resetButton)); advance(200, 0) }
      }
      click(btn(METER_COPY.useButton))
      expect(calls).toEqual([[key, '75']])
    })
  }
})
