// P1-01: one-tap reminder opt-in. The tap may only opt in through set_reminder_opt_in('protocol', true).
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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
  it('component never writes the toggles or markers directly; words are placeholders', () => {
    const upsert = comp.slice(comp.indexOf(".upsert({"), comp.indexOf("}, { onConflict"))
    expect(upsert).not.toMatch(/email_reminders|retest_reminders|weekly_digest|push_reminders|_opt_in_at/)
    expect(upsert).toMatch(/reminder_time/)
    expect(comp).toContain('saveReminderChanges(')
    expect(comp).toContain('{{P1-01 RESULTS HEADLINE, STACY}}')
    expect(comp).toContain('{{P1-01 OPT-IN CONSENT LINE, STACY}}')
    expect(comp).toContain('step={3600}')
    expect(comp).toContain('{{P1-01 OPT-IN BUTTON, STACY}}')
  })
  it('placed on results (signed in) and after a completed session', () => {
    expect(src('pages/ResultsPreview.tsx')).toMatch(/\{user && <ReminderOptIn userId=\{user\.id\} placement="results"/)
    expect(src('pages/MyProtocol.tsx')).toMatch(/completedToday && dbSessionCount === 1 && \(/)
  })
  it('Settings shows the reminder toggles, keeps push and product updates hidden', () => {
    const s = src('pages/Settings.tsx')
    expect(s).toContain('const SHOW_REMINDER_TOGGLES = true')
    expect(s).toContain('const SHOW_NOTIFICATIONS = true')
    expect(s).toContain('const SHOW_PUSH = false')
    expect(s).toMatch(/\{SHOW_MARKETING_TOGGLE && \(\s*<ToggleRow\s*title="Email product updates"/)
    expect(s).toContain('{{P1-01 SETTINGS TURN OFF ALL TITLE, STACY}}')
    expect(s).toMatch(/checked=\{marketingOptOut\}\s*onChange=\{setMarketingOptOut\}/)
  })
})
