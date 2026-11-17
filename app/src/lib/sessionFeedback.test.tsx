// @vitest-environment jsdom
/** P1-18: "How did that feel?" after a finished session, plus a short optional survey. Flag OFF by default. */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { readFileSync, existsSync } from 'node:fs'
import { createHash } from 'node:crypto'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('./track', () => ({ track: () => {}, trackPageView: () => {} }))
vi.mock('./supabase', () => ({ supabase: { from: () => { throw new Error('live client must not be used in tests') } } }))
import { SessionFeel } from '../components/SessionFeel'
import {
  SHOW_SESSION_FEEDBACK, P1_18_WORDS, SESSION_FEEDBACK_TABLE, buildFeedbackRow, feelDoneKey, isAlreadySent, NOTE_MAX,
} from './sessionFeedback'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const UID = '11111111-1111-4111-8111-111111111111'
const SID = '22222222-2222-4222-8222-222222222222'
const DAY = '2026-11-16'

type Call = { table: string; op: 'select' | 'insert'; row?: unknown; filters: [string, unknown][] }
function fakeClient(opts: { session?: { id: string } | null; sessionErr?: boolean; existing?: boolean; feedbackReadErr?: boolean; insertError?: { code?: string; message: string } | null; insertThrows?: boolean } = {}) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      const q = {
        select() { calls.push(call); return q },
        eq(k: string, v: unknown) { call.filters.push([k, v]); return q },
        limit() { return q },
        async maybeSingle() {
          if (table === 'protocol_sessions') return opts.sessionErr ? { data: null, error: { message: 'x' } } : { data: opts.session === undefined ? { id: SID } : opts.session, error: null }
          if (opts.feedbackReadErr) return { data: null, error: { message: 'relation does not exist' } }
          return { data: opts.existing ? { id: 'f1' } : null, error: null }
        },
        async insert(row: unknown) {
          calls.push({ table, op: 'insert', row, filters: [] })
          if (opts.insertThrows) throw new Error('network')
          return { error: opts.insertError ?? null }
        },
      }
      return q
    },
  }
  return { client, calls }
}

let root: Root | null = null, host: HTMLDivElement
async function mount(props: Record<string, unknown>) {
  host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host)
  await act(async () => { root!.render(createElement(SessionFeel, { userId: UID, sessionDate: DAY, ...props } as never)) })
  await act(async () => { await new Promise(r => setTimeout(r, 0)) })
}
async function unmount() { if (root) await act(async () => root!.unmount()); root = null; host?.remove() }
const $ = (id: string) => host.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
async function click(id: string) { await act(async () => { $(id)!.click() }); await act(async () => { await new Promise(r => setTimeout(r, 0)) }) }
async function type(id: string, v: string) {
  const el = $(id) as HTMLTextAreaElement
  const set = Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype, 'value')!.set!
  await act(async () => { set.call(el, v); el.dispatchEvent(new Event('input', { bubbles: true })) })
}
beforeEach(() => localStorage.clear())
afterEach(unmount)

describe('P1-18 flag', () => {
  it('SHOW_SESSION_FEEDBACK is false by default', () => { expect(SHOW_SESSION_FEEDBACK).toBe(false) })
  it('flag off: renders nothing and makes no Supabase call (read or write)', async () => {
    const { client, calls } = fakeClient()
    await mount({ client })
    expect(host.innerHTML).toBe('')
    expect(calls).toEqual([])
  })
  it('MyProtocol only mounts it under the flag and after the session is complete, below "Completed today"', () => {
    const src = readFileSync(resolve(__dirname, '../pages/MyProtocol.tsx'), 'utf8')
    expect(src).toContain('{SHOW_SESSION_FEEDBACK && completedToday && <div className="mt-3 empty:hidden"><SessionFeel userId={userId} sessionDate={todayIso} refreshKey={dbSessionCount} /></div>}')
    expect(src.indexOf('<SessionFeel')).toBeGreaterThan(src.indexOf('Completed today'))
    expect(src.match(/<SessionFeel/g)!.length).toBe(1)
    // the Mark Today Complete handler is untouched: no feedback call in it
    const h = src.slice(src.indexOf('const handleMarkComplete'), src.indexOf('const week1 = week1Window'))
    expect(h).not.toMatch(/feedback|SessionFeel/i)
  })
})

describe('P1-18 prompt (flag forced on)', () => {
  it('shows after the session is saved, with the question and 3 answers', async () => {
    const { client, calls } = fakeClient()
    await mount({ enabled: true, client })
    expect($('session-feel')).not.toBeNull()
    expect(host.textContent).toContain(P1_18_WORDS.title)
    for (const k of ['easy', 'about_right', 'hard']) expect($(`sf-${k}`)).not.toBeNull()
    expect(calls.every(c => c.op === 'select')).toBe(true)
    expect(calls.map(c => c.table)).toEqual(['protocol_sessions', SESSION_FEEDBACK_TABLE])
    expect(calls[0].filters).toEqual([['user_id', UID], ['session_date', DAY]])
    expect(calls[1].filters).toEqual([['user_id', UID], ['session_id', SID]])
  })
  it('stays hidden until the session row exists (never ahead of the save)', async () => {
    const { client } = fakeClient({ session: null })
    await mount({ enabled: true, client })
    expect(host.innerHTML).toBe('')
  })
  it('skip (Not now) hides it, writes nothing, and it stays hidden for this session', async () => {
    const { client, calls } = fakeClient()
    await mount({ enabled: true, client })
    await click('sf-skip')
    expect(host.innerHTML).toBe('')
    expect(calls.some(c => c.op === 'insert')).toBe(false)
    expect(localStorage.getItem(feelDoneKey(UID, DAY))).toBe('skipped')
    await unmount()
    const again = fakeClient()
    await mount({ enabled: true, client: again.client })
    expect(host.innerHTML).toBe('')
    expect(again.calls).toEqual([])
  })
  it('once per session: after a send it does not show again for that session, but shows for the next session', async () => {
    const { client } = fakeClient()
    await mount({ enabled: true, client })
    await click('sf-hard'); await click('sf-send')
    expect($('session-feel-thanks')!.textContent).toBe(P1_18_WORDS.thanks)
    await unmount()
    await mount({ enabled: true, client: fakeClient().client })
    expect(host.innerHTML).toBe('')
    await unmount()
    await mount({ enabled: true, client: fakeClient().client, sessionDate: '2026-11-17' })
    expect($('session-feel')).not.toBeNull()
  })
  it('once per session: hidden when the server already has a row for this session (other device)', async () => {
    const { client } = fakeClient({ existing: true })
    await mount({ enabled: true, client })
    expect(host.innerHTML).toBe('')
    expect(localStorage.getItem(feelDoneKey(UID, DAY))).toBe('sent')
  })
  it('submit payload matches the spec exactly (one insert into session_feedback)', async () => {
    const { client, calls } = fakeClient()
    await mount({ enabled: true, client })
    await click('sf-easy'); await click('sf-more')
    await click('sf-somewhat'); await click('sf-too_long')
    await type('sf-note', '  More time on the hips  ')
    await click('sf-send')
    const ins = calls.filter(c => c.op === 'insert')
    expect(ins.length).toBe(1)
    expect(ins[0].table).toBe('session_feedback')
    expect(ins[0].row).toEqual({
      user_id: UID, session_id: SID, session_date: DAY, feel: 'easy', clear: 'somewhat', length_fit: 'too_long',
      note: 'More time on the hips', sport: 'base', source: 'web',
    })
    expect(Object.keys(ins[0].row as object).sort()).toEqual(['clear', 'feel', 'length_fit', 'note', 'session_date', 'session_id', 'source', 'sport', 'user_id'])
  })
  it('the survey is optional: feel alone sends, with survey fields null', async () => {
    const { client, calls } = fakeClient()
    await mount({ enabled: true, client })
    expect($('session-feel-survey')).toBeNull()
    expect(($('sf-send') as HTMLButtonElement).disabled).toBe(true) // needs a feel first
    await click('sf-about_right'); await click('sf-send')
    const row = calls.find(c => c.op === 'insert')!.row as Record<string, unknown>
    expect(row).toMatchObject({ feel: 'about_right', clear: null, length_fit: null, note: null })
  })
  it('opening the survey and leaving it blank still sends feel only', async () => {
    const { client, calls } = fakeClient()
    await mount({ enabled: true, client })
    await click('sf-more'); await type('sf-note', '   ')
    await click('sf-hard'); await click('sf-send')
    expect(calls.find(c => c.op === 'insert')!.row).toMatchObject({ feel: 'hard', clear: null, length_fit: null, note: null })
  })
  it('error path: a failed send (missing table, RLS) hides the card quietly, shows no error, and is not marked done', async () => {
    const { client, calls } = fakeClient({ insertError: { code: '42501', message: 'rls' } })
    await mount({ enabled: true, client })
    await click('sf-hard'); await click('sf-send')
    expect(calls.filter(c => c.op === 'insert').length).toBe(1)
    expect($('session-feel-error')).toBeNull()
    expect(host.textContent).not.toContain(P1_18_WORDS.error)
    expect(host.textContent).not.toContain('rls')
    expect(host.innerHTML).toBe('')
    expect(localStorage.getItem(feelDoneKey(UID, DAY))).toBeNull()
  })
  it('error path: a thrown send hides the card quietly with no error text', async () => {
    const { client } = fakeClient({ insertThrows: true })
    await mount({ enabled: true, client })
    await click('sf-easy'); await click('sf-send')
    expect($('session-feel-error')).toBeNull()
    expect(host.innerHTML).toBe('')
    expect(localStorage.getItem(feelDoneKey(UID, DAY))).toBeNull()
  })
  it('error path: 23505 (already sent for this session) counts as sent, no error line', async () => {
    const { client } = fakeClient({ insertError: { code: '23505', message: 'dup' } })
    await mount({ enabled: true, client })
    await click('sf-easy'); await click('sf-send')
    expect($('session-feel-error')).toBeNull()
    expect($('session-feel-thanks')).not.toBeNull()
  })
  it('fails quietly on reads: a missing table or failed session read keeps it hidden with no error text', async () => {
    for (const o of [{ feedbackReadErr: true }, { sessionErr: true }]) {
      const { client, calls } = fakeClient(o)
      await mount({ enabled: true, client })
      expect(host.innerHTML).toBe('')
      expect(calls.some(c => c.op === 'insert')).toBe(false)
      await unmount()
    }
  })
})

describe('P1-18 words and payload helpers', () => {
  it('every string is plain: no em or en dashes, no medical words', () => {
    for (const [k, v] of Object.entries(P1_18_WORDS)) {
      expect(v).not.toMatch(/[\u2014\u2013]/)
      if (k === 'noteHelp') continue // Stacy's safety pointer (stop and check with a doctor or physical therapist), not a claim
      expect(v.toLowerCase()).not.toMatch(/pain|injur|heal|medical|treat|cure|diagnos|therap|hurt|doctor/)
    }
  })
  it('reused strings match the existing repo strings', () => {
    expect(P1_18_WORDS.error).toBe('Something went wrong. Please try again.')
    expect(P1_18_WORDS.notNow).toBe('Not now')
    expect(P1_18_WORDS.send).toBe('Send feedback')
    expect(P1_18_WORDS.thanks).toBe('Thanks. We got it.')
  })
  it('the component has no customer-facing string outside P1_18_WORDS', () => {
    const src = readFileSync(resolve(__dirname, '../components/SessionFeel.tsx'), 'utf8')
    const jsxText = [...src.matchAll(/>\s*([A-Za-z][^<>{}]*?)\s*</g)].map(m => m[1]).filter(t => !/[()=;,]/.test(t)) // JSX text nodes only, not code
    expect(jsxText).toEqual([])
    expect(src).toMatch(/\{W\.title\}/)
  })
  it('note is trimmed and capped at NOTE_MAX', () => {
    expect(buildFeedbackRow(UID, SID, DAY, 'easy', { note: 'x'.repeat(NOTE_MAX + 50) }).note!.length).toBe(NOTE_MAX)
  })
  it('isAlreadySent only for 23505', () => {
    expect(isAlreadySent({ code: '23505' })).toBe(true)
    expect(isAlreadySent({ code: '42501' })).toBe(false)
    expect(isAlreadySent(null)).toBe(false)
  })
})

// Stacy cleared strings 1 to 19 as written in the proposed file (801b1a05) and added noteHelp (STACY-P1-18-WORDS-20261116-1908.md, 97e2d251).
const CLEARED: Record<string, string> = {
  title: 'How did that feel?', feelEasy: 'Easy', feelRight: 'About right', feelHard: 'Hard', more: 'Tell us more (optional)',
  qClear: 'Were the moves clear?', aYes: 'Yes', aSomewhat: 'Somewhat', aNo: 'No', qLength: 'How was the length?',
  aTooShort: 'Too short', aLengthRight: 'About right', aTooLong: 'Too long', noteLabel: 'Anything else?',
  noteHelp: 'If a move hurts, stop it and check with a doctor or physical therapist.',
  send: 'Send feedback', sending: 'Sending...', notNow: 'Not now', thanks: 'Thanks. We got it.', error: 'Something went wrong. Please try again.',
}
const EVID = '/workspace/process/evidence'
const STACY = `${EVID}/STACY-P1-18-WORDS-20261116-1908.md`
const PROPOSED = `${EVID}/JULES-P1-18-PROPOSED-WORDS-20261116.md`
const sha = (p: string) => createHash('sha256').update(readFileSync(p)).digest('hex')

describe('P1-18 v2: Stacy-cleared words and noteHelp', () => {
  it('P1_18_WORDS is exactly the cleared set (19 plus noteHelp), character for character', () => {
    expect(P1_18_WORDS).toEqual(CLEARED)
  })
  it('noteHelp renders directly under the "Anything else?" field with the exact text', async () => {
    const { client } = fakeClient()
    await mount({ enabled: true, client })
    await click('sf-more')
    const note = $('sf-note')!, help = $('sf-note-help')!
    expect(help.textContent).toBe('If a move hurts, stop it and check with a doctor or physical therapist.')
    expect(note.nextElementSibling).toBe(help)
    expect(note.previousElementSibling!.textContent).toBe('Anything else?')
    expect(note.getAttribute('aria-describedby')).toBe(help.id)
  })
  it('noteHelp is not shown before the survey is opened', async () => {
    const { client } = fakeClient()
    await mount({ enabled: true, client })
    expect($('sf-note-help')).toBeNull()
  })
  it.skipIf(!existsSync(STACY) || !existsSync(PROPOSED))('words match Stacy\'s cleared files on the box (skipped where the evidence files are absent)', () => {
    expect(sha(STACY).startsWith('97e2d251')).toBe(true)
    expect(sha(PROPOSED).startsWith('801b1a05')).toBe(true)
    const stacy = readFileSync(STACY, 'utf8')
    expect(stacy).toContain('strings 1 to 19 are CLEAR as written')
    expect(stacy).toContain(`"${P1_18_WORDS.noteHelp}"`)
    const proposed = Object.fromEntries([...readFileSync(PROPOSED, 'utf8').matchAll(/^\d+\. (\w+) = "([^"]*)"/gm)].map(m => [m[1], m[2]]))
    expect(Object.keys(proposed).length).toBe(19)
    const { noteHelp: _n, ...nineteen } = P1_18_WORDS
    void _n
    expect(nineteen).toEqual(proposed)
  })
})
