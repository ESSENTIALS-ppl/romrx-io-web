// P1-10 (Base engagement): progress view. Month calendar of days with a logged session, plus a few milestone badges.
// Reads the session_date list My Body already loads (useProfile). Day strings are compared as stored; P1-05 makes them local days.
// Words: Stacy's STACY-P1-JULES-SLOTS-WORDS-20261115-2138.md, byte-exact (Jim yes pending). Month and weekday names come
// from the browser (Intl). Badges never differ by colour alone: earned shows a check icon, not yet an empty circle, and
// screen readers hear the badge name then its state from PROGRESS_SR_COPY (2157 addendum).
export type ProgressCopy = {
  title: string
  subtitle?: string
  prevMonth: string
  nextMonth: string
  badges: Record<MilestoneId, string>
}

/** Screen-reader state read after each badge name ("{badge name}: Earned"). Stacy's addendum
 *  STACY-P1-JULES-SLOTS-WORDS-ADDENDUM-20261115-2157.md, byte-exact (Jim yes pending). */
export const PROGRESS_SR_COPY = { earned: 'Earned', notEarned: 'Not yet earned' } as const
export const PROGRESS_COPY: ProgressCopy | null = {
  title: 'Your sessions',
  subtitle: 'Days you logged a session are filled in.',
  prevMonth: 'Previous month',
  nextMonth: 'Next month',
  badges: {
    first_session: 'First session',
    week1_three: '3 days in your first week',
    streak_7: '7 days in a row',
    sessions_14: '14 session days',
    sessions_30: '30 session days',
    sessions_42: '42 session days',
  },
}

export type MilestoneId = 'first_session' | 'week1_three' | 'streak_7' | 'sessions_14' | 'sessions_30' | 'sessions_42'
/** Milestones from logged sessions only (no score or health claims). */
export const MILESTONES: { id: MilestoneId; test: (s: MilestoneStats) => boolean }[] = [
  { id: 'first_session', test: s => s.total >= 1 },
  { id: 'week1_three', test: s => s.firstWeek >= 3 },
  { id: 'streak_7', test: s => s.bestStreak >= 7 },
  { id: 'sessions_14', test: s => s.total >= 14 },
  { id: 'sessions_30', test: s => s.total >= 30 },
  { id: 'sessions_42', test: s => s.total >= 42 },
]

export type MilestoneStats = { total: number; bestStreak: number; firstWeek: number }

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}

export function milestoneStats(dates: readonly string[]): MilestoneStats {
  const days = [...new Set(dates)].sort()
  let best = 0, run = 0, prev: string | null = null
  for (const d of days) {
    run = prev && addDays(prev, 1) === d ? run + 1 : 1
    best = Math.max(best, run)
    prev = d
  }
  const first = days[0]
  const firstWeek = first ? days.filter(d => d < addDays(first, 7)).length : 0
  return { total: days.length, bestStreak: best, firstWeek }
}

export function earnedMilestones(dates: readonly string[]): MilestoneId[] {
  const s = milestoneStats(dates)
  return MILESTONES.filter(m => m.test(s)).map(m => m.id)
}

export type CalendarCell = { iso: string; day: number; done: boolean; today: boolean } | null

/** Weeks (Sunday first) for the month holding `monthIso` (YYYY-MM-01). Empty cells are null. */
export function monthGrid(monthIso: string, done: ReadonlySet<string>, todayIso: string): CalendarCell[][] {
  const [y, m] = monthIso.split('-').map(Number)
  const first = new Date(Date.UTC(y, m - 1, 1))
  const daysIn = new Date(Date.UTC(y, m, 0)).getUTCDate()
  const cells: CalendarCell[] = Array(first.getUTCDay()).fill(null)
  for (let d = 1; d <= daysIn; d++) {
    const iso = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
    cells.push({ iso, day: d, done: done.has(iso), today: iso === todayIso })
  }
  while (cells.length % 7) cells.push(null)
  const weeks: CalendarCell[][] = []
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7))
  return weeks
}

export function shiftMonth(monthIso: string, delta: number): string {
  const [y, m] = monthIso.split('-').map(Number)
  const d = new Date(Date.UTC(y, m - 1 + delta, 1))
  return d.toISOString().slice(0, 7) + '-01'
}

/** Weekday initials and month title from the browser (en-US), not new copy. */
export function weekdayInitials(): string[] {
  const base = Date.UTC(2026, 10, 15) // a Sunday
  return Array.from({ length: 7 }, (_, i) => new Date(base + i * 86400000).toLocaleDateString('en-US', { weekday: 'narrow', timeZone: 'UTC' }))
}
export function monthTitle(monthIso: string): string {
  return new Date(`${monthIso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', year: 'numeric', timeZone: 'UTC' })
}
