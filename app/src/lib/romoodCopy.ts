/**
 * ROMood check copy. Source: /workspace/romood_spec.md revision 5 (Oct 19 2026), Section 3 and Section 5
 * rows 22 to 33. Grant owns these lines (Oct 13). Do not edit here without a spec revision.
 * Upset/Anxious descriptions and the opt-in checkbox text are STACY RULING.
 */
/**
 * ============================================================================================
 * OPEN ITEMS WITH JIM: swappable placeholders. Each value is spec rev 5 text (or the build default
 * Grant listed on Oct 26 6:38 PM ET). Change them HERE only; every screen reads from this block.
 * Nothing in this block is a final decision.
 * ============================================================================================
 */
export const ROMOOD_PLACEHOLDERS = {
  /** Q3 nutrition line (spec rev 5 screen 2 draft line 1). Shown above the question. null hides it. */
  Q3_nutritionLine: 'ROMRx also covers nutrition and hydration.' as string | null,
  /** Q4 button labels (spec rev 5 screen 3, PROPOSED DRAFT). */
  Q4_buttons: { back: 'Back', skip: 'Skip mood check', next: 'Next' },
  /** Q5 instruction line (spec rev 5 screen 3, PROPOSED DRAFT). */
  Q5_instruction: 'Tap a bubble or move the sliders.',
  /** Q6 step label (spec rev 5 screen 3: counter plus eyebrow). null hides either one. */
  Q6_stepLabel: { counter: '3 of 4' as string | null, eyebrow: 'Assessment step 1' as string | null },
  /** Q8 slider switch points, 0 to 100 scale. Readout switches below `low` and above `high`; `mid` splits quadrants (mid counts as the lower side). */
  Q8_sliderSwitch: { low: 40, high: 60, mid: 50 },
  /** Q9 what happens when the user turns mood saving off in Settings. 'offer' = ask if they want to delete (build default). 'auto' = delete automatically. */
  Q9_turnOff: 'offer' as 'offer' | 'auto',
  /** Q11 is the "skipped" event tied to the account? Default false: no user id, no anon id, no session id. */
  Q11_skipEventWithUserId: false,
  /** Mood input visual (Jim is weighing alternatives to bubbles). Key into MOOD_INPUTS in components/moodInput. */
  inputVisual: 'bubbles' as 'bubbles',
  /** Retention wording: STACY drafting (due about 7:30 PM ET Oct 26). Not shown until filled. */
  retentionLine: null as string | null,
} as const

const P = ROMOOD_PLACEHOLDERS

export const ROMOOD_COPY = {
  counter: P.Q6_stepLabel.counter,
  eyebrow: P.Q6_stepLabel.eyebrow,
  heading: 'ROMood check',
  nutritionLine: P.Q3_nutritionLine,
  /** LOCKED by Jim Oct 26 6:36 PM ET. */
  question: 'How are you feeling right now?',
  instruction: P.Q5_instruction,
  energy: { label: 'Energy', low: 'Low', high: 'High', readout: ['Leaning low', 'In the middle', 'Leaning high'] },
  pleasantness: { label: 'Pleasantness', low: 'Unpleasant', high: 'Pleasant', readout: ['Leaning unpleasant', 'In the middle', 'Leaning pleasant'] },
  gridLabel: 'Feeling words',
  encouragement: "No matter where you're starting today, we're in this together.",
  optInBefore: 'Save my mood check-ins so ROMRx can show me patterns over time. See the ',
  optInLink: 'Privacy Policy',
  optInAfter: '.',
  back: P.Q4_buttons.back,
  skip: P.Q4_buttons.skip,
  next: P.Q4_buttons.next,
} as const

/**
 * Settings > ROMood copy. BUILD PLACEHOLDERS (not in spec rev 5; Stacy/Jim to approve).
 */
export const ROMOOD_SETTINGS_COPY = {
  title: 'ROMood check-ins',
  savingOn: 'Saving is on. Your mood check-ins are saved so you can see your patterns over time.',
  savingOff: 'Saving is off. New mood check-ins are not saved.',
  turnOff: 'Turn off saving',
  turnOn: 'Turn on saving',
  deleteButton: 'Delete my mood check-ins',
  deleteConfirm: 'Delete all your saved mood check-ins? This cannot be undone.',
  offerDelete: 'Saving is off. Do you also want to delete the mood check-ins you already saved?',
  yesDelete: 'Yes, delete them',
  keep: 'Keep them',
  cancel: 'Cancel',
  deleted: 'Your mood check-ins are deleted.',
  error: 'Something went wrong. Please try again.',
} as const

export type Quadrant = 'high_unpleasant' | 'high_pleasant' | 'low_unpleasant' | 'low_pleasant'

export const QUADRANT_NAMES: Record<Quadrant, string> = {
  high_unpleasant: 'High energy, unpleasant',
  high_pleasant: 'High energy, pleasant',
  low_unpleasant: 'Low energy, unpleasant',
  low_pleasant: 'Low energy, pleasant',
}

export type FeelingWord = { word: string; description: string; quadrant: Quadrant }

export const FEELING_WORDS: readonly FeelingWord[] = [
  { word: 'Upset', description: 'Heated, and hard to settle.', quadrant: 'high_unpleasant' },
  { word: 'Anxious', description: 'Wired, and on edge.', quadrant: 'high_unpleasant' },
  { word: 'Angry', description: 'Hot, sharp, and ready to push.', quadrant: 'high_unpleasant' },
  { word: 'Tense', description: 'Drawn up in body and mind.', quadrant: 'high_unpleasant' },
  { word: 'Excited', description: 'Energy up, and it feels good.', quadrant: 'high_pleasant' },
  { word: 'Elated', description: 'Light, bright, and lifted.', quadrant: 'high_pleasant' },
  { word: 'Happy', description: 'Warm and plainly glad.', quadrant: 'high_pleasant' },
  { word: 'Lively', description: 'Awake, moving, and interested.', quadrant: 'high_pleasant' },
  { word: 'Sad', description: 'Heavy, quiet, and low.', quadrant: 'low_unpleasant' },
  { word: 'Gloomy', description: 'Dim, with very little lift.', quadrant: 'low_unpleasant' },
  { word: 'Tired', description: 'Spent, and rest sounds good.', quadrant: 'low_unpleasant' },
  { word: 'Bored', description: 'Flat, with nothing holding you.', quadrant: 'low_unpleasant' },
  { word: 'Calm', description: 'Steady and unruffled.', quadrant: 'low_pleasant' },
  { word: 'Content', description: 'Settled, with enough for now.', quadrant: 'low_pleasant' },
  { word: 'Relaxed', description: 'Loose and unhurried.', quadrant: 'low_pleasant' },
  { word: 'Mellow', description: 'Soft, easy, and low-key.', quadrant: 'low_pleasant' },
]
