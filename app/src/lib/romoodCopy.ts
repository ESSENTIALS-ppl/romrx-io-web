/**
 * ROMood check copy. Source: /workspace/romood_spec.md revision 5 (Oct 19 2026), Section 3 and Section 5
 * rows 22 to 33. Grant owns these lines (Oct 13). Do not edit here without a spec revision.
 * Riled/Wired descriptions (Stacy's Upset/Anxious lines, words renamed per Jim's plain-word purge Oct 26) and the opt-in checkbox text are STACY RULING.
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
  /** Q5 instruction line. PLACEHOLDER for input B (dial), Jim Oct 26. Spec rev 5 bubbles line was 'Tap a bubble or move the sliders.' */
  Q5_instruction: 'Drag the needle for energy. Slide the bar for how you feel. Tap the word to change it.',
  /** Q6 step label. 'flow' = real position in the actual flow (Grant Oct 26): setup, ROMood, then each
   * measure step, so ROMood shows "2 of N". A fixed string overrides; null hides either one. */
  Q6_stepLabel: { counter: 'flow' as 'flow' | string | null, eyebrow: 'flow' as 'flow' | string | null },
  /** Q8 slider switch points, 0 to 100 scale. Readout switches below `low` and above `high`; `mid` splits quadrants (mid counts as the lower side). */
  Q8_sliderSwitch: { low: 40, high: 60, mid: 50 },
  /** Q11 is the "skipped" event tied to the account? Default false: no user id, no anon id, no session id. */
  Q11_skipEventWithUserId: false,
  /** Mood input visual (Jim is weighing alternatives to bubbles). Key into MOOD_INPUTS in components/moodInput. */
  /** Mood input visual. Jim picked option B, the ROMeter dial (Oct 26). 'bubbles' kept as a fallback. */
  inputVisual: 'dial' as 'dial' | 'bubbles',
  /** Dial readout: when the user only drags, show the nearest feeling word as a suggestion. It is NOT stored
   * unless the user taps it and picks a word (stored word = null otherwise). Jim/Stacy to confirm. */
  dialSuggestWord: true,
  /** RETENTION (Jim's call, Stacy options A/B/C, Oct 26 6:40 PM ET). Default A, Stacy's recommendation.
   * User delete ALWAYS overrides retention in every option. */
  retention: 'until_delete' as RetentionMode,
  /** Mood-to-Dailee day linking. OFF until the new opt-in text AND the /legal 7A text are live. */
  daileeLinkEnabled: false,
} as const

export type RetentionMode = 'until_delete' | '12_months' | 'rolling_12_weeks'

/** Retention lines per option (Stacy draft, stacy-romood-retention-20261026.md). Shown in Settings. */
export const RETENTION_LINES: Record<RetentionMode, string> = {
  until_delete: 'We keep your check-ins until you delete them or your account. You can delete them at any time.',
  '12_months': 'We keep each check-in for 12 months, then delete it. You can delete it sooner at any time.',
  rolling_12_weeks: 'We keep each check-in for 12 weeks, then delete it. You can delete it sooner at any time.',
}

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
  /** PLACEHOLDER: Stacy's proposed opt-in text (Oct 26, adds the Dailee purpose). Needs a spec revision; copy owner Grant. */
  optInBefore: 'Save my mood check-ins so ROMRx can show me patterns over time, including how I feel on days I do or miss my Dailee protocol. I can turn this off or delete them anytime. See the ',
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
  { word: 'Riled', description: 'Heated, and hard to settle.', quadrant: 'high_unpleasant' },
  { word: 'Wired', description: 'Buzzing, and on edge.', quadrant: 'high_unpleasant' },
  { word: 'Angry', description: 'Hot, sharp, and ready to push.', quadrant: 'high_unpleasant' },
  { word: 'Tense', description: 'Drawn up in body and mind.', quadrant: 'high_unpleasant' },
  { word: 'Excited', description: 'Energy up, and it feels good.', quadrant: 'high_pleasant' },
  { word: 'Upbeat', description: 'Light, bright, and lifted.', quadrant: 'high_pleasant' },
  { word: 'Happy', description: 'Warm and plainly glad.', quadrant: 'high_pleasant' },
  { word: 'Lively', description: 'Awake, moving, and interested.', quadrant: 'high_pleasant' },
  { word: 'Low', description: 'Heavy and quiet.', quadrant: 'low_unpleasant' },
  { word: 'Flat', description: 'Dim, with very little lift.', quadrant: 'low_unpleasant' },
  { word: 'Drained', description: 'Spent, and rest sounds good.', quadrant: 'low_unpleasant' },
  { word: 'Bored', description: 'Nothing is holding you.', quadrant: 'low_unpleasant' },
  { word: 'Calm', description: 'Steady and unruffled.', quadrant: 'low_pleasant' },
  { word: 'Content', description: 'Settled, with enough for now.', quadrant: 'low_pleasant' },
  { word: 'Relaxed', description: 'Loose and unhurried.', quadrant: 'low_pleasant' },
  { word: 'Mellow', description: 'Soft, easy, and low-key.', quadrant: 'low_pleasant' },
]

/** My Body mood average (Jim approved layout Oct 26; Stacy conditions stacy-romood-mybody-average-20261026.md).
 * OPEN for Jim: label = nearest word vs broad area; window = all time vs recent. */
export type MoodAverageLabel = 'word' | 'area'
export type MoodAverageWindow = 'all_time' | 'recent'
export const ROMOOD_MYBODY_CONFIG = {
  averageLabel: 'word' as MoodAverageLabel,
  averageWindow: 'all_time' as MoodAverageWindow,
  recentDays: 84,
}
export const ROMOOD_MYBODY_COPY = {
  title: 'Your average mood',
  separate: 'Separate from your body score',
  reflection: 'For your own reflection. Not medical advice.',
  divider: 'Mood is not part of your body score',
  emptyTitle: 'Do a ROMood check to start your mood average',
  emptyCta: 'Start ROMood check',
  windowAllTime: 'Your average so far',
  windowRecent: 'Last 12 weeks',
  window12Months: 'Last 12 months',
  basedOn: (n: number) => `Based on ${n} check-in${n === 1 ? '' : 's'}`,
}

/** DECIDED (Jim, Oct 26): turning saving off OFFERS to delete past check-ins. No longer a placeholder. */
export const ROMOOD_TURN_OFF_BEHAVIOR: 'offer' | 'auto' = 'offer'
