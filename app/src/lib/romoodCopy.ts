/**
 * ROMood check copy. Source: /workspace/romood_spec.md revision 5 (Oct 19 2026), Section 3 and Section 5
 * rows 22 to 33. Grant owns these lines (Oct 13). Do not edit here without a spec revision.
 * Upset/Anxious descriptions and the opt-in checkbox text are STACY RULING.
 */
export const ROMOOD_COPY = {
  counter: '3 of 4',
  eyebrow: 'Assessment step 1',
  heading: 'ROMood check',
  question: 'How are you feeling right now?',
  instruction: 'Tap a bubble or move the sliders.',
  energy: { label: 'Energy', low: 'Low', high: 'High', readout: ['Leaning low', 'In the middle', 'Leaning high'] },
  pleasantness: { label: 'Pleasantness', low: 'Unpleasant', high: 'Pleasant', readout: ['Leaning unpleasant', 'In the middle', 'Leaning pleasant'] },
  gridLabel: 'Feeling words',
  encouragement: "No matter where you're starting today, we're in this together.",
  optInBefore: 'Save my mood check-ins so ROMRx can show me patterns over time. See the ',
  optInLink: 'Privacy Policy',
  optInAfter: '.',
  back: 'Back',
  skip: 'Skip mood check',
  next: 'Next',
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
