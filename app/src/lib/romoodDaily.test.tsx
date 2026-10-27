// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'

let insertError: { code?: string; message?: string } | null = null
const insert = vi.fn(async (_row: Record<string, unknown>) => ({ error: insertError }))
const upsert = vi.fn(async (_row: Record<string, unknown>, _o?: unknown) => ({ error: null as null }))
let settingsRow: { saving_on: boolean; opted_in_at: string | null; consent_version?: string | null } | null = null
vi.mock('./supabase', () => ({ supabase: {
  from: (_t: string) => ({
    insert, upsert,
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: settingsRow, error: null }) }) }),
  }),
} }))
const track = vi.fn()
vi.mock('./track', () => ({ track: (...a: unknown[]) => track(...a), trackPageView: () => {} }))
let mockSession: { user: { id: string } } | null = { user: { id: 'u1' } }
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ session: mockSession, user: mockSession?.user ?? null, loading: false }) }))

import { QuickMood } from '../pages/QuickMood'
import { MoodSettings } from '../components/MoodSettings'
import { ROMOOD_CONSENT_VERSION, ROMOOD_QUICK_COPY as Q, ROMOOD_COPY, ROMOOD_SETTINGS_COPY } from './romoodCopy'
import { hasCurrentConsent, isDailyCapError, romoodSaveEnabled, saveMoodEntry, setMoodSaving, ROMOOD_DAILY_CAP_CODE } from './romood'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let host: HTMLDivElement; let root: Root
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); insert.mockClear(); upsert.mockClear(); track.mockClear(); insertError = null; settingsRow = null; mockSession = { user: { id: 'u1' } } })
afterEach(() => { act(() => root.unmount()); host.remove() })
const q = (id: string) => host.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })
const click = async (el: HTMLElement | null) => { await act(async () => { el!.click() }); await flush() }
async function mount(saveEnabled: boolean, nav = vi.fn<(to: string) => void>()) {
  act(() => root.render(createElement(MemoryRouter, null, createElement(QuickMood, { saveEnabled, onNavigate: nav }))))
  await flush()
  return nav
}
const current = { saving_on: true, opted_in_at: '2026-10-26T12:00:00.000Z', consent_version: ROMOOD_CONSENT_VERSION }

describe('saving flag', () => {
  it('default OFF; only the exact string on turns it on', () => {
    expect(romoodSaveEnabled({})).toBe(false)
    expect(romoodSaveEnabled({ VITE_ROMOOD_SAVE: 'true' })).toBe(false)
    expect(romoodSaveEnabled({ VITE_ROMOOD_SAVE: 'on' })).toBe(true)
  })
})

describe('consent version (re-consent rule)', () => {
  it('opting in stores the current consent version', async () => {
    await setMoodSaving('u1', true, '2026-10-26T12:00:00.000Z')
    expect(upsert.mock.calls[0][0]).toMatchObject({ saving_on: true, consent_version: ROMOOD_CONSENT_VERSION })
  })
  it('only the current version with a valid tick counts', () => {
    expect(hasCurrentConsent({ savingOn: true, optedInAt: current.opted_in_at, consentVersion: ROMOOD_CONSENT_VERSION })).toBe(true)
    expect(hasCurrentConsent({ savingOn: true, optedInAt: current.opted_in_at, consentVersion: null })).toBe(false)
    expect(hasCurrentConsent({ savingOn: false, optedInAt: current.opted_in_at, consentVersion: ROMOOD_CONSENT_VERSION })).toBe(false)
    expect(hasCurrentConsent({ savingOn: true, optedInAt: 'x', consentVersion: ROMOOD_CONSENT_VERSION })).toBe(false)
  })
  it('opt-in text names the results email (Stacy, verbatim)', () => {
    expect(ROMOOD_COPY.optInBefore + ROMOOD_COPY.optInLink + ROMOOD_COPY.optInAfter).toBe('Save my mood check-ins so ROMRx can show me how my mood changes over time, in the app and in my results email. I can turn this off or delete them anytime. See the Privacy Policy.')
  })
})

describe('daily cap error', () => {
  it('detects RM429 and the message', () => {
    expect(isDailyCapError({ code: ROMOOD_DAILY_CAP_CODE })).toBe(true)
    expect(isDailyCapError({ message: 'romood_daily_cap' })).toBe(true)
    expect(isDailyCapError({ code: '42501' })).toBe(false)
    expect(isDailyCapError(null)).toBe(false)
  })
  it('saveMoodEntry reports capped and passes the quick context', async () => {
    insertError = { code: 'RM429', message: 'romood_daily_cap' }
    const r = await saveMoodEntry('u1', { energy: 50, pleasantness: 50, word: null, optedInAt: current.opted_in_at }, 'quick')
    expect(r).toEqual({ ok: false, capped: true })
    expect(insert.mock.calls[0][0]).toMatchObject({ context: 'quick' })
  })
})

describe('QuickMood screen /dashboard/mood', () => {
  it('flag OFF: shows the screen and the not-saved line, saves nothing, no step counter', async () => {
    const nav = await mount(false)
    expect(q('quick-mood-screen')).not.toBeNull()
    expect(q('quick-mood-not-saved')!.textContent).toBe(Q.notSaved)
    expect(q('quick-mood-optin')).toBeNull()
    expect(host.textContent).not.toMatch(/Step \d+ of|Assessment step/)
    expect(q('crisis-line')).not.toBeNull()
    await click(q('quick-mood-done'))
    expect(insert).not.toHaveBeenCalled(); expect(upsert).not.toHaveBeenCalled()
    expect(nav).toHaveBeenCalledWith('/dashboard/my-body')
  })
  it('flag ON, not yet opted in: Save disabled until ticked, then saves settings + entry', async () => {
    await mount(true)
    expect((q('quick-mood-save') as HTMLButtonElement).disabled).toBe(true)
    await click(q('quick-mood-save')); expect(insert).not.toHaveBeenCalled()
    await click(q('quick-mood-optin'))
    await click(q('quick-mood-save'))
    expect(upsert).toHaveBeenCalledTimes(1)
    expect(upsert.mock.calls[0][0]).toMatchObject({ consent_version: ROMOOD_CONSENT_VERSION })
    expect(insert.mock.calls[0][0]).toMatchObject({ user_id: 'u1', context: 'quick', opted_in: true })
    expect(q('quick-mood-saved')!.textContent).toBe(Q.saved)
  })
  it('flag ON, old opt-in (no version): must tick the new text again', async () => {
    settingsRow = { saving_on: true, opted_in_at: current.opted_in_at, consent_version: null }
    await mount(true)
    expect(q('quick-mood-optin')).not.toBeNull()
  })
  it('flag ON, current opt-in: no checkbox, saves with the stored tick time', async () => {
    settingsRow = current
    await mount(true)
    expect(q('quick-mood-optin')).toBeNull()
    await click(q('quick-mood-save'))
    expect(upsert).not.toHaveBeenCalled()
    expect(insert.mock.calls[0][0]).toMatchObject({ opted_in_at: current.opted_in_at, context: 'quick' })
  })
  it('cap reached: shows the cap message and disables Save', async () => {
    settingsRow = current; insertError = { code: 'RM429', message: 'romood_daily_cap' }
    await mount(true)
    await click(q('quick-mood-save'))
    expect(q('quick-mood-capped')!.textContent).toBe(Q.capReached)
    expect((q('quick-mood-save') as HTMLButtonElement).disabled).toBe(true)
  })
  it('signed out: never saves', async () => {
    mockSession = null; await mount(true)
    await click(q('quick-mood-optin')); await click(q('quick-mood-save'))
    expect(insert).not.toHaveBeenCalled()
  })
  it('no analytics or Meta on this path', async () => {
    settingsRow = current; await mount(true); await click(q('quick-mood-save'))
    expect(track).not.toHaveBeenCalled()
    const src = readFileSync(resolve(__dirname, '../pages/QuickMood.tsx'), 'utf8')
    expect(src).not.toMatch(/\btrack\(|fbq|metaAttribution|pushManager|send-push/i)
  })
})

describe('wiring and copy rules', () => {
  const app = readFileSync(resolve(__dirname, '../App.tsx'), 'utf8')
  it('route is inside ProtectedRoute', () => {
    const i = app.indexOf('path="/dashboard/mood"')
    expect(i).toBeGreaterThan(app.indexOf('<Route element={<ProtectedRoute />}>'))
  })
  it('My Body has the button to the quick check-in', () => {
    const mb = readFileSync(resolve(__dirname, '../pages/MyBody.tsx'), 'utf8')
    expect(mb).toContain('to="/dashboard/mood"')
  })
  it('final Stacy copy, no placeholder marker, no em dashes, no clinical words, no coach', () => {
    const all = Object.values(Q).join(' ')
    expect(Q.notSaved).toBe("Saving check-ins isn't turned on yet, so this one won't be saved.")
    expect(Q.tickToSave).toBe('To save this check-in, tick the box below.')
    expect(Q.saved).toBe('Check-in saved.')
    expect(Q.capReached).toBe("You've saved 4 check-ins today. You can check in again tomorrow.")
    expect(Q.saveFailed).toBe("We couldn't save this check-in. Please try again.")
    expect(all).not.toMatch(/STACY-COPY-PENDING/)
    expect(all).not.toMatch(/\u2014/)
    expect(all).not.toMatch(/depress|anxiety|disorder|diagnos|symptom|therap|clinical|mental health|coach/i)
  })
  it('legal 7A: Stacy paragraph and deletion line word for word', () => {
    const html = readFileSync(resolve(__dirname, '../../../legal.html'), 'utf8')
    expect(html).toContain("<p>Mood check-ins: if you turn on saving, we save the mood check-ins you enter, whether during an assessment or as a quick check-in from My Body, so we can show you how your mood changes over time in the app and in your results email. If you don't turn on saving, we don't keep them. We don't use them in your scores, share them with advertisers, or use them for ads or analytics. You can turn saving off or delete your check-ins anytime in Settings.</p>")
    expect(html).toContain('<p>When you delete your check-ins or your account, we delete them from our database right away. ROMRx does not keep separate backup copies of them. Results emails we already sent you stay in your inbox, and our email provider keeps a copy of sent emails for up to 30 days.</p>')
  })
  it('cap migration: trigger, 4 per America/New_York day, RM429, quick context, consent_version; revert exists', () => {
    const m = readFileSync(resolve(__dirname, '../../../supabase/migrations/20261027000000_romood_daily_cap.sql'), 'utf8')
    expect(m).toMatch(/before insert on public\.mood_entries/)
    expect(m).toMatch(/if n >= 4 then/)
    expect(m).toContain("'America/New_York'")
    expect(m).toContain("errcode = 'RM429'")
    expect(m).toContain("check (context in ('onboarding', 'quick'))")
    expect(m).toContain('add column if not exists consent_version text')
    // Vera fix: the trigger stamps server time, so a client created_at (backdated or future) cannot dodge the cap.
    const fn = m.slice(m.indexOf('create or replace function public.romood_enforce_daily_cap'), m.indexOf('revoke all on function'))
    expect(fn).toContain('new.created_at := now();')
    expect(fn.indexOf('new.created_at := now();')).toBeLessThan(fn.indexOf('select count(*) into n'))
    expect(m).toMatch(/before insert on public\.mood_entries/)
    const r = readFileSync(resolve(__dirname, '../../../supabase/reverts/20261027000000_romood_daily_cap.revert.sql'), 'utf8')
    expect(r).toContain('drop trigger if exists mood_entries_daily_cap')
    expect(r).toContain('drop column if exists consent_version')
    expect(r).toContain('drop function if exists public.romood_enforce_daily_cap()')
    expect(r).toContain('created_at := now()')
  })
})

describe('Settings > ROMood check-ins: re-consent display (Vera GAP B)', () => {
  const mountS = async () => {
    act(() => root.render(createElement(MoodSettings, { userId: 'u1', saveEnabled: true })))
    await flush()
  }
  it('old opt-in (no consent version): shows saving OFF and the existing opt-in panel with an unticked box; writes nothing', async () => {
    settingsRow = { saving_on: true, opted_in_at: '2026-10-26T12:00:00.000Z', consent_version: null }
    await mountS()
    expect(q('mood-saving-state')!.textContent).toBe(ROMOOD_SETTINGS_COPY.savingOff)
    expect(q('mood-toggle')!.textContent).toBe(ROMOOD_SETTINGS_COPY.turnOn)
    const panel = q('mood-optin-panel')
    expect(panel).toBeTruthy()
    expect(panel!.textContent).toBe(ROMOOD_COPY.optInBefore + ROMOOD_COPY.optInLink + ROMOOD_COPY.optInAfter + ROMOOD_SETTINGS_COPY.turnOn + ROMOOD_SETTINGS_COPY.cancel)
    expect((q('mood-settings-optin') as HTMLInputElement).checked).toBe(false)
    expect((q('mood-optin-confirm') as HTMLButtonElement).disabled).toBe(true)
    expect(upsert).not.toHaveBeenCalled()
  })
  it('an older consent version string also counts as old', async () => {
    settingsRow = { saving_on: true, opted_in_at: '2026-10-26T12:00:00.000Z', consent_version: 'v1' }
    await mountS()
    expect(q('mood-saving-state')!.textContent).toBe(ROMOOD_SETTINGS_COPY.savingOff)
    expect(q('mood-optin-panel')).toBeTruthy()
  })
  it('ticking and confirming records the current consent version with the real tick time', async () => {
    settingsRow = { saving_on: true, opted_in_at: '2026-10-26T12:00:00.000Z', consent_version: null }
    await mountS()
    const before = Date.now(); await click(q('mood-settings-optin')); const after = Date.now()
    await click(q('mood-optin-confirm'))
    const row = upsert.mock.calls[0][0] as { saving_on: boolean; opted_in_at: string; consent_version: string }
    expect(row).toMatchObject({ user_id: 'u1', saving_on: true, consent_version: ROMOOD_CONSENT_VERSION })
    expect(Date.parse(row.opted_in_at)).toBeGreaterThanOrEqual(before)
    expect(Date.parse(row.opted_in_at)).toBeLessThanOrEqual(after)
    expect(q('mood-saving-state')!.textContent).toBe(ROMOOD_SETTINGS_COPY.savingOn)
    expect(q('mood-optin-panel')).toBeNull()
  })
  it('current consent: shows saving ON and no prompt', async () => {
    settingsRow = { ...current }
    await mountS()
    expect(q('mood-saving-state')!.textContent).toBe(ROMOOD_SETTINGS_COPY.savingOn)
    expect(q('mood-toggle')!.textContent).toBe(ROMOOD_SETTINGS_COPY.turnOff)
    expect(q('mood-optin-panel')).toBeNull()
  })
  it('saving off in the database: shows OFF and no prompt', async () => {
    settingsRow = { saving_on: false, opted_in_at: null, consent_version: null }
    await mountS()
    expect(q('mood-saving-state')!.textContent).toBe(ROMOOD_SETTINGS_COPY.savingOff)
    expect(q('mood-optin-panel')).toBeNull()
  })
  it('no settings row: shows OFF and no prompt', async () => {
    await mountS()
    expect(q('mood-saving-state')!.textContent).toBe(ROMOOD_SETTINGS_COPY.savingOff)
    expect(q('mood-optin-panel')).toBeNull()
  })
  it('cancel closes the prompt and records nothing; saving stays OFF', async () => {
    settingsRow = { saving_on: true, opted_in_at: '2026-10-26T12:00:00.000Z', consent_version: null }
    await mountS()
    await click(q('mood-optin-cancel'))
    expect(q('mood-optin-panel')).toBeNull()
    expect(upsert).not.toHaveBeenCalled()
    expect(q('mood-saving-state')!.textContent).toBe(ROMOOD_SETTINGS_COPY.savingOff)
  })
  it('flag OFF: nothing shown even for an old opt-in', async () => {
    settingsRow = { saving_on: true, opted_in_at: '2026-10-26T12:00:00.000Z', consent_version: null }
    act(() => root.render(createElement(MoodSettings, { userId: 'u1', saveEnabled: false })))
    await flush()
    expect(q('mood-settings')).toBeNull()
  })
})

describe('migration 5: mood_entries insert requires v2 consent (Vera GAP A)', () => {
  const dir = resolve(__dirname, '../../../supabase')
  const file = '20261027010000_romood_insert_requires_v2_consent'
  const sql = readFileSync(resolve(dir, `migrations/${file}.sql`), 'utf8')
  const code = sql.replace(/--.*$/gm, '')
  it('sorts after the cap migration (it reads consent_version, which that migration adds)', () => {
    const names = readdirSync(resolve(dir, 'migrations')).filter(n => n.endsWith('.sql')).sort()
    expect(names.indexOf(`${file}.sql`)).toBeGreaterThan(names.indexOf('20261027000000_romood_daily_cap.sql'))
    expect(names[names.length - 1]).toBe(`${file}.sql`)
  })
  it('is a RESTRICTIVE INSERT policy for authenticated on mood_entries, and drops any old copy first', () => {
    expect(code).toMatch(/drop policy if exists mood_entries_insert_requires_v2_consent on public\.mood_entries;/)
    expect(code).toMatch(/create policy mood_entries_insert_requires_v2_consent on public\.mood_entries\s+as restrictive\s+for insert to authenticated\s+with check \(/)
    expect(code.match(/create policy/g)).toHaveLength(1)
  })
  it('requires the user\'s own mood_settings row with the v2 consent version and a non-null tick time', () => {
    expect(code).toMatch(/exists \(\s*select 1 from public\.mood_settings s\s+where s\.user_id = mood_entries\.user_id\s+and s\.consent_version = 'v2-email-20261026'\s+and s\.opted_in_at is not null\s*\)/)
  })
  it('uses the same consent version string as the app', () => {
    expect(ROMOOD_CONSENT_VERSION).toBe('v2-email-20261026')
    expect(sql).toContain(`'${ROMOOD_CONSENT_VERSION}'`)
  })
  it('does not depend on the cap trigger or context (quick and onboarding behave the same), and adds no function, grant or service-role rule', () => {
    expect(code).not.toMatch(/created_at|context|romood_enforce_daily_cap|create (or replace )?function|create trigger|security definer|grant |revoke |service_role/i)
  })
  it('does not loosen anything: no permissive insert policy, no update or delete policy, no disable of RLS', () => {
    expect(code).not.toMatch(/disable row level security|for update|for delete|for all|as permissive/i)
  })
  it('cap trigger still runs before the check: it is BEFORE INSERT and stamps server time (RLS WITH CHECK runs after BEFORE ROW triggers)', () => {
    const cap = readFileSync(resolve(dir, 'migrations/20261027000000_romood_daily_cap.sql'), 'utf8')
    expect(cap).toMatch(/before insert on public\.mood_entries/)
    expect(sql).toMatch(/BEFORE ROW triggers fire first, then RLS WITH CHECK/)
  })
  it('revert drops only that policy, is idempotent, and runs before revert 4 (which drops consent_version)', () => {
    const r = readFileSync(resolve(dir, `reverts/${file}.revert.sql`), 'utf8')
    const rc = r.replace(/--.*$/gm, '').trim()
    expect(rc).toBe('drop policy if exists mood_entries_insert_requires_v2_consent on public.mood_entries;')
    expect(r).toMatch(/Run FIRST of all/)
    const readme = readFileSync(resolve(dir, 'reverts/README.md'), 'utf8')
    expect(readme).toContain('revert 5 drops the restrictive consent policy and must run before revert 4')
    const cap = readFileSync(resolve(dir, 'reverts/20261027000000_romood_daily_cap.revert.sql'), 'utf8')
    expect(cap).toContain('drop column if exists consent_version')
  })
  it('PUSH-PLAN lists migration 5 and the 5, 4, 3, 2, 1 revert order', () => {
    const plan = readFileSync(resolve(dir, '../PUSH-PLAN.md'), 'utf8')
    expect(plan).toContain(`5. ${file}.sql`)
    expect(plan).toContain(`supabase/reverts/${file}.revert.sql`)
    expect(plan).toContain('Revert order: **5, 4, 3, 2, 1**')
    expect(plan).toContain('Apply migrations 1, 2, 3, 4, 5 in order')
    expect(plan).toContain('run the reverts by hand in order 5, 4, 3, 2, 1.')
    expect(plan).not.toMatch(/(?<!5, )4, 3, 2, 1/)
    expect(plan).not.toMatch(/migrations 1 to 4/)
  })
  it('no em dashes in the new SQL files', () => {
    expect(sql).not.toMatch(/\u2014/)
    expect(readFileSync(resolve(dir, `reverts/${file}.revert.sql`), 'utf8')).not.toMatch(/\u2014/)
  })
})
