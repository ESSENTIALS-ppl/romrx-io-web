// P1-01 reminder opt-in words, copied character for character from Stacy:
// /workspace/process/evidence/STACY-P1-01-WORDS-20261115-2053.md (sections A, B, C). Words covered by L1036(a).
// Do not edit here without a new Stacy file.

export const PRIVACY_URL = 'https://romrx.io/legal#privacy'

export const OPT_IN_COPY = {
  results: {
    heading: 'Want a reminder?',
    body: "Pick a time and we'll email you so your next session is easy to start.",
  },
  after_session: {
    heading: 'Session 1 done.',
    body: 'Want a reminder for your next one?',
  },
  timeLabel: 'Remind me at',
  timeHelper: (tz: string) => `Your time zone: ${tz}`,
  // Consent line is shown in full, never collapsed; "Privacy Policy" is the link.
  consentBefore: 'Email me around this time on my plan days, when my next check is due, and if I have not been back in 2 weeks. I can turn this off anytime in Settings. See the ',
  consentLink: 'Privacy Policy',
  consentAfter: '.',
  primary: 'Remind me',
  secondary: 'Not now',
  confirmation: (time: string) => `You're set. We'll email you around ${time} on your plan days. You can change this anytime in Settings.`,
  error: "We couldn't save your reminder. Please try again.",
} as const

export const SETTINGS_REMINDER_COPY = {
  title: 'Reminders',
  intro: 'Choose which emails you get from ROMRx. You can turn any of them off here or from the link in each email.',
  protocolTitle: 'Plan day reminders',
  protocolHelp: 'An email around your reminder time on days you have a session. We skip it if you already did your session that day. If you have not been back in 2 weeks, we send one note to check in.',
  retestTitle: 'Check reminders',
  retestHelp: 'An email when your quick check is ready (around day 7 and day 14) and when your 6-week retest is due.',
  digestTitle: 'Weekly progress email',
  digestHelp: 'A short summary on Sunday morning with your Body score and your streak.',
  timeLabel: 'Reminder time',
  timeHelper: (tz: string) => `We send plan day and check reminders around this time. Your time zone: ${tz}`,
  offAllTitle: 'Turn off all ROMRx emails except account and billing notices',
  offAllHelp: 'This stops every reminder above. Emails about your account, your payment and your privacy requests still come.',
  privacyBefore: 'We use your reminder choices and time only to send these emails. See the ',
  privacyLink: 'Privacy Policy',
  privacyAfter: '.',
  save: 'Save reminder settings',
  saved: 'Saved',
  error: "We couldn't save your reminder settings. Please try again.",
} as const

/** "America/New_York" -> "Eastern Time" (falls back to the IANA name). */
export function friendlyTimeZone(tz: string): string {
  try {
    const part = new Intl.DateTimeFormat('en-US', { timeZone: tz, timeZoneName: 'longGeneric' })
      .formatToParts(new Date()).find(p => p.type === 'timeZoneName')
    return part?.value || tz
  } catch {
    return tz
  }
}

/** "07:00" -> "7:00 AM", "19:00" -> "7:00 PM". */
export function displayTime(hhmm: string): string {
  const [h, m] = hhmm.split(':').map(Number)
  if (!Number.isFinite(h) || !Number.isFinite(m)) return hhmm
  const ampm = h < 12 ? 'AM' : 'PM'
  const h12 = h % 12 === 0 ? 12 : h % 12
  return `${h12}:${String(m).padStart(2, '0')} ${ampm}`
}
