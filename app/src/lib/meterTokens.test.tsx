// @vitest-environment jsdom
/**
 * SURF meter accent (Jim, Oct 6 2026, 11:51 AM via Grant). The phone meter, the ROMeter page and the
 * meter controls on the assessment step use the --meter-* tokens only: Surf fill #38E8FF, hover
 * #32CAE0, dark text #0A1020 on fills (never white), #007C8D for text and borders on white.
 * Must stay clearly apart from the strong-tier teal.
 */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./meterAudio', async (orig) => ({ ...(await orig<typeof import('./meterAudio')>()), unlockMeterAudio: () => {}, playLockDing: () => {}, playMeterTone: () => Promise.resolve(true) }))

import { ROMeter } from '../pages/ROMeter'
import { AssessmentMeasureScreen } from '../pages/AssessmentMeasureScreen'
import { STEPS } from '../pages/assessmentSteps'
import { __resetSensorForTests, feedOrientation } from './meterSensor'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const APP = resolve(__dirname, '..', '..')
const read = (p: string) => readFileSync(join(APP, p), 'utf8')

const SURF = { fill: '#38E8FF', hover: '#32CAE0', onFill: '#0A1020', text: '#007C8D', tint: '#E6FCFF' }
const hexToTriplet = (h: string) => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)).join(' ')
function lum(h: string) {
  const c = [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16) / 255).map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]
}
const contrast = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05) }

describe('Surf tokens are defined once', () => {
  it('index.css :root carries the five --meter-* values', () => {
    const css = read('src/index.css')
    expect(css).toContain(`--meter-fill: ${hexToTriplet(SURF.fill)};`)
    expect(css).toContain(`--meter-fill-hover: ${hexToTriplet(SURF.hover)};`)
    expect(css).toContain(`--meter-on-fill: ${hexToTriplet(SURF.onFill)};`)
    expect(css).toContain(`--meter-text: ${hexToTriplet(SURF.text)};`)
    expect(css).toContain(`--meter-tint: ${hexToTriplet(SURF.tint)};`)
  })
  it('Tailwind maps meter-* to the variables, and .btn-meter is Surf with dark text', () => {
    const tw = read('tailwind.config.js')
    const block = tw.slice(tw.indexOf('meter: {'), tw.indexOf('}', tw.indexOf('meter: {')))
    expect(block).not.toMatch(/#[0-9a-fA-F]{3,6}'/)   // no raw hex: values come from the variables
    for (const [k, v] of [['DEFAULT', 'fill'], ['hover', 'fill-hover'], ['ink', 'on-fill'], ['text', 'text'], ['tint', 'tint']])
      expect(block).toMatch(new RegExp(`${k}:\\s*'rgb\\(var\\(--meter-${v}\\) / <alpha-value>\\)'`))
    const btn = read('src/index.css').match(/\.btn-meter\s*\{([^}]*)\}/)![1]
    expect(btn).toMatch(/bg-meter\b/); expect(btn).toMatch(/text-meter-ink/); expect(btn).toMatch(/hover:bg-meter-hover/)
    expect(btn).not.toMatch(/text-white/)
  })
})

describe('contrast and separation (WCAG 2.x)', () => {
  it('#0A1020 on Surf and on its hover, and #007C8D on white and on the tint, are all at least 4.5:1', () => {
    expect(contrast(SURF.onFill, SURF.fill)).toBeGreaterThanOrEqual(4.5)    // 12.78
    expect(contrast(SURF.onFill, SURF.hover)).toBeGreaterThanOrEqual(4.5)   // 9.62
    expect(contrast(SURF.text, '#FFFFFF')).toBeGreaterThanOrEqual(4.5)      // 4.92
    expect(contrast(SURF.text, SURF.tint)).toBeGreaterThanOrEqual(4.5)      // 4.62
    expect(contrast('#FFFFFF', SURF.fill)).toBeLessThan(3)                  // why white text on Surf is banned (1.48)
  })
  it('Surf is not the strong-tier teal (or the elite teal)', () => {
    const tw = read('tailwind.config.js')
    const tier = { strong: tw.match(/strong:\s*'(#[0-9A-Fa-f]{6})'/)![1], elite: tw.match(/elite:\s*'(#[0-9A-Fa-f]{6})'/)![1] }
    expect(tier.strong).toBe('#14B8A6')
    for (const t of [tier.strong, tier.elite]) {
      expect(SURF.fill.toLowerCase()).not.toBe(t.toLowerCase())
      expect(SURF.text.toLowerCase()).not.toBe(t.toLowerCase())
    }
    expect(Math.abs(lum(SURF.fill) - lum(tier.strong))).toBeGreaterThan(0.2)   // Surf reads much lighter (1.68:1 apart)
  })
})

describe('meter files use the tokens, not cobalt accents, raw hex or white-on-fill', () => {
  for (const f of ['src/components/PhoneMeter.tsx', 'src/pages/ROMeter.tsx']) {
    it(f, () => {
      const code = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      expect(code).not.toMatch(/#[0-9a-fA-F]{6}\b/)
      expect(code).not.toMatch(/\b(?:bg|text|border|ring)-cobalt(?!-ink)\b/)   // cobalt-ink is the neutral ink, not an accent
      expect(code).not.toMatch(/btn-primary|text-white|pink|rose|fuchsia|magenta/)
    })
  }
  it('assessment step meter controls (Measure with phone, Saved row, all saved) use the tokens', () => {
    expect(read('src/pages/AssessmentMeasure.tsx')).toContain("'border border-meter-text/30 bg-meter-tint text-meter-text hover:bg-meter hover:text-meter-ink'")
    const s = read('src/pages/AssessmentMeasureScreen.tsx')
    expect(s).toContain('border-meter-text/20 bg-meter-tint')
    expect(s).toMatch(/text-meter-text" role="status" data-all-saved/)
  })
})

describe('rendered meter carries the token classes', () => {
  let root: Root | null = null, host: HTMLDivElement
  const $ = (sel: string) => host.querySelector(sel) as HTMLElement
  const btn = (t: string) => [...host.querySelectorAll('button')].find(b => b.textContent?.trim() === t || b.textContent?.trim().endsWith(` ${t}`)) as HTMLButtonElement
  const feed = (tilt: number) => act(() => { feedOrientation(30, 10 + tilt, 0) })
  const advance = (ms: number, tilt: number) => { for (let t = 0; t < ms; t += 50) { feed(tilt); act(() => { vi.advanceTimersByTime(50) }) } }
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'performance', 'Date'] })
    Object.defineProperty(navigator, 'maxTouchPoints', { value: 5, configurable: true })
    ;(window as unknown as { DeviceOrientationEvent: unknown }).DeviceOrientationEvent = class {}
    __resetSensorForTests()
  })
  afterEach(() => { if (root) act(() => root!.unmount()); root = null; host?.remove(); vi.useRealTimers() })
  async function run(el: ReturnType<typeof createElement>, deg: number) {
    host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
    act(() => { root!.render(el) })
    expect(btn('Turn on the ROMeter').className).toContain('btn-meter')
    act(() => { btn('Turn on the ROMeter').click() }); await act(async () => { await Promise.resolve(); await Promise.resolve() })
    for (let i = 0; i < 12; i++) feed(0)
    expect(btn('Start').className).toContain('btn-meter')
    act(() => { btn('Start').click() }); advance(6000, 0); advance(3500, deg)
    const badge = $('[data-locked-badge]')
    expect(badge.className).toContain('bg-meter'); expect(badge.className).toContain('text-meter-ink'); expect(badge.className).not.toContain('text-white')
    expect($('[data-meter-number]').className).toContain('text-meter-text')
    expect($('[data-phone-meter]').className).toContain('border-meter-text')
  }
  it('ROMeter page: Surf buttons, Surf Locked badge with dark text, #007C8D number and border', async () => {
    await run(createElement(ROMeter), 42)
    expect($('[data-method-line]').className).toContain('text-meter-text')
  })
  it('assessment meter: same tokens, and Use this number is a Surf button', async () => {
    await run(createElement(AssessmentMeasureScreen, {
      stepIdx: STEPS.findIndex(s => s.id === 'shoulder_er'), values: {}, loading: false, error: '', gender: null,
      setPhase: () => {}, setStepIdx: () => {}, handleNext: () => {}, handleChange: () => {},
    }), 60)
    expect(btn('Use this number').className).toContain('btn-meter')
  })
})
