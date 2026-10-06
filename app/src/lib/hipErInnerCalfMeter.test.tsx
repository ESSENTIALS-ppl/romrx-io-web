// @vitest-environment jsdom
/**
 * Hip ER, end to end in the real Base measure screen with the phone flat on the inner calf
 * (Jim, Oct 6, 11:36 AM): the meter shows the new grip, zeroes on the calf, and locks at the swing
 * angle (30 and 45), positive, for both legs. Synthetic deviceorientation readings for that pose.
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

const HIPER = STEPS.findIndex(s => s.id === 'hip_er')
const D = Math.PI / 180

/**
 * W3C (alpha, beta, gamma) for a phone flat on the inner calf, screen toward the other leg, top toward
 * the knee, while the lower leg swings the foot inward by deg (seated hip ER). Person faces north.
 * Left leg: device x = north, y = up, z = east; the swing turns the long edge toward the other leg.
 */
function innerCalfEuler(leg: 'left' | 'right', deg: number): [number, number, number] {
  const c = Math.cos(deg * D), s = Math.sin(deg * D)
  const m = leg === 'left' ? 1 : -1                                   // which way is "toward the other leg" (east or west)
  // Columns of the device->earth matrix after the swing (rotation about the north axis).
  const x = leg === 'left' ? [0, 1, 0] : [0, -1, 0]
  const y = [-m * s, 0, c]                                             // knee end of the phone tips away as the foot goes in
  const z = [m * c, 0, s]                                              // = x cross y (a proper rotation)
  const R = [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]]
  const det = x[0] * (y[1] * z[2] - y[2] * z[1]) - x[1] * (y[0] * z[2] - y[2] * z[0]) + x[2] * (y[0] * z[1] - y[1] * z[0])
  if (Math.abs(det - 1) > 1e-9) throw new Error('not a rotation')
  const beta = Math.asin(Math.max(-1, Math.min(1, R[2][1])))
  if (Math.cos(beta) < 1e-9) return [Math.atan2(R[1][0], R[0][0]) / D, beta / D, 0]
  return [Math.atan2(-R[0][1], R[1][1]) / D, beta / D, Math.atan2(-R[2][0], R[2][2]) / D]
}

let root: Root, host: HTMLDivElement
let leg: 'left' | 'right' = 'left'
function mount() {
  const calls: [string, string][] = []
  function Harness() {
    const [values, setValues] = useState<Record<string, string>>({})
    return createElement(AssessmentMeasureScreen, {
      stepIdx: HIPER, values, loading: false, error: '', gender: null,
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
const feed = (deg: number, n = 1) => act(() => { const [a, b, g] = innerCalfEuler(leg, deg); for (let i = 0; i < n; i++) feedOrientation(a, b, g) })
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

describe('hip_er meter with the phone flat on the inner calf', () => {
  it('Setup shows both Stacy PASS hip ER cues word for word, in the open Setup list (not under More help)', () => {
    mount()
    const cues = ['Press the phone flat against your leg with your hand the whole time.', 'Move your other knee out to the side and tuck that foot back, out of the way.']
    const items = [...host.querySelectorAll('li')].map(li => li.textContent ?? '')
    for (const c of cues) {
      expect(host.textContent).toContain(c)
      const li = [...host.querySelectorAll('li')].find(el => el.textContent?.includes(c))!
      expect(li, c).toBeTruthy()
      expect(li.closest('[data-help-body]'), c).toBeNull()             // not in the More help body (layout branch)
      expect(li.closest('details:not([open])'), c).toBeNull()
    }
    expect(items.findIndex(t => t.includes(cues[1]))).toBeLessThan(items.findIndex(t => t.includes('INNER calf')))
    expect(items.findIndex(t => t.includes(cues[0]))).toBeGreaterThan(items.findIndex(t => t.includes('INNER calf')))
  })

  it('shows the inner calf grip', () => {
    mount()
    expect(host.textContent).toContain('Phone flat on your inner calf, just below the knee. Screen faces your other leg, long edge along the calf.')
    expect(host.textContent).not.toContain('front of your shin')
  })

  for (const which of ['left', 'right'] as const) {
    it(`${which} leg: zero on the calf, swing 30° locks at 30; swing 45° locks at 45`, async () => {
      leg = which
      const calls = mount()
      const sideKey = which === 'left' ? 'hip_er_l' : 'hip_er_r'
      if (which === 'right') click(host.querySelector(`[data-measure-btn="hip_er_r"]`))
      click(btn(METER_COPY.startButton))
      await act(async () => { await Promise.resolve(); await Promise.resolve() })
      feed(0, 12)
      click(btn(METER_COPY.zeroButton)); advance(5900, 0)                 // countdown, zero at GO on the calf
      advance(400, 15); advance(3000, 30)
      expectLockedAt(30)
      click(btn(METER_COPY.resetButton)); advance(200, 30)                 // Reset re-arms from the current reading; zero is kept
      click(btn(METER_COPY.zeroButton)); advance(5900, 0)                 // re-zero at the start
      advance(400, 20); advance(3000, 45)
      expectLockedAt(45)
      click(btn(METER_COPY.useButton))
      expect(calls).toEqual([[sideKey, '45']])
    })
  }
})
