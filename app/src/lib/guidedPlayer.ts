// P1-20 (Base engagement): guided follow-along player for today's movements: timer, switch-sides cue, next up.
// Steps come from today's movements in Today card order (exercise, stretch, foam roll) and the dose string the card
// already builds ("3 sets x 30-60" or a bare reps value). The exercises table stores bare numbers, so the unit comes
// from the slot: stretch and foam roll are seconds (timed), the exercise is reps (tap when done).
// Sides: a movement is split into Side 1 and Side 2 (with the Switch sides cue) ONLY when it is marked perSide === true.
// No column says that today, so every movement plays as one block and the side words stay hidden.
// AVERY: an exercises.per_side boolean (and a seconds-vs-reps unit) turns this on; until then perSide is undefined.
// Other assumptions to confirm: a timed range uses its lower number, no sets value means 1 set.
// Words: Stacy's STACY-P1-JULES-SLOTS-WORDS-20261115-2138.md, byte-exact (Jim yes pending). Her file has no separate key
// for the open button, so `start` serves both the Today card button and the timer button, as her block says.
// The player screen shows the existing approved STOP_LINE (lib/stopLine.ts), not new words.
export type PlayerCopy = {
  start: string
  pause: string
  resume: string
  next: string
  back: string
  close: string
  setLine: (set: number, sets: number) => string
  side: (which: 'first' | 'second') => string
  switchSides: string
  repsLine: (reps: string) => string
  nextUp: (name: string) => string
  lastStep: string
  doneTitle: string
  markComplete: string
}
export const PLAYER_COPY: PlayerCopy | null = {
  start: 'Start',
  pause: 'Pause',
  resume: 'Resume',
  next: 'Next',
  back: 'Back',
  close: 'Close',
  setLine: (set, sets) => `Set ${set} of ${sets}`,
  side: (which) => (which === 'first' ? 'Side 1' : 'Side 2'),
  switchSides: 'Switch sides',
  repsLine: (reps) => {
    const r = reps.trim()
    return /\d$/.test(r) ? `${r.replace(/\s*-\s*/, ' to ')} reps` : r
  },
  nextUp: (name) => `Next up: ${name}`,
  lastStep: 'Last movement for today',
  doneTitle: 'That\'s all of today\'s movements.',
  markComplete: 'Mark today complete',
}

export type MovementSlot = 'exercise' | 'stretch' | 'foam'
export const TODAY_SLOTS: readonly MovementSlot[] = ['exercise', 'stretch', 'foam']

export type PlayerStep = {
  movementIndex: number
  name: string
  set: number
  sets: number
  side: 'first' | 'second' | null
  seconds: number | null
  reps: string | null
}

export function parseDose(dose: string): { sets: number; reps: string | null } {
  const m = /^(\d+) sets x (.+)$/.exec(dose.trim())
  if (m) return { sets: Math.max(1, Number(m[1])), reps: m[2].trim() || null }
  const reps = dose.trim()
  return { sets: 1, reps: reps || null }
}

/** Lower number of "30-60", "45", "30-". null when there is no number. */
export function lowerSeconds(reps: string | null): number | null {
  if (!reps) return null
  const m = /(\d+)/.exec(reps)
  if (!m) return null
  const n = Number(m[1])
  return n > 0 && n <= 600 ? n : null
}

export function buildSteps(movements: ReadonlyArray<{ name: string; dose: string; slot: MovementSlot; perSide?: boolean }>): PlayerStep[] {
  const steps: PlayerStep[] = []
  movements.forEach((m, movementIndex) => {
    const { sets, reps } = parseDose(m.dose)
    const timed = m.slot !== 'exercise'
    const seconds = timed ? lowerSeconds(reps) : null
    const sides: Array<'first' | 'second' | null> = m.perSide === true ? ['first', 'second'] : [null]
    for (let set = 1; set <= sets; set++) {
      for (const side of sides) {
        steps.push({ movementIndex, name: m.name, set, sets, side, seconds, reps: timed ? null : reps })
      }
    }
  })
  return steps
}

/** Show the switch-sides cue when the next step is the same movement and set, second side. */
export function isSwitchSides(steps: readonly PlayerStep[], i: number): boolean {
  const a = steps[i], b = steps[i + 1]
  return !!a && !!b && a.movementIndex === b.movementIndex && a.set === b.set && a.side === 'first' && b.side === 'second'
}

/** Name for "next up": the next step that is a different movement, or null on the last movement. */
export function nextUpName(steps: readonly PlayerStep[], i: number): string | null {
  const cur = steps[i]
  if (!cur) return null
  for (let j = i + 1; j < steps.length; j++) if (steps[j].movementIndex !== cur.movementIndex) return steps[j].name
  return null
}

export function formatClock(sec: number): string {
  const s = Math.max(0, Math.ceil(sec))
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`
}
