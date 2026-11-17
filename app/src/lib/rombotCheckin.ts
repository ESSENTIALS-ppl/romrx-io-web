// P1-17 (ledger L1031): day 3 ROMBot check-in, client side. The server (Avery, romrxbjj-v2 rombot-checkin, tip 3076398b)
// writes one ai_conversations row (sport "base", provider "rombot", no title, context_snapshot below) plus one ai_messages
// row (role "assistant", content = Stacy line 1 + "\n" + line 3) on the user's local day 3. The client only READS the
// user's own rows (RLS user_id = auth.uid()); it never writes either table. The day 3 timing is server side.
// context_snapshot = { kind: "checkin_d3", branch: "A"|"B"|"C", assessment_id, button: { label, path } }.
// Words: STACY-P1-17-DAY3-WORDS-20261116-0926.md (sha256 6fd272b6...) button labels (whitelisted below) and
// STACY-P1-17-CLIENT-WORDS-20261116-0958.md (sha256 9d8fe291...) items 1 and 2. The server note shows only inside ROMBot.
// Read state: there is no read column on ai_conversations, so "read" = opened on this device (localStorage) OR the user
// has replied in the check-in chat (works across devices).
import { supabase } from './supabase'

export const CHECKIN_KIND = 'checkin_d3'
export const CHECKIN_PROVIDER = 'rombot'
export const CHECKIN_SPORT = 'base'
/** Server APP_PATH (rombot-checkin/source/logic.ts). The button only ever opens this path. */
export const CHECKIN_PATH = '/dashboard/my-protocol?src=checkin-d3'
export type CheckinBranch = 'A' | 'B' | 'C'

/** Stacy "Final copy" button labels, byte for byte (shown without her [brackets]). */
export const CHECKIN_BUTTON_LABELS: Readonly<Record<CheckinBranch, string>> = {
  A: "Start today's session",
  B: "Start today's session",
  C: 'See my plan',
}

/** Stacy client words (STACY-P1-17-CLIENT-WORDS-20261116-0958.md, 9d8fe291, items 1 and 2), byte for byte.
 *  Item 1: the Today card shows this line INSTEAD of the note's first line, so the Today screen never shows a name, a
 *  session count or a focus area. Item 2: visually hidden label after the ROMBot tab name while the note is unread. */
export const CHECKIN_TODAY_LINE = 'ROMBot left you a note.'
export const CHECKIN_TAB_SR_LABEL = 'New note from ROMBot'

/** Existing app string (Settings, ResultsPreview, Unlock). Used when the check-in chat cannot be loaded. */
export const CHECKIN_LOAD_ERROR = 'Something went wrong. Please try again.'

export const CHECKIN_READ_EVENT = 'romrx:rombot-checkin-read'

export interface CheckinButton { label: string; path: string }
export interface Checkin {
  conversationId: string
  branch: CheckinBranch
  assessmentId: string | null
  button: CheckinButton | null
  /** First line of the server note (Stacy line 1, already filled in by the server). */
  line1: string
  /** The whole note as stored (line 1 + "\n" + line 3). */
  content: string
  replied: boolean
  createdAt: string
}

interface ConvRow { id: string; created_at?: string | null; provider?: string | null; sport?: string | null; context_snapshot?: unknown }
interface MsgRow { role: string; content: string | null; created_at?: string | null }

/** Validate the server snapshot. Anything off contract gives null (no button, no dot, no card). */
export function parseSnapshot(snap: unknown): { branch: CheckinBranch; assessmentId: string | null; button: CheckinButton | null } | null {
  if (!snap || typeof snap !== 'object') return null
  const s = snap as Record<string, unknown>
  if (s.kind !== CHECKIN_KIND) return null
  const branch = s.branch
  if (branch !== 'A' && branch !== 'B' && branch !== 'C') return null
  const b = s.button as Record<string, unknown> | undefined
  // Only Stacy's label for this branch and only the server path; never an arbitrary label or link.
  const button = b && b.label === CHECKIN_BUTTON_LABELS[branch] && b.path === CHECKIN_PATH
    ? { label: CHECKIN_BUTTON_LABELS[branch], path: CHECKIN_PATH }
    : null
  return { branch, assessmentId: typeof s.assessment_id === 'string' ? s.assessment_id : null, button }
}

export function buildCheckin(conv: ConvRow, msgs: MsgRow[]): Checkin | null {
  if (conv.provider !== CHECKIN_PROVIDER || conv.sport !== CHECKIN_SPORT) return null
  const snap = parseSnapshot(conv.context_snapshot)
  if (!snap) return null
  const note = msgs.find(m => m.role === 'assistant' && typeof m.content === 'string' && m.content.trim() !== '')
  if (!note || !note.content) return null
  const line1 = note.content.split('\n').map(l => l.trim()).filter(Boolean)[0] ?? ''
  return {
    conversationId: conv.id, branch: snap.branch, assessmentId: snap.assessmentId, button: snap.button,
    line1, content: note.content, replied: msgs.some(m => m.role === 'user'), createdAt: conv.created_at ?? '',
  }
}

export type CheckinLoad = { ok: true; checkin: Checkin | null } | { ok: false }

/** The user's newest day 3 check-in (own rows only). ok:false on any read error. */
export async function loadLatestCheckin(userId: string): Promise<CheckinLoad> {
  try {
    const { data: conv, error } = await supabase
      .from('ai_conversations')
      .select('id, created_at, provider, sport, context_snapshot')
      .eq('user_id', userId)
      .eq('provider', CHECKIN_PROVIDER)
      .eq('context_snapshot->>kind', CHECKIN_KIND)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) return { ok: false }
    if (!conv) return { ok: true, checkin: null }
    const { data: msgs, error: mErr } = await supabase
      .from('ai_messages')
      .select('role, content, created_at')
      .eq('conversation_id', (conv as ConvRow).id)
      .order('created_at', { ascending: true })
      .limit(50)
    if (mErr) return { ok: false }
    return { ok: true, checkin: buildCheckin(conv as ConvRow, (msgs ?? []) as MsgRow[]) }
  } catch {
    return { ok: false }
  }
}

export const readKey = (userId: string) => `romrx_rombot_checkin_read_${userId}`

function readIds(userId: string): string[] {
  try {
    const v = JSON.parse(localStorage.getItem(readKey(userId)) || '[]')
    return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : []
  } catch { return [] }
}

export function isCheckinUnread(userId: string, c: Checkin | null): boolean {
  if (!c || c.replied) return false
  return !readIds(userId).includes(c.conversationId)
}

export function markCheckinRead(userId: string, conversationId: string): void {
  try {
    const ids = readIds(userId)
    if (!ids.includes(conversationId)) localStorage.setItem(readKey(userId), JSON.stringify([...ids, conversationId].slice(-20)))
  } catch { /* storage off: the dot clears once the user replies */ }
  try { window.dispatchEvent(new CustomEvent(CHECKIN_READ_EVENT, { detail: { userId, conversationId } })) } catch { /* ignore */ }
}
