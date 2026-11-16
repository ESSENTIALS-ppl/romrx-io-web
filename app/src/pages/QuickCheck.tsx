// P1-06 quick check screen (/dashboard/quick-check). Behind QUICK_CHECK_ON (false): see lib/quickCheck.ts for the ship gate
// (Avery romrxbjj-v2 65c3a036 compute-tiers guard and submit-assessment quick path, plus bda32302 server quick-skip).
import { useEffect, useMemo, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { track } from '../lib/track'
import { Spinner } from '../components/Spinner'
import { STOP_LINE } from '../lib/stopLine'
import { STEPS } from './assessmentSteps'
import { AssessmentMeasureScreen } from './AssessmentMeasureScreen'
import { loadQuickContext } from '../lib/quickCheckLoad'
import {
  QUICK_CHECK_ON, QUICK_CHECK_COPY as Q, quickCheckSteps, jointName, jointList, formatValue, compareLine,
  nextCheckLineInCycle, quickSubmitBody, dayOneAssessment, SCHEDULE_COLUMNS, quickCheckPageGate, quickSubmitOutcome, GENERIC_ERROR,
  type QuickContext, type Schedule,
} from '../lib/quickCheck'

const SUBMIT_ASSESSMENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-assessment`
const TODAY = '/dashboard/my-protocol'

type Phase = 'loading' | 'intro' | 'measure' | 'result'

export function QuickCheck() {
  if (!QUICK_CHECK_ON) return <Navigate to={TODAY} replace />
  return <QuickCheckInner />
}

function QuickCheckInner() {
  const { session, user } = useAuth()
  const { profile } = useProfile(user?.id)
  const navigate = useNavigate()
  const [phase, setPhase] = useState<Phase>('loading')
  const [schedule, setSchedule] = useState<Schedule | null>(null)
  const [ctx, setCtx] = useState<QuickContext>({})
  const [day1, setDay1] = useState<Record<string, unknown> | null>(null)
  const [stepIdx, setStepIdx] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [gone, setGone] = useState(false)

  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      const [load, { data: rows }] = await Promise.all([
        loadQuickContext(user.id).catch(() => null),
        supabase.from('assessments').select('*').eq('user_id', user.id).order('assessed_at', { ascending: false }).limit(10),
      ])
      if (cancelled) return
      const s = load && !load.failed ? load.schedule : null
      // v4 gate (Avery 34835f66 window): outside local days 7 to 14, or a quick check already done this cycle, go to Today with no form.
      if (!s || !load || load.failed || quickCheckPageGate(s, new Date(), load.ctx) !== 'intro') { setGone(true); return }
      setCtx(load.ctx)
      setSchedule(s)
      // Assessments read with select('*') and filtered in code, so it works before and after 20261116031000 adds check_kind.
      setDay1(dayOneAssessment((rows ?? []) as Record<string, unknown>[], s.last_assessment_id))
      setPhase('intro')
    })()
    return () => { cancelled = true }
  }, [user?.id])

  const steps = useMemo(() => quickCheckSteps(STEPS, schedule?.check_joints), [schedule])
  const names = useMemo(() => steps.flatMap(s => s.fields.map(f => jointName(s, f))), [steps])

  if (gone) return <Navigate to={TODAY} replace />
  if (phase === 'loading') return <Spinner />

  const submit = async () => {
    // v4: no sign-in token shows the existing generic line instead of doing nothing.
    if (!session?.access_token) { setError(GENERIC_ERROR); return }
    if (!schedule?.check_joints) return
    setLoading(true); setError('')
    try {
      const res = await fetch(SUBMIT_ASSESSMENT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify(quickSubmitBody(values, schedule.check_joints)),
      })
      const data = await res.json().catch(() => ({ ok: false }))
      setLoading(false)
      // 65c3a036 / 34835f66: 200 { ok: true, check_kind: 'quick', ... }. The window 400 'No quick re-check is scheduled'
      // goes to Today (no retry loop); any other failure shows the existing generic line.
      const outcome = quickSubmitOutcome(res.status, data)
      if (outcome.kind === 'today') { navigate(TODAY, { replace: true }); return }
      if (outcome.kind === 'error') { setError(outcome.message); return }
      track('quick_check_completed', { joints: schedule.check_joints.length })
      const { data: sch } = await supabase.from('user_mobility_schedule').select(SCHEDULE_COLUMNS).eq('user_id', user!.id).maybeSingle()
      if (sch) setSchedule(sch as Schedule)
      setPhase('result')
    } catch {
      setLoading(false)
      setError(GENERIC_ERROR)
    }
  }

  if (phase === 'measure') {
    return (
      <AssessmentMeasureScreen
        steps={steps}
        beforeMeasure={1}
        onBackFirst={() => setPhase('intro')}
        stepIdx={stepIdx}
        values={values}
        loading={loading}
        error={error}
        setPhase={() => setPhase('intro')}
        setStepIdx={setStepIdx}
        handleChange={(k, v) => setValues(p => ({ ...p, [k]: v }))}
        handleNext={() => { if (stepIdx < steps.length - 1) { setStepIdx(i => i + 1); window.scrollTo({ top: 0 }) } else submit() }}
        gender={profile?.gender}
      />
    )
  }

  if (phase === 'result') {
    const next = nextCheckLineInCycle(schedule, new Date(), { ...ctx, quickDone: true })
    return (
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4" data-testid="quick-check-result">
        <h1 className="font-display font-bold text-2xl text-cobalt-ink">{Q.resultTitle}</h1>
        <div className="space-y-3">
          {steps.flatMap(s => s.fields.map(f => {
            const before = typeof day1?.[f.key] === 'number' ? (day1[f.key] as number) : null
            const nowV = values[f.key] ? parseFloat(values[f.key]) : null
            return (
              <div key={f.key} className="rounded-card bg-white border border-slate-200 p-4">
                <p className="text-sm font-semibold text-cobalt-ink">{jointName(s, f)}</p>
                <p className="text-sm text-slate-600 mt-1">
                  <span className="mr-4">{Q.day1(before === null ? '' : formatValue(before, f.unit))}</span>
                  <span>{Q.now(nowV === null ? '' : formatValue(nowV, f.unit))}</span>
                </p>
                {before !== null && nowV !== null && <p className="text-xs text-slate-500 mt-1">{compareLine(before, nowV, f.unit)}</p>}
              </div>
            )
          }))}
        </div>
        <p className="text-xs text-slate-500">{Q.note}</p>
        {next && <p className="text-sm font-semibold text-cobalt-ink">{next}</p>}
        <button type="button" className="btn-primary w-full" onClick={() => navigate(TODAY, { replace: true })}>{Q.back}</button>
        {/* "Add to my calendar" stays hidden until P1-12 is live (Stacy D). */}
      </div>
    )
  }

  return (
    <div className="max-w-lg mx-auto px-4 py-6 space-y-4" data-testid="quick-check-intro">
      <h1 className="font-display font-bold text-2xl text-cobalt-ink">{Q.introTitle}</h1>
      <p className="text-sm text-slate-600 leading-relaxed">{Q.introBody(jointList(names))}</p>
      <p className="text-sm text-slate-600 leading-relaxed">{Q.introSecond}</p>
      <p className="text-sm font-semibold text-cobalt-ink">{STOP_LINE}</p>
      <div className="flex gap-3">
        <button type="button" className="btn-primary flex-1" onClick={() => { setStepIdx(0); setPhase('measure') }}>{Q.start}</button>
        <button type="button" className="btn-ghost flex-1" onClick={() => navigate(TODAY)}>{Q.notNow}</button>
      </div>
    </div>
  )
}
