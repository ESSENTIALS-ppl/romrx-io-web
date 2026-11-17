// @vitest-environment jsdom
/** P1-18b: short optional survey on the assessment results screen. Flag OFF by default. Quick re-checks never get it. */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
vi.mock('./track', () => ({ track: () => {}, trackPageView: () => {} }))
vi.mock('./supabase', () => ({ supabase: { from: () => { throw new Error('live client must not be used in tests') } } }))
import { ResultsSurvey } from '../components/ResultsSurvey'
import { SHOW_RESULTS_SURVEY, P1_18B_WORDS, ASSESSMENT_FEEDBACK_TABLE, surveyDoneKey, surveyEligible, RESULTS_SURVEY_VERSION } from './resultsSurvey'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
const UID = '11111111-1111-4111-8111-111111111111'
const AID = 'aaaaaaaa-0000-4000-8000-000000000001'
const FULL = { id: AID, check_kind: 'full' }

type Call = { table: string; op: 'select' | 'insert'; row?: unknown; filters: [string, unknown][] }
function fakeClient(opts: { existing?: boolean; readErr?: boolean; insertError?: { code?: string; message: string } | null; insertThrows?: boolean } = {}) {
  const calls: Call[] = []
  const client = {
    from(table: string) {
      const call: Call = { table, op: 'select', filters: [] }
      const q = {
        select() { calls.push(call); return q },
        eq(k: string, v: unknown) { call.filters.push([k, v]); return q },
        limit() { return q },
        async maybeSingle() {
          if (opts.readErr) return { data: null, error: { message: 'relation does not exist' } }
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
  await act(async () => { root!.render(createElement(ResultsSurvey, { userId: UID, assessment: FULL, ...props } as never)) })
  await act(async () => { await new Promise(r => setTimeout(r, 0)) })
}
async function unmount() { if (root) await act(async () => root!.unmount()); root = null; host?.remove() }
const $ = (id: string) => host.querySelector(`[data-testid="${id}"]`) as HTMLElement | null
async function click(id: string) { await act(async () => { $(id)!.click() }); await act(async () => { await new Promise(r => setTimeout(r, 0)) }) }
const inserts = (calls: Call[]) => calls.filter(c => c.op === 'insert')
beforeEach(() => localStorage.clear())
afterEach(unmount)

describe('P1-18b flag', () => {
  it('SHOW_RESULTS_SURVEY is false by default', () => { expect(SHOW_RESULTS_SURVEY).toBe(false) })
  it('flag off: renders nothing and makes no Supabase call', async () => {
    const { client, calls } = fakeClient()
    await mount({ client })
    expect(host.innerHTML).toBe('')
    expect(calls).toEqual([])
  })
  it('ResultsPreview mounts it once, under the flag, after the results, the Unlock button and the fine print', () => {
    const src = readFileSync(resolve(__dirname, '../pages/ResultsPreview.tsx'), 'utf8')
    expect(src.match(/<ResultsSurvey/g)!.length).toBe(1)
    expect(src).toContain('{SHOW_RESULTS_SURVEY && user && <ResultsSurvey userId={user.id} assessment={assessment as { id?: unknown; check_kind?: unknown }} />}')
    const at = src.indexOf('<ResultsSurvey')
    for (const before of ['Your Results Are In', 'Top Asymmetry Flags', 'Unlock My Dashboard', '<ReminderOptIn', 'You pay nothing before January 1, 2027']) {
      expect(src.indexOf(before)).toBeGreaterThan(-1)
      expect(src.indexOf(before)).toBeLessThan(at)
    }
    // nothing in the unlock or navigation code waits on it
    const h = src.slice(src.indexOf('const handleUnlock'), src.indexOf('if (loading) return'))
    expect(h).not.toMatch(/survey|feedback/i)
  })
})

describe('P1-18b survey (flag forced on)', () => {
  it('shows on a full assessment with the 3 questions and Skip, after one read of its own row', async () => {
    const { client, calls } = fakeClient()
    await mount({ enabled: true, client })
    expect($('results-survey')).not.toBeNull()
    for (const k of ['title', 'qEase', 'qClear', 'qAgain', 'skip'] as const) expect(host.textContent).toContain(P1_18B_WORDS[k])
    expect(calls).toEqual([{ table: ASSESSMENT_FEEDBACK_TABLE, op: 'select', filters: [['user_id', UID], ['assessment_id', AID]] }])
  })
  it('older rows with no check_kind count as full and get it', async () => {
    await mount({ enabled: true, client: fakeClient().client, assessment: { id: AID } })
    expect($('results-survey')).not.toBeNull()
  })
  it('quick re-check: never shown and no call, even with the flag on', async () => {
    const { client, calls } = fakeClient()
    await mount({ enabled: true, client, assessment: { id: AID, check_kind: 'quick' } })
    expect(host.innerHTML).toBe('')
    expect(calls).toEqual([])
    expect(surveyEligible({ id: AID, check_kind: 'quick' })).toBe(false)
    expect(surveyEligible(null)).toBe(false)
    expect(surveyEligible({ check_kind: 'full' })).toBe(false) // no id
  })
  it('skip hides it, writes nothing, and it stays hidden for this assessment', async () => {
    const { client, calls } = fakeClient()
    await mount({ enabled: true, client })
    await click('rs-ease-hard')
    await click('rs-skip')
    expect(host.innerHTML).toBe('')
    expect(inserts(calls)).toEqual([])
    expect(localStorage.getItem(surveyDoneKey(UID, AID))).toBe('skipped')
    await unmount()
    const again = fakeClient()
    await mount({ enabled: true, client: again.client })
    expect(host.innerHTML).toBe('')
    expect(again.calls).toEqual([])
  })
  it('once per assessment: after a send it does not show again for it, but shows for the next assessment', async () => {
    await mount({ enabled: true, client: fakeClient().client })
    await click('rs-ease-easy'); await click('rs-clear-yes'); await click('rs-again-maybe')
    expect($('results-survey-thanks')!.textContent).toBe(P1_18B_WORDS.thanks)
    await unmount()
    await mount({ enabled: true, client: fakeClient().client })
    expect(host.innerHTML).toBe('')
    await unmount()
    await mount({ enabled: true, client: fakeClient().client, assessment: { id: 'aaaaaaaa-0000-4000-8000-000000000002', check_kind: null } })
    expect($('results-survey')).not.toBeNull()
  })
  it('once per assessment: hidden when the server already has a row (other device)', async () => {
    await mount({ enabled: true, client: fakeClient({ existing: true }).client })
    expect(host.innerHTML).toBe('')
    expect(localStorage.getItem(surveyDoneKey(UID, AID))).toBe('sent')
  })
  it('payload matches the spec exactly: one insert into assessment_feedback on the third tap, no free text', async () => {
    const { client, calls } = fakeClient()
    await mount({ enabled: true, client })
    await click('rs-ease-okay')
    await click('rs-clear-mostly')
    expect(inserts(calls)).toEqual([]) // not before all three
    await click('rs-again-no')
    const ins = inserts(calls)
    expect(ins.length).toBe(1)
    expect(ins[0].table).toBe('assessment_feedback')
    expect(ins[0].row).toEqual({
      user_id: UID, assessment_id: AID, ease: 'okay', results_clear: 'mostly', check_again: 'no',
      survey_version: RESULTS_SURVEY_VERSION, sport: 'base', source: 'web',
    })
    expect(RESULTS_SURVEY_VERSION).toBe('p1-18b-card1-2026-11-16')
    expect(host.querySelector('textarea, input')).toBeNull()
  })
  it('optional: any order of taps works, and leaving it unanswered never writes', async () => {
    const { client, calls } = fakeClient()
    await mount({ enabled: true, client })
    await click('rs-again-yes'); await click('rs-ease-hard')
    expect(inserts(calls)).toEqual([])
    await click('rs-clear-no')
    expect(inserts(calls)[0].row).toMatchObject({ ease: 'hard', results_clear: 'no', check_again: 'yes' })
  })
  it('error path: a failed send shows only the generic line, keeps the answers, and a tap tries again', async () => {
    const { client, calls } = fakeClient({ insertError: { code: '42501', message: 'rls' } })
    await mount({ enabled: true, client })
    await click('rs-ease-easy'); await click('rs-clear-yes'); await click('rs-again-yes')
    expect($('results-survey-error')!.textContent).toBe('Something went wrong. Please try again.')
    expect(host.textContent).not.toContain('rls')
    expect($('rs-ease-easy')!.getAttribute('aria-checked')).toBe('true')
    expect(localStorage.getItem(surveyDoneKey(UID, AID))).toBeNull()
    await click('rs-again-maybe')
    expect(inserts(calls).length).toBe(2)
    await click('rs-skip')
    expect(host.innerHTML).toBe('')
  })
  it('error path: a thrown send shows the generic line', async () => {
    await mount({ enabled: true, client: fakeClient({ insertThrows: true }).client })
    await click('rs-ease-easy'); await click('rs-clear-yes'); await click('rs-again-yes')
    expect($('results-survey-error')!.textContent).toBe(P1_18B_WORDS.error)
  })
  it('error path: 23505 (already answered) counts as sent, no error line', async () => {
    await mount({ enabled: true, client: fakeClient({ insertError: { code: '23505', message: 'dup' } }).client })
    await click('rs-ease-easy'); await click('rs-clear-yes'); await click('rs-again-yes')
    expect($('results-survey-error')).toBeNull()
    expect($('results-survey-thanks')).not.toBeNull()
  })
  it('fails quietly on reads: a missing table keeps it hidden with no error text and no write', async () => {
    const { client, calls } = fakeClient({ readErr: true })
    await mount({ enabled: true, client })
    expect(host.innerHTML).toBe('')
    expect(inserts(calls)).toEqual([])
  })
})

describe('P1-18b words', () => {
  it('plain: no em or en dashes, no medical words, no score or price claims', () => {
    for (const v of Object.values(P1_18B_WORDS)) {
      expect(v).not.toMatch(/[\u2014\u2013]/)
      expect(v.toLowerCase()).not.toMatch(/pain|injur|heal|medical|treat|cure|diagnos|therap|improve|\$|free/)
    }
  })
  it('reuses Stacy\'s cleared Survey card B Card 1 strings and the generic error line verbatim', () => {
    expect(P1_18B_WORDS).toEqual({
      title: 'Quick question', qEase: 'How easy was this assessment?', aEasy: 'Easy', aOkay: 'Okay', aHard: 'Hard',
      qClear: 'Were your results clear?', aYes: 'Yes', aMostly: 'Mostly', aNo: 'No',
      qAgain: 'Will you check again in a few weeks?', aAgainYes: 'Yes', aMaybe: 'Maybe', aAgainNo: 'No',
      skip: 'Skip', thanks: 'Thanks. Your answers help us decide what to work on.', error: 'Something went wrong. Please try again.',
    })
  })
  it('the component has no customer-facing string outside P1_18B_WORDS', () => {
    const src = readFileSync(resolve(__dirname, '../components/ResultsSurvey.tsx'), 'utf8')
    const jsxText = [...src.matchAll(/>\s*([A-Za-z][^<>{}]*?)\s*</g)].map(m => m[1]).filter(t => !/[()=;,]/.test(t))
    expect(jsxText).toEqual([])
    expect(src).toMatch(/\{W\.title\}/)
  })
})
