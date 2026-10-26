/**
 * ROMood logic and storage (spec rev 5, Section 3; Stacy locked mood-data requirements 1 to 6).
 *
 * Saving is OFF by default. Stacy req 5: no mood entry is stored until the /legal Privacy Policy mood
 * line is live. Turn on with VITE_ROMOOD_SAVE=on only after that line is live and the
 * mood_entries migration is applied (Jim's go). With the flag off, Next saves nothing.
 *
 * Mood is never sent to Meta ('mood' is in META_FORBIDDEN_KEYS) and never feeds scoring (req 3).
 */
import { supabase } from './supabase'
import { FEELING_WORDS, type FeelingWord, type Quadrant } from './romoodCopy'

export const ROMOOD_CONTEXT_ONBOARDING = 'onboarding'

export function romoodSaveEnabled(env: Record<string, unknown> = import.meta.env): boolean {
  return env.VITE_ROMOOD_SAVE === 'on'
}

/** 0 to 100 slider. Readout index: 0 leaning low, 1 middle, 2 leaning high. Thresholds are a build choice (spec gap). */
export function readoutIndex(v: number): 0 | 1 | 2 {
  if (v < 40) return 0
  if (v > 60) return 2
  return 1
}

/** Quadrant from slider values. Exact middle (50) counts as the lower/unpleasant side; spec does not define it. */
export function quadrantFor(energy: number, pleasantness: number): Quadrant {
  const hi = energy > 50
  const pl = pleasantness > 50
  if (hi) return pl ? 'high_pleasant' : 'high_unpleasant'
  return pl ? 'low_pleasant' : 'low_unpleasant'
}

/** Slider position for a bubble tap: centre of a 2x2 cell inside its quadrant, in grid order. */
export function positionFor(word: FeelingWord): { energy: number; pleasantness: number } {
  const inQuad = FEELING_WORDS.filter(w => w.quadrant === word.quadrant)
  const i = inQuad.findIndex(w => w.word === word.word)
  const row = Math.floor(i / 2) // 0 top (more energy), 1 bottom
  const col = i % 2 // 0 left (less pleasant), 1 right
  const hi = word.quadrant.startsWith('high')
  const pl = word.quadrant.endsWith('_pleasant')
  const energy = hi ? (row === 0 ? 90 : 70) : (row === 0 ? 30 : 10)
  const pleasantness = pl ? (col === 0 ? 70 : 90) : (col === 0 ? 10 : 30)
  return { energy, pleasantness }
}

export type MoodEntryInput = {
  energy: number
  pleasantness: number
  word: string | null
  optedInAt: string
}

/** Pure gate for the Next button (Stacy req 1 and 2). */
export function shouldSaveMood(opts: { optIn: boolean; signedIn: boolean; saveEnabled: boolean }): boolean {
  return opts.optIn && opts.signedIn && opts.saveEnabled
}

export async function saveMoodEntry(userId: string, input: MoodEntryInput): Promise<{ ok: boolean }> {
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
  const energy = clamp(input.energy)
  const pleasantness = clamp(input.pleasantness)
  const { error } = await supabase.from('mood_entries').insert({
    user_id: userId,
    energy,
    pleasantness,
    word: input.word,
    quadrant: quadrantFor(energy, pleasantness),
    context: ROMOOD_CONTEXT_ONBOARDING,
    opted_in: true,
    opted_in_at: input.optedInAt,
  })
  return { ok: !error }
}

/** Stacy req 4: the user can delete their mood entries. RLS limits this to their own rows. */
export async function deleteAllMoodEntries(userId: string): Promise<{ ok: boolean }> {
  const { error } = await supabase.from('mood_entries').delete().eq('user_id', userId)
  return { ok: !error }
}
