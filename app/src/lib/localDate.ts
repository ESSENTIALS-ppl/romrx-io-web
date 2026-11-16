// P1-05 (Vera confirmed: vera-P1-05-streak-date-bug-confirm-20261115.md): protocol_sessions.session_date is a `date` column
// (NOT NULL, UNIQUE (user_id, session_date), no sport in the key). It must hold the user's LOCAL calendar day.
// toISOString().slice(0, 10) gave the UTC day, so an 8 PM ET session landed on tomorrow. Every read and write of a
// session day goes through these helpers so the write, "completed today", the streak and the week 1 count all agree.

/** YYYY-MM-DD of the given moment in the browser's local time zone. */
export function localDateIso(d: Date = new Date()): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/** Local day of a stored timestamp (e.g. assessments.assessed_at), so a cycle starts on the day the user saw. */
export function localDateOfTimestamp(ts: string): string {
  const d = new Date(ts)
  return Number.isNaN(d.getTime()) ? ts.slice(0, 10) : localDateIso(d)
}

/** Calendar math on YYYY-MM-DD strings (no time zone involved). */
export function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/** The database answer wins once it is in; localStorage is only an optimistic cache until then. */
export function isCompletedToday(dbToday: boolean | null, cachedSessions: readonly string[], todayIso: string): boolean {
  return dbToday ?? cachedSessions.includes(todayIso)
}

/** Consecutive local days ending today or yesterday (1 day grace). Same rule as before, now on local days. */
export function computeStreak(sessionDates: readonly string[], now: Date = new Date()): number {
  if (sessionDates.length === 0) return 0
  const set = new Set(sessionDates)
  let cursor = localDateIso(now)
  if (!set.has(cursor)) {
    cursor = addDaysIso(cursor, -1)
    if (!set.has(cursor)) return 0
  }
  let count = 0
  while (set.has(cursor)) {
    count += 1
    cursor = addDaysIso(cursor, -1)
  }
  return count
}

/** P1-05: a session save failed for a reason other than "already logged today" (23505), so the optimistic "completed" must be undone. */
export function isUnexpectedSaveError(error: { code?: string } | null | undefined): boolean {
  return !!error && error.code !== '23505'
}

/** Remove one day from the cached session list (used to undo an optimistic mark that did not save). */
export function withoutDay(sessions: readonly string[], day: string): string[] {
  return sessions.filter((d) => d !== day)
}
