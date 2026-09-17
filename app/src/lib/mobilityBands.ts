/**
 * Locked Base mobility band labels - keep in sync with ROMBot CBase
 * (romrxbjj-v2 supabase/functions/ai-chat/handler.js).
 *
 * joint_scores: 1 → Needs focus, 2 → Building, 3 → Steady
 * Chips (space-tight): Focus · Building · Steady
 * Progress-needed tone; never AT RISK / RESTRICTED / ELITE / Position Readiness.
 */

export const BAND_FULL = {
  1: 'Needs focus',
  2: 'Building',
  3: 'Steady',
} as const

export const BAND_CHIP = {
  1: 'Focus',
  2: 'Building',
  3: 'Steady',
} as const

export type BandScore = 1 | 2 | 3

/** Map joint_scores score (1|2|3) or internal aliases to band score. */
export function bandScoreFromJointScore(
  score: number | string | null | undefined,
): BandScore | null {
  if (score === 1 || score === '1' || score === 'at_risk' || score === 'red' || score === 'needs_focus') {
    return 1
  }
  if (score === 2 || score === '2' || score === 'building' || score === 'yellow') {
    return 2
  }
  if (score === 3 || score === '3' || score === 'steady' || score === 'green') {
    return 3
  }
  return null
}

/** Map a measured value against riskBelow / normalMin to band score. */
export function bandScoreFromThresholds(
  val: number,
  riskBelow: number,
  normalMin: number,
): BandScore {
  if (val < riskBelow) return 1
  if (val < normalMin) return 2
  return 3
}

/**
 * Map aggregate 0-100 mobility score (legacy PRS) onto the locked 3 bands.
 * >=70 Steady, >=40 Building, else Needs focus.
 */
export function bandScoreFromAggregate(score: number): BandScore {
  if (score >= 70) return 3
  if (score >= 40) return 2
  return 1
}

/** Prefer worst (lowest) band among measured joints; null if none measured. */
export function worstBandScore(scores: Array<BandScore | null | undefined>): BandScore | null {
  let worst: BandScore | null = null
  for (const s of scores) {
    if (s == null) continue
    if (worst == null || s < worst) worst = s
  }
  return worst
}

export function bandFull(score: BandScore): string {
  return BAND_FULL[score]
}

export function bandChip(score: BandScore): string {
  return BAND_CHIP[score]
}

/** Progress-needed descriptions for aggregate chrome (non-threatening). */
export const BAND_DESC: Record<BandScore, string> = {
  1: 'Priority joints need work. Small daily progress moves you up.',
  2: 'Progress needed on key joints. Stay consistent with your plan.',
  3: 'Solid mobility foundation. Keep training and retest regularly.',
}

/** Tailwind tone tokens for band chips / chrome (cobalt locked). */
export const BAND_TONE: Record<BandScore, { color: string; bg: string; ring: string; chip: string }> = {
  1: {
    color: 'text-red-700',
    bg: 'bg-red-50',
    ring: 'border-red-400/40',
    chip: 'bg-red-50 text-red-700 border-red-200',
  },
  2: {
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    ring: 'border-yellow-400/40',
    chip: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  },
  3: {
    color: 'text-cobalt',
    bg: 'bg-cobalt-light',
    ring: 'border-cobalt/40',
    chip: 'bg-cobalt-light text-cobalt border-cobalt/20',
  },
}

/** Ordered legend entries for My Body chrome (always show all three). */
export const BAND_LEGEND: ReadonlyArray<{ score: BandScore; full: string; chip: string }> = [
  { score: 1, full: BAND_FULL[1], chip: BAND_CHIP[1] },
  { score: 2, full: BAND_FULL[2], chip: BAND_CHIP[2] },
  { score: 3, full: BAND_FULL[3], chip: BAND_CHIP[3] },
]
