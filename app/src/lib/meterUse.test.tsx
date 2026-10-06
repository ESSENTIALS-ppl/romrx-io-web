// @vitest-environment jsdom
/**
 * Phone meter in the real Base measure screen: permission only on tap, lock + one ding, Use this
 * number calls the SAME handleChange(key, value) as typing (so scoring and saving are unchanged),
 * and denied/unsupported falls back to typing.
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const dings = { lock: 0, tick: 0, unlock: 0 }
vi.mock('./meterAudio', () => ({
  unlockMeterAudio: () => { dings.unlock++ },
  playLockDing: () => { dings.lock++ },
  playCountdownTick: () => { dings.tick++ },
  resumeMeterAudio: () => {},
}))

import { AssessmentMeasureScreen } from '../pages/AssessmentMeasureScreen'
import { STEPS } from '../pages/assessmentSteps'
import { __resetSensorForTests, feedOrientation } from './meterSensor'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root, host: HTMLDivElement
const SER = STEPS.findIndex(s => s.id === 'shoulder_er')
const HIPABD = STEPS.findIndex(s => s.id === 'hip_abd')

function mount(stepIdx: number, handleChange: (k: string, v: string) => void, values: Record<string, string> = {}) {
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  act(() => {
    root.render(createElement(AssessmentMeasureScreen, {
      stepIdx, values, loading: false, error: '', gender: null,
      setPhase: () => {}, setStepIdx: () => {}, handleChange, handleNext: () => {},
    }))
  })
}
const $ = (sel: string) => host.querySelector(sel) as HTMLElement | null
const btn = (text: string) => [...host.querySelectorAll('button')].find(b => b.textContent?.trim().includes(text)) as HTMLButtonElement | undefined
const click = (el: Element | null | undefined) => act(() => { (el as HTMLElement).click() })
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve() }) }
/** Phone flat, pitching about its x axis: tilt since Zero = beta - 10. */
const feed = (tilt: number, n = 1) => act(() => { for (let i = 0; i < n; i++) feedOrientation(30, 10 + tilt, 0) })
const advance = (ms: number, tilt: number) => { for (let t = 0; t < ms; t += 50) { feed(tilt); act(() => { vi.advanceTimersByTime(50) }) } }
/** Tap Zero and let the 5 s countdown finish at the start position (tilt 0). */
const zeroNow = () => { click(btn('Zero')); advance(5050, 0) }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] })
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })
  ;(window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = class {}
  __resetSensorForTests()
  dings.lock = 0; dings.tick = 0; dings.unlock = 0
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers() })

describe('phone meter in the Base measure screen', () => {
  it('iOS: requestPermission is NOT called on load or when the meter opens, only on the Start sensor tap', async () => {
    const req = vi.fn(() => Promise.resolve('granted'))
    ;(window as unknown as { DeviceOrientationEvent: { requestPermission?: unknown } }).DeviceOrientationEvent.requestPermission = req
    mount(SER, () => {})
    expect(req).not.toHaveBeenCalled()
    click($('[data-measure-btn="shoulder_er_l"]'))
    expect(req).not.toHaveBeenCalled()
    click(btn('Start sensor'))
    expect(req).toHaveBeenCalledTimes(1)
    expect(dings.unlock).toBe(1)        // audio unlocked inside the same tap
    await flush()
  })

  it('full flow: Start, Zero, move, hold 2.5 s -> Locked + one ding; Use this number == typing the number', async () => {
    const calls: [string, string][] = []
    mount(SER, (k, v) => calls.push([k, v]))
    click($('[data-measure-btn="shoulder_er_l"]'))
    click(btn('Start sensor'))
    await flush()
    feed(0, 12)                                     // first readings -> live
    expect(btn('Zero')).toBeTruthy()
    zeroNow()
    advance(400, 45)                                // moving
    advance(600, 90)
    expect($('[data-locked-badge]')!.className).toContain('opacity-0')
    advance(2600, 90)                               // hold still 2.6 s
    expect(host.textContent).toContain('Locked: 90°')
    expect(dings.lock).toBe(1)
    advance(2000, 130)                              // move after lock: stays frozen, no second ding
    expect($('[data-meter-number]')!.textContent).toContain('90')
    expect($('[data-meter-peak]')!.textContent).toBe('90°')   // Peak frozen while locked
    expect(dings.lock).toBe(1)
    click(btn('Use this number'))
    expect(calls).toEqual([['shoulder_er_l', '90']])
    // Typing 90 in the same box produces the identical call, so scoring/saving cannot differ.
    const typed: [string, string][] = []
    act(() => root.unmount()); host.remove()
    mount(SER, (k, v) => typed.push([k, v]))
    const input = $('#m-shoulder_er_l') as HTMLInputElement
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, '90'); input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(typed).toEqual([['shoulder_er_l', '90']])
  })

  it('after Use this number on Left the meter moves to Right and asks for Zero', async () => {
    mount(SER, () => {})
    click($('[data-measure-btn="shoulder_er_l"]'))
    click(btn('Start sensor')); await flush(); feed(0, 12)
    zeroNow(); advance(3000, 70)
    click(btn('Use this number'))
    expect(host.textContent).toContain('Measuring: Right')
    expect(host.textContent).toContain('Left saved: 70°')
    expect($('[data-meter-status]')!.textContent).toMatch(/tap Zero/i)
  })

  it('Reset unlocks back to live (Peak restarts from the current reading) and can lock again', async () => {
    mount(SER, () => {})
    click($('[data-measure-btn="shoulder_er_l"]'))
    click(btn('Start sensor')); await flush(); feed(0, 12)
    zeroNow(); advance(3000, 60)
    expect(host.textContent).toContain('Locked: 60°')
    advance(500, 30)
    click(btn('Reset'))
    advance(100, 30)
    expect($('[data-locked-badge]')!.className).toContain('opacity-0')
    expect($('[data-meter-peak]')!.textContent).toBe('30°')
    advance(2700, 30)
    expect(host.textContent).toContain('Locked: 30°')
    expect(dings.lock).toBe(2)
  })

  it('Zero: 5-4-3-2-1 shown big, one soft tick per number (5), then zeroes at the start position and goes live', async () => {
    mount(HIPABD, () => {})
    click($('[data-measure-btn="hip_abd_l"]'))
    click(btn('Start sensor')); await flush(); feed(0, 12)
    click(btn('Zero'))
    const seen: string[] = []
    seen.push($('[data-countdown]')!.textContent!)
    expect(dings.tick).toBe(1)
    expect($('[data-meter-status]')!.textContent).toBe('Hold the start position...')
    for (let i = 0; i < 4; i++) { advance(1000, 0); seen.push($('[data-countdown]')?.textContent ?? 'none') }
    expect(seen).toEqual(['5', '4', '3', '2', '1'])
    expect(dings.tick).toBe(5)
    expect(btn('Use this number')!.disabled).toBe(true)
    advance(1050, 0)                                 // 5 s: zeroed, live
    expect($('[data-countdown]')).toBeNull()
    expect(dings.tick).toBe(5)                       // no extra pip at zero
    expect($('[data-meter-number]')!.textContent).toBe('0°')
    expect(btn('Use this number')!.disabled).toBe(false)
    advance(3000, 0)                                 // still at start: never locks within 2 deg of zero
    expect(host.textContent).not.toContain('Locked:')
    advance(3000, 40)
    expect(host.textContent).toContain('Locked: 40°')
    expect(dings.lock).toBe(1)
  })

  it('no lock during the countdown, even if held still away from the start', async () => {
    mount(SER, () => {})
    click($('[data-measure-btn="shoulder_er_l"]'))
    click(btn('Start sensor')); await flush(); feed(0, 12)
    zeroNow(); advance(3000, 60)
    expect(host.textContent).toContain('Locked: 60°')
    click(btn('Zero'))                               // Zero while locked: unlocks, countdown starts
    expect($('[data-locked-badge]')!.className).toContain('opacity-0')
    advance(4500, 60)                                // held still at 60 during the countdown
    expect(dings.lock).toBe(1)
    expect(host.textContent).not.toContain('Locked:')
    advance(600, 60)                                 // zeroes here: 60 becomes the new 0
    expect($('[data-meter-number]')!.textContent).toBe('0°')
  })

  it('Reset during the countdown cancels it cleanly: no more ticks, not zeroed', async () => {
    mount(SER, () => {})
    click($('[data-measure-btn="shoulder_er_l"]'))
    click(btn('Start sensor')); await flush(); feed(0, 12)
    click(btn('Zero')); advance(2000, 0)
    expect(dings.tick).toBe(3)
    expect(btn('Reset')!.disabled).toBe(false)
    click(btn('Reset'))
    advance(5000, 30)
    expect(dings.tick).toBe(3)
    expect($('[data-countdown]')).toBeNull()
    expect(host.textContent).not.toContain('Locked:')
    expect(btn('Use this number')!.disabled).toBe(true)
    expect($('[data-meter-status]')!.textContent).toBe('Tap Zero, then hold the start position while it counts down from 5.')
  })

  it('Close during the countdown cancels it: no more ticks', async () => {
    mount(SER, () => {})
    click($('[data-measure-btn="shoulder_er_l"]'))
    click(btn('Start sensor')); await flush(); feed(0, 12)
    click(btn('Zero')); advance(1000, 0)
    expect(dings.tick).toBe(2)
    click(host.querySelector('[aria-label="Close"]'))
    expect($('[data-phone-meter]')).toBeNull()
    act(() => { vi.advanceTimersByTime(6000) })
    expect(dings.tick).toBe(2)
  })

  it('denied: clear fallback, typed entry still works', async () => {
    ;(window as unknown as { DeviceOrientationEvent: { requestPermission?: unknown } }).DeviceOrientationEvent.requestPermission = () => Promise.resolve('denied')
    const calls: [string, string][] = []
    mount(SER, (k, v) => calls.push([k, v]))
    click($('[data-measure-btn="shoulder_er_l"]'))
    click(btn('Start sensor')); await flush()
    expect(host.textContent).toContain('Motion access is off, so type your number in the box.')
    expect($('#m-shoulder_er_l')).toBeTruthy()
  })

  it('no readings (desktop-like): falls back to typing after 2.5 s', async () => {
    mount(SER, () => {})
    click($('[data-measure-btn="shoulder_er_l"]'))
    click(btn('Start sensor')); await flush()
    act(() => { vi.advanceTimersByTime(2600) })
    expect(host.textContent).toContain('This device is not sending motion readings, so type your number in the box.')
  })

  it('no touch screen (desktop): no meter button, a short typing note, inputs present', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true })
    const had = 'ontouchstart' in window
    const saved = (window as unknown as { ontouchstart?: unknown }).ontouchstart
    delete (window as unknown as { ontouchstart?: unknown }).ontouchstart
    delete (Object.getPrototypeOf(window) as { ontouchstart?: unknown }).ontouchstart
    mount(SER, () => {})
    if (had) (window as unknown as { ontouchstart?: unknown }).ontouchstart = saved
    expect($('[data-measure-btn]')).toBeNull()
    expect($('[data-desktop-note]')).toBeTruthy()
    expect($('#m-shoulder_er_l')).toBeTruthy()
  })

  it('typed-only steps (lumbar, ankle cm) never show the meter', () => {
    for (const id of ['lumbar', 'ankle_df']) {
      mount(STEPS.findIndex(s => s.id === id), () => {})
      expect($('[data-measure-btn]')).toBeNull()
      act(() => root.unmount()); host.remove()
      mount(SER, () => {})                           // keep afterEach happy
    }
  })

  it('no debug readout unless ?debug=1', async () => {
    mount(SER, () => {})
    click($('[data-measure-btn="shoulder_er_l"]'))
    click(btn('Start sensor')); await flush(); feed(0, 12); zeroNow(); advance(200, 20)
    expect($('[data-meter-debug]')).toBeNull()
    expect(host.textContent).not.toMatch(/β|γ|α|quaternion|twist|tilt/i)
  })
})
