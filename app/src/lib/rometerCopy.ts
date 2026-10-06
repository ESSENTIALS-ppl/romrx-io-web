/**
 * Customer-facing strings for the standalone ROMeter page (/dashboard/rometer), in one place for
 * review. Plain, American spelling, no em dashes, no ranges, no accuracy or medical claims, no TM.
 * Status per line:
 *   STACY PASS     = cleared in ROMETER-STACY-CLEAR-20261006.md (Oct 6, 11:40 AM) or by Stacy after.
 *   PENDING STACY  = placeholder from ROMETER-BUILD-PLAN-20261006.md; nothing ships until Jim's yes.
 * Readings stay in React state only: never logged, stored or put in a URL. If that ever changes,
 * `privacy` has to change first (Stacy, Oct 6).
 */
export const ROMETER_COPY = {
  navLabel: 'ROMeter',                                                                    // PENDING STACY (name approved by Jim; no TM)
  title: 'ROMeter',                                                                       // PENDING STACY
  subtitle: 'A quick angle check with your phone.',                                       // PENDING STACY
  intro: 'Hold your phone against the part that moves, then measure how far it goes.',    // PENDING STACY
  meterHeader: 'ROMeter',                                                                 // PENDING STACY (replaces "Measuring: Left" in the meter)
  grip: 'Hold the phone flat against the part that moves.',                               // PENDING STACY (Quinn: fine for the neck with tiltOnly)
  tiltOnly: "Works for moves that tilt the phone up, down or to the side. Turning moves, like looking over your shoulder, won't read.", // STACY PASS (Quinn's line)
  locked: 'Locked. Tap Reset or Start to measure again.',                                 // PENDING STACY (no Use this number on this page)
  privacy: 'Your readings stay on this phone. They are not saved or sent.',               // STACY PASS
  notAssessment: 'This does not change your assessment or your score.',                   // PENDING STACY
  disclaimer: 'For informal use only. Not medical advice. Stop if anything hurts.',       // STACY PASS
  desktop: 'Open this page on your phone to use the ROMeter.',                            // PENDING STACY
} as const
