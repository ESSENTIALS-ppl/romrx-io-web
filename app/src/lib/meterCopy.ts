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
  startButton: 'Turn on the meter',                                      // STACY
  startNote: 'Your phone may ask to use motion. Tap Allow.',             // STACY
  starting: 'Turning on the meter...',                                   // STACY
  soundLine: 'Sound on, volume up. Turn off silent mode to hear the beeps.', // STACY
  zeroButton: 'Start',                                                   // STACY PASS
  resetButton: 'Reset',                                                  // STACY PASS
  useButton: 'Use this number',                                          // STACY PASS
  peakLabel: 'Peak',                                                     // STACY PASS
  lockedPrefix: 'Locked',                                                // STACY PASS
  go: 'GO',
  needZero: 'Tap Start, then hold the start position while it counts down from 5.',
  zeroCountdown: 'Hold still...',                                        // STACY (under the big number)
  live: 'GO. Move slowly to your end range, then hold still.',           // STACY (at zero)
  holding: 'Hold still...',
  locked: 'Locked. Tap Use this number, or Reset to measure again.',
  saved: (label: string, val: string | number) => `Saved: ${label} ${val}°`,   // STACY "Saved: Left 48°"
  /** STACY "Right side ready. Get in position and tap Start." (mirrored for right first). */
  nextReady: (label: string) => `${/^(Left|Right)$/.test(label) ? `${label} side` : label} ready. Get in position and tap Start.`,
  /** STACY "Both sides saved." Steps measured as Flexion + Extension say "Both saved." */
  allSaved: (labels: string[]) => labels.every(l => /^(Left|Right)/.test(l)) ? 'Both sides saved.' : 'Both saved.',
  measureAgain: 'Measure again',
  upNext: 'Up next',
  denied: 'Motion access is off. Type your number in the box. To use the meter, close and reopen your browser, then tap Allow when asked.', // STACY
  inApp: 'The meter may not work inside Instagram or Facebook. Open this page in Safari or Chrome, or type your number in the box.',     // STACY
  error: 'The phone meter did not start. Tap Turn on the meter again, or type your number in the box.',
  noData: 'This device is not sending motion readings, so type your number in the box.',
  desktopNote: 'Type your numbers here. On a phone, you can also measure with the phone itself.',
  manualPlaceholder: 'Type',
  manualAria: (label: string) => `${label}, type your number`,
  typicalRange: (lo: number, hi: number, unit = '°') => `Typical range: ${lo}-${hi}${unit}`, // STACY
} as const

/** Section header above the boxes on every step. STACY pre-clear optional (line 30), Grant: use it. Was "Enter your measurements". */
export const MEASUREMENTS_HEADER = 'Your measurements'

/** Instagram / Facebook in-app browsers (motion is often blocked there). */
export function isInAppBrowser(ua: string = typeof navigator !== 'undefined' ? navigator.userAgent : ''): boolean {
  return /Instagram|FBAN|FBAV|FB_IAB|FBIOS|FB4A/i.test(ua)
}
