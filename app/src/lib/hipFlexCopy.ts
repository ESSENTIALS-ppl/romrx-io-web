/**
 * Customer-facing hip flexion (straight-leg raise) copy. ONE place, so the step,
 * the measure screen, My Body and My Protocol can never drift apart.
 *
 * Stacy's rule (Oct 3, 2026): no degree numbers shown as a normal or target, and
 * none of the words normal, required, tight, injury, risk. American spelling,
 * no em dashes. Guarded by hipFlexCopy.test.ts.
 *
 * Only the fallback is live (HIP_FLEX_UNSCORED_FALLBACK in mobilityBands.ts).
 * The sex-specific lines are kept here, unused, for the follow-up that grades
 * each leg against published averages once the user's sex is available.
 */

/** Result line per leg once sex is known (FOLLOW-UP, not shown yet). */
export const HIP_FLEX_RESULT_LINE_SEX_KNOWN =
  'Compared with published averages for healthy adults of your sex (Youdas et al., 2005)'

/** Shown when the two legs differ (gap at least HIP_FLEX_LR_DIFFERENT_DEG). */
export const HIP_FLEX_LEFT_RIGHT_DIFFERENT = 'Left and right are different'

/** Degrees of left/right gap that counts as different (same 10 as the My Body gap flag). */
export const HIP_FLEX_LR_DIFFERENT_DEG = 10

/** LIVE: sex unknown or not given. No low/high judgment. */
export const HIP_FLEX_FALLBACK_LINE =
  'Saved for each leg, not scored. Published averages for this raise differ for men and women (Youdas et al., 2005).'

export const HIP_FLEX_STEP = {
  why: 'How far each leg lifts with the knee straight. Left and right are shown separately.',
  position: [
    'Lie flat on your back on the floor. Both legs straight. Slide one hand under your low back.',
    'Hold your phone flat against the outer side of your thigh (the surface facing away from your other leg), midway between your hip and your knee. Screen faces outward.',
    'Tap to zero with your leg flat on the ground.',
  ],
  howTo: [
    'Keep your knee completely straight. Raise the test leg straight up as high as you can. The other leg stays flat on the floor.',
    'Keep the phone aligned with your thigh as it rises. Stop at a firm stretch behind the thigh, or sooner when your low back presses down onto your hand. Stop if you feel sharp pain. Read the number.',
    'Record it. Lower the leg slowly. Re-zero. Repeat on the other side.',
  ],
  mistake: 'Bending the knee, letting the other leg lift off the floor, or letting your low back press down onto your hand as you go higher.',
  mistakeFix: 'Your knee stays straight and the other leg stays flat. Stop at a firm stretch, not at pain. Stop sooner when your low back presses down onto your hand.',
} as const

/** True when the two legs differ enough to say so. */
export function hipFlexLegsDiffer(left: number | null | undefined, right: number | null | undefined): boolean {
  if (left == null || right == null) return false
  return Math.abs(Number(left) - Number(right)) >= HIP_FLEX_LR_DIFFERENT_DEG
}
