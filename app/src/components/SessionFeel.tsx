// P1-18: "How did that feel?" under "Completed today", with a short optional survey.
// Gated by SHOW_SESSION_FEEDBACK (false): when off this renders nothing and makes no Supabase call.
// Never blocks finishing a session (it only shows after the session is saved), shows once per session,
// can be skipped, and fails quietly: a failed read hides it; a failed send hides it too (no error shown, not marked done).
import { useEffect, useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/cn'
import {
  SHOW_SESSION_FEEDBACK, P1_18_WORDS as W, FEELS, CLEARS, LENGTH_FITS, NOTE_MAX,
  FEEL_LABEL, CLEAR_LABEL, LENGTH_LABEL, SESSION_FEEDBACK_TABLE,
  buildFeedbackRow, readFeelDone, markFeelDone, isAlreadySent,
  type Feel, type Clear, type LengthFit,
} from '../lib/sessionFeedback'

// Minimal client surface so tests can pass a fake; the app passes the real supabase client.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = { from: (t: string) => any }

interface Props {
  userId: string
  sessionDate: string
  /** Changes when the session write lands (dbSessionCount), so the session id is looked up again. */
  refreshKey?: number
  enabled?: boolean
  client?: Client
}

export function SessionFeel({ enabled = SHOW_SESSION_FEEDBACK, ...rest }: Props) {
  if (!enabled) return null
  return <SessionFeelInner {...rest} />
}

function Choice<T extends string>({ value, options, labels, onPick, name }: { value: T | null; options: readonly T[]; labels: Record<T, string>; onPick: (v: T) => void; name: string }) {
  return (
    <div role="radiogroup" aria-label={name} className="flex gap-2 flex-wrap">
      {options.map(o => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={value === o}
          data-testid={`sf-${o}`}
          onClick={() => onPick(o)}
          className={cn(
            'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-cobalt',
            value === o ? 'bg-cobalt text-white' : 'bg-white text-cobalt-ink border border-slate-200 hover:bg-slate-50',
          )}
        >
          {labels[o]}
        </button>
      ))}
    </div>
  )
}

function SessionFeelInner({ userId, sessionDate, refreshKey = 0, client = supabase as unknown as Client }: Omit<Props, 'enabled'>) {
  const [done, setDone] = useState(() => readFeelDone(userId, sessionDate))
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [feel, setFeel] = useState<Feel | null>(null)
  const [surveyOpen, setSurveyOpen] = useState(false)
  const [clear, setClear] = useState<Clear | null>(null)
  const [lengthFit, setLengthFit] = useState<LengthFit | null>(null)
  const [note, setNote] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => { setDone(readFeelDone(userId, sessionDate)); setSent(false) }, [userId, sessionDate])

  // Find today's saved session, then hide if it already has feedback. Any read error keeps it hidden (quiet).
  useEffect(() => {
    if (!userId || !sessionDate || done) return
    let cancelled = false
    ;(async () => {
      try {
        const { data: s, error: sErr } = await client.from('protocol_sessions').select('id')
          .eq('user_id', userId).eq('session_date', sessionDate).limit(1).maybeSingle()
        if (cancelled || sErr || !s?.id) return
        const { data: f, error: fErr } = await client.from(SESSION_FEEDBACK_TABLE).select('id')
          .eq('user_id', userId).eq('session_id', s.id).limit(1).maybeSingle()
        if (cancelled || fErr) return
        if (f?.id) { markFeelDone(userId, sessionDate, 'sent'); setDone(true); return }
        setSessionId(s.id as string)
      } catch { /* quiet */ }
    })()
    return () => { cancelled = true }
  }, [client, userId, sessionDate, refreshKey, done])

  if (sent) {
    return (
      <div data-testid="session-feel-thanks" className="flex items-center gap-2 rounded-card px-3 py-2.5 text-sm font-medium bg-cobalt-light text-cobalt">
        <CheckCircle2 size={14} />
        {W.thanks}
      </div>
    )
  }
  if (done || failed || !sessionId) return null

  const skip = () => { markFeelDone(userId, sessionDate, 'skipped'); setDone(true) }

  const send = async () => {
    if (!feel || sending) return
    setSending(true)
    try {
      const row = buildFeedbackRow(userId, sessionId, sessionDate, feel, { clear, length_fit: lengthFit, note })
      const { error } = await client.from(SESSION_FEEDBACK_TABLE).insert(row)
      if (error && !isAlreadySent(error)) { setFailed(true); return } // quiet: hide, no error text
      markFeelDone(userId, sessionDate, 'sent'); setSent(true)
    } catch {
      setFailed(true) // quiet: hide, no error text
    } finally {
      setSending(false)
    }
  }

  return (
    <div data-testid="session-feel" className="rounded-card border border-cobalt/20 bg-white p-4 space-y-3 text-cobalt-ink">
      <p className="text-sm font-bold">{W.title}</p>
      <Choice name={W.title} value={feel} options={FEELS} labels={FEEL_LABEL} onPick={setFeel} />
      {surveyOpen ? (
        <div data-testid="session-feel-survey" className="space-y-3">
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">{W.qClear}</p>
            <Choice name={W.qClear} value={clear} options={CLEARS} labels={CLEAR_LABEL} onPick={setClear} />
          </div>
          <div className="space-y-1.5">
            <p className="text-xs font-semibold">{W.qLength}</p>
            <Choice name={W.qLength} value={lengthFit} options={LENGTH_FITS} labels={LENGTH_LABEL} onPick={setLengthFit} />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="session-feel-note" className="text-xs font-semibold block">{W.noteLabel}</label>
            <textarea
              id="session-feel-note"
              data-testid="sf-note"
              aria-describedby="session-feel-note-help"
              value={note}
              onChange={e => setNote(e.target.value.slice(0, NOTE_MAX))}
              maxLength={NOTE_MAX}
              rows={2}
              className="input resize-y"
            />
            <p id="session-feel-note-help" data-testid="sf-note-help" className="text-xs text-slate-600">{W.noteHelp}</p>
          </div>
        </div>
      ) : (
        <button type="button" data-testid="sf-more" onClick={() => setSurveyOpen(true)} className="text-xs font-semibold text-cobalt underline">
          {W.more}
        </button>
      )}
      <div className="flex items-center gap-3">
        <button
          type="button"
          data-testid="sf-send"
          onClick={send}
          disabled={!feel || sending}
          className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
        >
          {sending && <Loader2 size={15} className="animate-spin" />}
          {sending ? W.sending : W.send}
        </button>
        <button type="button" data-testid="sf-skip" onClick={skip} className="text-xs font-semibold text-slate-500 hover:text-cobalt">
          {W.notNow}
        </button>
      </div>
    </div>
  )
}
