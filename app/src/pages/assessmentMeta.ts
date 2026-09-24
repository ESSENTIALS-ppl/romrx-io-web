import { JOINT_SCORE_TARGETS, bandScoreFromTargetRatio, jointKeyBase, type BandScore } from '../lib/mobilityBands'

export interface Field {
  key: string
  label: string
  unit?: string
  normalLow: number
  normalHigh: number
  riskBelow: number
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
}

export const SETUP_STEPS = [
  { icon: '📱', label: 'iPhone', detail: 'Open the Measure app (pre-installed on all iPhones). Tap Level at the bottom. You will see a number in degrees that changes as you tilt the phone - that is your angle.' },
  { icon: '🤖', label: 'Android', detail: 'Download "Simple Inclinometer" by Syleos Apps, free on Google Play. Open it and you will see your angle in degrees, just like a digital level.' },
  { icon: '🤝', label: 'Partner (recommended)', detail: 'A partner makes this much easier - they hold the phone and read the angle while you focus on moving. You can do it solo using the screenshot tip on each step.' },
  { icon: '🔄', label: 'Warm up first - 5 minutes', detail: '1) Walk or march in place for 2 minutes. 2) Arm circles - 10 forward, 10 backward. 3) Hip circles - big loops with your hips like a hula hoop, 10 each way. 4) Leg swings - hold a wall, swing each leg front-to-back 10 times then side-to-side 10 times. 5) Slow neck turns - look left and right, 5 times each way. Wear shorts and a t-shirt.' },
  { icon: '📸', label: 'Solo tip', detail: 'When you cannot tap the screen: say "Hey Siri, take a screenshot" (iPhone) or "Hey Google, take a screenshot" (Android). Read the number right after.' },
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
  const target = JOINT_SCORE_TARGETS[jointKeyBase(field.key)]
  if (target == null) return null
  return bandScoreFromTargetRatio(n, target)
}

