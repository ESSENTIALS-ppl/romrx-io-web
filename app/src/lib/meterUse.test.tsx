// @vitest-environment jsdom
/**
 * Phone meter in the real Base measure screen: permission only on tap, lock + one ding, Use this
 * number calls the SAME handleChange(key, value) as typing (so scoring and saving are unchanged),
 * one side at a time (Left, then Right, never overwriting Left), and denied/unsupported falls back
 * to typing.
 */
import { act, createElement, useState } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const audio = { lock: 0, tick: 0, go: 0, unlock: 0, log: [] as string[] }
vi.mock('./meterAudio', async (orig) => {
  const real = await orig<typeof import('./meterAudio')>()
  return {
    ...real,
    unlockMeterAudio: () => { audio.unlock++ },
    playLockDing: () => { audio.lock++ },
    playMeterTone: (kind: 'tick' | 'go' | 'ding', wanted: () => boolean = () => true) => {
      if (kind === 'ding') audio.lock++; else if (wanted()) { audio[kind]++; audio.log.push(`${kind}@${Date.now()}`) }
      return Promise.resolve(true)
    },
  }
})

import { AssessmentMeasureScreen } from '../pages/AssessmentMeasureScreen'
import { STEPS } from '../pages/assessmentSteps'
import { __resetSensorForTests, feedOrientation } from './meterSensor'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true

let root: Root, host: HTMLDivElement
const SER = STEPS.findIndex(s => s.id === 'shoulder_er')
const HIPABD = STEPS.findIndex(s => s.id === 'hip_abd')

/** Real parent behavior: values live in state; every change is also recorded. */
function mount(stepIdx: number, calls: [string, string][] = [], initial: Record<string, string> = {}) {
  function Harness() {
    const [values, setValues] = useState(initial)
    return createElement(AssessmentMeasureScreen, {
      stepIdx, values, loading: false, error: '', gender: null,
      setPhase: () => {}, setStepIdx: () => {}, handleNext: () => {},
      handleChange: (k: string, v: string) => { calls.push([k, v]); setValues(s => ({ ...s, [k]: v })) },
    })
  }
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  act(() => { root.render(createElement(Harness)) })
  return calls
}
const $ = (sel: string) => host.querySelector(sel) as HTMLElement | null
const btn = (text: string) => [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === text || b.textContent?.trim().endsWith(` ${text}`)) as HTMLButtonElement | undefined
const click = (el: Element | null | undefined) => act(() => { (el as HTMLElement).click() })
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve() }) }
/** Phone flat, pitching about its x axis: tilt since zero = beta - 10. */
const feed = (tilt: number, n = 1) => act(() => { for (let i = 0; i < n; i++) feedOrientation(30, 10 + tilt, 0) })
const advance = (ms: number, tilt: number) => { for (let t = 0; t < ms; t += 50) { feed(tilt); act(() => { vi.advanceTimersByTime(50) }) } }
async function turnOn() { click(btn('Turn on the meter')); await flush(); feed(0, 12) }
/** Tap Start and let the countdown reach GO (4 s) at the start position, then let GO clear. */
const startNow = () => { click(btn('Start')); advance(5900, 0) }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] })
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })
  ;(window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = class {}
  __resetSensorForTests()
  audio.lock = 0; audio.tick = 0; audio.go = 0; audio.unlock = 0; audio.log = []
})
afterEach(() => { act(() => root.unmount()); host.remove(); vi.useRealTimers() })

describe('phone meter in the Base measure screen', () => {
  it('opens on the first side by itself; iOS requestPermission is called only on the Turn on the meter tap', async () => {
    const req = vi.fn(() => Promise.resolve('granted'))
    ;(window as unknown as { DeviceOrientationEvent: { requestPermission?: unknown } }).DeviceOrientationEvent.requestPermission = req
    mount(SER)
    expect($('[data-phone-meter]')).toBeTruthy()
    expect(host.textContent).toContain('Measuring: Left')
    expect(req).not.toHaveBeenCalled()
    expect(btn('Start sensor')).toBeUndefined()
    expect(host.textContent).toContain('Sound on, volume up. Turn off silent mode to hear the beeps.')
    click(btn('Turn on the meter'))
    expect(req).toHaveBeenCalledTimes(1)
    await flush()
  })

  it('full flow: Turn on, Start, move, hold 2.5 s -> Locked + one ding; Use this number == typing the number', async () => {
    const calls = mount(SER)
    await turnOn()
    expect(btn('Start')).toBeTruthy()
    startNow()
    advance(400, 45)
    advance(600, 90)
    expect($('[data-locked-badge]')!.className).toContain('opacity-0')
    advance(2600, 90)
    expect(host.textContent).toContain('Locked: 90°')
    expect(audio.lock).toBe(1)
    advance(2000, 130)                              // move after lock: stays frozen, no second ding
    expect($('[data-meter-number]')!.textContent).toContain('90')
    expect($('[data-meter-peak]')!.textContent).toBe('90°')
    expect(audio.lock).toBe(1)
    click(btn('Use this number'))
    expect(calls).toEqual([['shoulder_er_l', '90']])
    act(() => root.unmount()); host.remove()
    const typed = mount(SER)
    const input = $('#m-shoulder_er_l') as HTMLInputElement
    act(() => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!
      setter.call(input, '90'); input.dispatchEvent(new Event('input', { bubbles: true }))
    })
    expect(typed).toEqual([['shoulder_er_l', '90']])
  })

  it('fill bug: Use fills Left, Left collapses to "Saved: Left 70°", Right goes active, second Use fills Right (Left untouched)', async () => {
    const calls = mount(SER)
    await turnOn()
    startNow(); advance(3000, 70)
    click(btn('Use this number'))
    expect(calls).toEqual([['shoulder_er_l', '70']])
    expect($('[data-saved-row="shoulder_er_l"]')!.textContent).toContain('Saved: Left 70°')
    expect($('#m-shoulder_er_l')).toBeNull()                       // collapsed, no input or Measure button under Left
    expect($('[data-measure-btn="shoulder_er_l"]')).toBeNull()
    expect(host.textContent).toContain('Measuring: Right')
    expect(host.textContent).toContain('Right side ready. Get in position and tap Start.')
    expect(host.querySelectorAll('[data-phone-meter]').length).toBe(1)
    startNow(); advance(3000, 55)
    click(btn('Use this number'))
    expect(calls).toEqual([['shoulder_er_l', '70'], ['shoulder_er_r', '55']])
    expect($('[data-saved-row="shoulder_er_r"]')!.textContent).toContain('Saved: Right 55°')
    expect($('[data-phone-meter]')).toBeNull()
    expect($('[data-all-saved]')!.textContent).toContain('Both sides saved.')
  })

  it('right first: Measure with phone on Right, then the meter moves to Left', async () => {
    const calls = mount(SER)
    expect($('[data-up-next]')).toBeTruthy()                      // Right is marked Up next, no blank meter box
    click($('[data-measure-btn="shoulder_er_r"]'))
    expect(host.textContent).toContain('Measuring: Right')
    await turnOn(); startNow(); advance(3000, 50)
    click(btn('Use this number'))
    expect(calls).toEqual([['shoulder_er_r', '50']])
    expect(host.textContent).toContain('Measuring: Left')
    expect(host.textContent).toContain('Left side ready. Get in position and tap Start.')
  })

  it('Measure again re-opens a saved side and replaces only that side', async () => {
    const calls = mount(SER)
    await turnOn(); startNow(); advance(3000, 70); click(btn('Use this number'))
    startNow(); advance(3000, 55); click(btn('Use this number'))
    click(btn('Measure again'))                                      // first one = Left
    expect(host.textContent).toContain('Measuring: Left')
    startNow(); advance(3000, 75); click(btn('Use this number'))
    expect(calls.at(-1)).toEqual(['shoulder_er_l', '75'])
    expect(calls.filter(c => c[0] === 'shoulder_er_r')).toEqual([['shoulder_er_r', '55']])
  })

  it('countdown: 5, 4, 3, 2, 1 shown big with a tick each (0-4 s), then GO + zero at 5 s; each tone fires with its number', async () => {
    mount(HIPABD)
    await turnOn()
    const unlockBefore = audio.unlock
    const t0 = Date.now()
    click(btn('Start'))
    expect(audio.unlock).toBe(unlockBefore + 1)                     // audio unlocked/resumed in the Start tap itself
    expect(audio.tick).toBe(1)                                      // tick on 5 fires in the tap
    const seen: string[] = [$('[data-countdown]')!.textContent!]
    const ticks: number[] = [audio.tick]
    expect($('[data-meter-status]')!.textContent).toBe('Hold still...')
    for (let i = 0; i < 4; i++) {
      advance(1000, 0); seen.push($('[data-countdown]')?.textContent ?? 'none'); ticks.push(audio.tick)
      expect($('[data-meter-number]')!.textContent).not.toBe('0°')  // not zeroed before GO
    }
    expect(seen).toEqual(['5', '4', '3', '2', '1'])
    expect(ticks).toEqual([1, 2, 3, 4, 5])                          // one tick per number, when it changes
    expect(audio.go).toBe(0)
    advance(1000, 0)
    expect($('[data-countdown]')!.textContent).toBe('GO')
    expect(audio.go).toBe(1)
    expect(audio.log.map(l => +l.split('@')[1] - t0).map(ms => Math.round(ms / 1000))).toEqual([0, 1, 2, 3, 4, 5])
    expect($('[data-meter-status]')!.textContent).toBe('GO. Move slowly to your end range, then hold still.')
    expect(btn('Use this number')!.disabled).toBe(true)                // not until a lock
    advance(900, 0)
    expect($('[data-countdown]')).toBeNull()
    expect($('[data-meter-number]')!.textContent).toBe('0°')
    advance(3000, 0)
    expect(host.textContent).not.toContain('Locked:')              // never locks within 2 deg of zero
    advance(3000, 40)
    expect(host.textContent).toContain('Locked: 40°')
    expect(audio.lock).toBe(1)
    expect([audio.tick, audio.go]).toEqual([5, 1])
  })

  it('Use this number: disabled from the Start tap through the countdown and GO until a lock; enabled after lock; Reset disables it again', async () => {
    const calls = mount(SER)
    await turnOn()
    expect(btn('Use this number')!.disabled).toBe(true)
    click(btn('Start'))
    for (let i = 0; i < 5; i++) { expect(btn('Use this number')!.disabled).toBe(true); advance(1000, 0) }
    expect($('[data-countdown]')!.textContent).toBe('GO')
    expect(btn('Use this number')!.disabled).toBe(true)
    advance(1000, 0); advance(1000, 40)                              // live and moving, not locked yet
    expect(host.textContent).not.toContain('Locked:')
    expect(btn('Use this number')!.disabled).toBe(true)
    advance(3000, 40)
    expect(host.textContent).toContain('Locked: 40°')
    expect(btn('Use this number')!.disabled).toBe(false)
    click(btn('Reset')); advance(100, 40)
    expect(btn('Use this number')!.disabled).toBe(true)
    expect(calls).toEqual([])
    // typing stays available the whole time
    expect(($('#m-shoulder_er_l') as HTMLInputElement).disabled).toBe(false)
  })

  it('cannot save 0 from an unlocked meter: a forced click at GO does nothing', async () => {
    const calls = mount(SER)
    await turnOn()
    click(btn('Start')); advance(5000, 0)
    expect($('[data-countdown]')!.textContent).toBe('GO')
    const use = btn('Use this number')!
    act(() => { use.disabled = false; use.click() })                 // even if the disabled state were bypassed
    advance(1000, 0)
    act(() => { const u = btn('Use this number')!; u.disabled = false; u.click() })
    expect(calls).toEqual([])
    expect($('[data-saved-row]')).toBeNull()
  })

  it('no lock during the countdown, even if held still away from the start', async () => {
    mount(SER)
    await turnOn(); startNow(); advance(3000, 60)
    expect(host.textContent).toContain('Locked: 60°')
    click(btn('Start'))
    expect($('[data-locked-badge]')!.className).toContain('opacity-0')
    advance(4900, 60)
    expect(audio.lock).toBe(1)
    expect(host.textContent).not.toContain('Locked:')
    advance(1000, 60)                                                // zeroed at GO: 60 is the new 0
    expect($('[data-meter-number]')!.textContent).toBe('0°')
  })

  it('Reset during the countdown cancels it: beeps stopped, not zeroed', async () => {
    mount(SER)
    await turnOn()
    click(btn('Start')); advance(2000, 0)
    expect(btn('Reset')!.disabled).toBe(false)
    const unlockBefore = audio.unlock
    click(btn('Reset'))
    expect(audio.unlock).toBe(unlockBefore + 1)
    const ticksAtReset = audio.tick
    advance(5000, 30)
    expect([audio.tick, audio.go]).toEqual([ticksAtReset, 0])       // no more beeps after Reset
    expect($('[data-countdown]')).toBeNull()
    expect(host.textContent).not.toContain('Locked:')
    expect(btn('Use this number')!.disabled).toBe(true)
    expect($('[data-meter-status]')!.textContent).toBe('Tap Start, then hold the start position while it counts down from 5.')
  })

  it('Close during the countdown cancels it', async () => {
    mount(SER)
    await turnOn()
    click(btn('Start')); advance(1000, 0)
    const c = audio.tick
    click(host.querySelector('[aria-label="Close"]'))
    expect($('[data-phone-meter]')).toBeNull()
    act(() => { vi.advanceTimersByTime(6000) })
    expect([audio.tick, audio.go]).toEqual([c, 0])                   // no more beeps after Close
    expect($('[data-countdown]')).toBeNull()
  })

  it('Reset after lock unlocks back to live (Peak restarts from the current reading) and can lock again', async () => {
    mount(SER)
    await turnOn(); startNow(); advance(3000, 60)
    expect(host.textContent).toContain('Locked: 60°')
    advance(500, 30)
    click(btn('Reset'))
    advance(100, 30)
    expect($('[data-locked-badge]')!.className).toContain('opacity-0')
    expect($('[data-meter-peak]')!.textContent).toBe('30°')
    advance(2700, 30)
    expect(host.textContent).toContain('Locked: 30°')
    expect(audio.lock).toBe(2)
  })

  it('denied: Stacy line, typed entry still works', async () => {
    ;(window as unknown as { DeviceOrientationEvent: { requestPermission?: unknown } }).DeviceOrientationEvent.requestPermission = () => Promise.resolve('denied')
    mount(SER)
    click(btn('Turn on the meter')); await flush()
    expect(host.textContent).toContain('Motion access is off. Type your number in the box. To use the meter, close and reopen your browser, then tap Allow when asked.')
    expect($('#m-shoulder_er_l')).toBeTruthy()
  })

  it('Instagram / Facebook browser: Stacy line up front and on denied', async () => {
    const ua = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone) Instagram 300.0', configurable: true })
    ;(window as unknown as { DeviceOrientationEvent: { requestPermission?: unknown } }).DeviceOrientationEvent.requestPermission = () => Promise.resolve('denied')
    mount(SER)
    const line = 'The meter may not work inside Instagram or Facebook. Open this page in Safari or Chrome, or type your number in the box.'
    expect($('[data-inapp-note]')!.textContent).toBe(line)
    click(btn('Turn on the meter')); await flush()
    expect(host.textContent).toContain(line)
    Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
  })

  it('no readings (desktop-like): falls back to typing after 2.5 s', async () => {
    mount(SER)
    click(btn('Turn on the meter')); await flush()
    act(() => { vi.advanceTimersByTime(2600) })
    expect(host.textContent).toContain('This device is not sending motion readings, so type your number in the box.')
  })

  it('no touch screen (desktop): no meter, a short typing note, inputs present', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true })
    const had = 'ontouchstart' in window
    const saved = (window as unknown as { ontouchstart?: unknown }).ontouchstart
    delete (window as unknown as { ontouchstart?: unknown }).ontouchstart
    delete (Object.getPrototypeOf(window) as { ontouchstart?: unknown }).ontouchstart
    mount(SER)
    if (had) (window as unknown as { ontouchstart?: unknown }).ontouchstart = saved
    expect($('[data-measure-btn]')).toBeNull()
    expect($('[data-phone-meter]')).toBeNull()
    expect($('[data-desktop-note]')).toBeTruthy()
    expect($('#m-shoulder_er_l')).toBeTruthy()
  })

  it('typed-only steps (ankle cm, and lumbar when shown) never show the meter', () => {
    for (const id of ['lumbar', 'ankle_df']) {
      const i = STEPS.findIndex(s => s.id === id)
      if (i < 0) continue
      act(() => root?.unmount()); host?.remove()
      mount(i)
      expect($('[data-measure-btn]')).toBeNull()
      expect($('[data-phone-meter]')).toBeNull()
    }
  })

  it('Skip clears BOTH sides of the step, so nothing half-typed is saved', () => {
    const calls = mount(SER, [], { shoulder_er_l: '90', shoulder_er_r: '95' })
    click(btn('Skip'))
    expect(calls).toContainEqual(['shoulder_er_l', ''])
    expect(calls).toContainEqual(['shoulder_er_r', ''])
  })

  it('Typical range label on every scored angle step, never "Normal"', () => {
    mount(SER)
    expect(host.textContent).toContain('Typical range: 85-110°')
    expect($('[data-range-source]')!.textContent).toBe('Source: Vairo et al., 2012')
    expect(host.textContent).not.toMatch(/Normal/)
  })

  it('Quinn ranges: hip ER 29-43, hip IR 26-40, shoulder flexion 140-180, SLR 60-80 with sources; neck and hip abduction show no number', () => {
    const want: Record<string, [string, string] | null> = {
      hip_er: ['Typical range: 29-43°', 'Source: Simoneau et al., 1998'],
      hip_ir: ['Typical range: 26-40°', 'Source: Simoneau et al., 1998'],
      shoulder_flex: ['Typical range: 140-180°', 'Source: Gill et al., 2020'],
      hip_flex: ['Typical range: 60-80°', 'Source: Youdas et al., 2005'],
      cervical_lat: null, cervical_flex_ext: null, hip_abd: null,
    }
    for (const [id, exp] of Object.entries(want)) {
      act(() => root?.unmount()); host?.remove()
      mount(STEPS.findIndex(s => s.id === id))
      if (exp) {
        expect(host.textContent, id).toContain(exp[0])
        expect($('[data-range-source]')!.textContent, id).toBe(exp[1])
      } else {
        expect(host.textContent, id).not.toMatch(/Typical range|Normal|Youdas/)
        expect($('[data-range-source]'), id).toBeNull()
      }
    }
  })

  it('a typical range shows only where a source exists: lumbar (flag OFF) and ankle show none', () => {
    const lumbar = STEPS.findIndex(s => s.id === 'lumbar')
    for (const i of [lumbar, STEPS.findIndex(s => s.id === 'ankle_df')].filter(i => i >= 0)) {
      act(() => root?.unmount()); host?.remove()
      mount(i)
      expect(host.textContent).not.toMatch(/Typical range|Normal/)
      expect($('[data-range-source]')).toBeNull()
    }
    const shown = STEPS.filter(s => s.fields.some(f => f.rangeSource && f.normalLow != null && !f.unscored && !f.referenceNote)).map(s => s.id)
    expect(shown).toEqual(['hip_er', 'hip_ir', 'shoulder_er', 'shoulder_flex'])
  })

  it('no debug readout unless ?debug=1', async () => {
    mount(SER)
    await turnOn(); startNow(); advance(200, 20)
    expect($('[data-meter-debug]')).toBeNull()
    expect(host.textContent).not.toMatch(/β|γ|α|quaternion|twist|tilt/i)
  })
})
