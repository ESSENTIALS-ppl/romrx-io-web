// P1-19 (Base engagement): session length choice on the Today card: quick, standard, full.
// standard = today's card as it is now (first exercise, first stretch, first foam roll for today's focus area).
// quick    = first exercise and first stretch (2 movements).   full = every exercise, stretch and foam roll for today's area.
// Chooser words: Stacy's STACY-P1-JULES-SLOTS-WORDS-20261115-2138.md, byte-exact (Jim yes pending). No minutes are shown.
// The guided player (P1-20) plays the same movements via pickWithSlots (integration build).
export type SessionLength = 'quick' | 'standard' | 'full'
export type SessionLengthCopy = { heading: string; quick: string; standard: string; full: string }
export const SESSION_LENGTH_COPY: SessionLengthCopy | null = {
  heading: 'Session length',
  quick: 'Quick',
  standard: 'Standard',
  full: 'Full',
}
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

export type MovementSlotKind = 'exercise' | 'stretch' | 'foam'
/** Same picks as pickMovements, each tagged with its list, so the guided player knows timed (stretch, foam) vs reps. */
export function pickWithSlots<T>(rx: Lists<T> | null | undefined, length: SessionLength): { item: T; slot: MovementSlotKind }[] {
  if (!rx) return []
  const tag = (items: (T | undefined)[], slot: MovementSlotKind) => items.filter((x): x is T => !!x).map(item => ({ item, slot }))
  if (length === 'full') return [...tag(rx.exercises, 'exercise'), ...tag(rx.stretches, 'stretch'), ...tag(rx.foam, 'foam')]
  if (length === 'quick') return [...tag([rx.exercises[0]], 'exercise'), ...tag([rx.stretches[0]], 'stretch')]
  return [...tag([rx.exercises[0]], 'exercise'), ...tag([rx.stretches[0]], 'stretch'), ...tag([rx.foam[0]], 'foam')]
}
