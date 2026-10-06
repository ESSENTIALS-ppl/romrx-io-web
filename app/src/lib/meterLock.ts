/**
 * Lock-on-hold for the in-app phone meter (Jim, Oct 5 2026, tested on iPhone in the sandbox).
 *
 * - Lock when every reading stays within +/-LOCK_BAND_DEG of the reading at the START of the hold
 *   window for LOCK_HOLD_MS. Any reading outside the band restarts the window from that reading.
 * - Locked value = mean of the window, rounded to a whole degree (as displayed).
 * - No hold window while the reading is within ZERO_GUARD_DEG of 0 (still at the start position),
 *   so it never locks before you move.
 * - Once locked it stays locked: there is no automatic unlock or re-arm. Only Reset or Zero unlock.
 * Pure functions, no timers: callers pass the time. Guarded by meterLock.test.ts.
 */
export const LOCK_BAND_DEG = 2
export const LOCK_HOLD_MS = 2500
export const ZERO_GUARD_DEG = 2
/** Zero = a 5-4-3-2-1 countdown with a soft tick on each number, then it zeroes (Jim, Oct 5 10:26 PM). */
export const ZERO_COUNTDOWN_SEC = 5

export interface LockConfig { band: number; holdMs: number; zeroGuard: number }
export const DEFAULT_LOCK: LockConfig = { band: LOCK_BAND_DEG, holdMs: LOCK_HOLD_MS, zeroGuard: ZERO_GUARD_DEG }

export interface LockState {
  locked: boolean
  lockVal: number | null
  win: { t0: number; v0: number; sum: number; n: number } | null
}

export const initialLock = (): LockState => ({ locked: false, lockVal: null, win: null })

export interface LockStep {
  state: LockState
  /** true only on the reading that caused the lock (play the ding once). */
  justLocked: boolean
  /** 0..1 while a hold is in progress, null otherwise (no bar). */
  holdFrac: number | null
}

export function stepLock(s: LockState, v: number, now: number, cfg: LockConfig = DEFAULT_LOCK): LockStep {
  if (s.locked) return { state: s, justLocked: false, holdFrac: null }
  if (!Number.isFinite(v) || Math.abs(v) <= cfg.zeroGuard) return { state: { ...s, win: null }, justLocked: false, holdFrac: null }
  const w = s.win
  const win = !w || Math.abs(v - w.v0) > cfg.band
    ? { t0: now, v0: v, sum: v, n: 1 }
    : { t0: w.t0, v0: w.v0, sum: w.sum + v, n: w.n + 1 }
  const frac = Math.min(1, (now - win.t0) / cfg.holdMs)
  if (frac >= 1) return { state: { locked: true, lockVal: Math.round(win.sum / win.n), win: null }, justLocked: true, holdFrac: null }
  return { state: { locked: false, lockVal: null, win }, justLocked: false, holdFrac: frac }
}

/** Peak tracks the live maximum and is frozen while locked. */
export function nextPeak(peak: number | null, v: number, locked: boolean): number | null {
  if (locked || !Number.isFinite(v)) return peak
  return peak == null || v > peak ? v : peak
}

/** The number "Use this number" puts in the field: the locked value, else the live reading as displayed. */
export function meterValueToUse(lock: LockState, liveDeg: number | null): number | null {
  if (lock.locked && lock.lockVal != null) return lock.lockVal
  return liveDeg == null || !Number.isFinite(liveDeg) ? null : Math.round(liveDeg)
}
