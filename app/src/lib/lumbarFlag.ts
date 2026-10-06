/**
 * BASE LOW-BACK REMOVAL FLAG (Jim decided removal; Grant approved the plan, Oct 5 2026).
 *
 * ON  = the low back (lumbar flexion + extension) step is not in the Base assessment, nothing new is
 *       saved for it (null, never 0), My Body shows one "Low back: not measured" line instead of the two
 *       lumbar bars, and the radar leaves out unmeasured lumbar axes. Stored lumbar values are kept and
 *       used exactly as before.
 * OFF = today's behavior, unchanged.
 *
 * Build-time switch: VITE_BASE_LUMBAR_REMOVED=1 turns it ON. Anything else (unset) = OFF.
 * PRODUCTION DEFAULT IS OFF: the Netlify site has no such env var, so the 6 AM ship keeps the low back
 * step. Only the base-meter draft is built with VITE_BASE_LUMBAR_REMOVED=1.
 * To flip ON in production later (after the pack + compute-tiers fixes pass Reid): set
 * VITE_BASE_LUMBAR_REMOVED=1 in the romrx.io Netlify env and rebuild. To flip OFF: remove it and rebuild.
 */
export function baseLumbarRemoved(): boolean {
  return import.meta.env.VITE_BASE_LUMBAR_REMOVED === '1'
}

export const LUMBAR_KEYS = ['lumbar_flex', 'lumbar_ext'] as const

/** Stacy pre-clear line for any slot that would show the low back. */
export const LOW_BACK_NOT_MEASURED = 'Low back: not measured'

export function isLumbarKey(key: string): boolean {
  return (LUMBAR_KEYS as readonly string[]).includes(key)
}

/** True when this assessment has no lumbar value at all (both null / missing). */
export function lumbarNotMeasured(assessment: object | null | undefined): boolean {
  const rec = (assessment ?? {}) as Record<string, unknown>
  return LUMBAR_KEYS.every(k => rec[k] == null || rec[k] === '')
}
