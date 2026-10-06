/**
 * Meter sound sequence (Jim, real iPhone, Oct 6 9:05 AM): a clearly audible tick on 5, 4, 3, 2, 1
 * (0-4 s), then a higher, louder GO at 5 s when it zeroes; a distinct bright ding on lock. One shared
 * AudioContext; each tone re-checks the state and awaits resume (with retry) before playing.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  COUNTDOWN_TICK, GO_TONE, LOCK_DING, MAX_LATE_MS, ZERO_AT_SEC, __setAudioContextForTests, countdownPlan,
  ensureAudioRunning, playMeterTone, unlockMeterAudio,
} from './meterAudio'

type Osc = { freq: number; type: string; start: number }
function fakeCtx(state: string = 'running', resumeWorks = true, resumeDelayMs = 0) {
  const oscs: Osc[] = []
  const c = {
    state, currentTime: 10, destination: {},
    resume: vi.fn(function (this: { state: string }) {
      return new Promise<void>(res => setTimeout(() => { if (resumeWorks) this.state = 'running'; res() }, resumeDelayMs))
    }),
    createBuffer: () => ({}),
    createBufferSource: () => ({ connect() {}, start() {}, buffer: null }),
    createGain: () => ({ gain: { setValueAtTime() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() {} }),
    createOscillator: () => {
      const o: Osc = { freq: 0, type: 'sine', start: -1 }
      oscs.push(o)
      return {
        get type() { return o.type }, set type(t: string) { o.type = t },
        frequency: { set value(v: number) { o.freq = v } },
        connect() {}, disconnect() {}, start: (t: number) => { o.start = t }, stop() {},
      }
    },
  }
  return { c, oscs }
}
afterEach(() => { __setAudioContextForTests(null); vi.useRealTimers(); vi.unstubAllGlobals() })

describe('countdown plan', () => {
  it('5, 4, 3, 2, 1 tick one second apart (0-4 s), then GO at 5 s (zero is set at GO)', () => {
    expect(countdownPlan()).toEqual([
      { at: 0, show: 5, sound: 'tick' }, { at: 1, show: 4, sound: 'tick' }, { at: 2, show: 3, sound: 'tick' },
      { at: 3, show: 2, sound: 'tick' }, { at: 4, show: 1, sound: 'tick' }, { at: 5, show: 'GO', sound: 'go' },
    ])
    expect(ZERO_AT_SEC).toBe(5)
  })
  it('tick is clearly audible (880-1000 Hz, solid gain, short); GO is higher, louder, longer; ding is distinct', () => {
    const t = COUNTDOWN_TICK[0], g = GO_TONE[0], d = LOCK_DING[0]
    expect(t.freq).toBeGreaterThanOrEqual(880); expect(t.freq).toBeLessThanOrEqual(1000)
    expect(t.peak).toBeGreaterThanOrEqual(0.12)
    expect((t.attack + t.hold + t.decay) * 1000).toBeLessThanOrEqual(150)
    expect(g.freq).toBeGreaterThan(t.freq); expect(g.peak).toBeGreaterThan(t.peak)
    expect(g.attack + g.hold + g.decay).toBeGreaterThan(t.attack + t.hold + t.decay)
    expect(d.freq).not.toBe(g.freq); expect(d.freq).not.toBe(t.freq)
    expect(d.decay).toBeGreaterThan(1)
    for (const s of [...COUNTDOWN_TICK, ...GO_TONE, ...LOCK_DING]) expect(s.peak).toBeLessThanOrEqual(0.2)
  })
})

describe('playing on one AudioContext', () => {
  it('running: the tone plays immediately at currentTime (not scheduled far ahead)', async () => {
    const { c, oscs } = fakeCtx()
    __setAudioContextForTests(c as unknown as AudioContext)
    expect(await playMeterTone('tick')).toBe(true)
    expect(oscs.map(o => [o.freq, o.type])).toEqual([[COUNTDOWN_TICK[0].freq, 'triangle']])
    expect(oscs[0].start).toBeCloseTo(10.005, 3)
    await playMeterTone('go')
    expect(oscs.slice(1).map(o => o.freq)).toEqual(GO_TONE.map(s => s.freq))
  })
  it('suspended/interrupted: re-checks, awaits resume, then plays (never before running)', async () => {
    const { c, oscs } = fakeCtx('interrupted', true, 20)
    __setAudioContextForTests(c as unknown as AudioContext)
    const p = playMeterTone('tick')
    expect(oscs.length).toBe(0)
    expect(await p).toBe(true)
    expect(c.resume).toHaveBeenCalled()
    expect(oscs.length).toBe(1)
  })
  it('resume that never completes: retries, then gives up silently (no throw, nothing scheduled)', async () => {
    const { c, oscs } = fakeCtx('suspended', false, 0)
    __setAudioContextForTests(c as unknown as AudioContext)
    expect(await ensureAudioRunning(c as unknown as AudioContext)).toBe(false)
    expect(c.resume.mock.calls.length).toBeGreaterThanOrEqual(3)
    expect(await playMeterTone('tick')).toBe(false)
    expect(oscs.length).toBe(0)
  })
  it('a tone that would land too late, or after the countdown was cancelled, is dropped', async () => {
    const slow = fakeCtx('suspended', true, MAX_LATE_MS + 100)
    __setAudioContextForTests(slow.c as unknown as AudioContext)
    expect(await playMeterTone('tick')).toBe(false)
    const quick = fakeCtx('suspended', true, 5)
    __setAudioContextForTests(quick.c as unknown as AudioContext)
    expect(await playMeterTone('tick', () => false)).toBe(false)
    expect(quick.oscs.length).toBe(0)
  })
  it('no context yet (never unlocked): silent no-op', async () => {
    expect(await playMeterTone('tick')).toBe(false)
  })
  it('unlock in the tap: resume() called synchronously, silent buffer, audioSession set to playback when supported', () => {
    const { c } = fakeCtx('suspended')
    const session = { type: 'auto' }
    vi.stubGlobal('navigator', { audioSession: session })
    vi.stubGlobal('window', { AudioContext: function () { return c } })
    vi.stubGlobal('document', { addEventListener() {}, visibilityState: 'visible' })
    unlockMeterAudio()
    expect(c.resume).toHaveBeenCalledTimes(1)
    expect(session.type).toBe('playback')
    unlockMeterAudio()                                              // same context reused, resumed again if needed
    expect(c.resume).toHaveBeenCalledTimes(2)
  })
})
