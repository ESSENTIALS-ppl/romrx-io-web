/**
 * Phone meter lock-on-hold (Jim, Oct 5 2026): lock after 2.5 s within +/-2 deg of the reading at the
 * start of the hold window; any reading outside restarts the timer; never within 2 deg of zero; stays
 * locked until Reset or Zero (no auto unlock or re-arm). Locked value = rounded mean of the window.
 */
import { describe, expect, it } from 'vitest'
import { DEFAULT_LOCK, LOCK_BAND_DEG, LOCK_HOLD_MS, ZERO_GUARD_DEG, initialLock, meterValueToUse, nextPeak, stepLock, type LockState } from './meterLock'

/** Feed readings every dt ms from a function of time; returns lock time (ms) and the number of locks. */
function run(fn: (t: number) => number, ms: number, start: LockState = initialLock(), dt = 16) {
  let s = start, lockedAt: number | null = null, locks = 0, maxFrac = 0
  for (let t = 0; t <= ms; t += dt) {
    const r = stepLock(s, fn(t), t)
    s = r.state
    if (r.holdFrac != null) maxFrac = Math.max(maxFrac, r.holdFrac)
    if (r.justLocked) { locks++; if (lockedAt == null) lockedAt = t }
  }
  return { s, lockedAt, locks, maxFrac }
}

describe('meter lock constants', () => {
  it('2.5 s hold, +/-2 deg band, 2 deg zero guard', () => {
    expect(LOCK_HOLD_MS).toBe(2500)
    expect(LOCK_BAND_DEG).toBe(2)
    expect(ZERO_GUARD_DEG).toBe(2)
    expect(DEFAULT_LOCK).toEqual({ band: 2, holdMs: 2500, zeroGuard: 2 })
  })
})

describe('stepLock', () => {
  it('a still hold locks at 2.5 s with exactly one lock event, on the held value', () => {
    const r = run(() => 97, 6000)
    expect(r.locks).toBe(1)
    expect(r.lockedAt).toBeGreaterThanOrEqual(2500)
    expect(r.lockedAt).toBeLessThan(2500 + 20)
    expect(r.s.locked).toBe(true)
    expect(r.s.lockVal).toBe(97)
  })

  it('does not lock before 2.5 s', () => {
    expect(run(() => 60, 2480).s.locked).toBe(false)
  })

  it('jitter within +/-2 deg of the window start still locks; value is the rounded mean', () => {
    // alternates 44.1 / 45.9 around a 45 start: every reading within 2 of 45
    const r = run(t => (t === 0 ? 45 : (Math.floor(t / 16) % 2 ? 45.9 : 44.1)), 4000)
    expect(r.locks).toBe(1)
    expect(r.lockedAt).toBeLessThan(2520)
    expect(r.s.lockVal).toBe(45)
  })

  it('a move beyond 2 deg restarts the timer from that reading', () => {
    // 80 for 1.5 s, then 83 (3 deg away) -> new window at 1500, so lock at ~4000, not 2500
    const r = run(t => (t < 1500 ? 80 : 83), 6000)
    expect(r.locks).toBe(1)
    expect(r.lockedAt).toBeGreaterThanOrEqual(4000)
    expect(r.lockedAt).toBeLessThan(4020)
    expect(r.s.lockVal).toBe(83)
  })

  it('band is measured against the window START reading, not the previous sample (slow creep restarts)', () => {
    // creeping 1 deg per 500 ms: after 2.1 deg from the start the window restarts, so it never locks within 6 s
    const r = run(t => 50 + t / 500, 6000)
    expect(r.locks).toBe(0)
  })

  it('never locks within 2 deg of zero (start position), and shows no hold bar there', () => {
    const r = run(t => Math.sin(t / 100) * 1.5, 8000)
    expect(r.locks).toBe(0)
    expect(r.maxFrac).toBe(0)
    expect(run(() => 2, 5000).locks).toBe(0)
    expect(run(() => 2.5, 5000).locks).toBe(1)
  })

  it('stays locked while moving after lock: no unlock, no re-arm, no second lock', () => {
    const first = run(() => 60, 3000)
    expect(first.s.locked).toBe(true)
    const after = run(t => 60 + 70 * Math.sin(t / 300), 10000, first.s)
    expect(after.s.locked).toBe(true)
    expect(after.s.lockVal).toBe(60)
    expect(after.locks).toBe(0)
    const holdElsewhere = run(() => 20, 5000, after.s)
    expect(holdElsewhere.s.lockVal).toBe(60)
    expect(holdElsewhere.locks).toBe(0)
  })

  it('Reset or Zero (fresh state) goes back to live and can lock again', () => {
    const first = run(() => 60, 3000)
    const again = run(() => 110, 3000, initialLock())
    expect(first.s.lockVal).toBe(60)
    expect(again.s.lockVal).toBe(110)
    expect(again.locks).toBe(1)
  })

  it('reports hold progress 0..1 during a hold', () => {
    const s0 = stepLock(initialLock(), 40, 0)
    expect(s0.holdFrac).toBe(0)
    const s1 = stepLock(s0.state, 40.5, 1250)
    expect(s1.holdFrac).toBeCloseTo(0.5, 5)
  })
})

describe('Peak', () => {
  it('tracks the live maximum and is frozen while locked', () => {
    let p: number | null = 0
    for (const v of [10, 50, 105, 97]) p = nextPeak(p, v, false)
    expect(p).toBe(105)
    expect(nextPeak(p, 150, true)).toBe(105)
    expect(nextPeak(p, 150, false)).toBe(150)
  })
})

describe('Use this number value', () => {
  it('uses the locked value when locked, else the live reading as displayed (rounded)', () => {
    const locked = run(() => 133.4, 3000).s
    expect(meterValueToUse(locked, 20)).toBe(133)
    expect(meterValueToUse(initialLock(), 68.6)).toBe(69)
    expect(meterValueToUse(initialLock(), null)).toBeNull()
  })
})
