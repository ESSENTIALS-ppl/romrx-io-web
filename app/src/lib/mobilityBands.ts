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
 * Targets from public.compute_joint_scores() — NOT the measure-screen "Normal" ranges
 * (riskBelow/normalMin). Also the ONLY targets for the Base per-joint % and /100. Score bands:
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

  const worse = worseSideValue(measured)
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
  { color: string; bg: string; ring: string; chip: string; label: string; bar: string; badge: string }
> = {
  1: {
    color: 'text-red-700',
    bg: 'bg-red-50',
    ring: 'border-red-400/40',
    chip: 'bg-red-50 text-red-700 border-red-200',
    label: 'text-red-700',
    bar: 'bg-red-400',
    badge: 'bg-red-600 text-white border border-red-600',
  },
  2: {
    color: 'text-yellow-700',
    bg: 'bg-yellow-50',
    ring: 'border-yellow-400/40',
    chip: 'bg-yellow-50 text-yellow-700 border-yellow-200',
    label: 'text-yellow-700',
    bar: 'bg-yellow-500',
    badge: 'bg-yellow-500 text-yellow-950 border border-yellow-500',
  },
  3: {
    color: 'text-cobalt',
    bg: 'bg-cobalt-light',
    ring: 'border-cobalt/40',
    chip: 'bg-cobalt-light text-cobalt border-cobalt/20',
    label: 'text-cobalt',
    bar: 'bg-cobalt',
    badge: 'bg-cobalt text-white border border-cobalt',
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
// Per-joint % and the /100 score: ONE shared formula for every Base surface
// ---------------------------------------------------------------------------
//
// Fix A (Jim LOCK via Grant, 2026-09-24 5:32 PM ET). Base is for normal people,
// so every Base number is measured against JOINT_SCORE_TARGETS (the same targets
// that drive the bands), never against the elite sport-pack table.
//
//   per-joint %  = floor(100 * min(1, worse / target))            (worse side = midline,
//                  or the lower of L/R, exactly as bandForJointKey)  then clamped into
//                  the joint's band range, so Steady = 100, Building = 90..99,
//                  Needs focus = 0..89 ALWAYS (floor, not round: 89.6 never shows 90).
//   /100 score   = s = floor(mean over measured joints of min(1, worse/target) * 100),
//                  then clamped into the OVERALL band's range (overall = worst joint):
//                  Needs focus → min(s, 89); Building → max(90, min(s, 99)); Steady → 100.
//
// MIRRORED in romrxbjj-v2 supabase/functions/submit-lead-assessment/email.ts
// (lead results email). Any change here MUST be ported there in the same breath;
// the harness (mobilityBands.test.ts) pins the fixture values both sides print.

/** Lowest / highest % a band may display (inclusive). */
export const BAND_PERCENT_RANGE: Record<BandScore, { min: number; max: number }> = {
  1: { min: 0, max: 89 },
  2: { min: 90, max: 99 },
  3: { min: 100, max: 100 },
}

/** Clamp a 0..100 number into the band's range (used per joint AND for /100). */
export function clampPercentToBand(pct: number, band: BandScore): number {
  if (band === 3) return 100
  if (band === 2) return Math.max(90, Math.min(pct, 99))
  return Math.max(0, Math.min(pct, 89))
}

/** Worse side, the same rule bandForJointKey uses: midline, else lower of L/R, else the one side. */
export function worseSideValue(measured: {
  left?: number | null
  right?: number | null
  midline?: number | null
}): number | null {
  if (measured.midline != null) return measured.midline
  if (measured.left != null && measured.right != null) return Math.min(measured.left, measured.right)
  if (measured.left != null) return measured.left
  if (measured.right != null) return measured.right
  return null
}

/** min(1, worse / target) * 100, unfloored (0..100). null when unmeasured / no target. */
function cappedRatioPct(worse: number | null, target: number | undefined): number | null {
  if (worse == null || !Number.isFinite(worse) || target == null || !(target > 0)) return null
  return Math.min(1, Math.max(0, worse / target)) * 100
}

/**
 * THE per-joint % for Base (My Body Joint Breakdown bars + % and the radar).
 * `band` = the band that surface shows for this joint (persisted joint_scores
 * first); defaults to the compute_joint_scores() formula on the same values.
 */
export function jointPercent(
  jointKey: string,
  measured: { left?: number | null; right?: number | null; midline?: number | null },
  band?: BandScore | null,
): number | null {
  const base = jointKeyBase(jointKey)
  const target = JOINT_SCORE_TARGETS[base]
  const worse = worseSideValue(measured)
  const raw = cappedRatioPct(worse, target)
  if (raw == null) return null
  const b = band ?? bandScoreFromTargetRatio(worse!, target)
  return clampPercentToBand(Math.floor(raw), b)
}

function measuredFor(rec: Record<string, unknown>, j: { l?: string; r?: string; single?: string }) {
  return {
    left: j.l ? toNum(rec[j.l]) : null,
    right: j.r ? toNum(rec[j.r]) : null,
    midline: j.single ? toNum(rec[j.single]) : null,
  }
}

/** joint key → per-joint % for every measured joint of one assessment. */
export function jointPercentsForAssessment(
  assessment: object | null | undefined,
  jointScores?: JointScoreRow[] | null,
): Map<string, number> {
  const out = new Map<string, number>()
  if (!assessment) return out
  const rec = assessment as Record<string, unknown>
  const bands = jointBandsForAssessment(assessment, jointScores)
  for (const j of ASSESSMENT_JOINTS) {
    const pct = jointPercent(j.key, measuredFor(rec, j), bands.get(j.key) ?? null)
    if (pct != null) out.set(j.key, pct)
  }
  return out
}

/**
 * THE /100 mobility score for one assessment (My Body, My Protocol, results
 * preview, Settings history, My Body delta, lead submit). Pure and
 * deterministic. Pass the same jointScores the surface uses for its band so the
 * number is clamped into exactly the band shown next to it. With nothing
 * measured it returns 100, matching the surfaces' Steady fallback.
 */
export function mobilityScoreForAssessment(
  assessment: object | null | undefined,
  jointScores?: JointScoreRow[] | null,
): number {
  const rec = (assessment ?? {}) as Record<string, unknown>
  let sum = 0
  let n = 0
  for (const j of ASSESSMENT_JOINTS) {
    const p = cappedRatioPct(worseSideValue(measuredFor(rec, j)), JOINT_SCORE_TARGETS[j.key])
    if (p == null) continue
    sum += p
    n += 1
  }
  if (n === 0) return 100
  const s = Math.floor(sum / n)
  const band = overallBandForAssessment(assessment, jointScores) ?? 3
  return clampPercentToBand(s, band)
}

/**
 * Rank badge (#1/#2/#3 Problem area on My Protocol) is coloured by THAT joint's
 * band (Grant's call 2026-09-24): a solid badge in the band colour. Unmeasured
 * joints fall back to neutral slate.
 */
export function rankBadgeClass(band: BandScore | null | undefined): string {
  return band != null ? BAND_TONE[band].badge : 'bg-slate-100 text-slate-700 border border-slate-200'
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

// ---------------------------------------------------------------------------
// My Body display rows (Joint Breakdown bars AND the radar), side colours,
// units. One list, one per-joint %, one band: the radar can never disagree
// with the bars (2026-09-24, radar + L/R follow-up to Fix A).
// ---------------------------------------------------------------------------

/**
 * Unit each joint is MEASURED and STORED in (assessment input fields,
 * assessmentSteps*.ts). Ankle DF is the knee-to-wall test, recorded in cm, and
 * its JOINT_SCORE_TARGETS value (20) is cm. Everything else is degrees.
 */
export const JOINT_UNITS: Record<string, '°' | 'cm'> = {
  ankle_df: 'cm',
}
export function jointUnit(jointKey: string): '°' | 'cm' {
  return JOINT_UNITS[jointKeyBase(jointKey)] ?? '°'
}

/** Format a measured value or L/R gap: max 1 decimal, no float noise (1.1000000000000014 → 1.1). */
export function formatMeasure(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(Number(v))) return '-'
  return String(Math.round(Number(v) * 10) / 10)
}

/** Joints on My Body Joint Breakdown and the radar: same set, same order. */
export const BASE_DISPLAY_JOINTS: ReadonlyArray<{
  key: string; label: string; short: string; l?: string; r?: string; single?: string
}> = [
  { key: 'hip_er', label: 'Hip ER', short: 'Hip ER', l: 'hip_er_l', r: 'hip_er_r' },
  { key: 'hip_ir', label: 'Hip IR', short: 'Hip IR', l: 'hip_ir_l', r: 'hip_ir_r' },
  { key: 'hip_abd', label: 'Hip Abduction', short: 'Hip Abd', l: 'hip_abd_l', r: 'hip_abd_r' },
  { key: 'hip_flex', label: 'Hip Flexion', short: 'Hip Flex', l: 'hip_flex_l', r: 'hip_flex_r' },
  { key: 'shoulder_er', label: 'Shoulder ER', short: 'Shoulder ER', l: 'shoulder_er_l', r: 'shoulder_er_r' },
  { key: 'shoulder_flex', label: 'Shoulder Flex', short: 'Shoulder Flex', l: 'shoulder_flex_l', r: 'shoulder_flex_r' },
  { key: 'ankle_df', label: 'Ankle DF', short: 'Ankle DF', l: 'ankle_df_l', r: 'ankle_df_r' },
  { key: 'lumbar_flex', label: 'Lumbar Flex', short: 'Lumbar Flex', single: 'lumbar_flex' },
  { key: 'lumbar_ext', label: 'Lumbar Ext', short: 'Lumbar Ext', single: 'lumbar_ext' },
  { key: 'cervical_lat', label: 'Cervical Lat Flex', short: 'Cerv Lat', l: 'cervical_lat_l', r: 'cervical_lat_r' },
  { key: 'cervical_flex', label: 'Cervical Flex', short: 'Cerv Flex', single: 'cervical_flex' },
  { key: 'cervical_ext', label: 'Cervical Ext', short: 'Cerv Ext', single: 'cervical_ext' },
]

export interface JointDisplayRow {
  key: string
  label: string
  short: string
  unit: '°' | 'cm'
  left: number | null
  right: number | null
  midline: number | null
  /** Band shown for this joint (persisted joint_scores first). null = unmeasured. */
  band: BandScore | null
  /** THE per-joint % (jointPercent). 0 when unmeasured (bar empty, radar at centre). */
  pct: number
}

/** Rows for My Body Joint Breakdown AND radar (same values, same order). */
export function jointDisplayRowsForAssessment(
  assessment: object | null | undefined,
  jointScores?: JointScoreRow[] | null,
): JointDisplayRow[] {
  const rec = (assessment ?? {}) as Record<string, unknown>
  const bands = jointBandsForAssessment(assessment, jointScores)
  return BASE_DISPLAY_JOINTS.map(j => {
    const m = measuredFor(rec, j)
    const band = bands.get(j.key) ?? null
    return {
      key: j.key, label: j.label, short: j.short, unit: jointUnit(j.key),
      left: m.left, right: m.right, midline: m.midline,
      band,
      pct: jointPercent(j.key, m, band) ?? 0,
    }
  })
}

/**
 * Radar data for My Body: one row per BASE_DISPLAY_JOINTS entry (same order as
 * the bars), `v0` = the current assessment's per-joint % (identical to the bar
 * %), `v1..` = older assessments (formula bands, no persisted rows), `band` =
 * the current joint band (dot colour + tooltip). Scale is 0..100.
 */
export function radarDataForAssessments(
  assessments: ReadonlyArray<{ id?: string } & object>,
  current: { id?: string } & object,
  jointScores?: JointScoreRow[] | null,
): Array<Record<string, string | number | null>> {
  const currentRows = jointDisplayRowsForAssessment(current, jointScores)
  const perAssessment = assessments.map(a =>
    a === current || (a.id != null && a.id === current.id)
      ? currentRows
      : jointDisplayRowsForAssessment(a, null),
  )
  return currentRows.map((cur, idx) => {
    const row: Record<string, string | number | null> = { joint: cur.short, key: cur.key, band: cur.band }
    perAssessment.forEach((rows, i) => { row[`v${i}`] = rows[idx].pct })
    return row
  })
}

/** Hex band colours for SVG (radar dots); same hues as BAND_TONE[band].badge. */
export const BAND_HEX: Record<BandScore, string> = {
  1: '#DC2626', // red-600
  2: '#EAB308', // yellow-500
  3: '#1D4ED8', // cobalt
}

/**
 * Band for each side of a bilateral joint (My Protocol Left/Right numbers).
 * Each side is scored with the SAME rule as the joint (side / JOINT_SCORE_TARGETS
 * via bandScoreFromTargetRatio). The worse side always shows exactly the card's
 * band, and the better side is never shown below it, so a side colour can never
 * contradict the card chip even if persisted joint_scores differ from the formula.
 */
export function sideBandsForJoint(
  jointKey: string,
  sides: { left?: number | null; right?: number | null },
  jointBand?: BandScore | null,
): { left: BandScore | null; right: BandScore | null } {
  const target = JOINT_SCORE_TARGETS[jointKeyBase(jointKey)]
  const one = (v: number | null | undefined): BandScore | null =>
    v == null || target == null || !Number.isFinite(Number(v)) ? null : bandScoreFromTargetRatio(Number(v), target)
  let left = one(sides.left)
  let right = one(sides.right)
  if (jointBand != null) {
    const l = sides.left == null ? null : Number(sides.left)
    const r = sides.right == null ? null : Number(sides.right)
    const leftIsWorse = l != null && (r == null || l <= r)
    const rightIsWorse = r != null && (l == null || r <= l)
    if (left != null) left = leftIsWorse ? jointBand : (Math.max(left, jointBand) as BandScore)
    if (right != null) right = rightIsWorse ? jointBand : (Math.max(right, jointBand) as BandScore)
  }
  return { left, right }
}

/** Text colour class for a side / single value: BAND_TONE colour, neutral when unmeasured. */
export function valueToneClass(band: BandScore | null | undefined): string {
  return band != null ? BAND_TONE[band].color : 'text-slate-500'
}
