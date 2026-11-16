// P1-06 (Base engagement): day 7 to 14 quick re-check of the 1 or 2 focus areas, shown as day 1 next to now.
// SHIP GATE (Stacy 9:09 PM ET, Avery receipt): this UI may go live ONLY with or after Avery's compute-tiers quick-check guard
// (romrxbjj-v2 65a251b8), the matching submit-assessment and the check_kind and user_mobility_schedule migrations.
// Live submit-assessment today ignores check_kind, so a quick submit would be saved as a FULL assessment and rewrite the plan.
// So the whole feature (route and Today card banner) is behind QUICK_CHECK_ON = false.
import type { Field, Step } from '../pages/assessmentMeta'

export const QUICK_CHECK_ON = false
export const QUICK_CHECK_PATH = '/dashboard/quick-check' // the day 7 and day 14 emails link here (Avery note)

// Words: Stacy, /workspace/process/evidence/STACY-P1-06-WORDS-20261115-2055.md, character for character. Jim yes needed.
export const QUICK_CHECK_COPY = {
  bannerTitle: 'Your quick check is ready',
  bannerLine: 'Re-measure 1 or 2 focus areas and see them next to day 1.',
  bannerButton: 'Start quick check',
  bannerDismiss: 'Later',
  introTitle: 'Quick check',
  introBody: (joints: string) => `We'll re-measure ${joints}. Then you'll see your day 1 result next to today's.`,
  introSecond: 'This is a quick snapshot. Your full retest is still at 6 weeks.',
  start: 'Start',
  notNow: 'Not now',
  resultTitle: 'Your quick check',
  day1: (v: string) => `Day 1: ${v}`,
  now: (v: string) => `Now: ${v}`,
  higher: (n: string) => `Up ${n} since day 1.`,
  lower: (n: string) => `Down ${n} since day 1. Readings can change from day to day.`,
  same: 'About the same as day 1.',
  // Ships only with the compute-tiers guard; if the screen ever ships without it, Stacy says drop this line entirely.
  note: 'A quick check is a snapshot, not a full retest. Your plan stays the same until your 6-week retest.',
  nextCheck: (date: string) => `Your next check: ${date}`,
  nextCheckDue: 'Your next check is ready now.',
  nextCheckHelper: 'Quick check around day 7 to 14. Full retest every 6 weeks.',
  back: "Back to today's session",
} as const

export type Schedule = { next_check_at: string | null; next_retest_at: string | null; check_joints: string[] | null; last_assessed_at?: string | null }

/** Steps that hold a scheduled field, each cut down to the scheduled sides only (the server rejects any other field). */
export function quickCheckSteps(all: readonly Step[], checkJoints: readonly string[] | null | undefined): Step[] {
  const want = new Set(checkJoints ?? [])
  return all
    .map(s => ({ ...s, fields: s.fields.filter(f => want.has(f.key)) }))
    .filter(s => s.fields.length > 0)
}

/** The app's own names: step title plus the side label the measure screen shows. */
export function jointName(step: Step, field: Field): string {
  return step.fields.length > 1 || /left|right/i.test(field.label) ? `${step.title} (${field.label})` : step.title
}

export function jointList(names: readonly string[]): string {
  return names.join(', ')
}

/** Values shown the way the measure screen enters them: the number plus the field unit. */
export function formatValue(v: number, unit?: string): string {
  const r = Math.round(v * 10) / 10
  return `${r}${unit ?? ''}`
}

/** Up, Down or About the same. "Same" = equal after the app's 0.5 entry rounding. */
export function compareLine(day1: number, now: number, unit?: string): string {
  const d = Math.round((now - day1) * 2) / 2
  if (d === 0) return QUICK_CHECK_COPY.same
  return d > 0 ? QUICK_CHECK_COPY.higher(formatValue(d, unit)) : QUICK_CHECK_COPY.lower(formatValue(-d, unit))
}

/** "Monday, December 28" in the user's locale settings (en-US wording, local time zone). */
export function formatCheckDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
}

export function nextCheckLine(s: Schedule | null, now: Date = new Date()): string | null {
  const next = s?.next_check_at ?? s?.next_retest_at ?? null
  if (!next) return null
  return new Date(next).getTime() <= now.getTime() ? QUICK_CHECK_COPY.nextCheckDue : QUICK_CHECK_COPY.nextCheck(formatCheckDate(next))
}

/** Banner shows when a quick check is due (next_check_at reached) and joints are scheduled. */
export function isQuickCheckDue(s: Schedule | null, now: Date = new Date()): boolean {
  return !!s?.next_check_at && !!s.check_joints?.length && new Date(s.next_check_at).getTime() <= now.getTime()
}

export const quickCheckDismissKey = (userId: string, nextCheckAt: string) => `romrx_hq_quickcheck_later_${userId}_${nextCheckAt.slice(0, 10)}`

/** Request body for submit-assessment: only the scheduled fields, plus check_kind. */
export function quickSubmitBody(values: Record<string, string>, checkJoints: readonly string[]): Record<string, unknown> {
  const body: Record<string, unknown> = { check_kind: 'quick' }
  for (const k of checkJoints) body[k] = values[k] === undefined || values[k] === '' ? null : parseFloat(values[k])
  return body
}

/** Last FULL assessment from rows newest first (rows with check_kind 'quick' are skipped; the column may not exist yet). */
export function lastFullAssessment<T extends Record<string, unknown>>(rows: readonly T[]): T | null {
  return rows.find(r => r.check_kind !== 'quick') ?? null
}
