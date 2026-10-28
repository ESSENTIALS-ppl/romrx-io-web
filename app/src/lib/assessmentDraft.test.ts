/**
 * Assessment progress drafts: pure rules (spec ASSESSMENT-PROGRESS-FIX-SPEC-20261028, Stacy ruling, Vera D3 and D4).
 * No network: the saver runs against a fake store.
 */
import { readFileSync, existsSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { STEPS } from '../pages/assessmentSteps'
import {
  DRAFT_CAP_MS, DRAFT_KEYS, DRAFT_ROLLING_MS, DRAFT_STEP_IDS, MIRROR_PREFIX,
  buildSnapshot, cleanValue, clearAllMirrors, clearMirror, createDraftSaver, draftToRow, guardDecision, isDraftLive,
  isResumable, isStaleVersusAssessment, leaveSheetKind, mirrorKey, parseDraft, pickDraft, readMirror, rowToDraft,
  sanitizeValues, shouldRedirectSignedIn, valuesToStrings, withTimeout, writeMirror,
  type Draft, type DraftRow, type DraftStore, type StorageLike,
} from './assessmentDraft'

const SRC = resolve(__dirname, '..')
const UID = 'a1111111-1111-4111-8111-111111111111'
const H = 3600 * 1000

class MemStorage implements StorageLike {
  m = new Map<string, string>()
  get length() { return this.m.size }
  key(i: number) { return [...this.m.keys()][i] ?? null }
  getItem(k: string) { return this.m.has(k) ? this.m.get(k)! : null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
}

function fakeStore(over: Partial<DraftStore> = {}) {
  const calls: string[] = []
  const rows: unknown[] = []
  const store: DraftStore = {
    async save(_u, row) { calls.push('save'); rows.push(row); return true },
    async load() { return null },
    async remove() { calls.push('remove'); return true },
    async newestAssessmentAt() { return null },
    ...over,
  }
  return { store, calls, rows }
}

describe('key and step lists', () => {
  it('the 18 keys are exactly the measurement fields of the live steps, and the 9 step ids are the live steps', () => {
    const live = STEPS.flatMap(s => s.fields.map(f => f.key)).sort()
    expect([...DRAFT_KEYS].sort()).toEqual(live)
    expect(DRAFT_KEYS.length).toBe(18)
    expect(STEPS.map(s => s.id)).toEqual([...DRAFT_STEP_IDS])
  })
  // Runs when V2_MIGRATIONS points at the v2 migrations folder (local check; Netlify has no v2 repo).
  const mig = process.env.V2_MIGRATIONS
  it.skipIf(!mig || !existsSync(join(mig ?? '', '20261029100000_assessment_drafts.sql')))('the client key and step lists equal the SQL lists', () => {
    const sql = readFileSync(join(mig!, '20261029100000_assessment_drafts.sql'), 'utf8')
    for (const k of DRAFT_KEYS) expect(sql, k).toContain(`'${k}'`)
    for (const id of DRAFT_STEP_IDS) expect(sql, id).toContain(`'${id}'`)
    const keyBlock = sql.slice(sql.indexOf('assessment_draft_values_ok'))
    const found = [...keyBlock.matchAll(/'([a-z_]+_(?:l|r)|cervical_flex|cervical_ext)'/g)].map(m => m[1])
    expect(new Set(found).size).toBe(18)
  })
})

describe('values: 0 to 360 or null (Vera D4)', () => {
  it('accepts the edges, decimals and blanks', () => {
    for (const v of [0, 360, 45.5, '0', '360', '12.5']) expect(cleanValue(v).ok, String(v)).toBe(true)
    for (const v of ['', null, undefined]) expect(cleanValue(v)).toEqual({ ok: true, value: null })
  })
  it('rejects 361, -1, NaN, text and Infinity', () => {
    for (const v of [361, -1, '400', '-5', 'abc', NaN, Infinity, {}, []]) expect(cleanValue(v).ok, String(v)).toBe(false)
  })
  it('one bad value becomes null and is reported; the rest of the row is untouched', () => {
    const { values, dropped } = sanitizeValues({ hip_er_l: '40', hip_er_r: '400', hip_ir_l: '-3', hip_ir_r: 'x', shoulder_er_l: '' })
    expect(values).toEqual({ hip_er_l: 40, hip_er_r: null, hip_ir_l: null, hip_ir_r: null, shoulder_er_l: null })
    expect(dropped.sort()).toEqual(['hip_er_r', 'hip_ir_l', 'hip_ir_r'])
  })
  it('unknown keys never reach the draft (mood, name, email, lumbar)', () => {
    const { values } = sanitizeValues({ hip_er_l: '40', email: 'a@b.co', mood: '3', lumbar_flex: '10', full_name: 'x', thoracic_rot_l: '5' } as never)
    expect(Object.keys(values)).toEqual(['hip_er_l'])
  })
  it('a snapshot with a bad value still passes the database rule (every number inside 0..360)', () => {
    const { snapshot } = buildSnapshot({ values: { hip_er_l: '999', hip_er_r: '30' }, stepIds: DRAFT_STEP_IDS, finishedIdx: 0 })
    for (const v of Object.values(snapshot.values)) expect(v === null || (v >= 0 && v <= 360)).toBe(true)
  })
})

describe('snapshot', () => {
  it('step_idx is the NEXT step; the last step stays on itself; ids are the finished steps', () => {
    const a = buildSnapshot({ values: { hip_er_l: '40' }, stepIds: DRAFT_STEP_IDS, finishedIdx: 2 }).snapshot
    expect(a.stepIdx).toBe(3)
    expect(a.completedSteps).toEqual(['hip_er', 'hip_ir', 'shoulder_er'])
    const z = buildSnapshot({ values: {}, stepIds: DRAFT_STEP_IDS, finishedIdx: 8 }).snapshot
    expect(z.stepIdx).toBe(8)
    expect(z.completedSteps.length).toBe(9)
  })
  it('Skip saves the skipped step as null even when the old value is still in state', () => {
    const { snapshot } = buildSnapshot({ values: { hip_er_l: '40', hip_er_r: '41', hip_ir_l: '30' }, stepIds: DRAFT_STEP_IDS, finishedIdx: 0, skipKeys: ['hip_er_l', 'hip_er_r'] })
    expect(snapshot.values).toEqual({ hip_er_l: null, hip_er_r: null, hip_ir_l: 30 })
    expect(valuesToStrings(snapshot.values)).toEqual({ hip_ir_l: '30' })
  })
  it('the row sent to the server never carries created_at or expires_at (Vera D1)', () => {
    const row = draftToRow(UID, { values: { hip_er_l: 1 }, completedSteps: ['hip_er'], stepIdx: 1, savedAt: 1e12, createdAt: 1e12 })
    expect(Object.keys(row).sort()).toEqual(['client_saved_at', 'completed_steps', 'step_idx', 'step_values', 'user_id'])
  })
})

describe('retention mirror: 48 hours after the last step, 7 days from the start', () => {
  const t0 = Date.parse('2026-11-01T12:00:00Z')
  const d = (savedAt: number, createdAt = savedAt): Draft => ({ values: { hip_er_l: 40 }, completedSteps: ['hip_er'], stepIdx: 1, savedAt, createdAt })
  it('live inside 48h, dead after', () => {
    expect(isDraftLive(d(t0), t0 + 47 * H)).toBe(true)
    expect(isDraftLive(d(t0), t0 + 48 * H)).toBe(false)
  })
  it('steady saves cannot pass 7 days from the start', () => {
    const created = t0
    expect(isDraftLive(d(t0 + 6 * 24 * H, created), t0 + 6 * 24 * H + 47 * H)).toBe(false) // cap at day 7 hits first
    expect(isDraftLive(d(t0 + 6 * 24 * H, created), t0 + 6 * 24 * H + 20 * H)).toBe(true)
    expect(isDraftLive(d(t0 + 5 * 24 * H, created), t0 + DRAFT_CAP_MS)).toBe(false)
  })
  it('resume needs at least one finished step (a skipped step counts as finished)', () => {
    expect(isResumable({ ...d(t0), completedSteps: [] }, t0)).toBe(false)
    expect(isResumable({ ...d(t0), values: { hip_er_l: null }, completedSteps: ['hip_er'] }, t0)).toBe(true)
  })
  it('read and write per user; another user sees nothing', () => {
    const st = new MemStorage()
    writeMirror(st, UID, d(t0))
    expect(readMirror(st, UID, t0 + H)?.values).toEqual({ hip_er_l: 40 })
    expect(readMirror(st, 'b2222222-2222-4222-8222-222222222222', t0 + H)).toBeNull()
  })
  it('an expired or corrupt mirror is removed on read', () => {
    const st = new MemStorage()
    writeMirror(st, UID, d(t0))
    expect(readMirror(st, UID, t0 + DRAFT_ROLLING_MS + 1)).toBeNull()
    expect(st.length).toBe(0)
    st.setItem(mirrorKey(UID), '{not json')
    expect(readMirror(st, UID, t0)).toBeNull()
    expect(st.length).toBe(0)
  })
  it('signed out: nothing is written and nothing is read', () => {
    const st = new MemStorage()
    writeMirror(st, null, d(t0))
    writeMirror(st, undefined, d(t0))
    expect(st.length).toBe(0)
    expect(readMirror(st, null, t0)).toBeNull()
  })
  it('sign out clears every member key and leaves other keys alone', () => {
    const st = new MemStorage()
    writeMirror(st, UID, d(t0)); writeMirror(st, 'b2222222-2222-4222-8222-222222222222', d(t0))
    st.setItem('romrx.hq.anon_id', 'x')
    clearAllMirrors(st)
    expect([...st.m.keys()]).toEqual(['romrx.hq.anon_id'])
    writeMirror(st, UID, d(t0)); clearMirror(st, UID)
    expect([...st.m.keys()].some(k => k.startsWith(MIRROR_PREFIX))).toBe(false)
  })
  it('never stores mood: a draft that carries extra fields is cut down to the whitelist', () => {
    const p = parseDraft({ values: { hip_er_l: 40, mood: 3, email: 'a@b.co' }, completedSteps: ['hip_er', 'mood'], stepIdx: 99, savedAt: t0, createdAt: t0 })!
    expect(Object.keys(p.values)).toEqual(['hip_er_l'])
    expect(p.completedSteps).toEqual(['hip_er'])
    expect(p.stepIdx).toBe(8)
  })
})

describe('server rows and picking a draft', () => {
  const row = (over: Partial<DraftRow> = {}): DraftRow => ({
    step_values: { hip_er_l: 40 }, completed_steps: ['hip_er'], step_idx: 1,
    client_saved_at: '2026-11-01T12:00:00Z', created_at: '2026-11-01T12:00:01Z', updated_at: '2026-11-01T12:00:01Z', expires_at: '2026-11-03T12:00:01Z', ...over,
  })
  it('the server expires_at wins over the device clock', () => {
    const d = rowToDraft(row())!
    expect(isDraftLive(d, Date.parse('2026-11-03T12:00:00Z'))).toBe(true)
    expect(isDraftLive(d, Date.parse('2026-11-03T12:00:02Z'))).toBe(false)
  })
  it('garbage rows give null', () => {
    expect(rowToDraft(null)).toBeNull()
    expect(rowToDraft(row({ step_values: [1, 2] }))).toBeNull()
    expect(rowToDraft(row({ created_at: 'nope' }))).toBeNull()
  })
  it('the newer live draft wins; ties go to the server; a dead one is ignored', () => {
    const now = Date.parse('2026-11-01T13:00:00Z')
    const s = rowToDraft(row())!
    const newer: Draft = { ...s, savedAt: s.savedAt + 10 * 60 * 1000, expiresAt: undefined, values: { hip_er_l: 41 } }
    expect(pickDraft(s, newer, now)?.values.hip_er_l).toBe(41)
    expect(pickDraft(s, { ...s, expiresAt: undefined }, now)?.values.hip_er_l).toBe(40)
    expect(pickDraft(s, { ...newer, savedAt: 0, createdAt: 0 }, now)?.values.hip_er_l).toBe(40)
    expect(pickDraft(null, null, now)).toBeNull()
  })
  it('a draft older than the newest assessment is ignored', () => {
    const d = rowToDraft(row())!
    expect(isStaleVersusAssessment(d, Date.parse('2026-11-01T12:30:00Z'))).toBe(true)
    expect(isStaleVersusAssessment(d, Date.parse('2026-11-01T11:00:00Z'))).toBe(false)
    expect(isStaleVersusAssessment(d, null)).toBe(false)
  })
})

describe('saver: order, final save, close (Vera D3)', () => {
  const snap = (n: number) => buildSnapshot({ values: { hip_er_l: String(n) }, stepIds: DRAFT_STEP_IDS, finishedIdx: 0 }).snapshot
  it('saves run one at a time, and the last write is always the newest snapshot', async () => {
    const seen: number[] = []
    let running = 0, maxRunning = 0
    const { store } = fakeStore({ async save(_u, row) {
      running++; maxRunning = Math.max(maxRunning, running)
      await new Promise(r => setTimeout(r, 10))
      seen.push((row.step_values as Record<string, number>).hip_er_l); running--; return true
    } })
    const s = createDraftSaver({ store, userId: UID, storage: new MemStorage() })
    void s.save(snap(1)); void s.save(snap(2)); void s.save(snap(3))
    await s.flush()
    expect(maxRunning).toBe(1)
    expect(seen[seen.length - 1]).toBe(3)
    expect(seen).toEqual([...seen].sort((x, y) => x - y))
  })
  it('after close() no save reaches the server, and a queued one that has not started is skipped', async () => {
    const { store, calls } = fakeStore({ async save() { await new Promise(r => setTimeout(r, 15)); calls.push('save'); return true } })
    const s = createDraftSaver({ store, userId: UID, storage: new MemStorage() })
    void s.save(snap(1)); void s.save(snap(2))
    s.close()
    await s.flush()
    expect(await s.save(snap(3))).toBe(false)
    expect(calls.filter(c => c === 'save').length).toBeLessThanOrEqual(1)
  })
  it('final step order: the awaited final save lands BEFORE the submit trigger can clear it, then the delete runs last', async () => {
    const events: string[] = []
    const { store } = fakeStore({
      async save() { await new Promise(r => setTimeout(r, 20)); events.push('draft-saved'); return true },
      async remove() { events.push('draft-removed'); return true },
    })
    const s = createDraftSaver({ store, userId: UID, storage: new MemStorage() })
    const final = s.save(snap(9))
    await withTimeout(final, 5000, false)   // what Assessment.tsx does before submit
    s.close()
    events.push('submit-inserts-assessment-and-db-clears-draft')
    await s.finish()
    expect(events).toEqual(['draft-saved', 'submit-inserts-assessment-and-db-clears-draft', 'draft-removed'])
  })
  it('a retry (online or tab visible) after finish cannot bring the draft back', async () => {
    const { store, calls } = fakeStore()
    const st = new MemStorage()
    const s = createDraftSaver({ store, userId: UID, storage: st })
    void s.save(snap(1)); await s.flush()
    await s.finish()
    const before = calls.filter(c => c === 'save').length
    await s.retry(); await s.save(snap(2))
    expect(calls.filter(c => c === 'save').length).toBe(before)
    expect(st.length).toBe(0)
  })
  it('a failed submit reopens the saver so the member can still save', async () => {
    const { store, calls } = fakeStore()
    const s = createDraftSaver({ store, userId: UID, storage: new MemStorage() })
    s.close(); s.reopen()
    await s.save(snap(1))
    expect(calls).toContain('save')
  })
  it('a failed save keeps the values on this device and marks the status; retry succeeds later', async () => {
    let ok = false
    const { store } = fakeStore({ async save() { return ok } })
    const st = new MemStorage()
    const statuses: string[] = []
    const s = createDraftSaver({ store, userId: UID, storage: st, onStatus: x => statuses.push(x) })
    expect(await s.save(snap(7))).toBe(false)
    expect(s.isDirty()).toBe(true)
    expect(readMirror(st, UID, Date.now())?.values.hip_er_l).toBe(7)
    ok = true
    expect(await s.retry()).toBe(true)
    expect(s.isDirty()).toBe(false)
    expect(statuses).toEqual(['failed', 'saved'])
  })
  it('a store that throws never throws out of the saver', async () => {
    const { store } = fakeStore({ async save() { throw new Error('offline') } })
    const s = createDraftSaver({ store, userId: UID, storage: null })
    await expect(s.save(snap(1))).resolves.toBe(false)
  })
  it('a hung save does not block Submit past the timeout', async () => {
    const t0 = Date.now()
    const r = await withTimeout(new Promise<boolean>(() => {}), 30, false)
    expect(r).toBe(false)
    expect(Date.now() - t0).toBeLessThan(500)
  })
  it('discard (Start over) deletes server and device copies', async () => {
    const { store, calls } = fakeStore()
    const st = new MemStorage()
    const s = createDraftSaver({ store, userId: UID, storage: st })
    await s.save(snap(1)); await s.discard()
    expect(calls).toContain('remove')
    expect(st.length).toBe(0)
  })
  it('the 7 day clock restarts only after the old draft lapsed', async () => {
    let t = Date.parse('2026-11-01T00:00:00Z')
    const created: number[] = []
    const { store } = fakeStore()
    const s = createDraftSaver({ store, userId: UID, storage: new MemStorage(), now: () => t })
    const read = () => readMirror(mem, UID, t)!.createdAt
    const mem = new MemStorage()
    const s2 = createDraftSaver({ store, userId: UID, storage: mem, now: () => t })
    void s
    await s2.save(snap(1)); created.push(read())
    t += 40 * H; await s2.save(snap(2)); created.push(read())   // inside 48h: same draft
    t += 40 * H; await s2.save(snap(3)); created.push(read())
    t += 60 * H; await s2.save(snap(4)); created.push(read())   // 60h of silence: new draft
    expect(created[1]).toBe(created[0]); expect(created[2]).toBe(created[0]); expect(created[3]).toBeGreaterThan(created[0])
  })
})

describe('back button and leave guard', () => {
  it('only the measure screens are guarded; step 1 opens the sheet, later steps go back one step', () => {
    expect(guardDecision({ phase: 'measure', stepIdx: 0 })).toBe('leave-sheet')
    expect(guardDecision({ phase: 'measure', stepIdx: 4 })).toBe('previous-step')
    for (const ph of ['setup', 'mood', 'resume', 'lead', 'outro', 'lead-done', 'done']) expect(guardDecision({ phase: ph, stepIdx: 3 }), ph).toBe('none')
  })
  it('sheet kind: signed out, unsaved last step, or saved', () => {
    expect(leaveSheetKind({ signedIn: false, lastSaveFailed: false })).toBe('signed-out')
    expect(leaveSheetKind({ signedIn: true, lastSaveFailed: true })).toBe('unsaved-last')
    expect(leaveSheetKind({ signedIn: true, lastSaveFailed: false })).toBe('saved')
  })
})

describe('signup redirect for a signed-in visitor (S4)', () => {
  it('fires only when auth is loaded, a session exists, and the signup itself is not running', () => {
    const base = { authLoading: false, hasSession: true, submitting: false, checkEmail: false }
    expect(shouldRedirectSignedIn(base)).toBe(true)
    expect(shouldRedirectSignedIn({ ...base, authLoading: true })).toBe(false)
    expect(shouldRedirectSignedIn({ ...base, hasSession: false })).toBe(false)
    expect(shouldRedirectSignedIn({ ...base, submitting: true })).toBe(false)   // the post sign up navigate runs while loading stays true
    expect(shouldRedirectSignedIn({ ...base, checkEmail: true })).toBe(false)
  })
})

describe('wiring in the source files', () => {
  const read = (p: string) => readFileSync(join(SRC, p), 'utf8')
  const a = read('pages/Assessment.tsx')
  it('Assessment awaits the final save, then closes the saver, then submits, and finishes only after a good submit', () => {
    const iAwait = a.indexOf('await withTimeout(finalSave')
    const iClose = a.indexOf('saver?.close()')
    const iSubmit = a.indexOf('await submit(undefined, undefined, effective)')
    expect(iAwait).toBeGreaterThan(0)
    expect(iClose).toBeGreaterThan(iAwait)
    expect(iSubmit).toBeGreaterThan(iClose)
    expect(a.indexOf('saver.finish()')).toBeGreaterThan(a.indexOf('res.ok'))
    expect(a).toContain('saverRef.current?.saver.reopen()')
  })
  it('the draft store never sends created_at or expires_at', () => {
    const s = read('lib/assessmentDraftStore.ts')
    const upsert = s.slice(s.indexOf('upsert('), s.indexOf('onConflict'))
    expect(upsert).not.toMatch(/created_at|expires_at/)
  })
  it('the mirror is only written through writeMirror with a user id (no direct localStorage writes in Assessment)', () => {
    expect(a).not.toMatch(/localStorage\.setItem/)
    expect(a).toContain("readMirror(draftStorage(), userId")
  })
  it('sign out clears the mirrors', () => {
    const u = read('hooks/useAuth.ts')
    expect(u).toContain('clearAllMirrors')
    expect(u).toMatch(/SIGNED_OUT/)
  })
  it('Signup redirects a signed-in visitor through resolvePostAuthDest with the explicit next kept', () => {
    const s = read('pages/Signup.tsx')
    expect(s).toContain('shouldRedirectSignedIn(')
    expect(s).toContain('resolvePostAuthDest(authSession?.user?.id, leadToken || addSport ? nextDest : null)')
  })
  it('legal.html carries Stacy\'s sentence exactly once, in the Assessment and progress data paragraph', () => {
    const l = readFileSync(join(SRC, '..', '..', 'legal.html'), 'utf8')
    const S = 'While you take the assessment, we save your answers so you can pick up where you left off on this or another device. The draft is deleted when you finish, or 48 hours after your last saved step.'
    expect(l.split(S).length - 1).toBe(1)
    const para = l.slice(l.indexOf('<strong>Assessment and progress data:</strong>'))
    expect(para.slice(0, para.indexOf('</p>'))).toContain(S)
  })
})
