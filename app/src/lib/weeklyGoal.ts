// P1-09 (Base engagement): a weekly goal the user picks (3 to 7 days) with a weekly streak, replacing "Session N/42".
// Weeks run Sunday to Saturday on the stored session days. The goal is kept in localStorage for now; Avery owns the
// server column (so it follows the user across devices and the digest can read it). AVERY: weekly_goal smallint 3..7.
// Words: Stacy's STACY-P1-JULES-SLOTS-WORDS-20261115-2138.md, byte-exact (Jim yes pending). With the goal on, the Today card
// hides "Session N/42" and its 42-session bar; the only bar is this week's days toward the weekly goal (weekBarPct).
export type WeeklyGoalCopy = {
  pickerTitle: string
  pickerOption: (n: number) => string
  thisWeek: (done: number, goal: number) => string
  streak: (weeks: number) => string
  change: string
}
export const WEEKLY_GOAL_COPY: WeeklyGoalCopy | null = {
  pickerTitle: 'How many days a week do you want to do your session?',
  pickerOption: (n) => `${n} days`,
  thisWeek: (done, goal) => `${done} of ${goal} days this week`,
  streak: (weeks) => (weeks === 1 ? '1 week in a row at your goal' : `${weeks} weeks in a row at your goal`),
  change: 'Change goal',
}
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

/** Width of the weekly bar: days this week toward the weekly goal, capped at 100. */
export function weekBarPct(done: number, goal: number): number {
  if (goal <= 0) return 0
  return Math.min(100, Math.round((Math.max(0, done) / goal) * 100))
}
