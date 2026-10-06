import { JOINT_SCORE_TARGETS, bandScoreFromTargetRatio, isUnscoredJoint, jointKeyBase, type BandScore } from '../lib/mobilityBands'

export interface Field {
  key: string
  label: string
  unit?: string
  /** Measure-screen "Typical range" label only (never scoring). Omitted where Quinn found no usable source (neck, hip abduction, SLR, ankle cm). */
  normalLow?: number
  normalHigh?: number
  riskBelow?: number
  /** Short text shown instead of "Typical range: a-b" when there is no single published range (ankle cm; hip note is chosen by the screen from sex). */
  referenceNote?: string
  /** Short citation shown under the inputs when the step shows a typical range (Quinn, verified Oct 5). */
  rangeSource?: string
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
   * the meter. Start is always the countdown from 5 (lib/meterAudio countdownPlan).
   */
  meter?: { grip: string }
}

/**
 * Method line on the setup screen: Grant's Option A (Stacy PASS, Oct 5 11:30 PM). Alternates for Jim in
 * BASE-METER-STRINGS.md: Option B "Start. Beeps. Go. Hold for the ding." and Stacy's pre-clear line.
 */
export const METHOD_LINE = 'Tap Start and hold still for the beeps. Move on GO. Hold at your limit until the ding.'

export const SETUP_STEPS = [
  { icon: '📱', label: 'Your phone is the meter', detail: 'On each angle step, tap Measure with phone and allow motion access if asked. Hold the phone where the step shows, tap Start, and hold still for the countdown. Move on GO and hold still. The number locks with a ding. Tap Use this number to fill it in. Sound on, volume up. Turn off silent mode to hear the beeps.' },
  { icon: '⌨️', label: 'Typing is always OK', detail: "Can't use the meter? Type your number in the box." },
  { icon: '🤝', label: 'Partner (optional)', detail: 'A partner can help. They hold the phone and tap the buttons while you move.' },
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

