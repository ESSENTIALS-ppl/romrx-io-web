// P1-04 (Base engagement): "3 sessions in week 1" goal with a 3-dot tracker on the Today card.
// Week 1 runs on the user's LOCAL calendar (Grant, 9:14 PM ET). This file has its own local-date helper on purpose, so P1-04
// is right whether it ships before or after P1-05 (which moves session_date writes from the UTC day to the local day).

export const WEEK1_GOAL = 3
export const WEEK1_DAYS = 7

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** YYYY-MM-DD of a moment in the browser's local time zone. */
export function week1LocalDate(d: Date = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/** Local day of the assessment timestamp: week 1 starts on the day the user took it. */
export function week1StartFrom(assessedAt: string): string {
  const d = new Date(assessedAt)
  return Number.isNaN(d.getTime()) ? assessedAt.slice(0, 10) : week1LocalDate(d)
}

/** Last stored day that can belong to week 1. Before P1-05 an evening session on day 7 is stored on the next (UTC) day,
 *  so the count also accepts the day after week 1. That day can only be "today" once week 1 is over, when the card is hidden. */
export function week1CountEnd(w: { start: string; end: string }): string {
  return addDaysIso(w.end, 1)
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
  const end = week1CountEnd(w)
  const days = new Set(sessionDates.filter(d => d >= w.start && d < end))
  return Math.min(days.size, WEEK1_GOAL)
}

// Words: Stacy, /workspace/process/evidence/STACY-P1-04-AND-P1-01-PRIVACY-WORDS-20261115-2104.md, character for character.
export const WEEK1_COPY = {
  label: 'Week 1 goal: 3 sessions',
  done: 'Week 1 goal done: 3 of 3',
  progress: (n: number) => `${n} of 3 this week`,
} as const
