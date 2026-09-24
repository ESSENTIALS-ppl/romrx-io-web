/**
 * Locked Base mobility band labels — keep in sync with ROMBot CBase
 * (romrxbjj-v2 supabase/functions/ai-chat/handler.js) AND with
 * public.compute_joint_scores() (persisted joint_scores.score).
 *
 * Product truth: joint_scores 1 → Needs focus, 2 → Building, 3 → Steady.
 * SINGLE SOURCE OF TRUTH for Base bands (P0 2026-09-24): every surface (My Body
 * header + chips + bar colours, My Protocol, results preview, Settings history,
 * lead submit) must resolve bands through this file. Thresholds live ONLY in
 * bandScoreFromTargetRatio (mirrors public.compute_joint_scores()). Colours come
 * from BAND_TONE[band], never from a separate %/threshold check.
 * Labels are exactly Needs focus · Building · Steady everywhere (chips included).
 * Progress-needed tone; never AT RISK / RESTRICTED / ELITE / Position Readiness.
 * Guarded by src/lib/mobilityBands.test.ts (npm test).
 */

export const BAND_FULL = {
  1: 'Needs focus',
  2: 'Building',
  3: 'Steady',
} as const

/** Chips use the exact same labels as the full band (no 'Focus' shorthand). */
export const BAND_CHIP = BAND_FULL

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
  1: 'Your problem areas need work. Small daily progress moves you up.',
  2: 'Progress needed on key joints. Stay consistent with your plan.',
  3: 'Solid mobility foundation. Keep training and retest regularly.',
}

/** Tailwind tone tokens for band chips / chrome (cobalt locked). */
export const BAND_TONE: Record<
  BandScore,
  { color: string; bg: string; ring: string; chip: string; label: string; bar: string }
> = {
  1: {
    color: 'text-red-700',
    bg: 'bg-red-50',
    ring: 'border-red-400/40',
    chip: 'bg-red-50 text-red-700 border-red-200',
    label: 'text-red-700',
    bar: 'bg-red-400',
  },
  2: {
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    ring: 'border-yellow-400/40',
    chip: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    label: 'text-yellow-700',
    bar: 'bg-yellow-500',
  },
  3: {
    color: 'text-cobalt',
    bg: 'bg-cobalt-light',
    ring: 'border-cobalt/40',
    chip: 'bg-cobalt-light text-cobalt border-cobalt/20',
    label: 'text-cobalt-ink',
    bar: 'bg-cobalt',
  },
}

/** Ordered legend entries for My Body chrome (always show all three). */
export const BAND_LEGEND: ReadonlyArray<{ score: BandScore; full: string; chip: string }> = [
  { score: 1, full: BAND_FULL[1], chip: BAND_CHIP[1] },
  { score: 2, full: BAND_FULL[2], chip: BAND_CHIP[2] },
  { score: 3, full: BAND_FULL[3], chip: BAND_CHIP[3] },
]

// ---------------------------------------------------------------------------
// Assessment-level resolvers (shared by every surface)
// ---------------------------------------------------------------------------

/** Joints scored by public.compute_joint_scores() (same columns, same order). */
export const ASSESSMENT_JOINTS: ReadonlyArray<{ key: string; l?: string; r?: string; single?: string }> = [
  { key: 'hip_er', l: 'hip_er_l', r: 'hip_er_r' },
  { key: 'hip_ir', l: 'hip_ir_l', r: 'hip_ir_r' },
  { key: 'hip_abd', l: 'hip_abd_l', r: 'hip_abd_r' },
  { key: 'hip_flex', l: 'hip_flex_l', r: 'hip_flex_r' },
  { key: 'shoulder_er', l: 'shoulder_er_l', r: 'shoulder_er_r' },
  { key: 'shoulder_flex', l: 'shoulder_flex_l', r: 'shoulder_flex_r' },
  { key: 'ankle_df', l: 'ankle_df_l', r: 'ankle_df_r' },
  { key: 'cervical_rot', l: 'cervical_rot_l', r: 'cervical_rot_r' },
  { key: 'cervical_lat', l: 'cervical_lat_l', r: 'cervical_lat_r' },
  { key: 'lumbar_flex', single: 'lumbar_flex' },
  { key: 'lumbar_ext', single: 'lumbar_ext' },
  { key: 'cervical_flex', single: 'cervical_flex' },
  { key: 'cervical_ext', single: 'cervical_ext' },
]

function toNum(v: unknown): number | null {
  if (v == null || v === '') return null
  const n = typeof v === 'number' ? v : Number(v)
  return Number.isFinite(n) ? n : null
}

/**
 * Per-joint bands for one assessment. Persisted joint_scores win; any joint
 * without a row is scored with the identical compute_joint_scores() formula.
 */
export function jointBandsForAssessment(
  assessment: object | null | undefined,
  jointScores?: JointScoreRow[] | null,
): Map<string, BandScore> {
  const map = bandMapFromJointScores(jointScores)
  if (!assessment) return map
  const rec = assessment as Record<string, unknown>
  for (const j of ASSESSMENT_JOINTS) {
    if (map.has(j.key)) continue
    const band = bandForJointKey(j.key, map, {
      left: j.l ? toNum(rec[j.l]) : null,
      right: j.r ? toNum(rec[j.r]) : null,
      midline: j.single ? toNum(rec[j.single]) : null,
    })
    if (band != null) map.set(j.key, band)
  }
  return map
}

/**
 * THE overall Mobility band for an assessment (My Body, My Protocol, results
 * preview, Settings history, lead submit): worst joint band, same as ROMBot CBase.
 * null only when no joint is measured.
 */
export function overallBandForAssessment(
  assessment: object | null | undefined,
  jointScores?: JointScoreRow[] | null,
): BandScore | null {
  return worstBandScore([...jointBandsForAssessment(assessment, jointScores).values()])
}

/** Copy says "top three problem areas" — never show more than this. */
export const TOP_PROBLEM_AREAS_MAX = 3

/**
 * Top problem areas from assessments.worst_joints (compute-tiers writes 5,
 * side-specific keys, worst first). Dedupe by joint (keep the worse side that
 * appears first) and cap at TOP_PROBLEM_AREAS_MAX.
 */
export function topProblemAreas(
  worstJoints: ReadonlyArray<string> | null | undefined,
  max: number = TOP_PROBLEM_AREAS_MAX,
): string[] {
  const out: string[] = []
  const seen = new Set<string>()
  for (const k of worstJoints ?? []) {
    if (!k) continue
    const base = jointKeyBase(k)
    if (seen.has(base)) continue
    seen.add(base)
    out.push(k)
    if (out.length >= max) break
  }
  return out
}

// ---------------------------------------------------------------------------
// Mobility score (/100) — ONE shared number for every Base surface
// ---------------------------------------------------------------------------
//
// Display number only (bands still come from overallBandForAssessment above).
// Moved verbatim from the four duplicated computePRS() copies in MyBody.tsx,
// MyProtocol.tsx, Settings.tsx and ResultsPreview.tsx (2026-09-24). The
// formula is UNCHANGED on purpose: a separate decision on it is pending with
// Jim. Do not tune the riskBelow/normalMin deductions here without that call.

/** Bilateral joints scored by the /100 number (riskBelow / normalMin cutoffs). */
export const SCORE_BILATERAL_JOINTS: ReadonlyArray<{
  l: string
  r: string
  riskBelow: number
  normalMin: number
}> = [
  { l: 'hip_er_l', r: 'hip_er_r', riskBelow: 40, normalMin: 40 },
  { l: 'hip_ir_l', r: 'hip_ir_r', riskBelow: 30, normalMin: 30 },
  { l: 'hip_abd_l', r: 'hip_abd_r', riskBelow: 30, normalMin: 40 },
  { l: 'hip_flex_l', r: 'hip_flex_r', riskBelow: 100, normalMin: 100 },
  { l: 'shoulder_er_l', r: 'shoulder_er_r', riskBelow: 60, normalMin: 60 },
  { l: 'shoulder_flex_l', r: 'shoulder_flex_r', riskBelow: 120, normalMin: 140 },
  { l: 'ankle_df_l', r: 'ankle_df_r', riskBelow: 10, normalMin: 10 },
  { l: 'cervical_lat_l', r: 'cervical_lat_r', riskBelow: 30, normalMin: 40 },
]

/** Midline joints scored by the /100 number. */
export const SCORE_UNILATERAL_JOINTS: ReadonlyArray<{
  key: string
  riskBelow: number
  normalMin: number
}> = [
  { key: 'lumbar_flex', riskBelow: 40, normalMin: 40 },
  { key: 'lumbar_ext', riskBelow: 15, normalMin: 20 },
  { key: 'cervical_flex', riskBelow: 35, normalMin: 45 },
  { key: 'cervical_ext', riskBelow: 40, normalMin: 55 },
]

/**
 * THE /100 mobility score for one assessment (My Body, My Protocol, results
 * preview, Settings history, My Body delta, lead submit). Pure: the same
 * assessment always gives the same number.
 */
export function mobilityScoreForAssessment(assessment: object | null | undefined): number {
  let score = 100
  const rec = (assessment ?? {}) as Record<string, number | null>
  for (const j of SCORE_BILATERAL_JOINTS) {
    const l = rec[j.l]
    const r = rec[j.r]
    if (l != null && r != null) {
      const minVal = Math.min(l, r)
      const gap = Math.abs(l - r)
      if (minVal < j.riskBelow) score -= 8
      else if (minVal < j.normalMin) score -= 4
      if (gap >= 15) score -= 6
      else if (gap >= 8) score -= 3
    }
  }
  for (const j of SCORE_UNILATERAL_JOINTS) {
    const v = rec[j.key]
    if (v != null) {
      if (v < j.riskBelow) score -= 6
      else if (v < j.normalMin) score -= 3
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

/** Separator between score and band: U+00B7 MIDDLE DOT, never an em dash. */
export const SCORE_BAND_SEPARATOR = ' \u00B7 '

/**
 * Score + band together, exactly "96/100 · Steady". Used by every Base
 * surface that shows the overall band.
 */
export function formatScoreBand(score: number, band: BandScore): string {
  return `${score}/100${SCORE_BAND_SEPARATOR}${bandFull(band)}`
}
