// @vitest-environment jsdom
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'

const insert = vi.fn(async (_row: Record<string, unknown>) => ({ error: null as null }))
const eventInsert = vi.fn(async (_row: Record<string, unknown>) => ({ error: null as null }))
const upsert = vi.fn(async (_row: Record<string, unknown>, _o?: unknown) => ({ error: null as null }))
const del = vi.fn(async (_c: string, _v: string) => ({ error: null as null }))
let settingsRow: { saving_on: boolean; opted_in_at: string | null; consent_version?: string | null } | null = null
vi.mock('./supabase', () => ({ supabase: {
  auth: { getSession: async () => ({ data: { session: { user: { id: 'u1' } } } }) },
  from: (t: string) => ({
    insert: t === 'product_events' ? eventInsert : insert,
    upsert,
    delete: () => ({ eq: del }),
    select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: settingsRow, error: null }) }) }),
  }),
} }))
const track = vi.fn()
vi.mock('./track', () => ({ track: (...a: unknown[]) => track(...a), trackPageView: () => {} }))
let mockSession: { user: { id: string } } | null = { user: { id: 'u1' } }
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ session: mockSession, loading: false }) }))

import { ROMood } from '../pages/ROMood'
import { ROMOOD_COPY, FEELING_WORDS, ROMOOD_PLACEHOLDERS, ROMOOD_SETTINGS_COPY, RETENTION_LINES, ROMOOD_MYBODY_COPY, ROMOOD_TURN_OFF_BEHAVIOR, ROMOOD_CONSENT_VERSION } from './romoodCopy'
import { MoodSettings } from '../components/MoodSettings'
import { energyFromPoint, needlePoint } from '../components/DialMoodInput'
import { AssessmentPhases } from '../pages/AssessmentPhases'
import { quadrantFor, positionFor, shouldSaveMood, romoodSaveEnabled, saveMoodEntry, readoutIndex, retentionCutoff, romoodDaileeLinkEnabled } from './romood'
import { META_FORBIDDEN_KEYS } from './metaAttribution'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let host: HTMLDivElement; let root: Root
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); insert.mockClear(); eventInsert.mockClear(); upsert.mockClear(); del.mockClear(); settingsRow = null; track.mockClear(); mockSession = { user: { id: 'u1' } } })
afterEach(() => { act(() => root.unmount()); host.remove() })

function mount(saveEnabled: boolean, nav = vi.fn<(to: string) => void>()) {
  act(() => root.render(createElement(MemoryRouter, null, createElement(ROMood, { saveEnabled, onNavigate: nav }))))
  return nav
}
const q = (id: string) => host.querySelector(`[data-testid="${id}"]`) as HTMLElement
const click = async (el: HTMLElement) => { await act(async () => { el.click() }) }

describe('ROMood copy (spec rev 5)', () => {
  it('exact lines', () => {
    expect(ROMOOD_COPY.encouragement).toBe("No matter where you're starting today, we're in this together.")
    expect(ROMOOD_COPY.optInBefore + ROMOOD_COPY.optInLink + ROMOOD_COPY.optInAfter).toBe('Save my mood check-ins so ROMRx can show me how my mood changes over time, in the app and in my results email. I can turn this off or delete them anytime. See the Privacy Policy.')
    expect(ROMOOD_COPY.optInBefore).not.toMatch(/Dailee/)
    expect(ROMOOD_SETTINGS_COPY.deleteConfirm).toBe('Delete all your saved mood check-ins? This cannot be undone. Emails we already sent you are not affected. We delete them from our database right away. ROMRx does not keep backup copies.')
    expect(ROMOOD_SETTINGS_COPY.deleteConfirm).not.toMatch(/30 days|encrypted backups/)
    expect(FEELING_WORDS).toHaveLength(16)
    expect(FEELING_WORDS.find(w => w.word === 'Riled')?.description).toBe('Heated, and hard to settle.')
    expect(FEELING_WORDS.find(w => w.word === 'Wired')?.description).toBe('Buzzing, and on edge.')
  })
  it('no em dashes, no banned words, no diagnose/predict/screen claims', () => {
    const all = JSON.stringify(ROMOOD_COPY) + JSON.stringify(FEELING_WORDS) + JSON.stringify(ROMOOD_SETTINGS_COPY) + JSON.stringify(ROMOOD_PLACEHOLDERS)
    expect(all).not.toMatch(/\u2014/)
    expect(all).not.toMatch(/\b(normal|required|limited|tight|injury|risk|prevent|improve|proven|diagnos\w*|predict\w*|screen\w*)\b/i)
  })
})

describe('ROMood logic', () => {
  it('bubble positions land in their quadrant', () => {
    for (const w of FEELING_WORDS) { const p = positionFor(w); expect(quadrantFor(p.energy, p.pleasantness)).toBe(w.quadrant) }
  })
  it('save gate needs opt-in, sign-in and flag', () => {
    const t = '2026-10-26T22:00:00.000Z'
    expect(shouldSaveMood({ optIn: false, signedIn: true, saveEnabled: true, optedInAt: t })).toBe(false)
    expect(shouldSaveMood({ optIn: true, signedIn: false, saveEnabled: true, optedInAt: t })).toBe(false)
    expect(shouldSaveMood({ optIn: true, signedIn: true, saveEnabled: false, optedInAt: t })).toBe(false)
    expect(shouldSaveMood({ optIn: true, signedIn: true, saveEnabled: true, optedInAt: t })).toBe(true)
  })
  it('opt-in time is REQUIRED: missing, null, empty or junk blocks saving', () => {
    for (const v of [undefined, null, '', 'not a date']) expect(shouldSaveMood({ optIn: true, signedIn: true, saveEnabled: true, optedInAt: v as string | null })).toBe(false)
  })
  it('Q8 switch points', () => { expect([readoutIndex(39), readoutIndex(40), readoutIndex(60), readoutIndex(61)]).toEqual([0, 1, 1, 2]); expect(quadrantFor(50, 50)).toBe('low_unpleasant') })
  it('Q9 decided offer, Q11 default', () => { expect(ROMOOD_TURN_OFF_BEHAVIOR).toBe('offer'); expect('Q9_turnOff' in ROMOOD_PLACEHOLDERS).toBe(false); expect(ROMOOD_PLACEHOLDERS.Q11_skipEventWithUserId).toBe(false) })
  it('Q6 counter shows the real flow count', async () => {
    const { romoodStepCounter } = await import('./romood'); const { STEPS } = await import('../pages/assessmentSteps')
    expect(ROMOOD_PLACEHOLDERS.Q6_stepLabel.counter).toBe('flow')
    expect(romoodStepCounter('flow', 9)).toBe('Step 2 of 11'); expect(romoodStepCounter('3 of 4', 9)).toBe('3 of 4'); expect(romoodStepCounter(null, 9)).toBeNull()
    mount(true); expect(q('romood-counter').textContent).toBe(`Step 2 of ${STEPS.length + 2}`); expect(q('romood-eyebrow').textContent).toBe('Assessment step 2')
  })
  it('save flag defaults OFF', () => {
    expect(romoodSaveEnabled({})).toBe(false)
    expect(romoodSaveEnabled({ VITE_ROMOOD_SAVE: 'on' })).toBe(true)
  })
  it("'mood' keys never go to Meta", () => { expect(META_FORBIDDEN_KEYS.test('mood_word')).toBe(true) })
})

describe('ROMood screen', () => {
  it('opt-in unchecked by default', () => { mount(true); expect((q('romood-optin') as HTMLInputElement).checked).toBe(false) })
  it('Next with box unticked saves nothing', async () => { const nav = mount(true); await click(q('romood-next')); expect(insert).not.toHaveBeenCalled(); expect(nav).toHaveBeenCalledWith('/onboarding/assessment') })
  it('Skip saves nothing even when ticked, and tracks no mood values', async () => {
    const nav = mount(true); await click(q('romood-optin')); await click(q('romood-skip'))
    expect(insert).not.toHaveBeenCalled(); expect(upsert).not.toHaveBeenCalled(); expect(nav).toHaveBeenCalled()
    await act(async () => { await Promise.resolve() })
    expect(eventInsert).not.toHaveBeenCalled() // skip event disabled: live RLS rejects no-id rows (Grant Oct 26)
  })
  it('Next with box ticked but save flag OFF saves nothing', async () => { mount(false); await click(q('romood-optin')); await click(q('romood-next')); expect(insert).not.toHaveBeenCalled() })
  it('Next with box ticked, signed in, flag ON saves one entry', async () => {
    mount(true)
    await click(q('mood-word')); expect(q('mood-picker')).toBeTruthy()
    const calm = [...q('mood-picker').querySelectorAll('button')].find(b => b.textContent === 'Calm')!
    await click(calm); expect(q('romood-description').textContent).toContain('Steady and unruffled.')
    await click(q('romood-optin')); await click(q('romood-next'))
    expect(insert).toHaveBeenCalledTimes(1)
    expect(insert.mock.calls[0][0]).toMatchObject({ user_id: 'u1', word: 'Calm', quadrant: 'low_pleasant', context: 'onboarding', opted_in: true })
    const tick = insert.mock.calls[0][0].opted_in_at as string
    expect(upsert.mock.calls[0][0]).toMatchObject({ user_id: 'u1', saving_on: true, opted_in_at: tick })
  })
  it('opt-in time is the real tick time, not the Next time', async () => {
    vi.useFakeTimers({ toFake: ['Date'] }); vi.setSystemTime(new Date('2026-10-26T22:00:00Z'))
    mount(true); await click(q('romood-optin'))
    vi.setSystemTime(new Date('2026-10-26T22:03:00Z')); await click(q('romood-next'))
    vi.useRealTimers()
    expect(insert.mock.calls[0][0].opted_in_at).toBe('2026-10-26T22:00:00.000Z')
  })
  it('saveMoodEntry refuses without a real tick time (no now() fallback)', async () => {
    expect((await saveMoodEntry('u1', { energy: 50, pleasantness: 50, word: null, optedInAt: '' })).ok).toBe(false)
    expect(insert).not.toHaveBeenCalled()
  })
  it('shows the locked lead-in and the Q3 placeholder', () => {
    mount(true)
    expect(q('romood-question').textContent).toBe('How are you feeling right now?')
    expect(q('romood-nutrition').textContent).toBe(ROMOOD_PLACEHOLDERS.Q3_nutritionLine)
    expect(q('mood-input').getAttribute('data-visual')).toBe('dial')
  })
  it('signed out: never saves', async () => { mockSession = null; mount(true); await click(q('romood-optin')); await click(q('romood-next')); expect(insert).not.toHaveBeenCalled() })
})

describe('mood_entries migration', () => {
  const sql = readFileSync(resolve(__dirname, '../../../supabase/migrations/20261026220000_romood_mood_entries.sql'), 'utf8')
  it('own table, RLS, opt-in enforced, delete allowed, no update', () => {
    expect(sql).toMatch(/enable row level security/)
    expect(sql).toMatch(/check \(opted_in = true\)/)
    expect(sql).toMatch(/for delete to authenticated/)
    expect(sql).not.toMatch(/for update/)
    expect(sql).not.toMatch(/assessments?\s*\(/i)
  })
  it('grants: authenticated is stripped first, then gets only select, insert, delete (no TRUNCATE, no UPDATE)', () => {
    const rev = sql.indexOf('revoke all on public.mood_entries from authenticated;')
    const grant = sql.indexOf('grant select, insert, delete on public.mood_entries to authenticated;')
    expect(rev).toBeGreaterThan(-1)
    expect(grant).toBeGreaterThan(rev)
    expect(sql).toContain('revoke all on public.mood_entries from anon;')
    expect(sql.match(/^grant .*$/gm)).toEqual(['grant select, insert, delete on public.mood_entries to authenticated;'])
    expect(sql.replace(/--.*$/gm, '')).not.toMatch(/grant[^;]*(truncate|update|all)/i)
  })
})

describe('ROMood placement', () => {
  it('Start after the intro video goes to the mood check, then mood Next goes to measure', async () => {
    const setPhase = vi.fn()
    const base = { stepIdx: 0, values: {}, email: '', fullName: '', loading: false, error: '', setPhase, setStepIdx: vi.fn(), setEmail: vi.fn(), setFullName: vi.fn(), handleChange: vi.fn(), handleNext: vi.fn(), handleLeadSubmit: vi.fn() }
    act(() => root.render(createElement(MemoryRouter, null, createElement(AssessmentPhases, { ...base, phase: 'setup' }))))
    const start = [...host.querySelectorAll('button')].find(b => /Start assessment/.test(b.textContent ?? ''))!
    await click(start); expect(setPhase).toHaveBeenCalledWith('mood')
    await act(async () => { root.render(createElement(MemoryRouter, null, createElement(AssessmentPhases, { ...base, phase: 'mood' }))) })
    for (let i = 0; i < 20 && !q('romood-screen'); i++) await act(async () => { await new Promise(r => setTimeout(r, 10)) })
    expect(q('romood-screen')).toBeTruthy()
    await click(q('romood-next')); expect(setPhase).toHaveBeenLastCalledWith('measure')
  })
})

describe('Settings > ROMood check-ins', () => {
  const mountS = (saveEnabled: boolean, turnOffBehavior?: 'offer' | 'auto') =>
    act(() => root.render(createElement(MoodSettings, { userId: 'u1', saveEnabled, turnOffBehavior })))
  const flush = () => act(async () => { await Promise.resolve(); await Promise.resolve() })
  it('hidden while the save flag is OFF', () => { mountS(false); expect(q('mood-settings')).toBeNull() })
  it('delete asks to confirm, cancel deletes nothing, confirm deletes own rows', async () => {
    mountS(true); await flush()
    await click(q('mood-delete')); expect(q('mood-dialog').textContent).toContain(ROMOOD_SETTINGS_COPY.deleteConfirm)
    await click(q('mood-dialog-no')); expect(del).not.toHaveBeenCalled()
    await click(q('mood-delete')); await click(q('mood-dialog-yes'))
    expect(del).toHaveBeenCalledWith('user_id', 'u1'); expect(q('mood-msg').textContent).toBe(ROMOOD_SETTINGS_COPY.deleted)
  })
  it('turning saving off offers delete (Q9 offer) and does not auto-delete', async () => {
    settingsRow = { saving_on: true, opted_in_at: '2026-10-26T22:00:00Z', consent_version: ROMOOD_CONSENT_VERSION }
    mountS(true); await flush()
    expect(q('mood-saving-state').textContent).toBe(ROMOOD_SETTINGS_COPY.savingOn)
    await click(q('mood-toggle')); await flush()
    expect(upsert.mock.calls[0][0]).toMatchObject({ user_id: 'u1', saving_on: false })
    expect(del).not.toHaveBeenCalled(); expect(q('mood-dialog').textContent).toContain(ROMOOD_SETTINGS_COPY.offerDelete)
    await click(q('mood-dialog-no')); expect(del).not.toHaveBeenCalled()
  })
  it('turning saving ON shows full opt-in text, Privacy link and an UNTICKED box; records real tick time only after ticking', async () => {
    mountS(true); await flush()
    await click(q('mood-toggle')); await flush()
    expect(upsert).not.toHaveBeenCalled()
    const panel = q('mood-optin-panel')
    expect(panel.textContent).toBe(ROMOOD_COPY.optInBefore + ROMOOD_COPY.optInLink + ROMOOD_COPY.optInAfter + ROMOOD_SETTINGS_COPY.turnOn + ROMOOD_SETTINGS_COPY.cancel)
    expect(q('mood-settings-privacy').getAttribute('href')).toBe('/legal#privacy')
    const box = q('mood-settings-optin') as HTMLInputElement; expect(box.checked).toBe(false)
    expect((q('mood-optin-confirm') as HTMLButtonElement).disabled).toBe(true)
    await click(q('mood-optin-confirm')); expect(upsert).not.toHaveBeenCalled()
    const before = Date.now(); await click(box); const after = Date.now()
    await click(q('mood-optin-confirm')); await flush()
    const row = upsert.mock.calls[0][0] as { saving_on: boolean; opted_in_at: string }
    expect(row.saving_on).toBe(true)
    const at = Date.parse(row.opted_in_at); expect(at).toBeGreaterThanOrEqual(before); expect(at).toBeLessThanOrEqual(after)
    expect(q('mood-saving-state').textContent).toBe(ROMOOD_SETTINGS_COPY.savingOn)
  })
  it('cancelling the opt-in panel records nothing', async () => {
    mountS(true); await flush(); await click(q('mood-toggle')); await click(q('mood-optin-cancel'))
    expect(upsert).not.toHaveBeenCalled(); expect(q('mood-optin-panel')).toBeNull()
  })
  it("Q9 'auto' deletes on turn-off", async () => {
    settingsRow = { saving_on: true, opted_in_at: '2026-10-26T22:00:00Z', consent_version: ROMOOD_CONSENT_VERSION }
    mountS(true, 'auto'); await flush(); await click(q('mood-toggle')); await flush()
    expect(del).toHaveBeenCalledWith('user_id', 'u1')
  })
})

describe('mood_settings migration', () => {
  const sql = readFileSync(resolve(__dirname, '../../../supabase/migrations/20261026230000_romood_mood_settings.sql'), 'utf8')
  it('no now() default on opt-in time; inserts need saving_on; RLS on', () => {
    expect(sql).toMatch(/opted_in_at\s+timestamptz,/)
    expect(sql).not.toMatch(/^\s*opted_in_at\s+timestamptz[^\n]*default/m)
    expect(sql).toMatch(/s\.saving_on = true/)
    expect(sql).toMatch(/enable row level security/)
    expect(sql).toMatch(/on delete cascade/)
  })
  it('grants: authenticated is stripped first, then gets only select, insert, update (no TRUNCATE, no DELETE)', () => {
    const rev = sql.indexOf('revoke all on public.mood_settings from authenticated;')
    const grant = sql.indexOf('grant select, insert, update on public.mood_settings to authenticated;')
    expect(rev).toBeGreaterThan(-1)
    expect(grant).toBeGreaterThan(rev)
    expect(sql).toContain('revoke all on public.mood_settings from anon;')
    expect(sql.match(/^grant .*$/gm)).toEqual(['grant select, insert, update on public.mood_settings to authenticated;'])
    expect(sql.replace(/--.*$/gm, '')).not.toMatch(/grant[^;]*(truncate|delete|all)/i)
  })
  it('updated_at trigger: BEFORE UPDATE, sets now(), pins search_path, not callable by app roles; revert drops it', () => {
    expect(sql).toMatch(/updated_at\s+timestamptz not null default now\(\)/)
    const fn = sql.slice(sql.indexOf('create or replace function public.romood_touch_updated_at'), sql.indexOf('revoke all on function public.romood_touch_updated_at'))
    expect(fn).toContain('set search_path = pg_catalog, pg_temp')
    expect(fn).toContain('new.updated_at := now();')
    expect(fn).toContain('return new;')
    expect(sql).toContain('revoke all on function public.romood_touch_updated_at() from public, anon, authenticated;')
    expect(sql).toMatch(/create trigger mood_settings_touch_updated_at\s+before update on public\.mood_settings\s+for each row execute function public\.romood_touch_updated_at\(\);/)
    for (const rel of ['../../../supabase/reverts/20261026230000_romood_mood_settings.revert.sql', '../../../supabase/migrations/20261026230000_romood_mood_settings.revert.sql.txt']) {
      const r = readFileSync(resolve(__dirname, rel), 'utf8')
      expect(r).toContain('drop table if exists public.mood_settings;')
      expect(r).toContain('drop function if exists public.romood_touch_updated_at();')
      expect(r.indexOf('drop function if exists public.romood_touch_updated_at();')).toBeGreaterThan(r.indexOf('drop table if exists public.mood_settings;'))
    }
  })
  it('reverts README lists the 5 reverts in migration order and the run order 5, 4, 3, 2, 1', () => {
    const readme = readFileSync(resolve(__dirname, '../../../supabase/reverts/README.md'), 'utf8')
    expect(readme).toContain('**5, 4, 3, 2, 1**')
    for (const [n, f] of [[1, '20261026220000_romood_mood_entries'], [2, '20261026230000_romood_mood_settings'], [3, '20261026233000_romood_retention'], [4, '20261027000000_romood_daily_cap'], [5, '20261027010000_romood_insert_requires_v2_consent']] as const) {
      expect(readme).toContain(`| ${n}. ${f}.sql | ${f}.revert.sql |`)
      expect(existsSync(resolve(__dirname, `../../../supabase/reverts/${f}.revert.sql`))).toBe(true)
    }
  })
  it('PUSH-PLAN deploys migrations from the frontend repo, not the backend repo', () => {
    const plan = readFileSync(resolve(__dirname, '../../../PUSH-PLAN.md'), 'utf8')
    expect(plan).toContain('Apply migrations 1, 2, 3, 4, 5 in order, from /workspace/romood-daily/supabase/migrations')
    expect(plan).toContain('NOT from the backend repo')
  })
  it('PUSH-PLAN pins backend 5af19bf and runs the bundled order with switches on', () => {
    const plan = readFileSync(resolve(__dirname, '../../../PUSH-PLAN.md'), 'utf8')
    expect(plan).toContain('(exactly 5af19bf, expect 7 deno tests)')
    expect(plan).toContain('at exactly 5af19bf')
    expect(plan).not.toContain('Not tested against real Postgres')
    expect(plan).toContain('ROMOOD-SCHEMACOPY-RETEST-3d08ba7-20261027.md, 147/147')
    const order = ['Apply migrations 1, 2, 3, 4, 5', 'Deploy ONLY the submit-assessment', 'PROD-TRUNCATE-GRANTS-FIX-20261027.sql', 'VITE_ROMOOD_SAVE=on in the production build env', 'ROMOOD_EMAIL_MOOD=on', 'DROP ROLE cli_login_postgres']
    const idx = order.map((o) => plan.indexOf(o))
    idx.forEach((i) => expect(i).toBeGreaterThan(-1))
    expect([...idx].sort((a, b) => a - b)).toEqual(idx)
    expect(plan).toContain('PROD-TRUNCATE-GRANTS-REVERT-20261027.sql')
    expect(plan).not.toMatch(/\u2014/)
  })
  it('PUSH-PLAN applies Vera R1 to R6: switches off first, view-only draft, merge then role drop via MCP', () => {
    const plan = readFileSync(resolve(__dirname, '../../../PUSH-PLAN.md'), 'utf8')
    const rb = plan.slice(plan.indexOf('## Rollback'))
    expect(rb.indexOf('supabase secrets unset ROMOOD_EMAIL_MOOD')).toBeLessThan(rb.indexOf('unset VITE_ROMOOD_SAVE'))
    expect(rb).toContain('Keep the tables and the mood rows: no drop, no delete.')
    expect(rb).toContain("needs Jim's own typed OK")
    expect(plan).toContain('He saves NO mood, and no prod accounts are created. Cleanup: none.')
    expect(plan).toContain('Pair under review: **b830fa6/5af19bf**')
    expect(plan).not.toContain('Code head **c8412bb**')
    const merge = plan.indexOf('7. Merge the two romood branches to main')
    expect(merge).toBeGreaterThan(plan.indexOf('ROMOOD_EMAIL_MOOD=on'))
    expect(plan.indexOf("Supabase MCP execute_sql")).toBeGreaterThan(merge)
    expect(plan).toContain("select count(*) from pg_roles where rolname='cli_login_postgres'")
    expect(plan).toContain('stacy-romood-live-gate-20261027.md')
    expect(plan).toContain('quinn-signoff-romood-5ad2c1c-b382db9.md')
  })

  it('PUSH-PLAN applies Vera d9bbb11 fixes: expected role-drop denial, gates refreshed, no duplicates', () => {
    const plan = readFileSync(resolve(__dirname, '../../../PUSH-PLAN.md'), 'utf8')
    expect(plan).toContain('that is EXPECTED: stop and report, and try no workaround')
    expect(plan.split('Jim confirms the Netlify credit balance as part of his packaged yes.').length).toBe(3)
    expect(plan).toContain('RESEND-TRACKING-RECHECK-20261027-0802.txt')
    expect(plan).not.toContain('now cover migrations 1 to 5')
    expect(plan).not.toContain('nothing over its limit')
    expect(plan).not.toContain('Resend: Resend:')
    expect(plan.split('credits to Grant and Jim.').length).toBe(2)
  })
  it('PUSH-PLAN repins 6b78eca and lists the T14 site deploys with IDs from local files', () => {
    const plan = readFileSync(resolve(__dirname, '../../../PUSH-PLAN.md'), 'utf8')
    expect(plan).toContain('whose parent chain contains 6b78eca')
    expect(plan).toContain('Push the romood, romrxbjj and romrxbodybuilding branches to GitHub as new branches only')
    for (const m of ['feat/romood-daily-email at exactly 5af19bf', 'feat/pack-date-feb15-1026 at exactly 78249bf', 'feat/pack-date-feb15-1026 at exactly ac1c045', 'https://github.com/ESSENTIALS-ppl/romrx-bjj-web.git', 'https://github.com/ESSENTIALS-ppl/romrx-bodybuilding-web.git', 'NEVER merged to main', 'abort if HEAD differs']) expect(plan).toContain(m)
    expect(plan).toContain('exactly 5af19bf')
    for (const id of ['d9bc6384-fc26-44fb-a51d-32aa8f28dd7b', '29117887-e0e0-4f7d-8758-4a59503c8ad7', '9e59d255-74d0-4da5-a888-e1d70479b795', '78249bf', 'ac1c045']) expect(plan).toContain(id)
    expect(plan).not.toContain('06567695-4772-4025-b029-a04d838ae767')
    expect(plan).toContain('3 publishes, about 45 credits')
    expect(plan).toContain('incomparable-pastelito-849104')
    expect(plan).toContain('about 15 per publish')
    expect(plan).toContain('STOP and report on any failure')
    expect(plan).not.toMatch(/\u2014/)
    expect(plan).not.toMatch(/limited/i)
  })
})

describe('Input B: ROMeter dial', () => {
  it('dial is a keyboard slider with screen-reader values; bar has values too', async () => {
    mount(true)
    const dial = q('mood-dial')
    expect(dial.getAttribute('role')).toBe('slider'); expect(dial.getAttribute('tabindex')).toBe('0')
    expect(dial.getAttribute('aria-valuenow')).toBe('50')
    await act(async () => { dial.dispatchEvent(new KeyboardEvent('keydown', { key: 'End', bubbles: true })) })
    expect(dial.getAttribute('aria-valuenow')).toBe('100'); expect(dial.getAttribute('aria-valuetext')).toBe('Energy: Leaning high')
    await act(async () => { dial.dispatchEvent(new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true })) })
    expect(dial.getAttribute('aria-valuenow')).toBe('90')
    expect(q('mood-bar').getAttribute('aria-valuetext')).toBe('Pleasantness: In the middle')
  })
  it('caption and word sit outside the SVG, so the needle cannot cover them', () => {
    mount(true)
    expect(q('mood-dial').contains(q('mood-energy-caption'))).toBe(false)
    expect(q('mood-dial').contains(q('mood-word'))).toBe(false)
  })
  it('dragged-only check-in stores word null, energy/pleasantness 0-100', async () => {
    mount(true)
    await act(async () => { q('mood-dial').dispatchEvent(new KeyboardEvent('keydown', { key: 'Home', bubbles: true })) })
    await click(q('romood-optin')); await click(q('romood-next'))
    expect(insert.mock.calls[0][0]).toMatchObject({ energy: 0, pleasantness: 50, word: null })
  })
  it('needle geometry and pointer mapping', () => {
    expect(energyFromPoint(30, 150)).toBe(0); expect(energyFromPoint(270, 150)).toBe(100); expect(energyFromPoint(150, 30)).toBe(50)
    expect(needlePoint(50).x).toBeCloseTo(150)
  })
  it('Q5 placeholder is the dial line', () => { expect(ROMOOD_PLACEHOLDERS.Q5_instruction).toBe('Drag the needle for energy. Slide the bar for how you feel. Tap the word to change it.') })
})

describe('Retention and Dailee link', () => {
  it('retention default until_delete; cutoffs for other modes', () => {
    expect(ROMOOD_PLACEHOLDERS.retention).toBe('until_delete')
    const now = new Date('2026-10-26T00:00:00Z')
    expect(retentionCutoff('until_delete', now)).toBeNull()
    expect(retentionCutoff('12_months', now)?.toISOString()).toBe('2025-10-26T00:00:00.000Z')
    expect(retentionCutoff('rolling_12_weeks', now)?.toISOString()).toBe('2026-08-03T00:00:00.000Z')
  })
  it('Dailee link OFF by default even with saving on', () => {
    expect(romoodDaileeLinkEnabled({ saveEnabled: true })).toBe(false)
    expect(romoodDaileeLinkEnabled({ saveEnabled: false, daileeFlag: true })).toBe(false)
  })
})

describe('ROMood plain words (no clinical terms)', () => {
  const BANNED = /\b(depress\w*|anxious|anxiety|panic\w*|stress\w*|burn-?out|mental health|well-?being|mood disorder|disorder\w*|symptom\w*|sad|gloomy|upset|psycholog\w*|clinical|therap\w*|diagnos\w*|condition\w*)\b/i
  const collect = (v: unknown): string[] => typeof v === 'string' ? [v] : v && typeof v === 'object' ? Object.values(v).flatMap(collect) : []
  it('no banned term in any ROMood copy, word, description or readout', () => {
    const all = [...collect(ROMOOD_COPY), ...collect(ROMOOD_PLACEHOLDERS), ...collect(ROMOOD_SETTINGS_COPY), ...collect(RETENTION_LINES), ...collect(ROMOOD_MYBODY_COPY), ...FEELING_WORDS.flatMap(w => [w.word, w.description])]
    const hits = all.filter(s => BANNED.test(s)); expect(hits).toEqual([])
    expect(FEELING_WORDS).toHaveLength(16)
  })
  it('no banned term in rendered screen or screen-reader labels', () => {
    mount(true)
    const aria = [...host.querySelectorAll('[aria-label],[aria-valuetext]')].map(e => (e.getAttribute('aria-label') ?? '') + ' ' + (e.getAttribute('aria-valuetext') ?? ''))
    expect([host.textContent ?? '', ...aria].filter(s => BANNED.test(s))).toEqual([])
  })
  it('DB word check list matches the app words', async () => {
    const fs = await import('node:fs'); const sql = fs.readFileSync(__dirname + '/../../../supabase/migrations/20261026220000_romood_mood_entries.sql', 'utf8')
    for (const w of FEELING_WORDS) expect(sql).toContain(`'${w.word}'`)
    expect(BANNED.test(sql.replace(/--.*$/gm, ''))).toBe(false)
  })
})

describe('whole-flow counter on measure screens (Jim 8:10 PM)', () => {
  it('source shows Step n+2 of STEPS.length + 2', async () => {
    const fs = await import('node:fs'); const path = await import('node:path')
    const src = fs.readFileSync(path.resolve(__dirname, '../pages/AssessmentMeasureScreen.tsx'), 'utf8')
    expect(src).toContain('Step {stepIdx + 1 + STEPS_BEFORE_MEASURE} of {totalMeasureSteps + STEPS_BEFORE_MEASURE}')
    expect(src).toContain('const STEPS_BEFORE_MEASURE = 2')
    expect(src).not.toMatch(/\{stepIdx \+ 1\} \/ \{totalMeasureSteps\}/)
    const { STEPS } = await import('../pages/assessmentSteps'); expect(STEPS.length + 2).toBe(11)
  })
})
