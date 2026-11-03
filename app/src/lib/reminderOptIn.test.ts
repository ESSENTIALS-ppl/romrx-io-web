import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { reminderStateFromRow, saveReminderChanges, type ReminderState } from './reminderOptIn'
import { loadDeletionStatus, DELETION_STATUS_COPY, type FromFn } from './deletionStatus'

const T = '2026-11-02T12:00:00Z'
const OFF: ReminderState = { retest: false, protocol: false, digest: false }
describe('reminderStateFromRow: ON only with toggle AND marker', () => {
  it('default-on rows without markers show OFF', () => {
    expect(reminderStateFromRow({ retest_reminders: true, retest_opt_in_at: null, email_reminders: true, protocol_opt_in_at: null, weekly_digest: true, digest_opt_in_at: null })).toEqual(OFF)
  })
  it('marker without toggle shows OFF; both shows ON; null row OFF; non-boolean toggle OFF', () => {
    expect(reminderStateFromRow({ retest_reminders: false, retest_opt_in_at: T, email_reminders: false, protocol_opt_in_at: T, weekly_digest: false, digest_opt_in_at: T })).toEqual(OFF)
    expect(reminderStateFromRow({ retest_reminders: true, retest_opt_in_at: T, email_reminders: true, protocol_opt_in_at: T, weekly_digest: true, digest_opt_in_at: T })).toEqual({ retest: true, protocol: true, digest: true })
    expect(reminderStateFromRow(null)).toEqual(OFF)
    expect(reminderStateFromRow({ retest_reminders: 'true', retest_opt_in_at: T })).toEqual(OFF)
  })
})
describe('saveReminderChanges', () => {
  it('calls set_reminder_opt_in only for switches that changed, including turning off', async () => {
    const calls: unknown[] = []
    const rpc = async (fn: string, args: unknown) => { calls.push([fn, args]); return { error: null } }
    const r = await saveReminderChanges(rpc, OFF, { retest: true, protocol: false, digest: true })
    expect(r.ok).toBe(true)
    expect(calls).toEqual([['set_reminder_opt_in', { p_kind: 'retest', p_on: true }], ['set_reminder_opt_in', { p_kind: 'digest', p_on: true }]])
    calls.length = 0
    await saveReminderChanges(rpc, { retest: true, protocol: true, digest: true }, { retest: true, protocol: true, digest: true })
    expect(calls).toEqual([])
    await saveReminderChanges(rpc, { retest: true, protocol: false, digest: false }, OFF)
    expect(calls).toEqual([['set_reminder_opt_in', { p_kind: 'retest', p_on: false }]])
  })
  it('stops at the first error and reports what was applied', async () => {
    const rpc = async (_f: string, a: { p_kind: string }) => (a.p_kind === 'protocol' ? { error: { message: 'nope' } } : { error: null })
    const r = await saveReminderChanges(rpc, OFF, { retest: true, protocol: true, digest: true })
    expect(r).toEqual({ ok: false, message: 'nope', applied: { retest: true, protocol: false, digest: false } })
    const t = await saveReminderChanges(async () => { throw new Error('net') }, OFF, { retest: true, protocol: false, digest: false })
    expect(t.ok).toBe(false)
  })
})
describe('loadDeletionStatus', () => {
  const from = (res: { data: unknown; error: unknown }): FromFn => (() => ({ select: () => ({ order: () => ({ limit: async () => res }) }) })) as unknown as FromFn
  it('newest status, or null for none, error, unknown or exception', async () => {
    expect(await loadDeletionStatus(from({ data: [{ status: 'in_progress' }], error: null }))).toBe('in_progress')
    expect(await loadDeletionStatus(from({ data: [], error: null }))).toBeNull()
    expect(await loadDeletionStatus(from({ data: null, error: { code: '42P01' } }))).toBeNull()
    expect(await loadDeletionStatus(from({ data: [{ status: 'weird' }], error: null }))).toBeNull()
    expect(await loadDeletionStatus((() => { throw new Error('x') }) as unknown as FromFn)).toBeNull()
    for (const k of ['requested', 'in_progress', 'completed', 'failed'] as const) expect(DELETION_STATUS_COPY[k].length).toBeGreaterThan(0)
  })
})
describe('Settings.tsx wiring', () => {
  const page = readFileSync(new URL('../pages/Settings.tsx', import.meta.url), 'utf8')
  it('save no longer upserts the three toggles and goes through the RPC', () => {
    const save = page.slice(page.indexOf('const handleSaveNotifications'), page.indexOf('// ── Change password'))
    expect(save).toContain('push_reminders')
    expect(save).not.toMatch(/email_reminders|retest_reminders|weekly_digest/)
    expect(save).toContain('saveReminderChanges(')
    expect(save).toContain('supabase.rpc(fn, args)')
  })
  it('load shows ON only through reminderStateFromRow', () => {
    expect(page).toContain('reminderStateFromRow(data)')
    expect(page).not.toMatch(/setRetestReminders\(data\./)
  })
  it('deletion status is off by default and reads nothing while off', () => {
    expect(page).toContain('const SHOW_DELETION_STATUS = false')
    expect(page).toMatch(/if \(!SHOW_DELETION_STATUS \|\| !user\?\.id\) return/)
  })
})

describe('lifecycle toggles visible with existing words only (feat/lifecycle-toggles-20261102-base)', () => {
  const src = readFileSync(new URL('../pages/Settings.tsx', import.meta.url), 'utf8')
  it('Notifications section and reminder toggles are on; push, export and deletion status stay off', () => {
    expect(src).toMatch(/^const SHOW_NOTIFICATIONS = true$/m)
    expect(src).toMatch(/^const SHOW_REMINDER_TOGGLES = true$/m)
    expect(src).toMatch(/^const SHOW_PUSH = false$/m)
    expect(src).toMatch(/^const SHOW_EXPORT_MY_DATA = false$/m)
    expect(src).toMatch(/^const SHOW_DELETION_STATUS = false$/m)
  })
  it('the toggles keep their existing labels', () => {
    for (const s of ['title="Email product updates"', 'subtitle="Occasional emails about new features and tips"', 'title="Retest reminders"', 'subtitle="Prompt to retake your assessment every 42 days"', 'title="Weekly progress digest"', 'subtitle="Sunday summary of PRS trend and streak"', 'title="Email reminders"', 'subtitle="Get an email on your protocol days"', 'Reminder time', 'Save notification settings']) expect(src).toContain(s)
  })
  it('a failed reminder save with no database message falls back to the existing Something went wrong. (no new copy)', async () => {
    const none = await saveReminderChanges(async () => ({ error: {} }), OFF, { retest: true, protocol: false, digest: false })
    expect(none).toEqual({ ok: false, message: 'Something went wrong.', applied: OFF })
    const thrown = await saveReminderChanges(async () => { throw new Error('x') }, OFF, { retest: true, protocol: false, digest: false })
    expect(thrown).toEqual({ ok: false, message: 'Something went wrong.', applied: OFF })
  })
})
