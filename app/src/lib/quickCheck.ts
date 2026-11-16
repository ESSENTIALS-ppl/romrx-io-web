// P1-06 (Base engagement): day 7 to 14 quick re-check of the 1 or 2 focus areas, shown as day 1 next to now.
// SHIP GATE: this UI may go live ONLY with or after Avery's P1-06 v2 backend, romrxbjj-v2 65c3a036 (compute-tiers quick guard
// after the Row 19 caller check, submit-assessment quick path, migration 20261116031000 assessments.check_kind) and
// bda32302 (server reads skip check_kind='quick': get_my_profile, my_joint_history, my_joint_start_vs_now, rombot_context;
// migrations 20261116031100 and 20261116031200), on P1-07 v2 (20261116030000 user_mobility_schedule and its roll cron).
// Replaces the dead 65a251b8 and c8769478 contracts. Live submit-assessment today ignores check_kind, so a quick submit would
// be saved as a FULL assessment and rewrite the plan. So the whole feature (route and Today card banner) is behind QUICK_CHECK_ON = false.
//
// 65c3a036 contract this file follows (read only):
//  - POST functions/v1/submit-assessment, body { check_kind: 'quick', <scheduled field keys>: number }.
//    200 { ok: true, assessment_id, assessed_at, sport, check_kind: 'quick' } (no assessment-done email).
//    400 { error } with: 'check_kind must be full or quick', 'No quick re-check is scheduled' (no schedule row or empty
//    check_joints, so a user with no full assessment cannot save a quick check), 'Quick re-check only accepts the scheduled joints',
//    'Quick re-check needs a measurement for a scheduled joint', 'At least one ROM measurement is required'.
//  - Schedule writer rules (Grant 9:38 PM ET): full save sets next_check_at = +7 days and next_retest_at = +42 days;
//    a quick save sets next_check_at = next_retest_at; the hourly roll sets next_check_at = next_retest_at once the window ends
//    (65c3a036: after local day 7; Avery is moving the roll to after local day 14, so the check stays open days 7 to 14).
//    The client needs no change for either: it reads only whether next_check_at still differs from next_retest_at.
//    So next_check_at === next_retest_at means no quick check is pending (only the full retest).
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

export type Schedule = { next_check_at: string | null; next_retest_at: string | null; check_joints: string[] | null; last_assessed_at?: string | null; last_assessment_id?: string | null }

/** user_mobility_schedule columns the client reads (owner select policy schedule_own_read). */
export const SCHEDULE_COLUMNS = 'next_check_at, next_retest_at, check_joints, last_assessed_at, last_assessment_id'

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
export function formatCheckDate(iso: string, tz?: string): string {
  return new Date(iso).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', ...(tz ? { timeZone: tz } : {}) })
}

export function nextCheckLine(s: Schedule | null, now: Date = new Date()): string | null {
  const next = s?.next_check_at ?? s?.next_retest_at ?? null
  if (!next) return null
  return new Date(next).getTime() <= now.getTime() ? QUICK_CHECK_COPY.nextCheckDue : QUICK_CHECK_COPY.nextCheck(formatCheckDate(next))
}

/** A quick check is pending only while next_check_at is set and differs from next_retest_at (65c3a036 rule 2 and the roll
 *  both set next_check_at = next_retest_at once it is done or missed). */
export function isQuickCheckPending(s: Schedule | null): boolean {
  if (!s?.next_check_at || !s.check_joints?.length) return false
  return !s.next_retest_at || new Date(s.next_check_at).getTime() !== new Date(s.next_retest_at).getTime()
}

/** Banner and page: due = inside the 34835f66 window (see isQuickCheckInWindow below). Replaces the v3 "next_check_at reached" rule. */
export function isQuickCheckDue(s: Schedule | null, now: Date = new Date(), ctx: QuickContext = {}): boolean {
  return isQuickCheckInWindow(s, now, ctx)
}

// ---------------------------------------------------------------------------------------------------------------
// v4 window, matching Avery's server guard romrxbjj-v2 34835f66 (schedule.ts rejectQuickWindow, read only):
//  - day 0 is the LOCAL calendar date of user_mobility_schedule.last_assessed_at (the cycle's full assessment);
//  - the day number is the local date of now minus day 0, in calendar days;
//  - a quick check is accepted on local days 7 to 14 inclusive (day 14 runs to the end of that local day);
//  - zone: notification_preferences.timezone if valid, else America/New_York (server DEFAULT_TZ); the device zone
//    is used only if this browser cannot format America/New_York;
//  - once per cycle: the server treats next_check_at === next_retest_at as done (rule 2). The client also hides when a
//    quick row exists after last_assessed_at (stricter, in case the schedule write after a quick save failed).
// Outside that the server answers 400 'No quick re-check is scheduled' (QUICK_NOT_SCHEDULED_ERROR).
export const DEFAULT_TZ = 'America/New_York'
export const QUICK_WINDOW_FIRST_DAY = 7
export const QUICK_WINDOW_LAST_DAY = 14
export const QUICK_NOT_SCHEDULED_ERROR = 'No quick re-check is scheduled'
/** The app's existing generic error line (Assessment.tsx, ResultsPreview.tsx). No new words. */
export const GENERIC_ERROR = 'Something went wrong. Please try again.'

function zoneWorks(tz: string): boolean {
  try { new Intl.DateTimeFormat('en-US', { timeZone: tz }); return true } catch { return false }
}

/** Stored zone if valid, else America/New_York, else the device zone, else undefined (runtime local). */
export function resolveTz(stored: string | null | undefined): string | undefined {
  if (stored && typeof stored === 'string' && stored.length <= 64 && zoneWorks(stored)) return stored
  if (zoneWorks(DEFAULT_TZ)) return DEFAULT_TZ
  try { return Intl.DateTimeFormat().resolvedOptions().timeZone || undefined } catch { return undefined }
}

/** Local calendar date YYYY-MM-DD of an instant in a zone. */
export function localYmd(at: Date | string, tz: string | undefined): string | null {
  const t = typeof at === 'string' ? Date.parse(at) : at.getTime()
  if (!Number.isFinite(t)) return null
  const parts = new Intl.DateTimeFormat('en-US', { timeZone: tz, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(new Date(t))
  const g = (k: string) => parts.find(p => p.type === k)?.value ?? ''
  const y = g('year'), m = g('month'), d = g('day')
  return y && m && d ? `${y}-${m}-${d}` : null
}

/** Local day number of now; day 0 is the local date of lastAssessedAt (same as the server's localDayOffset). */
export function localDayNumber(lastAssessedAt: string, now: Date, tz: string | undefined): number | null {
  const a = localYmd(lastAssessedAt, tz), b = localYmd(now, tz)
  if (!a || !b) return null
  const [ya, ma, da] = a.split('-').map(Number), [yb, mb, db] = b.split('-').map(Number)
  return Math.round((Date.UTC(yb, mb - 1, db) - Date.UTC(ya, ma - 1, da)) / 86400000)
}

/** Server rule 2 signal: next_check_at equals next_retest_at after a saved quick check (and after the roll). */
export function quickDoneBySchedule(s: Schedule | null): boolean {
  if (!s?.next_check_at || !s.next_retest_at) return false
  const a = Date.parse(s.next_check_at), b = Date.parse(s.next_retest_at)
  return Number.isFinite(a) && Number.isFinite(b) && a === b
}

/** Any quick row assessed after the cycle's full assessment (rows from the one explicit quick read). */
export function quickRowAfter(rows: readonly { assessed_at?: string | null; check_kind?: string | null }[] | null | undefined, lastAssessedAt: string | null | undefined): boolean {
  if (!rows?.length || !lastAssessedAt) return false
  const start = Date.parse(lastAssessedAt)
  return rows.some(r => r.check_kind === 'quick' && !!r.assessed_at && Date.parse(r.assessed_at) > start)
}

export type QuickContext = { tz?: string | null; quickDone?: boolean }

/** Quick check is offered only inside the server window, with joints scheduled, and not yet done this cycle. */
export function isQuickCheckInWindow(s: Schedule | null, now: Date = new Date(), ctx: QuickContext = {}): boolean {
  if (!s?.check_joints?.length || !s.last_assessed_at) return false
  if (ctx.quickDone || quickDoneBySchedule(s)) return false
  const day = localDayNumber(s.last_assessed_at, now, resolveTz(ctx.tz))
  return day !== null && day >= QUICK_WINDOW_FIRST_DAY && day <= QUICK_WINDOW_LAST_DAY
}

/** "Your next check" line for the cycle: the quick check date before the window, "ready now" in it, else the retest. */
export function nextCheckLineInCycle(s: Schedule | null, now: Date = new Date(), ctx: QuickContext = {}): string | null {
  if (!s) return null
  if (isQuickCheckInWindow(s, now, ctx)) return QUICK_CHECK_COPY.nextCheckDue
  const tz = resolveTz(ctx.tz)
  const day = s.last_assessed_at ? localDayNumber(s.last_assessed_at, now, tz) : null
  const beforeWindow = !!s.check_joints?.length && !ctx.quickDone && !quickDoneBySchedule(s) && day !== null && day < QUICK_WINDOW_FIRST_DAY
  if (beforeWindow) {
    // Day 7 as a local date (day 0 + 7), the same day the server window opens; not next_check_at's clock time.
    const start = localYmd(s.last_assessed_at!, tz)!
    const [y, m, d] = start.split('-').map(Number)
    return QUICK_CHECK_COPY.nextCheck(formatCheckDate(new Date(Date.UTC(y, m - 1, d + QUICK_WINDOW_FIRST_DAY, 12)).toISOString(), 'UTC'))
  }
  const next = s.next_retest_at
  if (!next) return null
  return new Date(next).getTime() <= now.getTime() ? QUICK_CHECK_COPY.nextCheckDue : QUICK_CHECK_COPY.nextCheck(formatCheckDate(next, tz))
}

/** Page gate on load: show the intro only when a quick check is in the window; otherwise go to Today with no form. */
export function quickCheckPageGate(s: Schedule | null, now: Date = new Date(), ctx: QuickContext = {}): 'intro' | 'today' {
  return isQuickCheckInWindow(s, now, ctx) ? 'intro' : 'today'
}

export type SubmitOutcome = { kind: 'result' } | { kind: 'today' } | { kind: 'error'; message: string }

/** What the page does with a submit response. The window 400 goes to Today (no loop); other failures show the generic line. */
export function quickSubmitOutcome(status: number, data: { ok?: boolean; error?: string } | null | undefined): SubmitOutcome {
  if (status >= 200 && status < 300 && data?.ok) return { kind: 'result' }
  if (status === 400 && data?.error === QUICK_NOT_SCHEDULED_ERROR) return { kind: 'today' }
  return { kind: 'error', message: GENERIC_ERROR }
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

/** Day 1 values: the schedule's last_assessment_id (the full save that set it) when it is in the rows and not quick,
 *  else the newest full row. last_assessment_id can be null (ON DELETE SET NULL). */
export function dayOneAssessment<T extends Record<string, unknown>>(rows: readonly T[], lastAssessmentId: string | null | undefined): T | null {
  const byId = lastAssessmentId ? rows.find(r => r.id === lastAssessmentId && r.check_kind !== 'quick') : undefined
  return byId ?? lastFullAssessment(rows)
}
