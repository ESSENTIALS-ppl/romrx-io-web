/**
 * Customer-facing strings for the in-app phone meter, in one place for review
 * (Stacy: claims; Quinn: grips). Plain, goal-first, American spelling, no em dashes,
 * no accuracy or medical claims. Lines marked STACY are verbatim from her pre-clear
 * (METER-STRINGS-STACY-PRECLEAR-20261005.md). Mirrored in
 * /workspace/er-sensor-20261005/BASE-METER-STRINGS.md.
 */
export const METER_COPY = {
  measureButton: 'Measure with phone',                                   // STACY PASS
  closeButton: 'Close',                                                  // STACY PASS
  measuringPrefix: 'Measuring',
  startButton: 'Turn on the ROMeter',                                    // STACY (ROMeter rename cleared Oct 6)
  startNote: 'Your phone may ask to use motion. Tap Allow.',             // STACY
  starting: 'Turning on the ROMeter...',                                 // STACY (ROMeter rename cleared Oct 6)
  soundLine: 'Sound on, volume up. Turn off silent mode to hear the beeps.', // STACY
  zeroButton: 'Start',                                                   // STACY PASS
  resetButton: 'Reset',                                                  // STACY PASS
  useButton: 'Use this number',                                          // STACY PASS
  peakLabel: 'Peak',                                                     // STACY PASS
  lockedPrefix: 'Locked',                                                // STACY PASS
  go: 'Move',                                                           // Jim 12:16: the start signal is a beep, never GO
  needZero: 'Tap Start, then hold the start position while it counts down from 5.',
  zeroCountdown: 'Hold still...',                                        // STACY (under the big number)
  live: 'Move slowly to your end range, then hold still.',           // STACY (at zero)
  holding: 'Hold still...',
  locked: 'Locked. Tap Use this number, or Reset to measure again.',
  saved: (label: string, val: string | number) => `Saved: ${label} ${val}°`,   // STACY "Saved: Left 48°"
  /** STACY "Right side ready. Get in position and tap Start." (mirrored for right first). */
  nextReady: (label: string) => `${/^(Left|Right)$/.test(label) ? `${label} side` : label} ready. Get in position and tap Start.`,
  /** STACY "Both sides saved." Steps measured as Flexion + Extension say "Both saved." */
  allSaved: (labels: string[]) => labels.every(l => /^(Left|Right)/.test(l)) ? 'Both sides saved.' : 'Both saved.',
  measureAgain: 'Measure again',
  upNext: 'Up next',
  denied: 'Motion access is off. To use the ROMeter, close and reopen your browser, then tap Allow when asked.', // STACY (ROMeter rename cleared Oct 6)
  inApp: 'The ROMeter may not work inside Instagram or Facebook. Open this page in Safari or Chrome.',   // STACY (ROMeter rename cleared Oct 6)
  error: 'The ROMeter did not start. Tap the button again.',          // STACY (Oct 6)
  noData: 'This device is not sending motion readings.',
  desktopNote: 'Type your numbers here. On a phone, you can also use the ROMeter.',                  // STACY (Oct 6)
  manualPlaceholder: 'Type',
  manualAria: (label: string) => `${label}, type your number`,
  typicalRange: (lo: number, hi: number, unit = '°') => `Typical range: ${lo}-${hi}${unit}`, // STACY
} as const

/** Section header above the boxes on every step. STACY pre-clear optional (line 30), Grant: use it. Was "Enter your measurements". */
export const MEASUREMENTS_HEADER = 'Your measurements'

/**
 * Layout review (METER-UI-REVIEW-20261006.md, item 9): the toggle that holds How to Measure, Common
 * mistake and the lock tip on meter steps. Wording from the review. STACY PASS (Oct 6 11:43).
 */
export const MORE_HELP_LABEL = 'More help'

/** Instagram / Facebook in-app browsers (motion is often blocked there). */
export function isInAppBrowser(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(ua)
}
