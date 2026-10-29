import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { markPromptShown, otherPromptShown, otherPromptVisible } from '../lib/promptSession'
import {
  SURVEY_B_COPY as C,
  STORE,
  buildSurveyFeedbackRow,
  noThanksQuietUntil,
  surveyBEligibility,
  surveyCardBEnabled,
  type SurveyAnswers,
  type SurveyContext,
  type SurveyMoment,
} from '../lib/surveyB'
import type { BandScore } from '../lib/mobilityBands'
import { track } from '../lib/track'
import { cn } from '../lib/cn'

interface Props {
  userId: string
  email: string | null
  /** Newest first (useProfile order). */
  assessments: ReadonlyArray<{ id: string; assessed_at: string }>
  overallBand: BandScore | null
  bandMix: SurveyContext['bandMix']
  top3: string[]
}

function lsGet(k: string): string | null { try { return localStorage.getItem(k) } catch { return null } }
function lsSet(k: string, v: string) { try { localStorage.setItem(k, v) } catch { /* ignore */ } }
function ssGet(k: string): string | null { try { return sessionStorage.getItem(k) } catch { return null } }
function ssSet(k: string, v: string) { try { sessionStorage.setItem(k, v) } catch { /* ignore */ } }

/**
 * Survey card B: inline card on My Body (the profile reveal), never a blocking modal.
 * Renders nothing unless VITE_SURVEY_CARD_B=on and the user just finished an assessment (lib/surveyB.ts).
 */
export function SurveyCardB(props: Props) {
  const enabled = surveyCardBEnabled()
  const [state, setState] = useState<
    { s: 'hidden' } | { s: 'intro' | 'asking' | 'sent'; moment: SurveyMoment; cycle: number; assessmentId: string }
  >({ s: 'hidden' })
  const [step, setStep] = useState(0)
  const [answers, setAnswers] = useState<SurveyAnswers>({})
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const latestId = props.assessments[0]?.id ?? ''

  useEffect(() => {
    if (!enabled || !latestId) return
    let alive = true
    ;(async () => {
      // Server cap: last survey complete by this user (RLS: select own rows only).
      let serverLast: number | null = null
      const { data } = await supabase
        .from('client_feedback')
        .select('created_at')
        .eq('user_id', props.userId)
        .eq('category', 'survey')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (data?.created_at) serverLast = new Date(data.created_at).getTime()
      if (!alive) return
      const now = Date.now()
      const quiet = Number(lsGet(STORE.quietUntil) ?? '') || null
      const last = Number(lsGet(STORE.lastComplete) ?? '') || null
      const e = surveyBEligibility({
        enabled,
        assessments: props.assessments,
        now,
        otherPromptThisSession: otherPromptShown('survey_b') || otherPromptVisible('survey_b'),
        serverLastCompleteAt: serverLast,
        local: {
          done: lsGet(STORE.done(latestId)) === '1',
          laterCount: Number(lsGet(STORE.later(latestId)) ?? '0') || 0,
          laterThisSession: ssGet(STORE.laterSession) === '1',
          quietUntil: quiet,
          lastComplete: last,
        },
      })
      if (!e.show) return
      markPromptShown('survey_b')
      track('survey_b_shown', { moment: e.moment, cycle: e.cycle })
      setState({ s: 'intro', moment: e.moment, cycle: e.cycle, assessmentId: e.assessmentId })
    })()
    return () => { alive = false }
  }, [enabled, latestId, props.userId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.s === 'hidden') return null
  const { moment, cycle, assessmentId } = state
  const questions = C.questions[moment]
  const total = questions.length

  const askLater = () => {
    lsSet(STORE.later(assessmentId), String((Number(lsGet(STORE.later(assessmentId)) ?? '0') || 0) + 1))
    ssSet(STORE.laterSession, '1')
    track('survey_b_later', { moment })
    setState({ s: 'hidden' })
  }
  const noThanks = () => {
    lsSet(STORE.quietUntil, String(noThanksQuietUntil(Date.now())))
    lsSet(STORE.done(assessmentId), '1')
    track('survey_b_no_thanks', { moment })
    setState({ s: 'hidden' })
  }

  const send = async () => {
    if (sending) return
    setSending(true); setError('')
    const row = buildSurveyFeedbackRow({
      userId: props.userId, email: props.email, moment, cycle, assessmentId,
      overallBand: props.overallBand, bandMix: props.bandMix, top3: props.top3,
      pageUrl: window.location.pathname,
    }, answers)
    const { error: err } = await supabase.from('client_feedback').insert(row)
    setSending(false)
    if (err) { setError(C.error); return }
    const now = Date.now()
    lsSet(STORE.done(assessmentId), '1')
    lsSet(STORE.lastComplete, String(now))
    track('survey_b_completed', { moment, cycle, recruit_ok: answers.recruit_ok === true })
    setState({ s: 'sent', moment, cycle, assessmentId })
  }

  const wrap = (children: React.ReactNode) => (
    <section data-testid="survey-card-b" aria-label={C.title} className="rounded-card border border-cobalt/10 bg-white p-4 space-y-3">
      <h2 className="font-display font-bold text-cobalt-ink text-base">{C.title}</h2>
      {children}
    </section>
  )

  if (state.s === 'sent') {
    return wrap(<p role="status" className="text-sm text-slate-600">{C.sent}</p>)
  }

  if (state.s === 'intro') {
    return wrap(
      <>
        <p className="text-sm text-slate-600 leading-relaxed">{C.intro[moment]}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-primary text-sm min-h-[44px] px-4" onClick={() => setState({ ...state, s: 'asking' })}>{C.start}</button>
          <button type="button" className="text-sm text-slate-600 underline min-h-[44px] px-2" onClick={askLater}>{C.askLater}</button>
          <button type="button" className="text-sm text-slate-600 underline min-h-[44px] px-2" onClick={noThanks}>{C.noThanks}</button>
        </div>
      </>,
    )
  }

  const q = questions[step]
  const value = answers[q.id]
  const otherKey = q.id === 'q2' ? 'q2_other' : q.id === 'q3' ? 'q3_other' : null
  const isLast = step === total - 1
  const choose = (opt: string) => {
    setAnswers(a => ({ ...a, [q.id]: opt }))
    if (opt !== q.otherOption && !isLast) setStep(s => s + 1)
  }
  const hint = <p className="text-xs text-slate-500">{C.noHealthDetails}</p>

  return wrap(
    <>
      <p className="text-xs font-semibold text-slate-500" aria-live="polite">{C.progress(step + 1, total)}</p>
      <p className="text-sm font-semibold text-cobalt-ink leading-snug">{q.prompt}</p>
      {q.why && <p className="text-xs text-slate-500">{q.why}</p>}
      {q.options && (
        <div role="radiogroup" aria-label={q.prompt} className="flex flex-col gap-2">
          {q.options.map(opt => (
            <button
              key={opt}
              type="button"
              role="radio"
              aria-checked={value === opt}
              onClick={() => choose(opt)}
              className={cn('text-left text-sm rounded-lg border px-3 min-h-[44px]',
                value === opt ? 'border-cobalt bg-cobalt-light text-cobalt-ink' : 'border-slate-200 bg-white text-cobalt-ink')}
            >{opt}</button>
          ))}
        </div>
      )}
      {q.otherOption && value === q.otherOption && otherKey && (
        <div className="space-y-1">
          <input
            type="text"
            maxLength={200}
            aria-label={C.otherPlaceholder}
            placeholder={C.otherPlaceholder}
            value={answers[otherKey] ?? ''}
            onChange={e => setAnswers(a => ({ ...a, [otherKey]: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          {hint}
        </div>
      )}
      {q.id === 'q4' && (
        <div className="space-y-2">
          <div className="space-y-1">
            <textarea
              maxLength={280}
              rows={2}
              aria-label={q.prompt}
              placeholder={C.sentencePlaceholder}
              value={answers.q4 ?? ''}
              onChange={e => setAnswers(a => ({ ...a, q4: e.target.value }))}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            />
            {hint}
          </div>
          <label className="flex items-start gap-2 text-sm text-cobalt-ink cursor-pointer min-h-[44px]">
            <input
              type="checkbox"
              data-testid="survey-b-recruit"
              checked={answers.recruit_ok === true}
              onChange={e => setAnswers(a => ({ ...a, recruit_ok: e.target.checked }))}
              className="mt-1 h-4 w-4"
            />
            <span>{C.recruit}</span>
          </label>
        </div>
      )}
      {error && <p role="alert" className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>}
      <div className="flex flex-wrap gap-2 pt-1">
        {step > 0 && (
          <button type="button" className="text-sm text-slate-600 underline min-h-[44px] px-2" onClick={() => setStep(s => s - 1)}>{C.back}</button>
        )}
        {!isLast && (
          <button type="button" className="text-sm text-slate-600 underline min-h-[44px] px-2" onClick={() => setStep(s => s + 1)}>
            {value ? C.next : C.skip}
          </button>
        )}
        {isLast && (
          <button type="button" disabled={sending} className="btn-primary text-sm min-h-[44px] px-4 disabled:opacity-50" onClick={send}>
            {sending ? C.sending : C.send}
          </button>
        )}
      </div>
    </>,
  )
}
