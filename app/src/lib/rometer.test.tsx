// @vitest-environment jsdom
/**
 * Standalone ROMeter (/dashboard/rometer): signed-in tab right after ROMBot, raw angle meter with no
 * joint, NOTHING saved or sent, no range ever (Jim + Stacy, Oct 6). Also pins that the assessment
 * meter is unchanged by the new optional PhoneMeter props.
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const audio = { lock: 0, tick: 0, go: 0 }
vi.mock('./meterAudio', async (orig) => {
  const real = await orig<typeof import('./meterAudio')>()
  return {
    ...real,
    unlockMeterAudio: () => {},
    playLockDing: () => { audio.lock++ },
    playMeterTone: (kind: 'tick' | 'go' | 'ding', wanted: () => boolean = () => true) => {
      if (kind === 'ding') audio.lock++; else if (wanted()) audio[kind]++
      return Promise.resolve(true)
    },
  }
})

import { ROMeter } from '../pages/ROMeter'
import { ROMETER_COPY } from './rometerCopy'
import { METHOD_LINE } from '../pages/assessmentMeta'
import { AssessmentMeasureScreen } from '../pages/AssessmentMeasureScreen'
import { STEPS } from '../pages/assessmentSteps'
import { __resetSensorForTests, feedOrientation } from './meterSensor'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const SRC = resolve(__dirname, '..')
const read = (p: string) => readFileSync(join(SRC, p), 'utf8')

let root: Root | null = null, host: HTMLDivElement
function mount(el: ReturnType<typeof createElement>) {
  host = document.createElement('div'); document.body.appendChild(host)
  root = createRoot(host)
  act(() => { root!.render(el) })
}
const $ = (sel: string) => host.querySelector(sel) as HTMLElement | null
const btn = (text: string) => [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === text || b.textContent?.trim().endsWith(` ${text}`)) as HTMLButtonElement | undefined
const click = (el: Element | null | undefined) => act(() => { (el as HTMLElement).click() })
async function flush() { await act(async () => { await Promise.resolve(); await Promise.resolve() }) }
const feed = (tilt: number) => act(() => { feedOrientation(30, 10 + tilt, 0) })
const advance = (ms: number, tilt: number) => { for (let t = 0; t < ms; t += 50) { feed(tilt); act(() => { vi.advanceTimersByTime(50) }) } }
/** Layout branch: the badge says just "Locked"; the big number shows the value. */
function expectLockedAt(deg: number) {
  expect($('[data-locked-badge]')!.className).not.toContain('opacity-0')
  expect($('[data-locked-badge]')!.textContent!.trim()).toBe('Locked')
  expect($('[data-meter-number]')!.textContent).toBe(`${deg}°`)
}
/** The filled (primary) buttons inside the meter card. */
const primaries = () => [...$('[data-phone-meter]')!.querySelectorAll('button.btn-primary')].map(b => b.textContent!.trim())
async function turnOn() { click(btn('Turn on the meter') ?? btn('Turn on the ROMeter')); await flush(); for (let i = 0; i < 12; i++) feed(0) }

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] })
  Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })
  ;(window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = class {}
  __resetSensorForTests()
  audio.lock = 0; audio.tick = 0; audio.go = 0
})
afterEach(() => { if (root) act(() => root!.unmount()); root = null; host?.remove(); vi.useRealTimers(); vi.restoreAllMocks() })

describe('ROMeter placement: signed-in tab right after ROMBot', () => {
  it('nav order is My Body, My Protocol, My Fuel, My Sport, ROMBot, ROMeter, Settings', () => {
    const s = read('components/Layout.tsx')
    const start = s.indexOf('= [', s.indexOf('const NAV'))
    const nav = s.slice(start, s.indexOf('\n]', start))
    const labels = [...nav.matchAll(/label: (?:'([^']+)'|ROMETER_COPY\.navLabel)/g)].map(m => m[1] ?? ROMETER_COPY.navLabel)
    expect(labels).toEqual(['My Body', 'My Protocol', 'My Fuel', 'My Sport', 'ROMBot', 'ROMeter', 'Settings'])
    expect(nav).toMatch(/to: '\/dashboard\/rometer'/)
  })
  it('route sits inside ProtectedRoute + Layout, right after ROMBot (no public route)', () => {
    const s = read('App.tsx')
    const open = s.indexOf('<Route element={<ProtectedRoute />}>')
    const close = s.indexOf('</Route>', s.indexOf('</Route>', open) + 1)
    const at = s.indexOf('<Route path="/dashboard/rometer" element={<ROMeter />} />')
    expect(at).toBeGreaterThan(open)
    expect(at).toBeLessThan(close)
    expect(at).toBeGreaterThan(s.indexOf('path="/dashboard/rombot"'))
    expect(at).toBeLessThan(s.indexOf('path="/dashboard/settings"'))
    expect(s.match(/path="[^"]*rometer"/gi)).toEqual(['path="/dashboard/rometer"'])   // one route only; no public /rometer
  })
})

describe('ROMeter page', () => {
  it('shows the cleared lines, the tilt line next to the grip, and no Use this number / Close / side', async () => {
    mount(createElement(ROMeter))
    const t = host.textContent!
    for (const k of ['title', 'subtitle', 'intro', 'meterHeader', 'grip', 'tiltOnly', 'privacy', 'notAssessment', 'disclaimer'] as const) expect(t, k).toContain(ROMETER_COPY[k])
    expect(t).toContain(METHOD_LINE)
    expect($('[data-grip-note]')!.textContent).toBe(ROMETER_COPY.tiltOnly)
    expect($('[data-grip-note]')!.previousElementSibling!.textContent).toBe(ROMETER_COPY.grip)   // right under the grip, always visible
    expect(t).not.toMatch(/Measuring:|Left|Right/)
    expect($('[data-grip-note]')!.previousElementSibling!.hasAttribute('data-meter-grip')).toBe(true)   // layout grip line (phone icon, no box)
    expect($('[data-phone-meter]')!.getAttribute('aria-label')).toBe(ROMETER_COPY.title)   // screen-reader name for the card
    await turnOn()
    expect(primaries()).toEqual(['Start'])   // one big button
    expect(btn('Reset')).toBeUndefined()      // Reset only once there is something to reset
    expect($('[data-meter-peak]')).toBeNull()  // Peak hidden outside ?debug=1
    expect(btn('Use this number')).toBeUndefined()
    expect($('[data-use-btn]')).toBeNull()
    expect(host.querySelector('[aria-label="Close"]')).toBeNull()
  })

  it('full flow: Start, 5-4-3-2-1, GO zeroes, hold 2.5 s locks with one ding; ROMeter locked line; Reset unlocks', async () => {
    mount(createElement(ROMeter))
    await turnOn()
    click(btn('Start'))
    expect($('[data-countdown]')!.textContent).toBe('5')
    expect(btn('Reset')).toBeTruthy()   // small Reset during the countdown
    advance(5000, 0)
    expect($('[data-countdown]')!.textContent).toBe('GO')
    advance(900, 0)
    expect($('[data-meter-number]')!.textContent).toBe('0°')
    advance(600, 35)
    expect($('[data-meter-number]')!.textContent).toBe('35°')
    advance(2700, 35)
    expectLockedAt(35)
    expect($('[data-meter-status]')!.textContent).toBe(ROMETER_COPY.locked)
    expect(primaries()).toEqual(['Start'])            // never Use this number on the ROMeter, even locked
    expect($('[data-use-btn]')).toBeNull()
    expect(btn('Reset')).toBeTruthy()
    expect($('[data-meter-peak]')).toBeNull()
    expect([audio.tick, audio.go, audio.lock]).toEqual([5, 1, 1])
    click(btn('Reset')); advance(100, 35)
    expect($('[data-locked-badge]')!.className).toContain('opacity-0')
  })

  it('no range, band or comparison ever (Stacy, Oct 6), even after a lock', async () => {
    mount(createElement(ROMeter))
    await turnOn(); click(btn('Start')); advance(6000, 0); advance(3500, 120)
    expectLockedAt(120)
    expect(host.textContent).not.toMatch(/Typical range|range|Needs focus|Building|Steady|Normal|average|%|Source:/i)
  })

  it('desktop (no touch): one line instead of the meter', () => {
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 0, configurable: true })
    const saved = (window as unknown as { ontouchstart?: unknown }).ontouchstart
    delete (window as unknown as { ontouchstart?: unknown }).ontouchstart
    delete (Object.getPrototypeOf(window) as { ontouchstart?: unknown }).ontouchstart
    mount(createElement(ROMeter))
    if (saved !== undefined) (window as unknown as { ontouchstart?: unknown }).ontouchstart = saved
    expect($('[data-rometer-desktop]')!.textContent).toBe(ROMETER_COPY.desktop)
    expect($('[data-phone-meter]')).toBeNull()
    expect(host.textContent).toContain(ROMETER_COPY.disclaimer)
  })
})

describe('ROMeter saves and sends nothing (guard)', () => {
  /** ROMeter.tsx plus every local file it imports, transitively. */
  function importGraph(entry: string): string[] {
    const seen = new Set<string>(); const todo = [entry]
    while (todo.length) {
      const f = todo.pop()!
      if (seen.has(f)) continue
      seen.add(f)
      for (const m of readFileSync(f, 'utf8').matchAll(/^import[^'"]*['"](\.[^'"]+)['"]/gm)) {
        const base = resolve(dirname(f), m[1])
        const hit = ['.ts', '.tsx', '/index.ts', '/index.tsx', ''].map(e => base + e).find(p => existsSync(p) && /\.tsx?$/.test(p))
        if (hit) todo.push(hit)
      }
    }
    return [...seen]
  }
  it('no supabase, fetch, track, storage, cookie or URL writes anywhere in its import graph', () => {
    const files = importGraph(join(SRC, 'pages', 'ROMeter.tsx'))
    expect(files.map(f => f.replace(SRC, ''))).toEqual(expect.arrayContaining(['/pages/ROMeter.tsx', '/components/PhoneMeter.tsx', '/lib/meterSensor.ts', '/lib/rometerCopy.ts']))
    for (const f of files) {
      const code = readFileSync(f, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')   // code only, not comments
      expect(code, f).not.toMatch(/supabase|\bfetch\(|XMLHttpRequest|sendBeacon|\btrack\w*\(|localStorage\.|sessionStorage\.|indexedDB|document\.cookie|history\.(push|replace)State|searchParams\.set/)
    }
  })
  it('a full measure makes zero storage, network or URL calls', async () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem')
    const fetchSpy = vi.fn(); vi.stubGlobal('fetch', fetchSpy)
    const beacon = vi.fn(); Object.defineProperty(navigator, 'sendBeacon', { value: beacon, configurable: true })
    const xhr = vi.spyOn(XMLHttpRequest.prototype, 'open')
    const push = vi.spyOn(history, 'pushState'); const replace = vi.spyOn(history, 'replaceState')
    const url = location.href
    mount(createElement(ROMeter))
    await turnOn(); click(btn('Start')); advance(6000, 0); advance(3500, 50)
    expectLockedAt(50)
    click(btn('Reset')); advance(200, 20)
    expect(setItem).not.toHaveBeenCalled()
    expect(fetchSpy).not.toHaveBeenCalled()
    expect(beacon).not.toHaveBeenCalled()
    expect(xhr).not.toHaveBeenCalled()
    expect(push).not.toHaveBeenCalled(); expect(replace).not.toHaveBeenCalled()
    expect(location.href).toBe(url)
    vi.unstubAllGlobals()
  })
})

describe('ROMeter copy rules', () => {
  const lines = Object.values(ROMETER_COPY)
  it('no em/en dashes, no TM, no claims words (Stacy list), no ranges', () => {
    for (const l of lines) {
      expect(l).not.toMatch(/[\u2014\u2013]/)
      expect(l).not.toMatch(/\u2122|\(tm\)/i)
      expect(l).not.toMatch(/accura|clinical|goniometer|validated|precis|diagnos|range|normal/i)
    }
  })
  it('Stacy-passed lines, verbatim (Oct 6)', () => {
    expect(ROMETER_COPY.disclaimer).toBe('For informal use only. Not medical advice. Stop if anything hurts.')
    expect(ROMETER_COPY.privacy).toBe('Your readings stay on this phone. They are not saved or sent.')
    expect(ROMETER_COPY.tiltOnly).toBe("Works for moves that tilt the phone up, down or to the side. Turning moves, like looking over your shoulder, won't read.")
    expect(ROMETER_COPY.navLabel).toBe('ROMeter')
  })
})

describe('assessment meter unchanged by the new optional props', () => {
  it('still shows Measuring: <side>, the movement name as the card label, Close, no grip note, Use only after a lock, its locked line, and Use fills the field', async () => {
    const calls: [string, string][] = []
    const SER = STEPS.findIndex(s => s.id === 'shoulder_er')
    mount(createElement(AssessmentMeasureScreen, {
      stepIdx: SER, values: {}, loading: false, error: '', gender: null,
      setPhase: () => {}, setStepIdx: () => {}, handleNext: () => {}, handleChange: (k: string, v: string) => { calls.push([k, v]) },
    }))
    const card = $('[data-phone-meter]')!
    expect(card.textContent).toContain('Measuring: Left')
    expect(card.getAttribute('aria-label')).toBe('Shoulder External Rotation')   // layout: name is the screen-reader label, the step header shows it
    expect(card.querySelector('[aria-label="Close"]')).toBeTruthy()
    expect(card.querySelector('[data-grip-note]')).toBeNull()
    expect(card.querySelector('[data-meter-grip]')).toBeTruthy()
    await turnOn()
    expect(btn('Use this number')).toBeUndefined()   // hidden until a lock
    expect(primaries()).toEqual(['Start'])
    click(btn('Start')); advance(6000, 0); advance(3500, 70)
    expectLockedAt(70)
    expect($('[data-meter-status]')!.textContent).toBe('Locked. Tap Use this number, or Reset to measure again.')
    expect(primaries()).toEqual(['Use this number'])
    expect(btn('Start')).toBeTruthy(); expect(btn('Reset')).toBeTruthy()   // small links under the big button
    click(btn('Use this number'))
    expect(calls).toEqual([['shoulder_er_l', '70']])
    expect(host.textContent).not.toContain(ROMETER_COPY.tiltOnly)
  })
})
