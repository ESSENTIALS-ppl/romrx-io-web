// P1-21 (Base engagement): solo 14-day challenge on the user's #1 problem area, with a badge. Solo only, nobody else is invited.
// The user starts it with one tap; progress is the number of days with a logged session inside the 14 days.
// Start date and joint are kept in localStorage for now. AVERY: a challenge start column (challenge_started_on date,
// challenge_joint text) so it follows the user across devices and emails can use it.
// Product rule to confirm (Jim or Sable): CHALLENGE_GOAL_DAYS sessions within CHALLENGE_DAYS days earns the badge.
// Words: every challenge line is new. Until Stacy supplies them (Jim yes), CHALLENGE_COPY is null and nothing renders.
// Words needed (NEEDS JIM WORDING): title(joint), pitch, start, progress(done, goal, dayOfChallenge), badge, expired, restart.
export type ChallengeCopy = {
  title: (jointLabel: string) => string
  pitch: string
  start: string
  progress: (done: number, goal: number, day: number) => string
  badge: string
  expired: string
  restart: string
}
export const CHALLENGE_COPY: ChallengeCopy | null = null
export const CHALLENGE_DAYS = 14
export const CHALLENGE_GOAL_DAYS = 10

export type ChallengeState = { start: string; joint: string }
export type ChallengeStatus =
  | { kind: 'none' }
  | { kind: 'active'; done: number; day: number }
  | { kind: 'won'; done: number }
  | { kind: 'expired'; done: number }

function addDays(iso: string, n: number): string {
  const d = new Date(`${iso}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
function daysBetween(a: string, b: string): number {
  return Math.round((Date.parse(`${b}T00:00:00Z`) - Date.parse(`${a}T00:00:00Z`)) / 86400000)
}

export function challengeEnd(start: string): string {
  return addDays(start, CHALLENGE_DAYS) // exclusive
}

export function challengeStatus(state: ChallengeState | null, sessionDates: readonly string[], todayIso: string): ChallengeStatus {
  if (!state) return { kind: 'none' }
  const end = challengeEnd(state.start)
  const done = new Set(sessionDates.filter(d => d >= state.start && d < end)).size
  if (done >= CHALLENGE_GOAL_DAYS) return { kind: 'won', done }
  if (todayIso >= end) return { kind: 'expired', done }
  return { kind: 'active', done, day: Math.min(CHALLENGE_DAYS, daysBetween(state.start, todayIso) + 1) }
}

export const challengeKey = (userId: string) => `romrx_hq_challenge_${userId}`

export function readChallenge(userId: string): ChallengeState | null {
  try {
    const v = JSON.parse(localStorage.getItem(challengeKey(userId)) ?? 'null') as ChallengeState | null
    return v && /^\d{4}-\d{2}-\d{2}$/.test(v.start) && typeof v.joint === 'string' ? v : null
  } catch {
    return null
  }
}

export function saveChallenge(userId: string, state: ChallengeState): void {
  try { localStorage.setItem(challengeKey(userId), JSON.stringify(state)) } catch { /* ignore */ }
}
