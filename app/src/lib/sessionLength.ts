// P1-19 (Base engagement): session length choice on the Today card: quick, standard, full.
// standard = today's card as it is now (first exercise, first stretch, first foam roll for today's focus area).
// quick and full: see pickWithSlots (length tiers fix, Nov 24 2026). Full adds the area's other Base library movements.
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

/** Same picks as pickWithSlots, without the slot tags. */
export function pickMovements<T>(rx: Lists<T> | null | undefined, length: SessionLength, library?: Lists<T> | null): T[] {
  return pickWithSlots(rx, length, library).map(x => x.item)
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

/** Movement identity for Full: name without any "(...)" part, letters and digits only, plus its slot. */
function movementKey(item: unknown, slot: MovementSlotKind): string {
  const name = typeof item === 'string' ? item : String((item as { name?: unknown } | null)?.name ?? '')
  return `${slot}|${name.replace(/\([^)]*\)/g, '').toLowerCase().replace(/[^a-z0-9]/g, '')}`
}

/** Full on a small pool is the Standard set done twice. Card label, Grant cleared 7:36 PM ET. */
export const FULL_ROUNDS_LABEL = '2 rounds'
/** A joint whose deduped pool has fewer unique movements than this uses the small-pool tiers (Avery 7:36 PM ET). */
export const SMALL_POOL_BELOW = 4

export type SessionPlan<T> = { movements: { item: T; slot: MovementSlotKind }[]; rounds: 1 | 2 }

/**
 * Length tiers (fix 2026-11-24, Grant 7:32 PM ET; small pools Avery 7:36 PM ET): Quick < Standard < Full on every day
 * and area. Pool = the area's unique movements (today's prescription plus the EXISTING Base library for the area,
 * sports 'general'; same name and slot counts once). Names and doses come from the rows unchanged.
 * Pool of 4 or more:
 * - standard = today's card as it is now: first exercise, first stretch, first foam roll of today's prescription
 *   (with a saved protocol that is exactly the 3 movements ROMBot reads).
 * - quick    = standard minus its last movement (always one fewer).
 * - full     = every pool movement, exercises then stretches then foam rolls, prescription first.
 * Pool under 4: quick = 1 movement, standard = 2 (the standard picks, topped up from the pool), full = that standard
 * set done 2 rounds (rounds: 2, card shows FULL_ROUNDS_LABEL). Doses unchanged.
 * Without a library (not loaded yet, or the read failed), the small-pool rule is not applied and full = the prescription.
 */
export function planSession<T>(rx: Lists<T> | null | undefined, length: SessionLength, library?: Lists<T> | null): SessionPlan<T> {
  if (!rx) return { movements: [], rounds: 1 }
  const tag = (items: (T | undefined)[], slot: MovementSlotKind) => items.filter((x): x is T => !!x).map(item => ({ item, slot }))
  const standard = [...tag([rx.exercises[0]], 'exercise'), ...tag([rx.stretches[0]], 'stretch'), ...tag([rx.foam[0]], 'foam')]
  const pool: { item: T; slot: MovementSlotKind }[] = []
  const seen = new Set<string>()
  const lists: [keyof Lists<T>, MovementSlotKind][] = [['exercises', 'exercise'], ['stretches', 'stretch'], ['foam', 'foam']]
  for (const [list, slot] of lists) {
    for (const item of [...(rx[list] ?? []), ...(library?.[list] ?? [])]) {
      if (!item) continue
      const k = movementKey(item, slot)
      if (seen.has(k)) continue
      seen.add(k)
      pool.push({ item, slot })
    }
  }
  if (library && pool.length < SMALL_POOL_BELOW) {
    const picked = new Set(standard.map(m => movementKey(m.item, m.slot)))
    const set = [...standard, ...pool.filter(m => !picked.has(movementKey(m.item, m.slot)))].slice(0, 2)
    if (length === 'quick') return { movements: set.slice(0, 1), rounds: 1 }
    if (length === 'standard') return { movements: set, rounds: 1 }
    return { movements: set, rounds: 2 }
  }
  if (length === 'standard') return { movements: standard, rounds: 1 }
  if (length === 'quick') return { movements: standard.length > 1 ? standard.slice(0, -1) : standard, rounds: 1 }
  return { movements: pool, rounds: 1 }
}

/** The movements of planSession, each tagged with its list (timed stretch/foam vs reps). One round; see planSession for rounds. */
export function pickWithSlots<T>(rx: Lists<T> | null | undefined, length: SessionLength, library?: Lists<T> | null): { item: T; slot: MovementSlotKind }[] {
  return planSession(rx, length, library).movements
}
