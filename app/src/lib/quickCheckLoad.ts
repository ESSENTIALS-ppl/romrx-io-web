// P1-06 v4: the reads behind the quick check gate (banner and page). Behind QUICK_CHECK_ON (false).
import { supabase } from './supabase'
import { SCHEDULE_COLUMNS, quickRowAfter, type QuickContext, type Schedule } from './quickCheck'

export type QuickLoad = { schedule: Schedule | null; ctx: QuickContext; failed: boolean }

/** Schedule, stored time zone, and the ONE explicit quick-row read (check_kind = 'quick' after the cycle's full
 *  assessment; needs migration 20261116031000). Every other assessments read stays quick-skipped. A failed read of the
 *  schedule or the quick rows counts as "not due" (failed = true), so nothing is offered that the server would reject. */
export async function loadQuickContext(userId: string): Promise<QuickLoad> {
  const [{ data: sch, error: sErr }, { data: pref }] = await Promise.all([
    supabase.from('user_mobility_schedule').select(SCHEDULE_COLUMNS).eq('user_id', userId).maybeSingle(),
    supabase.from('notification_preferences').select('timezone').eq('user_id', userId).maybeSingle(),
  ])
  const schedule = (sErr ? null : sch) as Schedule | null
  const tz = (pref as { timezone?: unknown } | null)?.timezone
  const ctx: QuickContext = { tz: typeof tz === 'string' ? tz : null }
  if (!schedule?.last_assessed_at) return { schedule, ctx, failed: !!sErr }
  const { data: rows, error: qErr } = await supabase
    .from('assessments')
    .select('id, assessed_at, check_kind')
    .eq('user_id', userId)
    .eq('check_kind', 'quick')
    .gt('assessed_at', schedule.last_assessed_at)
    .limit(1)
  if (qErr) return { schedule, ctx: { ...ctx, quickDone: true }, failed: true }
  return { schedule, ctx: { ...ctx, quickDone: quickRowAfter(rows as { assessed_at: string; check_kind: string }[], schedule.last_assessed_at) }, failed: false }
}
