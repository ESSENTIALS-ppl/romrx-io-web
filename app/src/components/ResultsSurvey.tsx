// P1-18b: short optional survey at the bottom of the results screen (after the results and the Unlock button).
// Gated by SHOW_RESULTS_SURVEY (false): when off this renders nothing and makes no Supabase call.
// Never blocks the results or navigation (it sits below everything, nothing waits on it), shows once per assessment,
// never for a quick re-check, can be skipped, and fails quietly: a failed read hides it; a failed send hides it too
// (no error shown, not marked done).
import { useEffect, useState } from 'react'
import { CheckCircle2 } from 'lucide-react'
import { supabase } from '../lib/supabase'
import { cn } from '../lib/cn'
import {
  SHOW_RESULTS_SURVEY, P1_18B_WORDS as W, EASES, RESULTS_CLEARS, CHECK_AGAINS, EASE_LABEL, RESULTS_CLEAR_LABEL, CHECK_AGAIN_LABEL,
  ASSESSMENT_FEEDBACK_TABLE, answersComplete, buildAssessmentFeedbackRow, surveyEligible, readSurveyDone, markSurveyDone,
  type ResultsAnswers,
} from '../lib/resultsSurvey'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Client = { from: (t: string) => any }

interface Props {
  userId: string
  assessment: { id?: unknown; check_kind?: unknown } | null
  enabled?: boolean
  client?: Client
}

export function ResultsSurvey({ enabled = SHOW_RESULTS_SURVEY, ...rest }: Props) {
  if (!enabled || !rest.userId || !surveyEligible(rest.assessment)) return null
  return <ResultsSurveyInner userId={rest.userId} assessmentId={rest.assessment!.id as string} client={rest.client} />
}

function Row<T extends string>({ q, value, options, labels, onPick, id }: { q: string; value: T | null; options: readonly T[]; labels: Record<T, string>; onPick: (v: T) => void; id: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-semibold text-white/80">{q}</p>
      <div role="radiogroup" aria-label={q} className="flex gap-2 flex-wrap">
        {options.map(o => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            data-testid={`rs-${id}-${o}`}
            onClick={() => onPick(o)}
            className={cn(
              'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-white/60',
              value === o ? 'bg-white text-cobalt-ink' : 'bg-white/5 text-white border border-white/25 hover:bg-white/10',
            )}
          >
            {labels[o]}
          </button>
        ))}
      </div>
    </div>
  )
}

function ResultsSurveyInner({ userId, assessmentId, client = supabase as unknown as Client }: { userId: string; assessmentId: string; client?: Client }) {
  const [done, setDone] = useState(() => readSurveyDone(userId, assessmentId))
  const [ready, setReady] = useState(false)
  const [answers, setAnswers] = useState<ResultsAnswers>({ ease: null, results_clear: null, check_again: null })
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [failed, setFailed] = useState(false)

  // Hide if this assessment already has an answer (another device). Any read error keeps it hidden (quiet).
  useEffect(() => {
    if (done) return
    let cancelled = false
    ;(async () => {
      try {
        const { data, error } = await client.from(ASSESSMENT_FEEDBACK_TABLE).select('id')
          .eq('user_id', userId).eq('assessment_id', assessmentId).limit(1).maybeSingle()
        if (cancelled || error) return
        if (data?.id) { markSurveyDone(userId, assessmentId, 'sent'); setDone(true); return }
        setReady(true)
      } catch { /* quiet */ }
    })()
    return () => { cancelled = true }
  }, [client, userId, assessmentId, done])

  if (sent) {
    return (
      <div data-testid="results-survey-thanks" className="flex items-center gap-2 rounded-card px-3 py-2.5 text-sm font-medium bg-white/10 text-white">
        <CheckCircle2 size={14} />
        {W.thanks}
      </div>
    )
  }
  if (done || failed || !ready) return null

  const send = async (a: ResultsAnswers) => {
    if (!answersComplete(a) || sending) return
    setSending(true)
    try {
      const { error } = await client.from(ASSESSMENT_FEEDBACK_TABLE).insert(buildAssessmentFeedbackRow(userId, assessmentId, a))
      if (error && error.code !== '23505') { setFailed(true); return } // quiet: hide, no error text. 23505 = already answered
      markSurveyDone(userId, assessmentId, 'sent'); setSent(true)
    } catch {
      setFailed(true) // quiet: hide, no error text
    } finally {
      setSending(false)
    }
  }
  const pick = <K extends keyof ResultsAnswers>(k: K) => (v: NonNullable<ResultsAnswers[K]>) => {
    const next = { ...answers, [k]: v }
    setAnswers(next)
    void send(next) // Card 1: sends on the last of the 3 taps
  }
  const skip = () => { markSurveyDone(userId, assessmentId, 'skipped'); setDone(true) }

  return (
    <div data-testid="results-survey" className="bg-white/5 rounded-card border border-white/20 p-5 space-y-3 text-white">
      <p className="text-sm font-bold">{W.title}</p>
      <Row id="ease" q={W.qEase} value={answers.ease} options={EASES} labels={EASE_LABEL} onPick={pick('ease')} />
      <Row id="clear" q={W.qClear} value={answers.results_clear} options={RESULTS_CLEARS} labels={RESULTS_CLEAR_LABEL} onPick={pick('results_clear')} />
      <Row id="again" q={W.qAgain} value={answers.check_again} options={CHECK_AGAINS} labels={CHECK_AGAIN_LABEL} onPick={pick('check_again')} />
      <button type="button" data-testid="rs-skip" onClick={skip} className="text-xs font-semibold text-white/60 hover:text-white">
        {W.skip}
      </button>
    </div>
  )
}
