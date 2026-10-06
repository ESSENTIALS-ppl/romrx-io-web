import { HIP_FLEX_UNSCORED_FALLBACK } from './mobilityBands'

/**
 * Customer-facing hip flexion (straight-leg raise) copy. ONE place, so the step,
 * the measure screen, My Body and My Protocol can never drift apart.
 *
 * Stacy's rule (Oct 3, 2026): no degree numbers shown as a normal or target, and
 * none of the words normal, required, tight, injury, risk. American spelling,
 * no em dashes. Guarded by hipFlexCopy.test.ts.
 *
 * Only the fallback is live (HIP_FLEX_UNSCORED_FALLBACK in mobilityBands.ts).
 * While that flag is true EVERYONE (male, female, blank, other) gets the neutral
 * copy: no "your sex", no "Compared by sex", no "passive", no "rough guide".
 * The sex-specific lines are kept here, unused, and are selected only when the
 * flag flips to false (the follow-up that grades each leg against published
 * averages once the user's sex is available). Stacy edit, Oct 4, 2026.
 */

/** Result line per leg once sex is known (FOLLOW-UP, not shown yet). */
export const HIP_FLEX_RESULT_LINE_SEX_KNOWN =
  'Compared with published averages for healthy adults of your sex (Youdas et al., 2005)'

/** Shown when the two legs differ (gap at least HIP_FLEX_LR_DIFFERENT_DEG). */
export const HIP_FLEX_LEFT_RIGHT_DIFFERENT = 'Left and right are different'

/** Degrees of left/right gap that counts as different (same 10 as the My Body gap flag). */
export const HIP_FLEX_LR_DIFFERENT_DEG = 10

/**
 * Stacy pre-clear (Oct 5, 2026): straight-leg raise shows "Typical range: 60-85°" ONLY with Quinn's
 * peer-reviewed source visible on the same screen. Still unscored: no band, no %, not in the /100.
 * Jim (Oct 6, 2026, 11:19 AM, CLOSED) the SLR shows a range. Stacy cleared "Typical range: 60-80°"
 * with "Source: Youdas et al., 2005", same format as hip ER/IR and shoulder ER/flexion.
 */
export const HIP_FLEX_TYPICAL_RANGE = 'Typical range: 60-80°'
export const HIP_FLEX_RANGE_SOURCE = 'Source: Youdas et al., 2005'
/**
 * ONE switch. Grant (Oct 5, 11:14 PM): OFF. Quinn rates the 60-85° source PARTIAL (paywalled table,
 * helper-lifted leg), so the straight-leg raise shows NO number and NO source line while this is false.
 */
export const SHOW_SLR_TYPICAL_RANGE = true

/** LIVE: sex unknown or not given. No low/high judgment. */
export const HIP_FLEX_FALLBACK_LINE = 'Saved for each leg, not scored.'

export const HIP_FLEX_STEP = {
  /** Always shown. Makes no comparison claim, so it is safe when sex is unknown. */
  why: 'You raise one straight leg and read the angle. Each leg is measured on its own, so you can see both sides.',
  tool: 'Your phone. Lying on the floor. A partner is helpful.',
  /** One-line grip shown in the in-app phone meter. */
  meterGrip: 'Phone flat on the outer side of your thigh, midway between hip and knee, screen facing out.',
  position: [
    'Lie flat on your back on the floor with both legs straight.',
    'Hold your phone flat against the outer side of your thigh (the surface facing away from your other leg), midway between your hip and your knee. Screen faces outward.',
    // Jim, Oct 6 12:02 PM: no hand under the low back in setup. Stacy PASS Oct 6 12:02, ship-blocked: can't ship until Jim decides how-to 2 and Fix (they still mention the hand under the low back).
    'Tap Start, then keep your leg flat on the ground and hold still while it counts down from 5 with a soft beep each second. It zeroes at the end.',
  ],
  howTo: [
    'Keep the test knee completely straight, kneecap pointing at the ceiling. Raise that leg straight up, not out, as high as you can without bending the knee, and keep your other leg flat on the floor.',
    'Keep the phone aligned with your thigh as it rises. Stop when you feel a firm stretch behind the thigh, or sooner when your low back presses down onto your hand. Stop if you feel sharp pain. Hold still until the number locks and chimes.',
    'Tap Use this number for this leg. Lower the leg slowly. Tap Start again and repeat with the other leg. Each leg gets its own number.',
  ],
  mistake: 'Bending the knee as the leg rises, letting the other leg lift, or letting your low back press down or your hips tilt as you go higher.',
  mistakeFix: 'Keep the test leg straight and the other leg flat on the floor. Stop at a firm stretch, not at pain. Stop sooner when your low back presses down onto your hand. If your hips tilt or your knee bends, redo the lift and read the number again.',
} as const

/** Added to the "why" line ONLY when the user's sex is known (male or female). */
export const HIP_FLEX_WHY_SEX_KNOWN =
  'Your numbers are compared with published passive straight-leg-raise values for adults of your sex. This is an educational comparison, not a diagnosis.'

/** Input note under each leg box: ONLY when sex is known. */
export const HIP_FLEX_INPUT_NOTE_SEX_KNOWN = 'Compared by sex after you finish'

/** Input note when sex is blank, prefer_not_to_say or anything else. */
export const HIP_FLEX_INPUT_NOTE_FALLBACK = 'Saved for each leg'

/** Approved by Stacy for the sex-known comparison screen ONLY. Never on the fallback screen or in the hotfix. */
export const HIP_FLEX_HONESTY_LINE =
  'Your raise is active and the published values are passive, so treat this as a rough guide.'

/** True only for male or female. Blank, prefer_not_to_say, other, null: false. */
export function hipFlexSexKnown(gender: string | null | undefined): boolean {
  const g = (gender ?? '').trim().toLowerCase()
  return g === 'male' || g === 'female'
}

/**
 * True only when the sex-known comparison copy may render: sex is male or female AND hip flexion is
 * graded (HIP_FLEX_UNSCORED_FALLBACK false). While the fallback flag is true this is false for everyone.
 */
export function hipFlexShowSexKnownCopy(gender: string | null | undefined): boolean {
  return !HIP_FLEX_UNSCORED_FALLBACK && hipFlexSexKnown(gender)
}

/** The "why" line for the hip step: the comparison claim only when the sex-known copy is allowed. */
export function hipFlexWhy(gender: string | null | undefined): string {
  return hipFlexShowSexKnownCopy(gender) ? `${HIP_FLEX_STEP.why} ${HIP_FLEX_WHY_SEX_KNOWN}` : HIP_FLEX_STEP.why
}

/** The note beside each leg input. */
export function hipFlexInputNote(gender: string | null | undefined): string {
  return hipFlexShowSexKnownCopy(gender) ? HIP_FLEX_INPUT_NOTE_SEX_KNOWN : HIP_FLEX_INPUT_NOTE_FALLBACK
}

/** True when the two legs differ enough to say so. */
export function hipFlexLegsDiffer(left: number | null | undefined, right: number | null | undefined): boolean {
  if (left == null || right == null) return false
  return Math.abs(Number(left) - Number(right)) >= HIP_FLEX_LR_DIFFERENT_DEG
}

/**
 * Everything the measure screen shows for the hip step that depends on sex, in one pure function
 * (so it can be tested without rendering). While HIP_FLEX_UNSCORED_FALLBACK is true: neutral why
 * line, "Saved for each leg" note and the fallback line for EVERYONE, none of the comparison text.
 * Only when the flag is false and sex is known: why line with the comparison, "Compared by sex"
 * note, honesty line.
 */
export function hipFlexScreenCopy(
  gender: string | null | undefined,
  left: number | null | undefined,
  right: number | null | undefined,
): { why: string; inputNote: string; lines: string[] } {
  const known = hipFlexShowSexKnownCopy(gender)
  const lines: string[] = known ? [HIP_FLEX_HONESTY_LINE] : [HIP_FLEX_FALLBACK_LINE]
  if (hipFlexLegsDiffer(left, right)) lines.push(HIP_FLEX_LEFT_RIGHT_DIFFERENT)
  return { why: hipFlexWhy(gender), inputNote: hipFlexInputNote(gender), lines }
}
