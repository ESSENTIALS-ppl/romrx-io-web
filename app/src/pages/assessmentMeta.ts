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
 * Method line (Jim, Oct 6 2026, 12:16 PM, his exact words; replaces Grant's Option A because "GO" is no longer
 * used). Shown as the second paragraph of the ROMeter card on the setup screen (the card component needs a label,
 * and Jim gave this sentence no title), and on the ROMeter page.
 */
export const METHOD_LINE = "Tap Start and move into position during the five-second countdown beeps. After the final beep, begin your move. Then hold for 2.5 seconds, and you'll hear a finishing ding."

/** Before you start (Jim, Oct 6 2026, 12:16 PM, his exact words and order). `more` is a second paragraph under the detail. */
export const SETUP_STEPS: { icon: string; label: string; detail: string; more?: string }[] = [
  { icon: '🔄', label: 'Warm up first - 5 minutes', detail: '1) Walk or march in place for 2 minutes. 2) Arm circles - 10 forward, 10 backward. 3) Hip circles - big loops with your hips like a hula hoop, 10 each way. 4) Leg swings - hold a wall, swing each leg front-to-back 10 times then side-to-side 10 times. 5) Slow neck turns - look left and right, 5 times each way. Wear shorts and a t-shirt.' },
  { icon: '📱', label: 'Your phone is the meter, and we call it ROMeter.', detail: 'Tap Measure. Your phone may ask for access. If it does, accept it. Hold the phone where the step shows. Tap Use this number to fill it in. Sound on, volume up, and turn off silent mode so you can hear the beeps.', more: METHOD_LINE },
  { icon: '⏭️', label: 'Skip is always OK', detail: "If a position is too difficult or you feel any pain, tap Skip. Your score is based on what you complete. You can always try to redo this position during a reassessment if you're able." },
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

