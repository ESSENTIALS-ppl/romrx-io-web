/**
 * Max-reached fallback (Grant approved Oct 21 2026). If nothing locks within FALLBACK_MS after
 * movement starts, offer the highest correct-direction reading reached. It is only OFFERED: the
 * user still taps Use this number (no auto-save). Inputs are the same values fed to the lock
 * (lib/meterDirection gateReading), so a wrong-way reading (NaN) is never counted, and readings
 * inside the zero guard do not count as movement.
 */
import { ZERO_GUARD_DEG } from './meterLock'

export const FALLBACK_MS = 10000

export interface FallbackState { t0: number | null; best: number | null }
export const initialFallback = (): FallbackState => ({ t0: null, best: null })

/** One tick. Returns the new state and the number to offer (rounded), or null. */
export function stepFallback(s: FallbackState, lockInput: number, now: number, locked: boolean): { state: FallbackState; offer: number | null } {
  if (locked) return { state: s, offer: null }
  let { t0, best } = s
  if (Number.isFinite(lockInput) && lockInput > ZERO_GUARD_DEG) {
    if (t0 == null) t0 = now
    if (best == null || lockInput > best) best = lockInput
  }
  const state = { t0, best }
  const offer = t0 != null && best != null && now - t0 >= FALLBACK_MS ? Math.round(best) : null
  return { state, offer }
}
