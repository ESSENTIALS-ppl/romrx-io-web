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
import { SHOW_SLR_TYPICAL_RANGE } from './hipFlexCopy'

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
async function turnOn() { click(btn('Turn on the ROMeter')); await flush(); feed(0, 12) }
/** Layout item 1: the badge says just "Locked"; the big number shows the value that will be saved. */
const badge = () => $('[data-locked-badge]')!
const isLocked = () => !badge().className.includes('opacity-0')
function expectLockedAt(deg: number) {
  expect(isLocked()).toBe(true)
  expect(badge().textContent!.trim()).toBe('Locked')
  expect($('[data-meter-number]')!.textContent).toBe(`${deg}°`)
  expect($('[data-meter-status]')!.textContent).toBe('Locked. Tap Use this number, or Reset to measure again.')
}
/** Layout item 4: the filled (primary) buttons inside the meter card. */
const primaries = () => [...$('[data-phone-meter]')!.querySelectorAll('button.btn-meter')].map(b => b.textContent!.trim())
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
  it('opens on the first side by itself; iOS requestPermission is called only on the Turn on the ROMeter tap', async () => {
    const req = vi.fn(() => Promise.resolve('granted'))
    ;(window as unknown as { DeviceOrientationEvent: { requestPermission?: unknown } }).DeviceOrientationEvent.requestPermission = req
    mount(SER)
    expect($('[data-phone-meter]')).toBeTruthy()
    expect(host.textContent).toContain('Measuring: Left')
    expect(req).not.toHaveBeenCalled()
    expect(btn('Start sensor')).toBeUndefined()
    expect(host.textContent).toContain('Sound on, volume up. Turn off silent mode to hear the beeps.')
    click(btn('Turn on the ROMeter'))
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
    expect(isLocked()).toBe(false)
    advance(2600, 90)
    expectLockedAt(90)
    expect(host.textContent).not.toContain('Locked: 90°')          // item 1: no number in the badge
    expect(audio.lock).toBe(1)
    advance(2000, 130)                              // move after lock: stays frozen, no second ding
    expect($('[data-meter-number]')!.textContent).toBe('90°')
    expect($('[data-meter-peak]')).toBeNull()                       // item 2: Peak hidden (only with ?debug=1)
    expect(host.textContent).not.toContain('Peak')
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

  it('right first: Measure on Right, then the meter moves to Left', async () => {
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
    expect($('[data-countdown]')!.textContent).toBe('Move')
    expect(audio.go).toBe(1)
    expect(audio.log.map(l => +l.split('@')[1] - t0).map(ms => Math.round(ms / 1000))).toEqual([0, 1, 2, 3, 4, 5])
    expect($('[data-meter-status]')!.textContent).toBe('Move slowly to your end range, then hold still.')
    expect(btn('Use this number')).toBeUndefined()                     // not until a lock (item 3: not shown)
    advance(900, 0)
    expect($('[data-countdown]')).toBeNull()
    expect($('[data-meter-number]')!.textContent).toBe('0°')
    advance(3000, 0)
    expect(isLocked()).toBe(false)                                  // never locks within 2 deg of zero
    advance(3000, 40)
    expectLockedAt(40)
    expect(audio.lock).toBe(1)
    expect([audio.tick, audio.go]).toEqual([5, 1])
  })

  it('Use this number: not shown from the Start tap through the countdown and GO until a lock; shown after lock; Reset hides it again', async () => {
    const calls = mount(SER)
    await turnOn()
    expect(btn('Use this number')).toBeUndefined()
    click(btn('Start'))
    for (let i = 0; i < 5; i++) { expect(btn('Use this number')).toBeUndefined(); advance(1000, 0) }
    expect($('[data-countdown]')!.textContent).toBe('Move')
    expect(btn('Use this number')).toBeUndefined()
    advance(1000, 0); advance(1000, 40)                              // live and moving, not locked yet
    expect(isLocked()).toBe(false)
    expect(btn('Use this number')).toBeUndefined()
    advance(3000, 40)
    expectLockedAt(40)
    expect(btn('Use this number')!.disabled).toBe(false)
    click(btn('Reset')); advance(100, 40)
    expect(btn('Use this number')).toBeUndefined()
    expect(calls).toEqual([])
    // typing stays available the whole time
    expect(($('#m-shoulder_er_l') as HTMLInputElement).disabled).toBe(false)
  })

  it('cannot save 0 from an unlocked meter: at GO and while live there is no Use button, and nothing is saved', async () => {
    const calls = mount(SER)
    await turnOn()
    click(btn('Start')); advance(5000, 0)
    expect($('[data-countdown]')!.textContent).toBe('Move')
    expect(btn('Use this number')).toBeUndefined()
    expect($('[data-use-btn]')).toBeNull()                           // not in the page at all, so it cannot be tapped
    advance(1000, 0)
    expect($('[data-meter-number]')!.textContent).toBe('0°')
    expect($('[data-use-btn]')).toBeNull()
    for (const b of host.querySelectorAll('[data-phone-meter] button')) {
      if (b.getAttribute('aria-label') !== 'Close' && b.textContent?.trim() !== 'Start' && b.textContent?.trim() !== 'Reset') throw new Error(`unexpected button ${b.textContent}`)
    }
    expect(calls).toEqual([])
    expect($('[data-saved-row]')).toBeNull()
  })

  it('no lock during the countdown, even if held still away from the start', async () => {
    mount(SER)
    await turnOn(); startNow(); advance(3000, 60)
    expectLockedAt(60)
    click(btn('Start'))                                              // the small Start under Use this number
    expect(isLocked()).toBe(false)
    advance(4900, 60)
    expect(audio.lock).toBe(1)
    expect(isLocked()).toBe(false)
    advance(1000, 60)                                                // zeroed at GO: 60 is the new 0
    expect($('[data-meter-number]')!.textContent).toBe('0°')
  })

  it('Reset during the countdown cancels it: beeps stopped, not zeroed', async () => {
    mount(SER)
    await turnOn()
    click(btn('Start')); advance(2000, 0)
    expect(btn('Reset')).toBeTruthy()
    expect(btn('Reset')!.disabled).toBe(false)
    const unlockBefore = audio.unlock
    click(btn('Reset'))
    expect(audio.unlock).toBe(unlockBefore + 1)
    const ticksAtReset = audio.tick
    advance(5000, 30)
    expect([audio.tick, audio.go]).toEqual([ticksAtReset, 0])       // no more beeps after Reset
    expect($('[data-countdown]')).toBeNull()
    expect(isLocked()).toBe(false)
    expect(btn('Use this number')).toBeUndefined()
    expect(btn('Reset')).toBeUndefined()                             // nothing left to reset (item 5)
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

  it('Reset after lock unlocks back to live (Peak, shown with ?debug=1, restarts from the current reading) and can lock again', async () => {
    const url = window.location.href
    window.history.replaceState(null, '', '/?debug=1')
    try {
      mount(SER)
      await turnOn(); startNow(); advance(3000, 60)
      expectLockedAt(60)
      expect($('[data-meter-peak]')!.textContent).toBe('60°')
      advance(500, 30)
      click(btn('Reset'))
      advance(100, 30)
      expect(isLocked()).toBe(false)
      expect($('[data-meter-number]')!.textContent).toBe('30°')
      expect($('[data-meter-peak]')!.textContent).toBe('30°')
      advance(2700, 30)
      expectLockedAt(30)
      expect(audio.lock).toBe(2)
    } finally { window.history.replaceState(null, '', url) }
  })

  it('denied: Stacy line, typed entry still works', async () => {
    ;(window as unknown as { DeviceOrientationEvent: { requestPermission?: unknown } }).DeviceOrientationEvent.requestPermission = () => Promise.resolve('denied')
    mount(SER)
    click(btn('Turn on the ROMeter')); await flush()
    expect(host.textContent).toContain('Motion access is off. To use the ROMeter, close and reopen your browser, then tap Allow when asked.')
    expect($('#m-shoulder_er_l')).toBeTruthy()
  })

  it('Instagram / Facebook browser: Stacy line up front and on denied', async () => {
    const ua = navigator.userAgent
    Object.defineProperty(navigator, 'userAgent', { value: 'Mozilla/5.0 (iPhone) Instagram 300.0', configurable: true })
    ;(window as unknown as { DeviceOrientationEvent: { requestPermission?: unknown } }).DeviceOrientationEvent.requestPermission = () => Promise.resolve('denied')
    mount(SER)
    const line = 'The ROMeter may not work inside Instagram or Facebook. Open this page in Safari or Chrome.'
    expect($('[data-inapp-note]')!.textContent).toBe(line)
    click(btn('Turn on the ROMeter')); await flush()
    expect(host.textContent).toContain(line)
    Object.defineProperty(navigator, 'userAgent', { value: ua, configurable: true })
  })

  it('no readings (desktop-like): falls back to typing after 2.5 s', async () => {
    mount(SER)
    click(btn('Turn on the ROMeter')); await flush()
    act(() => { vi.advanceTimersByTime(2600) })
    expect(host.textContent).toContain('This device is not sending motion readings.')
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
    expect(host.textContent).toContain('Typical range: 40-75°')                  // tucked-elbow shoulder ER (Jim, Oct 6 11:45 AM)
    expect($('[data-range-source]')!.textContent).toBe('Source: Gill et al., 2020')
    expect(host.textContent).not.toMatch(/Normal/)
  })

  it('Quinn ranges: hip ER 29-43, hip IR 26-40, shoulder flexion 140-180, SLR 60-80 with sources; neck and hip abduction show no number', () => {
    const want: Record<string, [string, string] | null> = {
      hip_er: ['Typical range: 29-43°', 'Source: Simoneau et al., 1998'],
      hip_ir: ['Typical range: 26-40°', 'Source: Simoneau et al., 1998'],
      shoulder_er: ['Typical range: 40-75°', 'Source: Gill et al., 2020'],
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

  // ---- Layout review items (METER-UI-REVIEW-20261006.md section 5), Oct 6 -----------------------
  it('item 3: Use this number appears only after the reading locks, and goes away again on Start', async () => {
    const calls = mount(SER)
    expect(btn('Use this number')).toBeUndefined()                      // meter off
    await turnOn()
    expect(btn('Use this number')).toBeUndefined()                      // idle
    click(btn('Start')); advance(2000, 0)
    expect(btn('Use this number')).toBeUndefined()                      // countdown
    advance(3900, 0); advance(600, 50)
    expect(btn('Use this number')).toBeUndefined()                      // live, moving
    advance(3000, 50)
    expectLockedAt(50)
    expect(btn('Use this number')).toBeTruthy()                         // locked
    click(btn('Start'))                                                  // measure again from the small Start
    expect(btn('Use this number')).toBeUndefined()
    advance(5900, 0); advance(3000, 65)
    click(btn('Use this number'))
    expect(calls).toEqual([['shoulder_er_l', '65']])
  })

  it('item 4: exactly one big filled button in the meter at a time (Turn on, then Start, then Use this number)', async () => {
    mount(SER)
    expect(primaries()).toEqual(['Turn on the ROMeter'])
    await turnOn()
    expect(primaries()).toEqual(['Start'])                               // idle
    click(btn('Start')); advance(2000, 0)
    expect(primaries()).toEqual(['Start'])                               // countdown
    advance(3900, 0); advance(600, 45)
    expect(primaries()).toEqual(['Start'])                               // live
    advance(3000, 45)
    expect(primaries()).toEqual(['Use this number'])                     // locked: Use is the big one
    const small = [...$('[data-meter-small]')!.querySelectorAll('button')].map(b => b.textContent!.trim())
    expect(small).toEqual(['Start', 'Reset'])                            // Start again + Reset become small
    expect([...host.querySelectorAll('[data-phone-meter] button')].filter(b => b.textContent!.trim() === 'Start').length).toBe(1)
  })

  it('item 5: Reset is hidden until there is something to reset', async () => {
    mount(SER)
    await turnOn()
    expect(btn('Reset')).toBeUndefined()                                 // idle: nothing to reset
    click(btn('Start'))
    expect(btn('Reset')).toBeTruthy()                                    // countdown: Reset cancels it
    advance(5900, 0)
    expect(btn('Reset')).toBeTruthy()                                    // zeroed and live
    advance(3000, 40)
    expectLockedAt(40)
    expect(btn('Reset')).toBeTruthy()                                    // locked
    click(btn('Start')); advance(1000, 0); click(btn('Reset'))           // cancel a new countdown
    expect(btn('Reset')).toBeUndefined()                                 // back to idle: hidden again
    expect(btn('Start')).toBeTruthy()
  })

  it('item 9: on a meter step, How to Measure, Common mistake and the lock tip sit under a closed More help; Setup stays open', () => {
    const step = STEPS[SER]
    mount(SER)
    const toggle = $('[data-more-help]') as HTMLButtonElement
    expect(toggle.textContent!.trim()).toBe('More help')
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(host.textContent).toContain('Setup')
    for (const line of step.position) expect(host.textContent).toContain(line)
    expect(host.textContent).not.toContain('How to Measure')
    expect(host.textContent).not.toContain('Common mistake')
    expect(host.textContent).not.toContain(step.mistakeFix)
    expect(host.textContent).not.toContain("Can't see the screen at the end?")
    // More help sits between Setup and Your measurements (the meter moves up the page)
    const order = host.textContent!
    expect(order.indexOf('More help')).toBeLessThan(order.indexOf('Your measurements'))
    expect(order.indexOf(step.position.at(-1)!)).toBeLessThan(order.indexOf('More help'))
    click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('true')
    expect(host.textContent).toContain('How to Measure')
    for (const line of step.howTo) expect(host.textContent).toContain(line)
    expect(host.textContent).toContain('Common mistake')
    expect(host.textContent).toContain(`Fix: ${step.mistakeFix}`)
    expect($('[data-lock-tip]')!.textContent).toBe("🔒 Can't see the screen at the end? Hold still. The number locks and dings, so you can read it after.")
    expect(host.textContent!.indexOf('More help')).toBeLessThan(host.textContent!.indexOf('Your measurements'))
    click(toggle)
    expect(toggle.getAttribute('aria-expanded')).toBe('false')
    expect(host.textContent).not.toContain('How to Measure')
  })

  it('item 9: typed-only steps and no-meter devices keep How to Measure and Common mistake open, with no More help', () => {
    const ankle = STEPS.findIndex(s => s.id === 'ankle_df')
    mount(ankle)
    expect($('[data-more-help]')).toBeNull()
    expect(host.textContent).toContain('How to Measure')
    expect(host.textContent).toContain('Common mistake')
    act(() => root.unmount()); host.remove()
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true })
    const saved = (window as unknown as { ontouchstart?: unknown }).ontouchstart
    const had = 'ontouchstart' in window
    delete (window as unknown as { ontouchstart?: unknown }).ontouchstart
    delete (Object.getPrototypeOf(window) as { ontouchstart?: unknown }).ontouchstart
    mount(SER)
    if (had) (window as unknown as { ontouchstart?: unknown }).ontouchstart = saved
    expect($('[data-phone-meter]')).toBeNull()
    expect($('[data-more-help]')).toBeNull()
    expect(host.textContent).toContain('How to Measure')
    expect(host.textContent).toContain('Common mistake')
    expect(host.textContent).toContain('Hey Siri, take a screenshot')       // no-meter devices keep the screenshot tip
  })

  it('items 6 and 8: no movement name inside the meter (screen-reader label only); the grip line has no box, same words', () => {
    const step = STEPS[SER]
    mount(SER)
    const card = $('[data-phone-meter]')!
    expect(card.getAttribute('aria-label')).toBe(step.title)
    expect(card.textContent).not.toContain(step.title)
    expect($('h2')!.textContent).toBe(step.title)                          // the step header still says it
    const grip = $('[data-meter-grip]')!
    expect(grip.textContent).toBe(step.meter!.grip)
    expect(grip.className).not.toMatch(/bg-|rounded/)
  })

  it('item 7: the typical range shows once per step, on the side being measured, and moves to Right after Left is saved', async () => {
    // Range and source come from the step data, so this holds after #148 moves Shoulder ER to the
    // tucked-elbow test (85-110° Vairo 2012 -> 40-75° Gill 2020) as well as before it. Only those two pairs pass.
    const lf = STEPS[SER].fields.find(f => f.key === 'shoulder_er_l')!
    expect(['85-110|Vairo et al., 2012', '40-75|Gill et al., 2020']).toContain(`${lf.normalLow}-${lf.normalHigh}|${lf.rangeSource}`)
    const RANGE = `Typical range: ${lf.normalLow}-${lf.normalHigh}°`, SOURCE = `Source: ${lf.rangeSource}`
    mount(SER)
    const count = () => host.textContent!.split(RANGE).length - 1
    expect(count()).toBe(1)
    expect($('[data-field-note="shoulder_er_l"]')!.textContent).toBe(RANGE)
    expect($('[data-field-note="shoulder_er_r"]')).toBeNull()
    expect($('[data-range-source]')!.textContent).toBe(SOURCE)
    await turnOn(); startNow(); advance(3000, 70); click(btn('Use this number'))
    expect(count()).toBe(1)
    expect($('[data-field-note="shoulder_er_r"]')!.textContent).toBe(RANGE)
    expect($('[data-range-source]')!.textContent).toBe(SOURCE)
  })

  it('item 7: SLR shows Typical range: 60-80° once, with Source: Youdas et al., 2005 (switch on); ankle keeps its note on both sides', () => {
    expect(SHOW_SLR_TYPICAL_RANGE).toBe(true)
    mount(STEPS.findIndex(s => s.id === 'hip_flex'))
    expect((host.textContent!.match(/Typical range: 60-80°/g) ?? []).length).toBe(1)
    expect($('[data-field-note="hip_flex_l"]')!.textContent).toBe('Typical range: 60-80°')
    expect($('[data-range-source]')!.textContent).toBe('Source: Youdas et al., 2005')
    act(() => root.unmount()); host.remove()
    mount(STEPS.findIndex(s => s.id === 'ankle_df'))
    expect((host.textContent!.match(/Best of 3, in cm/g) ?? []).length).toBe(2)
  })
})
