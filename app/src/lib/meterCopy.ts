/**
 * Customer-facing strings for the in-app phone meter, in one place for review
 * (Stacy: claims; Quinn: grips). Plain, goal-first, American spelling, no em dashes,
 * no accuracy or medical claims. Mirrored in /workspace/er-sensor-20261005/BASE-METER-STRINGS.md.
 */
export const METER_COPY = {
  measureButton: 'Measure with phone',
  closeButton: 'Close',
  measuringPrefix: 'Measuring',
  startButton: 'Start sensor',
  startNote: 'Your phone may ask to use motion. Tap Allow.',
  starting: 'Starting the sensor...',
  zeroButton: 'Zero',
  resetButton: 'Reset',
  useButton: 'Use this number',
  peakLabel: 'Peak',
  lockedPrefix: 'Locked',
  needZero: 'Get into the start position and tap Zero.',
  needZeroDelayed: (s: number) => `Tap Zero, then get into the start position. It zeroes in ${s} seconds.`,
  zeroCountdown: (s: number) => `Zeroing in ${s}...`,
  live: 'Move slowly to your end range, then hold still.',
  holding: 'Hold still...',
  locked: 'Locked. Tap Use this number, or Reset to measure again.',
  savedThenNext: (prev: string, val: number, next: string) => `${prev} saved: ${val}°. Now ${next}: tap Zero in the start position.`,
  denied: 'Motion access is off, so type your number in the box. To use the phone meter on iPhone, reload this page, tap Start sensor, and tap Allow.',
  error: 'The phone meter did not start. Tap Start sensor again, or type your number in the box.',
  noData: 'This device is not sending motion readings, so type your number in the box.',
  desktopNote: 'Type your numbers here. On a phone, you can also measure with the phone itself.',
  manualPlaceholder: 'Type',
  manualAria: (label: string) => `${label}, type your number`,
} as const
