// @vitest-environment jsdom
// P1-17 day 3 ROMBot check-in, client side: contract match with Avery's rombot-checkin (3076398b), Stacy's words, the
// button, the unread dot, the Today card, the ROMBot page open/read path and the generic error line.
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom'
import { createHash } from 'node:crypto'
import { existsSync, readFileSync } from 'node:fs'

type Row = Record<string, unknown>
const db: { conv: Row | null; msgs: Row[]; convErr: unknown; msgErr: unknown; latest: Row | null } = { conv: null, msgs: [], convErr: null, msgErr: null, latest: null }
const calls: { table: string; op: string; args: unknown[] }[] = []
function builder(table: string) {
  const state: { filters: [string, unknown][]; single: boolean } = { filters: [], single: false }
  const b: Record<string, unknown> = {}
  const chain = (op: string) => (...args: unknown[]) => { calls.push({ table, op, args }); if (op === 'eq') state.filters.push([args[0] as string, args[1]]); if (op === 'maybeSingle') state.single = true; return b }
  for (const op of ['select', 'eq', 'order', 'limit', 'maybeSingle', 'insert', 'update', 'upsert', 'delete']) b[op] = chain(op)
  b.then = (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => {
    let out: unknown
    if (table === 'ai_conversations') {
      const isCheckinQuery = state.filters.some(([k]) => k === 'context_snapshot->>kind')
      out = isCheckinQuery ? { data: db.conv, error: db.convErr } : { data: db.latest, error: null }
    } else if (table === 'ai_messages') {
      const asc = calls.filter(c => c.table === 'ai_messages' && c.op === 'order').slice(-1)[0]?.args[1] as { ascending: boolean } | undefined
      out = asc?.ascending === false ? { data: db.msgErr ? null : [...db.msgs].reverse(), error: db.msgErr } : { data: db.msgs, error: null }
    } else out = { data: null, error: null }
    return Promise.resolve(out).then(res, rej)
  }
  return b
}
vi.mock('../lib/supabase', () => ({ supabase: { from: (t: string) => builder(t) } }))
const track = vi.fn()
vi.mock('../lib/track', () => ({ track: (...a: unknown[]) => track(...a), trackPageView: () => {} }))
const USER = { id: '11111111-1111-4111-8111-111111111111' }
vi.mock('../hooks/useAuth', () => ({ useAuth: () => ({ user: USER, session: { access_token: 't' }, signOut: async () => {} }) }))
vi.mock('../hooks/useProfile', () => ({ useProfile: () => ({ profile: { full_name: 'Sam Lee', age_bucket: '30-39' }, loading: false }) }))

import { RombotCheckinCard, RombotUnreadDot } from './RombotCheckin'
import { ROMBot } from '../pages/ROMBot'
import { useRombotCheckin } from '../hooks/useRombotCheckin'
import { CHECKIN_BUTTON_LABELS, CHECKIN_LOAD_ERROR, CHECKIN_PATH, buildCheckin, markCheckinRead, parseSnapshot, readKey } from '../lib/rombotCheckin'

// Rendered samples from Avery's RENDERED-SAMPLES-3076398b.txt (server output = Stacy's words, filled in).
const NOTE_A = "Hey Sam, ROMBot here. It's been 3 days since your assessment, and your plan is ready. Today's focus is your hips. It's short, and you can do it now. Want to start?\nIf something got in the way, tell me here and I'll help you find an easier way in."
const LINE1_A = NOTE_A.split('\n')[0]
const NOTE_C = "Sam, 4 sessions since your assessment. That's a great start. Keep it steady, not perfect. Your next check is Friday, Nov 20. That's when you measure again and see where you are.\nIf any move doesn't feel right, tell me here."
const CONV = 'cccccccc-0000-4000-8000-000000000001'
const snap = (branch: 'A' | 'B' | 'C', label = CHECKIN_BUTTON_LABELS[branch], path = CHECKIN_PATH) =>
  ({ kind: 'checkin_d3', branch, assessment_id: 'aaaaaaaa-0000-4000-8000-000000000001', button: { label, path } })
function seed(branch: 'A' | 'B' | 'C' = 'A', note = NOTE_A, extra: Row[] = []) {
  db.conv = { id: CONV, created_at: '2026-11-16T14:30:00Z', provider: 'rombot', sport: 'base', context_snapshot: snap(branch) }
  db.msgs = [{ role: 'assistant', content: note, created_at: '2026-11-16T14:30:00Z' }, ...extra]
}

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true
Element.prototype.scrollIntoView = function () {}
let root: Root | null = null; let host: HTMLDivElement
let where = ''
function Where() { where = useLocation().pathname + useLocation().search; return null }
beforeEach(() => { db.conv = null; db.msgs = []; db.convErr = null; db.msgErr = null; db.latest = null; calls.length = 0; track.mockClear(); localStorage.clear() })
afterEach(() => { act(() => root?.unmount()); root = null; host?.remove() })
async function mount(el: ReturnType<typeof createElement>, at = '/dashboard/my-protocol') {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  await act(async () => { root!.render(createElement(MemoryRouter, { initialEntries: [at] }, createElement(Where), createElement(Routes, null, createElement(Route, { path: '*', element: el })))) })
  for (let i = 0; i < 4; i++) await act(async () => {})
}
const q = (id: string) => host.querySelector(`[data-testid="${id}"]`) as HTMLElement | null

function DotHarness() { const { unread } = useRombotCheckin(USER.id); return createElement('span', null, createElement(RombotUnreadDot, { show: unread })) }

describe('P1-17 contract (Avery rombot-checkin 3076398b)', () => {
  it('button comes from context_snapshot.button with Stacy label and the server path only', () => {
    expect(CHECKIN_PATH).toBe('/dashboard/my-protocol?src=checkin-d3')
    expect(parseSnapshot(snap('A'))!.button).toEqual({ label: "Start today's session", path: CHECKIN_PATH })
    expect(parseSnapshot(snap('B'))!.button).toEqual({ label: "Start today's session", path: CHECKIN_PATH })
    expect(parseSnapshot(snap('C'))!.button).toEqual({ label: 'See my plan', path: CHECKIN_PATH })
    expect(parseSnapshot(snap('A', 'Click here'))!.button).toBeNull()          // not Stacy's words
    expect(parseSnapshot(snap('C', "Start today's session"))!.button).toBeNull() // wrong branch label
    expect(parseSnapshot(snap('A', undefined, 'https://evil.example/'))!.button).toBeNull()
    expect(parseSnapshot({ ...snap('A'), kind: 'other' })).toBeNull()
    expect(parseSnapshot({ ...snap('A'), branch: 'D' })).toBeNull()
  })
  it('only provider rombot + sport base conversations count; line 1 is the note before the newline', () => {
    const msgs = [{ role: 'assistant', content: NOTE_A }]
    expect(buildCheckin({ id: CONV, provider: 'rombot', sport: 'base', context_snapshot: snap('A') }, msgs)!.line1).toBe(LINE1_A)
    expect(buildCheckin({ id: CONV, provider: 'grok', sport: 'base', context_snapshot: snap('A') }, msgs)).toBeNull()
    expect(buildCheckin({ id: CONV, provider: 'rombot', sport: 'bjj', context_snapshot: snap('A') }, msgs)).toBeNull()
    expect(buildCheckin({ id: CONV, provider: 'rombot', sport: 'base', context_snapshot: snap('A') }, [])).toBeNull()
  })
  it('reads only the user own rows with the contract filters and never writes ai_conversations or ai_messages', async () => {
    seed()
    await mount(createElement(RombotCheckinCard, { userId: USER.id }))
    const conv = calls.filter(c => c.table === 'ai_conversations' && c.op === 'eq').map(c => c.args)
    expect(conv).toEqual(expect.arrayContaining([['user_id', USER.id], ['provider', 'rombot'], ['context_snapshot->>kind', 'checkin_d3']]))
    expect(calls.some(c => c.table === 'ai_messages' && c.op === 'eq' && c.args[0] === 'conversation_id' && c.args[1] === CONV)).toBe(true)
    expect(calls.filter(c => /^(insert|update|upsert|delete)$/.test(c.op) && /^ai_/.test(c.table))).toEqual([])
  })
})

describe('P1-17 Stacy words', () => {
  it('button labels are Stacy final copy byte for byte; no "Jim\'s ROMBot"', () => {
    expect(CHECKIN_BUTTON_LABELS).toEqual({ A: "Start today's session", B: "Start today's session", C: 'See my plan' })
    const src = readFileSync(__dirname + '/RombotCheckin.tsx', 'utf8') + readFileSync(__dirname + '/../lib/rombotCheckin.ts', 'utf8')
    expect(src).not.toMatch(/Jim's ROMBot/)
    expect(src).not.toMatch(/[\u2014\u2013]/)
    expect(CHECKIN_LOAD_ERROR).toBe('Something went wrong. Please try again.')
    expect(readFileSync(__dirname + '/../pages/Settings.tsx', 'utf8')).toContain(CHECKIN_LOAD_ERROR) // existing string, not new
  })
  const f = process.env.STACY_WORDS_FILE
  it.skipIf(!f || !existsSync(f))('labels match Stacy file 6fd272b6 (STACY_WORDS_FILE set)', () => {
    const raw = readFileSync(f!)
    expect(createHash('sha256').update(raw).digest('hex').startsWith('6fd272b6')).toBe(true)
    const t = raw.toString('utf8')
    for (const l of new Set(Object.values(CHECKIN_BUTTON_LABELS))) expect(t).toContain(`[${l}]`)
    expect(t).toContain(LINE1_A.replace('Sam', '{first_name}').replace('hips', '{today_area}'))
  })
})

describe('P1-17 Today card', () => {
  it('unread check-in: card shows ROMBot + Stacy line 1 + Stacy button; line 3 stays in the chat', async () => {
    seed()
    await mount(createElement(RombotCheckinCard, { userId: USER.id }))
    expect(q('rombot-checkin-card')).toBeTruthy()
    expect(q('rombot-checkin-line1')!.textContent).toBe(LINE1_A)
    expect(q('rombot-checkin-button')!.textContent).toBe("Start today's session")
    expect(q('rombot-checkin-open')!.getAttribute('href')).toBe('/dashboard/rombot')
    expect(q('rombot-unread-dot')).toBeTruthy()
    expect(host.textContent).not.toContain('If something got in the way')
    expect(host.textContent).not.toContain('left you a note')
  })
  it('branch C shows "See my plan"', async () => {
    seed('C', NOTE_C)
    await mount(createElement(RombotCheckinCard, { userId: USER.id }))
    expect(q('rombot-checkin-button')!.textContent).toBe('See my plan')
    expect(q('rombot-checkin-card')!.getAttribute('data-branch')).toBe('C')
  })
  it('button: marks read, fires today_session_started {source: rombot_checkin}, opens the server path, card goes away', async () => {
    seed()
    await mount(createElement(RombotCheckinCard, { userId: USER.id }), '/dashboard/my-protocol')
    await act(async () => { q('rombot-checkin-button')!.click() })
    expect(track).toHaveBeenCalledWith('today_session_started', { source: 'rombot_checkin', branch: 'A' })
    expect(where).toBe(CHECKIN_PATH)
    expect(JSON.parse(localStorage.getItem(readKey(USER.id))!)).toEqual([CONV])
    expect(q('rombot-checkin-card')).toBeNull()
  })
  it('no check-in, already read, or replied: no card', async () => {
    await mount(createElement(RombotCheckinCard, { userId: USER.id }))
    expect(q('rombot-checkin-card')).toBeNull()
    act(() => root?.unmount()); host.remove()
    seed(); localStorage.setItem(readKey(USER.id), JSON.stringify([CONV]))
    await mount(createElement(RombotCheckinCard, { userId: USER.id }))
    expect(q('rombot-checkin-card')).toBeNull()
    act(() => root?.unmount()); host.remove(); localStorage.clear()
    seed('A', NOTE_A, [{ role: 'user', content: 'too easy', created_at: '2026-11-16T15:00:00Z' }])
    await mount(createElement(RombotCheckinCard, { userId: USER.id }))
    expect(q('rombot-checkin-card')).toBeNull()
  })
  it('read error: fails quiet (no card, no error text)', async () => {
    seed(); db.convErr = { code: '500' }
    await mount(createElement(RombotCheckinCard, { userId: USER.id }))
    expect(q('rombot-checkin-card')).toBeNull()
    expect(host.textContent).toBe('')
  })
  it('off-contract button: card still shows line 1 but no button', async () => {
    seed(); (db.conv as Row).context_snapshot = snap('A', 'Go now')
    await mount(createElement(RombotCheckinCard, { userId: USER.id }))
    expect(q('rombot-checkin-line1')).toBeTruthy()
    expect(q('rombot-checkin-button')).toBeNull()
  })
})

describe('P1-17 unread dot', () => {
  it('appears while unread and clears when the note is marked read anywhere', async () => {
    seed()
    await mount(createElement(DotHarness))
    expect(q('rombot-unread-dot')).toBeTruthy()
    expect(q('rombot-unread-dot')!.getAttribute('aria-hidden')).toBe('true')
    await act(async () => { markCheckinRead(USER.id, CONV) })
    expect(q('rombot-unread-dot')).toBeNull()
  })
  it('no dot without a check-in', async () => {
    await mount(createElement(DotHarness))
    expect(q('rombot-unread-dot')).toBeNull()
  })
})

describe('P1-17 ROMBot page', () => {
  it('unread check-in opens first, shows the note with its button, fires rombot_checkin_opened once and marks read', async () => {
    seed()
    db.latest = { id: 'other', updated_at: '2026-11-16T15:00:00Z' }
    await mount(createElement(ROMBot), '/dashboard/rombot')
    expect(host.textContent).toContain(LINE1_A)
    expect(host.textContent).toContain("If something got in the way, tell me here and I'll help you find an easier way in.")
    expect(q('rombot-checkin-button')!.textContent).toBe("Start today's session")
    expect(track).toHaveBeenCalledWith('rombot_checkin_opened', { branch: 'A' })
    expect(track.mock.calls.filter(c => c[0] === 'rombot_checkin_opened')).toHaveLength(1)
    expect(JSON.parse(localStorage.getItem(readKey(USER.id))!)).toEqual([CONV])
    expect(calls.filter(c => /^(insert|update|upsert|delete)$/.test(c.op))).toEqual([])
  })
  it('error path: the check-in chat cannot be loaded, so the existing generic line shows and nothing is marked read', async () => {
    seed(); db.msgErr = { code: '500' }
    // msgErr hits only the page's chat read (descending); the check-in loader (ascending) still succeeds
    await mount(createElement(ROMBot), '/dashboard/rombot')
    expect(host.textContent).toContain('Something went wrong. Please try again.')
    expect(localStorage.getItem(readKey(USER.id))).toBeNull()
    expect(track).not.toHaveBeenCalledWith('rombot_checkin_opened', expect.anything())
  })
  it('read check-in that is not the latest chat: page restores the latest chat as before, no button', async () => {
    seed(); localStorage.setItem(readKey(USER.id), JSON.stringify([CONV]))
    db.latest = { id: 'other', updated_at: '2026-11-16T15:00:00Z' }
    await mount(createElement(ROMBot), '/dashboard/rombot')
    expect(q('rombot-checkin-button')).toBeNull()
    expect(track).not.toHaveBeenCalled()
  })
})
