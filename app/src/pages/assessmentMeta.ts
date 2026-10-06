import { JOINT_SCORE_TARGETS, bandScoreFromTargetRatio, isUnscoredJoint, jointKeyBase, type BandScore } from '../lib/mobilityBands'

export interface Field {
  key: string
  label: string
  unit?: string
  /** Measure-screen range label. Omitted for fields with no published range (hip flexion, ankle cm). */
  normalLow?: number
  normalHigh?: number
  riskBelow?: number
  /** Short text shown instead of "Normal: a-b" when there is no single published range (ankle cm; hip note is chosen by the screen from sex). */
  referenceNote?: string
  /** true = recorded per leg but never judged: no range label, no live band chip. */
  unscored?: boolean
}

export interface Step {
  id: string
  title: string
  why: string
  tool: string
  position: string[]
  howTo: string[]
  mistake: string
  mistakeFix: string
  fields: Field[]
  /**
   * In-app phone meter for this step's degree fields. Omitted = typed entry only (ankle cm; lumbar,
   * where one phone cannot separate the low back from the hips). grip = the one-line grip shown in
   * the meter. Zero is always a 5-second countdown (lib/meterLock ZERO_COUNTDOWN_SEC).
   */
  meter?: { grip: string }
}

export const SETUP_STEPS = [
  { icon: '📱', label: 'Your phone is the meter', detail: 'On each angle step, tap Measure with phone and allow motion access if asked. Hold the phone where the step shows, tap Zero, and hold still for the 5-second countdown. Then move and hold still. The number locks with a soft chime. Tap Use this number to fill it in. Turn your ringer on to hear the chime.' },
  { icon: '⌨️', label: 'Typing is always OK', detail: 'You can type any number yourself. If the phone meter is not available, use the Measure app (tap Level) on iPhone or the free "Simple Inclinometer" app by Syleos Apps on Android, then type the number. The low back step uses one of these apps.' },
  { icon: '🤝', label: 'Partner (recommended)', detail: 'A partner makes this much easier - they hold the phone and tap the buttons while you focus on moving.' },
  { icon: '🔄', label: 'Warm up first - 5 minutes', detail: '1) Walk or march in place for 2 minutes. 2) Arm circles - 10 forward, 10 backward. 3) Hip circles - big loops with your hips like a hula hoop, 10 each way. 4) Leg swings - hold a wall, swing each leg front-to-back 10 times then side-to-side 10 times. 5) Slow neck turns - look left and right, 5 times each way. Wear shorts and a t-shirt.' },
  { icon: '🔒', label: 'Solo tip', detail: 'Cannot see the screen at the end of a move? Just hold still. The number locks and chimes, so you can read it after you return.' },
  { icon: '⏭️', label: 'Skip is always OK', detail: 'If a position is too difficult or you need a partner for a step and do not have one, tap Skip. Your score is based on what you completed. You can always come back and fill in any skipped measurements later.' },
]


/**
 * Live band chip while measuring. Uses the single Base band source of truth
 * (lib/mobilityBands → compute_joint_scores targets) so the chip matches
 * My Body / My Protocol after submit. null = no chip (blank or unscored joint).
 */
export function getScore(val: string, field: Field): BandScore | null {
  const n = parseFloat(val)
  if (isNaN(n) || val === '') return null
  if (field.unscored || isUnscoredJoint(field.key)) return null
  const target = JOINT_SCORE_TARGETS[jointKeyBase(field.key)]
  if (target == null) return null
  return bandScoreFromTargetRatio(n, target)
}

