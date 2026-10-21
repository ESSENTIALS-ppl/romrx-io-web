/**
 * Max-reached fallback (Grant approved Oct 21 2026; stiff-joint fix per Quinn sign-off 1:08 PM).
 * If nothing locks within FALLBACK_MS after Start (zero), offer the highest right-way reading
 * reached, including 0 to 5 deg (inside the zero guard), so a very stiff joint can still finish.
 * It is only OFFERED: the user still taps Use this number (no auto-save). Input is
 * gateReading().fallbackInput: wrong-way past the margin is NaN (never counted), a small wrong-way
 * wobble counts as 0. The clock starts at the first reading after zero; Reset and Start clear it.
 */

export const FALLBACK_MS = 10000

export interface FallbackState { t0: number | null; best: number | null }
export const initialFallback = (): FallbackState => ({ t0: null, best: null })

/** One tick. Returns the new state and the number to offer (rounded), or null. */
export function stepFallback(s: FallbackState, lockInput: number, now: number, locked: boolean): { state: FallbackState; offer: number | null } {
  if (locked) return { state: s, offer: null }
  let { t0, best } = s
  if (t0 == null) t0 = now
  if (Number.isFinite(lockInput) && (best == null || lockInput > best)) best = lockInput
  const state = { t0, best }
  const offer = t0 != null && best != null && now - t0 >= FALLBACK_MS ? Math.round(best) : null
  return { state, offer }
}
