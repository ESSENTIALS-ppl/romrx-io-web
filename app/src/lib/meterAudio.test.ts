/**
 * Meter sound sequence (Jim, Oct 5 10:45 PM): small soft ticks on 5, 4, 3, 2, then ONE louder,
 * higher GO when it zeroes; a bright longer ding on lock. One shared AudioContext, resumed on every tap.
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  COUNTDOWN_TICK, GO_TONE, LOCK_DING, ZERO_AT_SEC, __setAudioContextForTests, countdownPlan,
  playLockDing, scheduleCountdownSounds,
} from './meterAudio'

type Osc = { freq: number; type: string; start: number; stopAt: number | null; stopped: boolean; peak: number }
function fakeCtx(state: 'running' | 'suspended' | 'interrupted' = 'running') {
  const oscs: Osc[] = []
  const c = {
    state, currentTime: 10,
    destination: {},
    resume: vi.fn(function (this: { state: string }) { this.state = 'running'; return Promise.resolve() }),
    createBuffer: () => ({}),
    createBufferSource: () => ({ connect() {}, start() {}, buffer: null }),
    createGain: () => {
      let peak = 0
      const g = { gain: { setValueAtTime: () => {}, linearRampToValueAtTime: (v: number) => { peak = v; last.peak = peak }, exponentialRampToValueAtTime: () => {} }, connect() {} }
      return g
    },
    createOscillator: () => {
      const o: Osc = { freq: 0, type: 'sine', start: -1, stopAt: null, stopped: false, peak: 0 }
      oscs.push(o); last = o
      return {
        get type() { return o.type }, set type(t: string) { o.type = t },
        frequency: { set value(v: number) { o.freq = v } },
        connect() {}, disconnect() {},
        start: (t: number) => { o.start = t },
        stop: (t?: number) => { if (t == null) o.stopped = true; else o.stopAt = t },
      }
    },
  }
  let last: Osc = oscs[0]
  return { c, oscs }
}

afterEach(() => __setAudioContextForTests(null))

describe('countdown plan', () => {
  it('5, 4, 3, 2 tick one second apart, then GO at 4 s (zero is set at GO)', () => {
    expect(countdownPlan()).toEqual([
      { at: 0, show: 5, sound: 'tick' }, { at: 1, show: 4, sound: 'tick' },
      { at: 2, show: 3, sound: 'tick' }, { at: 3, show: 2, sound: 'tick' },
      { at: 4, show: 'GO', sound: 'go' },
    ])
    expect(ZERO_AT_SEC).toBe(4)
  })
  it('ticks are small, soft and low; GO is louder and higher; the lock ding is different from both', () => {
    expect(COUNTDOWN_TICK.peak).toBeLessThanOrEqual(0.06)
    expect((COUNTDOWN_TICK.attack + COUNTDOWN_TICK.decay) * 1000).toBeLessThanOrEqual(80)
    expect(GO_TONE[0].peak).toBeGreaterThan(COUNTDOWN_TICK.peak * 2)
    expect(GO_TONE[0].freq).toBeGreaterThan(COUNTDOWN_TICK.freq * 1.8)
    expect(LOCK_DING[0].freq).not.toBe(GO_TONE[0].freq)
    expect(LOCK_DING[0].decay).toBeGreaterThan(1)               // longer ring, microwave-style
    for (const s of [COUNTDOWN_TICK, ...GO_TONE, ...LOCK_DING]) expect(s.peak).toBeLessThanOrEqual(0.15)
  })
})

describe('scheduling on one AudioContext', () => {
  it('schedules every beep up front on the audio clock, in order: 4 ticks then GO', () => {
    const { c, oscs } = fakeCtx()
    __setAudioContextForTests(c as unknown as AudioContext)
    scheduleCountdownSounds()
    const base = 10.03
    const main = oscs.filter(o => o.freq === COUNTDOWN_TICK.freq || o.freq === GO_TONE[0].freq)
    expect(main.map(o => [o.freq, +(o.start - base).toFixed(3)])).toEqual([
      [480, 0], [480, 1], [480, 2], [480, 3], [GO_TONE[0].freq, 4],
    ])
    expect(oscs.find(o => o.freq === GO_TONE[0].freq)!.peak).toBeGreaterThan(oscs[0].peak)
  })
  it('cancel (Reset / Close during the countdown) stops every pending beep', () => {
    const { c, oscs } = fakeCtx()
    __setAudioContextForTests(c as unknown as AudioContext)
    const cancel = scheduleCountdownSounds()
    cancel()
    expect(oscs.every(o => o.stopped)).toBe(true)
  })
  it('lock ding re-checks the state: suspended/interrupted -> resume first, then play', async () => {
    const { c, oscs } = fakeCtx('interrupted')
    __setAudioContextForTests(c as unknown as AudioContext)
    playLockDing()
    expect(c.resume).toHaveBeenCalledTimes(1)
    expect(oscs.length).toBe(0)
    await Promise.resolve(); await Promise.resolve()
    expect(oscs.map(o => o.freq)).toEqual(LOCK_DING.map(s => s.freq))
  })
  it('lock ding plays immediately when running; no context (never unlocked) is a silent no-op', () => {
    playLockDing()
    const { c, oscs } = fakeCtx()
    __setAudioContextForTests(c as unknown as AudioContext)
    playLockDing()
    expect(c.resume).not.toHaveBeenCalled()
    expect(oscs.length).toBe(LOCK_DING.length)
  })
})
