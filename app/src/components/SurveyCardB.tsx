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
  cycleCard,
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

/**
 * Survey card B: inline card on My Body (the profile reveal), never a blocking modal.
 * Renders nothing unless VITE_SURVEY_CARD_B=on and the user just finished an assessment (lib/surveyB.ts).
 */
export function SurveyCardB(props: Props) {
  const enabled = surveyCardBEnabled()
  const [state, setState] = useState<
    { s: 'hidden' } | { s: 'asking' | 'sent'; moment: SurveyMoment; cycle: number; assessmentId: string }
  >({ s: 'hidden' })
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
      setState({ s: 'asking', moment: e.moment, cycle: e.cycle, assessmentId: e.assessmentId })
    })()
    return () => { alive = false }
  }, [enabled, latestId, props.userId]) // eslint-disable-line react-hooks/exhaustive-deps

  if (state.s === 'hidden') return null
  const { moment, cycle, assessmentId } = state

  const skip = () => {
    lsSet(STORE.quietUntil, String(noThanksQuietUntil(Date.now())))
    lsSet(STORE.done(assessmentId), '1')
    track('survey_b_no_thanks', { moment })
    setState({ s: 'hidden' })
  }

  const send = async (a: SurveyAnswers) => {
    if (sending) return
    setSending(true); setError('')
    const row = buildSurveyFeedbackRow({
      userId: props.userId, email: props.email, moment, cycle, assessmentId,
      overallBand: props.overallBand, bandMix: props.bandMix, top3: props.top3,
      pageUrl: window.location.pathname,
    }, a)
    const { error: err } = await supabase.from('client_feedback').insert(row)
    setSending(false)
    if (err) { setError(C.error); return }
    lsSet(STORE.done(assessmentId), '1')
    lsSet(STORE.lastComplete, String(Date.now()))
    track('survey_b_completed', { moment, cycle })
    setState({ s: 'sent', moment, cycle, assessmentId })
  }

  const cc = moment === 'reassess' ? cycleCard(cycle) : null
  const copy = moment === 'first' ? C.first : cc ? { title: C.cycles.header, skip: C.cycles.skip, after: C.cycles.footer } : C.reassess
  const wrap = (children: React.ReactNode) => (
    <section data-testid="survey-card-b" data-moment={moment} aria-label={copy.title} className="rounded-card border border-cobalt/10 bg-white p-4 space-y-3">
      <h2 className="font-display font-bold text-cobalt-ink text-base">{copy.title}</h2>
      {children}
    </section>
  )
  if (state.s === 'sent') return wrap(<p role="status" className="text-sm text-slate-600">{copy.after}</p>)

  const taps = (q: { id: string; prompt: string; options?: readonly string[] }, onPick: (o: string) => void) => (
    <div key={q.id} className="space-y-2">
      <p className="text-sm font-semibold text-cobalt-ink leading-snug">{q.prompt}</p>
      <div role="radiogroup" aria-label={q.prompt} className="flex flex-wrap gap-2">
        {(q.options ?? []).map(opt => {
          const on = answers[q.id as 'q1'] === opt
          return (
            <button key={opt} type="button" role="radio" aria-checked={on} disabled={sending} onClick={() => onPick(opt)}
              className={cn('text-sm rounded-lg border px-3 min-h-[44px]', on ? 'border-cobalt bg-cobalt-light text-cobalt-ink' : 'border-slate-200 bg-white text-cobalt-ink')}
            >{opt}</button>
          )
        })}
      </div>
    </div>
  )
  const err = error && <p role="alert" className="text-xs text-red-700 bg-red-50 rounded-lg px-3 py-2">{error}</p>
  const skipBtn = <button type="button" className="text-sm text-slate-600 underline min-h-[44px] px-2" onClick={skip}>{copy.skip}</button>

  if (moment === 'first') {
    const qs = C.first.questions
    return wrap(
      <>
        {qs.map(q => taps(q, opt => {
          const next = { ...answers, [q.id]: opt }
          setAnswers(next)
          if (qs.every(x => next[x.id])) void send(next)
        }))}
        {err}
        <div className="flex gap-2">{skipBtn}</div>
      </>,
    )
  }

  if (cc) {
    return wrap(
      <>
        <p className="text-sm text-slate-600">{C.cycles.sub}</p>
        {taps(cc.q1, opt => setAnswers(a => ({ ...a, q1: opt })))}
        {taps(cc.q2, opt => setAnswers(a => ({ ...a, q2: opt, recruit_ok: cycle === 4 ? opt === 'Yes' : undefined })))}
        {cc.q2SmallPrint && <p data-testid="survey-b-chat-note" className="text-xs text-slate-500">{cc.q2SmallPrint}</p>}
        <div className="space-y-1">
          <textarea maxLength={280} rows={2} aria-label={cc.text} placeholder={cc.text} value={answers.q4 ?? ''}
            onChange={e => setAnswers(a => ({ ...a, q4: e.target.value }))}
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
          <p className="text-xs text-slate-500">{C.cycles.noHealth}</p>
        </div>
        {err}
        <div className="flex flex-wrap gap-2 pt-1">
          <button type="button" disabled={sending || !(answers.q1 || answers.q2 || answers.q4?.trim())} className="btn-primary text-sm min-h-[44px] px-4 disabled:opacity-50" onClick={() => void send(answers)}>{C.cycles.send}</button>
          {skipBtn}
        </div>
      </>,
    )
  }

  const r = C.reassess
  return wrap(
    <>
      <p className="text-sm text-slate-600 leading-relaxed">{r.body}</p>
      <textarea maxLength={280} rows={2} aria-label={r.body} placeholder={r.placeholder} value={answers.q4 ?? ''}
        onChange={e => setAnswers(a => ({ ...a, q4: e.target.value }))}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm" />
      {taps(r.tap, opt => setAnswers(a => ({ ...a, q1: a.q1 === opt ? undefined : opt })))}
      <p className="text-xs text-slate-500">{r.smallPrint}</p>
      {err}
      <div className="flex flex-wrap gap-2 pt-1">
        <button type="button" disabled={sending || !(answers.q4?.trim() || answers.q1)} className="btn-primary text-sm min-h-[44px] px-4 disabled:opacity-50" onClick={() => void send(answers)}>{r.send}</button>
        {skipBtn}
      </div>
    </>,
  )
}
