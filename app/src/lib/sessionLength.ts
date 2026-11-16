// P1-19 (Base engagement): session length choice on the Today card: quick, standard, full.
// standard = today's card as it is now (first exercise, first stretch, first foam roll for today's focus area).
// quick    = first exercise and first stretch (2 movements).   full = every exercise, stretch and foam roll for today's area.
// The chooser needs 3 new labels plus a heading. Until Stacy supplies them (Jim yes), SESSION_LENGTH_COPY is null, the chooser
// is not shown and everyone gets standard, so the live Today card is unchanged. Words needed (NEEDS JIM WORDING):
//   heading, quick, standard, full (short labels; optional minute hints are new claims, so only if Stacy writes them).
export type SessionLength = 'quick' | 'standard' | 'full'
export type SessionLengthCopy = { heading: string; quick: string; standard: string; full: string }
export const SESSION_LENGTH_COPY: SessionLengthCopy | null = null
export const SESSION_LENGTHS: SessionLength[] = ['quick', 'standard', 'full']

type Lists<T> = { exercises: T[]; stretches: T[]; foam: T[] }

export function pickMovements<T>(rx: Lists<T> | null | undefined, length: SessionLength): T[] {
  if (!rx) return []
  if (length === 'full') return [...rx.exercises, ...rx.stretches, ...rx.foam].filter(Boolean)
  if (length === 'quick') return [rx.exercises[0], rx.stretches[0]].filter(Boolean) as T[]
  return [rx.exercises[0], rx.stretches[0], rx.foam[0]].filter(Boolean) as T[]
}

export const sessionLengthKey = (userId: string) => `romrx_hq_session_length_${userId}`

export function readSessionLength(userId: string, copy: SessionLengthCopy | null = SESSION_LENGTH_COPY): SessionLength {
  if (!copy) return 'standard'
  try {
    const v = localStorage.getItem(sessionLengthKey(userId))
    return v === 'quick' || v === 'full' || v === 'standard' ? v : 'standard'
  } catch {
    return 'standard'
  }
}
