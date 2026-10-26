/**
 * ROMood logic and storage (spec rev 5, Section 3; Stacy locked mood-data requirements 1 to 6;
 * Stacy pass at 8c61152, fixes 1, 2, 4, 6, 7).
 *
 * Saving is OFF by default. Stacy req 5: no mood entry (and no mood setting) is stored until the /legal
 * Privacy Policy mood line, incl. 7A Washington consumer health data, is live. Turn on with
 * VITE_ROMOOD_SAVE=on only after that line is live and both ROMood migrations are applied (Jim's go).
 *
 * Mood is never sent to Meta ('mood' is in META_FORBIDDEN_KEYS) and never feeds scoring (req 3).
 */
// Supabase is loaded lazily so screens that embed ROMood do not need a client at import time.
const db = async () => (await import('./supabase')).supabase
import { FEELING_WORDS, ROMOOD_PLACEHOLDERS, type FeelingWord, type Quadrant } from './romoodCopy'

export const ROMOOD_CONTEXT_ONBOARDING = 'onboarding'
const SW = ROMOOD_PLACEHOLDERS.Q8_sliderSwitch

export function romoodSaveEnabled(env: Record<string, unknown> = import.meta.env): boolean {
  return env.VITE_ROMOOD_SAVE === 'on'
}

/** 0 to 100 slider. Readout index: 0 leaning low, 1 middle, 2 leaning high. Switch points are Q8. */
export function readoutIndex(v: number): 0 | 1 | 2 {
  if (v < SW.low) return 0
  if (v > SW.high) return 2
  return 1
}

/** Quadrant from slider values. Exactly mid counts as the lower/unpleasant side (Q8). */
export function quadrantFor(energy: number, pleasantness: number): Quadrant {
  const hi = energy > SW.mid
  const pl = pleasantness > SW.mid
  if (hi) return pl ? 'high_pleasant' : 'high_unpleasant'
  return pl ? 'low_pleasant' : 'low_unpleasant'
}

/** Slider position for a bubble tap: centre of a 2x2 cell inside its quadrant, in grid order. */
export function positionFor(word: FeelingWord): { energy: number; pleasantness: number } {
  const inQuad = FEELING_WORDS.filter(w => w.quadrant === word.quadrant)
  const i = inQuad.findIndex(w => w.word === word.word)
  const row = Math.floor(i / 2)
  const col = i % 2
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
  /** The real time the user ticked the opt-in box. Required; there is no fallback (Stacy fix 6). */
  optedInAt: string
}

/** Pure gate for the Next button (Stacy req 1 and 2, fix 6: needs a real tick time). */
export function shouldSaveMood(opts: { optIn: boolean; signedIn: boolean; saveEnabled: boolean; optedInAt?: string | null }): boolean {
  const hasTick = opts.optedInAt === undefined ? true : !!opts.optedInAt
  return opts.optIn && opts.signedIn && opts.saveEnabled && hasTick
}

export function isValidTickTime(t: unknown): t is string {
  return typeof t === 'string' && t.length > 0 && !Number.isNaN(Date.parse(t))
}

/** Stores the user's saving choice (Stacy fix 2). Opt-in time is the real tick time, never now(). */
export async function setMoodSaving(userId: string, on: boolean, tickTime: string): Promise<{ ok: boolean }> {
  if (!isValidTickTime(tickTime)) return { ok: false }
  const row: Record<string, unknown> = on
    ? { user_id: userId, saving_on: true, opted_in_at: tickTime, turned_off_at: null }
    : { user_id: userId, saving_on: false, turned_off_at: tickTime }
  const { error } = await (await db()).from('mood_settings').upsert(row, { onConflict: 'user_id' })
  return { ok: !error }
}

export async function getMoodSaving(userId: string): Promise<{ savingOn: boolean; optedInAt: string | null } | null> {
  const { data, error } = await (await db()).from('mood_settings').select('saving_on, opted_in_at').eq('user_id', userId).maybeSingle()
  if (error) return null
  const d = data as { saving_on: boolean; opted_in_at: string | null } | null
  return { savingOn: !!d?.saving_on, optedInAt: d?.opted_in_at ?? null }
}

export async function saveMoodEntry(userId: string, input: MoodEntryInput): Promise<{ ok: boolean }> {
  if (!isValidTickTime(input.optedInAt)) return { ok: false }
  const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)))
  const energy = clamp(input.energy)
  const pleasantness = clamp(input.pleasantness)
  const { error } = await (await db()).from('mood_entries').insert({
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

/** Stacy req 4 / fix 1: the user can delete their mood entries. RLS limits this to their own rows. */
export async function deleteAllMoodEntries(userId: string): Promise<{ ok: boolean }> {
  const { error } = await (await db()).from('mood_entries').delete().eq('user_id', userId)
  return { ok: !error }
}

/**
 * Q11 / Stacy fix 7: the skip event. Default carries no user id, no anon id and no session id,
 * so it only counts that a skip happened. No mood values ever.
 */
export async function trackMoodSkipped(withUserId = ROMOOD_PLACEHOLDERS.Q11_skipEventWithUserId): Promise<void> {
  try {
    let userId: string | null = null
    if (withUserId) {
      const { data } = await (await db()).auth.getSession()
      userId = data.session?.user?.id ?? null
    }
    await (await db()).from('product_events').insert({
      user_id: userId, anon_id: null, session_id: null, event: 'romood_skipped', props: {}, sport: null, source: 'web', path: null,
    })
  } catch { /* analytics must never break the app */ }
}
