// Assessment progress drafts (spec ASSESSMENT-PROGRESS-FIX-SPEC-20261028, Stacy ruling Oct 28 2026).
// Pure logic only: no React, no supabase import. The Supabase calls live in assessmentDraftStore.ts and are
// injected, so every rule here is unit tested without a network.
//
// Rules in one place:
//  - Only the 18 measurement keys, numbers 0..360 or null (skipped). Never mood, name, email or anything else.
//  - Retention: 48 hours after the last save, and never more than 7 days after the draft was first created.
//    The database enforces both; this file only mirrors them so the client does not show a dead draft.
//  - Signed-in users only. No localStorage copy for signed-out visitors (Stacy).
//  - After the final step the draft is removed (the database also clears it on submit). Saves are serialized
//    and a closed saver refuses further saves, so a late save cannot bring a finished draft back (Vera D3).

export const DRAFT_KEYS = [
  'hip_er_l', 'hip_er_r', 'hip_ir_l', 'hip_ir_r',
  'shoulder_er_l', 'shoulder_er_r', 'shoulder_flex_l', 'shoulder_flex_r',
  'cervical_lat_l', 'cervical_lat_r', 'cervical_flex', 'cervical_ext',
  'hip_flex_l', 'hip_flex_r', 'hip_abd_l', 'hip_abd_r',
  'ankle_df_l', 'ankle_df_r',
] as const

export const DRAFT_STEP_IDS = [
  'hip_er', 'hip_ir', 'shoulder_er', 'shoulder_flex', 'cervical_lat', 'cervical_flex_ext', 'hip_flex', 'hip_abd', 'ankle_df',
] as const

export const DRAFT_MIN = 0
export const DRAFT_MAX = 360
export const DRAFT_ROLLING_MS = 48 * 3600 * 1000
export const DRAFT_CAP_MS = 7 * 24 * 3600 * 1000
export const MIRROR_PREFIX = 'romrx.assessment_draft.v1.'
export const MIRROR_VERSION = 1

export type DraftValues = Record<string, number | null>
export interface Snapshot { values: DraftValues; completedSteps: string[]; stepIdx: number }
export interface Draft extends Snapshot {
  /** Device clock (ms) of the save. */
  savedAt: number
  /** When this draft first started (ms). The 7 day cap counts from here. */
  createdAt: number
  /** Server clock (ms) of the last write, when the draft came from the server. */
  serverUpdatedAt?: number
  /** Server clock (ms) when the server says the draft ends. Authoritative when present. */
  expiresAt?: number
}

const KEY_SET = new Set<string>(DRAFT_KEYS)
const STEP_SET = new Set<string>(DRAFT_STEP_IDS)

/** One value: finite number inside 0..360 or null. Anything else is dropped (Vera D4). */
export function cleanValue(raw: unknown): { ok: true; value: number | null } | { ok: false } {
  if (raw === null || raw === undefined || raw === '') return { ok: true, value: null }
  const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? parseFloat(raw) : NaN
  if (!Number.isFinite(n) || n < DRAFT_MIN || n > DRAFT_MAX) return { ok: false }
  return { ok: true, value: n }
}

/**
 * Turn the screen's string values into draft values. Unknown keys are ignored. A bad value (NaN, below 0, above 360)
 * is saved as null and listed in `dropped`, so one typo can never make the database reject the whole row and stop
 * every later save. `skipKeys` are forced to null (the Skip button, which cannot rely on state that has not updated yet).
 */
export function sanitizeValues(
  raw: Record<string, string | number | null | undefined>,
  skipKeys: readonly string[] = [],
): { values: DraftValues; dropped: string[] } {
  const values: DraftValues = {}
  const dropped: string[] = []
  const skip = new Set(skipKeys)
  for (const k of Object.keys(raw)) {
    if (!KEY_SET.has(k)) continue
    if (skip.has(k)) { values[k] = null; continue }
    const c = cleanValue(raw[k])
    if (c.ok) values[k] = c.value
    else { values[k] = null; dropped.push(k) }
  }
  for (const k of skipKeys) if (KEY_SET.has(k)) values[k] = null
  return { values, dropped }
}

/** Ids of the first `doneCount` steps, restricted to the nine the database allows. */
export function completedStepIds(stepIds: readonly string[], doneCount: number): string[] {
  return stepIds.slice(0, Math.max(0, doneCount)).filter(id => STEP_SET.has(id))
}

export function clampStepIdx(n: unknown, stepCount: number): number {
  const x = typeof n === 'number' && Number.isFinite(n) ? Math.floor(n) : 0
  return Math.max(0, Math.min(x, Math.min(stepCount - 1, DRAFT_STEP_IDS.length - 1)))
}

/**
 * Snapshot after finishing step `finishedIdx`. step_idx is the NEXT step to show (the last step stays on itself).
 * `skipKeys` are the fields of a skipped step.
 */
export function buildSnapshot(args: {
  values: Record<string, string>
  stepIds: readonly string[]
  finishedIdx: number
  skipKeys?: readonly string[]
}): { snapshot: Snapshot; dropped: string[] } {
  const { values, dropped } = sanitizeValues(args.values, args.skipKeys ?? [])
  return {
    snapshot: {
      values,
      completedSteps: completedStepIds(args.stepIds, args.finishedIdx + 1),
      stepIdx: clampStepIdx(args.finishedIdx + 1, args.stepIds.length),
    },
    dropped,
  }
}

/** The values as the screen holds them (strings), for filling the form on resume. */
export function valuesToStrings(values: DraftValues): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [k, v] of Object.entries(values)) if (KEY_SET.has(k) && v !== null) out[k] = String(v)
  return out
}

export const draftExpiresAt = (d: Pick<Draft, 'savedAt' | 'createdAt' | 'expiresAt'>) =>
  d.expiresAt ?? Math.min(d.savedAt + DRAFT_ROLLING_MS, d.createdAt + DRAFT_CAP_MS)

export const isDraftLive = (d: Pick<Draft, 'savedAt' | 'createdAt' | 'expiresAt'>, now: number) => draftExpiresAt(d) > now

/** Resume is offered only if the member finished at least one step (S1: a skipped step counts as finished). */
export const isResumable = (d: Draft, now: number) => d.completedSteps.length >= 1 && isDraftLive(d, now)

/** A draft saved before the member's newest assessment belongs to a finished run: ignore it (server clock when known, else the device clock). */
export function isStaleVersusAssessment(d: Draft, newestAssessmentAt: number | null): boolean {
  if (newestAssessmentAt === null) return false
  return (d.serverUpdatedAt ?? d.savedAt) <= newestAssessmentAt
}

/** Check a draft-shaped value from storage or the server. Returns null if anything is out of shape. */
export function parseDraft(raw: unknown): Draft | null {
  if (!raw || typeof raw !== 'object') return null
  const r = raw as Record<string, unknown>
  const vals = r.values
  if (!vals || typeof vals !== 'object' || Array.isArray(vals)) return null
  const { values } = sanitizeValues(vals as Record<string, string | number | null>)
  const steps = Array.isArray(r.completedSteps) ? (r.completedSteps as unknown[]).filter((s): s is string => typeof s === 'string' && STEP_SET.has(s)) : []
  const savedAt = typeof r.savedAt === 'number' && Number.isFinite(r.savedAt) ? r.savedAt : null
  const createdAt = typeof r.createdAt === 'number' && Number.isFinite(r.createdAt) ? r.createdAt : savedAt
  if (savedAt === null || createdAt === null) return null
  const d: Draft = { values, completedSteps: steps, stepIdx: clampStepIdx(r.stepIdx, DRAFT_STEP_IDS.length), savedAt, createdAt }
  if (typeof r.serverUpdatedAt === 'number' && Number.isFinite(r.serverUpdatedAt)) d.serverUpdatedAt = r.serverUpdatedAt
  if (typeof r.expiresAt === 'number' && Number.isFinite(r.expiresAt)) d.expiresAt = r.expiresAt
  return d
}

/** Row shape returned by the draft table (public.assessment_drafts). */
export interface DraftRow {
  step_values: unknown
  completed_steps: unknown
  step_idx: unknown
  client_saved_at: string | null
  created_at: string
  updated_at: string
  expires_at: string
}

export function rowToDraft(row: DraftRow | null | undefined): Draft | null {
  if (!row) return null
  const created = Date.parse(row.created_at)
  const updated = Date.parse(row.updated_at)
  const clientSaved = row.client_saved_at ? Date.parse(row.client_saved_at) : NaN
  const saved = Number.isFinite(clientSaved) ? clientSaved : updated
  if (!Number.isFinite(created) || !Number.isFinite(updated)) return null
  const exp = Date.parse(row.expires_at)
  return parseDraft({
    values: row.step_values, completedSteps: row.completed_steps, stepIdx: row.step_idx,
    savedAt: saved, createdAt: created, serverUpdatedAt: updated, expiresAt: Number.isFinite(exp) ? exp : undefined,
  })
}

export function draftToRow(userId: string, d: Draft) {
  return {
    user_id: userId,
    step_values: d.values,
    completed_steps: d.completedSteps,
    step_idx: d.stepIdx,
    client_saved_at: new Date(d.savedAt).toISOString(),
    // created_at and expires_at are never sent: the database owns both (Vera D1).
  }
}

/** Pick the newer live draft of the server and this device. Ties go to the server. */
export function pickDraft(server: Draft | null, local: Draft | null, now: number): Draft | null {
  const s = server && isDraftLive(server, now) ? server : null
  const l = local && isDraftLive(local, now) ? local : null
  if (s && l) return l.savedAt > s.savedAt ? l : s
  return s ?? l
}

// ---- localStorage mirror (signed in only, per user, strictly necessary) ----

export interface StorageLike {
  getItem(k: string): string | null
  setItem(k: string, v: string): void
  removeItem(k: string): void
  readonly length: number
  key(i: number): string | null
}

export const mirrorKey = (userId: string) => `${MIRROR_PREFIX}${userId}`

export function writeMirror(storage: StorageLike | null, userId: string | null | undefined, d: Draft): void {
  if (!storage || !userId) return // signed out: nothing is stored
  try { storage.setItem(mirrorKey(userId), JSON.stringify({ v: MIRROR_VERSION, ...d })) } catch { /* private mode or full */ }
}

export function readMirror(storage: StorageLike | null, userId: string | null | undefined, now: number): Draft | null {
  if (!storage || !userId) return null
  try {
    const txt = storage.getItem(mirrorKey(userId))
    if (!txt) return null
    const raw = JSON.parse(txt) as Record<string, unknown>
    const d = raw && raw.v === MIRROR_VERSION ? parseDraft(raw) : null
    if (!d || !isDraftLive(d, now)) { storage.removeItem(mirrorKey(userId)); return null }
    return d
  } catch {
    try { storage.removeItem(mirrorKey(userId)) } catch { /* ignore */ }
    return null
  }
}

export function clearMirror(storage: StorageLike | null, userId: string | null | undefined): void {
  if (!storage || !userId) return
  try { storage.removeItem(mirrorKey(userId)) } catch { /* ignore */ }
}

/** Sign out: remove every person's mirror on this device. */
export function clearAllMirrors(storage: StorageLike | null): void {
  if (!storage) return
  try {
    const keys: string[] = []
    for (let i = 0; i < storage.length; i++) { const k = storage.key(i); if (k && k.startsWith(MIRROR_PREFIX)) keys.push(k) }
    for (const k of keys) storage.removeItem(k)
  } catch { /* ignore */ }
}

// ---- back button and leave guard ----

export type GuardDecision = 'none' | 'previous-step' | 'leave-sheet'

/**
 * What browser Back (popstate) does. The sentinel entry exists only on the measure screens, so setup, mood,
 * resume and the end screens have nothing to lose and nothing to guard (S2).
 */
export function guardDecision(args: { phase: string; stepIdx: number }): GuardDecision {
  if (args.phase !== 'measure') return 'none'
  return args.stepIdx > 0 ? 'previous-step' : 'leave-sheet'
}

export type LeaveKind = 'saved' | 'unsaved-last' | 'signed-out'
export function leaveSheetKind(args: { signedIn: boolean; lastSaveFailed: boolean }): LeaveKind {
  if (!args.signedIn) return 'signed-out'
  return args.lastSaveFailed ? 'unsaved-last' : 'saved'
}

/** Signup page: send an already signed-in visitor on, but never during the sign up itself (S4). */
export function shouldRedirectSignedIn(a: { authLoading: boolean; hasSession: boolean; submitting: boolean; checkEmail: boolean }): boolean {
  return !a.authLoading && a.hasSession && !a.submitting && !a.checkEmail
}

// ---- the saver: serialized, closable, never throws ----

export interface DraftStore {
  /** Upsert the member's own row. Resolves true when the server accepted it. */
  save(userId: string, row: ReturnType<typeof draftToRow>): Promise<boolean>
  load(userId: string): Promise<DraftRow | null>
  remove(userId: string): Promise<boolean>
  /** Newest assessment created_at (ms) for the member, or null. */
  newestAssessmentAt(userId: string): Promise<number | null>
}

export type SaveStatus = 'idle' | 'saved' | 'failed'

export interface DraftSaver {
  save(s: Snapshot): Promise<boolean>
  /** Resolves when every queued save has finished. Never rejects. */
  flush(): Promise<void>
  /** Retry the newest unsaved snapshot (online event, tab visible again). No effect once closed. */
  retry(): Promise<boolean>
  /** After this no save reaches the server. Call before submit. */
  close(): void
  reopen(): void
  /** Submit succeeded: close, wait for saves in flight, delete the server draft and the mirror. */
  finish(): Promise<void>
  /** Delete the draft and mirror and forget the clock (Start over). */
  discard(): Promise<void>
  status(): SaveStatus
  isDirty(): boolean
}

export function createDraftSaver(o: {
  store: DraftStore
  userId: string
  storage: StorageLike | null
  now?: () => number
  onStatus?: (s: SaveStatus) => void
  /** Start the 7 day clock from an existing draft (resume). */
  createdAt?: number | null
  lastSavedAt?: number | null
}): DraftSaver {
  const now = o.now ?? (() => Date.now())
  let closed = false
  let chain: Promise<unknown> = Promise.resolve()
  let latest: Draft | null = null
  let dirty = false
  let status: SaveStatus = 'idle'
  let createdAt: number | null = o.createdAt ?? null
  let lastSavedAt: number | null = o.lastSavedAt ?? null

  const setStatus = (s: SaveStatus) => { status = s; o.onStatus?.(s) }

  function enqueue(): Promise<boolean> {
    const run = chain.then(async () => {
      if (closed || !latest) return false
      const d = latest
      let ok = false
      try { ok = await o.store.save(o.userId, draftToRow(o.userId, d)) } catch { ok = false }
      if (ok && latest === d) { dirty = false; setStatus('saved') }
      else if (!ok) setStatus('failed')
      return ok
    })
    chain = run.catch(() => false)
    return run
  }

  return {
    save(s) {
      if (closed) return Promise.resolve(false)
      const t = now()
      // A new draft starts when the old one has lapsed (48h of silence or past the 7 day cap), matching the database.
      if (createdAt === null || lastSavedAt === null || t >= lastSavedAt + DRAFT_ROLLING_MS || t >= createdAt + DRAFT_CAP_MS) createdAt = t
      lastSavedAt = t
      latest = { ...s, savedAt: t, createdAt }
      dirty = true
      writeMirror(o.storage, o.userId, latest)
      return enqueue()
    },
    flush: () => chain.then(() => undefined, () => undefined),
    retry() { return dirty && !closed && latest ? enqueue() : Promise.resolve(false) },
    close() { closed = true },
    reopen() { closed = false },
    async finish() {
      closed = true
      await chain.then(() => undefined, () => undefined)
      try { await o.store.remove(o.userId) } catch { /* the database trigger already cleared it on submit */ }
      clearMirror(o.storage, o.userId)
      latest = null; dirty = false; createdAt = null; lastSavedAt = null
    },
    async discard() {
      await chain.then(() => undefined, () => undefined)
      try { await o.store.remove(o.userId) } catch { /* ignore */ }
      clearMirror(o.storage, o.userId)
      latest = null; dirty = false; createdAt = null; lastSavedAt = null; setStatus('idle')
    },
    status: () => status,
    isDirty: () => dirty,
  }
}

/** Wait for a promise, but never longer than `ms` (a hung network must not block Submit). */
export function withTimeout<T>(p: Promise<T>, ms: number, fallback: T): Promise<T> {
  return new Promise<T>(resolve => {
    const t = setTimeout(() => resolve(fallback), ms)
    p.then(v => { clearTimeout(t); resolve(v) }, () => { clearTimeout(t); resolve(fallback) })
  })
}
