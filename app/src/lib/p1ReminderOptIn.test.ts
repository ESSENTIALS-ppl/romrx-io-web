// P1-01: one-tap reminder opt-in. The tap may only opt in through set_reminder_opt_in('protocol', true).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { saveReminderTime } from './reminderOptIn'
import { OPT_IN_COPY, SETTINGS_REMINDER_COPY, displayTime, friendlyTimeZone } from './reminderCopy'
import { saveReminderChanges, shouldOfferOptIn, optInTarget, toWholeHour, isValidReminderTime, optInDismissKey, reminderStateFromRow } from './reminderOptIn'

const src = (p: string) => readFileSync(join(process.cwd(), 'src', p), 'utf8')

describe('P1-01 helpers', () => {
  it('offers the card only when the protocol reminder is not on (toggle AND marker)', () => {
    expect(shouldOfferOptIn(null)).toBe(false)
    expect(shouldOfferOptIn(reminderStateFromRow(null))).toBe(true)
    expect(shouldOfferOptIn(reminderStateFromRow({ email_reminders: true, protocol_opt_in_at: null }))).toBe(true)
    expect(shouldOfferOptIn(reminderStateFromRow({ email_reminders: true, protocol_opt_in_at: '2026-11-15T00:00:00Z' }))).toBe(false)
  })
  it('time is HH:MM 24h', () => {
    for (const t of ['00:00', '07:00', '23:59']) expect(isValidReminderTime(t)).toBe(true)
    for (const t of ['24:00', '7:00', '', '07:60', 'ab:cd']) expect(isValidReminderTime(t)).toBe(false)
  })
  it('dismiss key is per placement and per user', () => {
    expect(optInDismissKey('u1', 'results')).not.toBe(optInDismissKey('u1', 'after_session'))
    expect(optInDismissKey('u1', 'results')).not.toBe(optInDismissKey('u2', 'results'))
  })
  it('the one tap turns on protocol and retest only, never digest (Stacy)', async () => {
    const calls: Array<[string, Record<string, unknown>]> = []
    const rpc = async (fn: string, args: Record<string, unknown>) => { calls.push([fn, args]); return { error: null } }
    const cur = reminderStateFromRow(null)
    const res = await saveReminderChanges(rpc as never, cur, optInTarget(cur))
    expect(res.ok).toBe(true)
    expect(calls.map(c => c[1])).toEqual(expect.arrayContaining([{ p_kind: 'protocol', p_on: true }, { p_kind: 'retest', p_on: true }]))
    expect(calls).toHaveLength(2)
    expect(calls.every(c => c[0] === 'set_reminder_opt_in')).toBe(true)
    expect(optInTarget({ retest: false, protocol: false, digest: true }).digest).toBe(true)
    expect(optInTarget({ retest: false, protocol: false, digest: false }).digest).toBe(false)
  })
  it('whole hours only', () => {
    expect(toWholeHour('07:30')).toBe('07:00')
    expect(toWholeHour('bad')).toBe('07:00')
    expect(toWholeHour('21:00')).toBe('21:00')
  })
})

describe('P1-01 wiring', () => {
  const comp = src('components/ReminderOptIn.tsx')
  it('component never writes the toggles or markers directly; words come from reminderCopy', () => {
    expect(comp).toContain('saveReminderChanges(')
    expect(comp).toContain('C[placement].heading')
    expect(comp).toContain('{C.consentBefore}<a href={PRIVACY_URL}')
    expect(comp).not.toMatch(/\{\{P1-01/)
    expect(comp).toContain('saveReminderTime(')
    expect(comp).toContain('step={3600}')
  })
  it('placed on results (signed in) and after a completed session', () => {
    expect(src('pages/ResultsPreview.tsx')).toMatch(/\{user && <ReminderOptIn userId=\{user\.id\} placement="results"/)
    expect(src('pages/MyProtocol.tsx')).toMatch(/completedToday && dbSessionCount === 1 && \(/)
  })
  it('Settings shows the reminder toggles and the push toggle (P1-14 r10, SHOW_PUSH on), keeps product updates hidden', () => {
    const s = src('pages/Settings.tsx')
    expect(s).toContain('const SHOW_REMINDER_TOGGLES = true')
    expect(s).toContain('const SHOW_NOTIFICATIONS = true')
    expect(s).toMatch(/^const SHOW_PUSH = true$/m) // P1-14 r10 flag on (Grant, Nov 17)
    expect(s).toMatch(/\{SHOW_MARKETING_TOGGLE && \(\s*<ToggleRow\s*title="Email product updates"/)
    expect(s).toContain('title={R.offAllTitle}')
    expect(s).not.toMatch(/\{\{P1-01/)
    expect(s).toContain('reminder_time: toWholeHour(reminderTime)')
    expect(s).toMatch(/checked=\{marketingOptOut\}\s*onChange=\{setMarketingOptOut\}/)
  })
})

describe('P1-01 time and timezone write (Stacy note 3a)', () => {
  it('saveReminderTime writes reminder_time (whole hour) and timezone, and nothing about toggles or markers', async () => {
    const rows: Record<string, unknown>[] = []
    await saveReminderTime(async row => { rows.push(row); return { error: null } }, 'u1', '19:45', 'America/New_York')
    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({ user_id: 'u1', reminder_time: '19:00', timezone: 'America/New_York' })
    expect(Object.keys(rows[0]).sort()).toEqual(['reminder_time', 'timezone', 'updated_at', 'user_id'])
  })
})

describe('P1-01 words (Stacy file 2053, verbatim)', () => {
  it('key lines and helpers', () => {
    expect(OPT_IN_COPY.results.heading).toBe('Want a reminder?')
    expect(OPT_IN_COPY.after_session.heading).toBe('Session 1 done.')
    expect(OPT_IN_COPY.primary).toBe('Remind me')
    expect(OPT_IN_COPY.consentBefore + OPT_IN_COPY.consentLink + OPT_IN_COPY.consentAfter).toBe('Email me around this time on my plan days, when my next check is due, and if I have not been back in 2 weeks. I can turn this off anytime in Settings. See the Privacy Policy.')
    expect(OPT_IN_COPY.confirmation(displayTime('07:00'))).toBe("You're set. We'll email you around 7:00 AM on your plan days. You can change this anytime in Settings.")
    expect(SETTINGS_REMINDER_COPY.title).toBe('Reminders')
    expect(displayTime('19:00')).toBe('7:00 PM')
    expect(displayTime('00:00')).toBe('12:00 AM')
    expect(friendlyTimeZone('America/New_York')).toMatch(/Eastern Time|America\/New_York/)
    expect(friendlyTimeZone('Not/AZone')).toBe('Not/AZone')
    const all = JSON.stringify(OPT_IN_COPY) + JSON.stringify(SETTINGS_REMINDER_COPY)
    expect(all).not.toMatch(/[\u2013\u2014]/)
  })
})
