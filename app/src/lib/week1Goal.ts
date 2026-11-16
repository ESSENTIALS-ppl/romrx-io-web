// P1-04 (Base engagement): "3 sessions in week 1" goal with a 3-dot tracker on the Today card.
// Dates are YYYY-MM-DD strings in the SAME convention protocol_sessions.session_date is written in today
// (see P1-05: that convention is UTC until the local-date fix lands; this helper only does string math, so it follows whatever P1-05 decides).

export const WEEK1_GOAL = 3
export const WEEK1_DAYS = 7

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** Week 1 = the cycle start date plus the next 6 days. `end` is exclusive. */
export function week1Window(cycleStartIso: string): { start: string; end: string } {
  const start = cycleStartIso.slice(0, 10)
  return { start, end: addDaysIso(start, WEEK1_DAYS) }
}

export function isInWeek1(todayIso: string, w: { start: string; end: string }): boolean {
  return todayIso >= w.start && todayIso < w.end
}

/** Distinct session days inside week 1, capped at the goal. */
export function week1Done(sessionDates: readonly string[], w: { start: string; end: string }): number {
  const days = new Set(sessionDates.filter(d => d >= w.start && d < w.end))
  return Math.min(days.size, WEEK1_GOAL)
}
