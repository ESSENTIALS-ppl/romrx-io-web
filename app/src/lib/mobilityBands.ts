/**
 * Locked Base mobility band labels — keep in sync with ROMBot CBase
 * (romrxbjj-v2 supabase/functions/ai-chat/handler.js) AND with
 * public.compute_joint_scores() (persisted joint_scores.score).
 *
 * Product truth: joint_scores 1 → Needs focus, 2 → Building, 3 → Steady.
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

/** Row shape from public.joint_scores / rombot_context.joint_scores. */
export interface JointScoreRow {
  joint_key?: string
  joint?: string
  score: number | string
  left_value?: number | null
  right_value?: number | null
  left?: number | null
  right?: number | null
  asymmetry_pct?: number | null
  asymmetry_flag?: string | null
  flag?: string | null
}

/**
 * Targets from public.compute_joint_scores() — NOT the My Body riskBelow/normalMin
 * PRS thresholds. Score bands:
 *   worse/target >= 1.0 → 3 Steady
 *   worse/target >= 0.90 → 2 Building
 *   else → 1 Needs focus
 */
export const JOINT_SCORE_TARGETS: Record<string, number> = {
  hip_er: 45,
  hip_ir: 45,
  hip_abd: 90,
  hip_flex: 120,
  shoulder_er: 90,
  shoulder_flex: 180,
  ankle_df: 20,
  cervical_rot: 80,
  cervical_lat: 45,
  lumbar_flex: 60,
  lumbar_ext: 25,
  cervical_flex: 50,
  cervical_ext: 60,
}

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

/**
 * Exact same formula as public.compute_joint_scores() CASE expression.
 * Use only when persisted joint_scores rows are missing.
 */
export function bandScoreFromTargetRatio(worse: number, target: number): BandScore {
  if (!(target > 0) || !Number.isFinite(worse)) return 1
  const ratio = worse / target
  if (ratio >= 1.0) return 3
  if (ratio >= 0.9) return 2
  return 1
}

/** Map a measured value against riskBelow / normalMin (legacy FE / PRS chrome). */
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
 * Do NOT use for My Body overall when joint_scores exist.
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

export function jointKeyBase(key: string): string {
  return key.replace(/_(l|r)$/, '')
}

export function normalizeJointScoreKey(row: JointScoreRow): string | null {
  const raw = row.joint_key ?? row.joint
  if (!raw) return null
  return jointKeyBase(String(raw))
}

/** Build joint_key → BandScore map from persisted joint_scores rows. */
export function bandMapFromJointScores(
  rows: JointScoreRow[] | null | undefined,
): Map<string, BandScore> {
  const map = new Map<string, BandScore>()
  if (!rows) return map
  for (const row of rows) {
    const key = normalizeJointScoreKey(row)
    const band = bandScoreFromJointScore(row.score)
    if (key && band != null) map.set(key, band)
  }
  return map
}

/** Overall = worst joint_scores band (same as ROMBot CBase). */
export function overallBandFromJointScores(
  rows: JointScoreRow[] | null | undefined,
): BandScore | null {
  const bands: BandScore[] = []
  for (const row of rows ?? []) {
    const b = bandScoreFromJointScore(row.score)
    if (b != null) bands.push(b)
  }
  return worstBandScore(bands)
}

/**
 * Resolve band for a priority/joint key (ankle_df_l or ankle_df).
 * Prefers persisted joint_scores; else compute_joint_scores target ratio.
 */
export function bandForJointKey(
  jointKey: string,
  scoreMap: Map<string, BandScore>,
  measured?: { left?: number | null; right?: number | null; midline?: number | null },
): BandScore | null {
  const base = jointKeyBase(jointKey)
  const fromDb = scoreMap.get(base)
  if (fromDb != null) return fromDb

  const target = JOINT_SCORE_TARGETS[base]
  if (target == null || !measured) return null

  let worse: number | null = null
  if (measured.midline != null) worse = measured.midline
  else if (measured.left != null && measured.right != null) worse = Math.min(measured.left, measured.right)
  else if (measured.left != null) worse = measured.left
  else if (measured.right != null) worse = measured.right

  if (worse == null) return null
  return bandScoreFromTargetRatio(worse, target)
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
