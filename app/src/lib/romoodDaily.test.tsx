// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync } from 'node:fs'
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
import { ROMOOD_CONSENT_VERSION, ROMOOD_QUICK_COPY as Q, ROMOOD_COPY } from './romoodCopy'
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
  it('placeholders are marked, no em dashes, no clinical words, no coach', () => {
    const all = Object.values(Q).join(' ')
    for (const k of ['notSaved', 'tickToSave', 'saved', 'capReached', 'saveFailed'] as const) expect(Q[k]).toMatch(/^STACY-COPY-PENDING: /)
    expect(all).not.toMatch(/\u2014/)
    expect(all).not.toMatch(/depress|anxiety|disorder|diagnos|symptom|therap|clinical|mental health|coach/i)
  })
  it('legal 7A: Stacy paragraph and deletion line word for word', () => {
    const html = readFileSync(resolve(__dirname, '../../../legal.html'), 'utf8')
    expect(html).toContain("<p>Mood check-ins: if you turn on saving, we save the mood check-ins you enter, whether during an assessment or as a quick check-in from My Body, so we can show you how your mood changes over time in the app and in your results email. If you don't turn on saving, we don't keep them. We don't use them in your scores, share them with advertisers, or use them for ads or analytics. You can turn saving off or delete your check-ins anytime in Settings.</p>")
    expect(html).toContain('<p>When you delete your check-ins or your account, we delete them from our database right away. ROMRx does not keep separate backup copies of them. Results emails we already sent you stay in your inbox, and our email provider may keep a copy of sent emails for a limited time.</p>')
  })
  it('cap migration: trigger, 4 per America/New_York day, RM429, quick context, consent_version; revert exists', () => {
    const m = readFileSync(resolve(__dirname, '../../../supabase/migrations/20261027000000_romood_daily_cap.sql'), 'utf8')
    expect(m).toMatch(/before insert on public\.mood_entries/)
    expect(m).toMatch(/if n >= 4 then/)
    expect(m).toContain("'America/New_York'")
    expect(m).toContain("errcode = 'RM429'")
    expect(m).toContain("check (context in ('onboarding', 'quick'))")
    expect(m).toContain('add column if not exists consent_version text')
    const r = readFileSync(resolve(__dirname, '../../../supabase/reverts/20261027000000_romood_daily_cap.revert.sql'), 'utf8')
    expect(r).toContain('drop trigger if exists mood_entries_daily_cap')
    expect(r).toContain('drop column if exists consent_version')
  })
})
