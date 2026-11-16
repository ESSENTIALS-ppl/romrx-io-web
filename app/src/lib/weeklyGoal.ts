// P1-09 (Base engagement): a weekly goal the user picks (3 to 7 days) with a weekly streak, replacing "Session N/42".
// Weeks run Sunday to Saturday on the stored session days. The goal is kept in localStorage for now; Avery owns the
// server column (so it follows the user across devices and the digest can read it). AVERY: weekly_goal smallint 3..7.
// Words: picker heading, the "this week" line, the weekly streak line and the change link are new. Until Stacy supplies
// them (Jim yes), WEEKLY_GOAL_COPY is null and the Today card keeps "Session N/42" unchanged. Words needed (NEEDS JIM WORDING):
//   pickerTitle, pickerOption(n), thisWeek(done, goal), streak(weeks), change.
export type WeeklyGoalCopy = {
  pickerTitle: string
  pickerOption: (n: number) => string
  thisWeek: (done: number, goal: number) => string
  streak: (weeks: number) => string
  change: string
}
export const WEEKLY_GOAL_COPY: WeeklyGoalCopy | null = null
export const GOAL_OPTIONS = [3, 4, 5, 6, 7] as const

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

/** Sunday that starts the week holding `iso`. */
export function weekStart(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`)
  return addDays(iso, -d.getUTCDay())
}

export function daysThisWeek(dates: readonly string[], todayIso: string): number {
  const start = weekStart(todayIso)
  const end = addDays(start, 7)
  return new Set(dates.filter(d => d >= start && d < end)).size
}

/** Consecutive weeks meeting the goal: the current week counts once met; otherwise counting starts last week. */
export function weeklyStreak(dates: readonly string[], goal: number, todayIso: string): number {
  const perWeek = new Map<string, Set<string>>()
  for (const d of dates) {
    const w = weekStart(d)
    if (!perWeek.has(w)) perWeek.set(w, new Set())
    perWeek.get(w)!.add(d)
  }
  const met = (w: string) => (perWeek.get(w)?.size ?? 0) >= goal
  let w = weekStart(todayIso)
  if (!met(w)) w = addDays(w, -7)
  let n = 0
  while (met(w)) { n += 1; w = addDays(w, -7) }
  return n
}

export const weeklyGoalKey = (userId: string) => `romrx_hq_weekly_goal_${userId}`

export function readWeeklyGoal(userId: string): number | null {
  try {
    const v = Number(localStorage.getItem(weeklyGoalKey(userId)))
    return (GOAL_OPTIONS as readonly number[]).includes(v) ? v : null
  } catch {
    return null
  }
}
