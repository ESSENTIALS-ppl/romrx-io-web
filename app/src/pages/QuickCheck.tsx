// P1-06 quick check screen (/dashboard/quick-check). Behind QUICK_CHECK_ON (false): see lib/quickCheck.ts for the ship gate.
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
import {
  QUICK_CHECK_ON, QUICK_CHECK_COPY as Q, quickCheckSteps, jointName, jointList, formatValue, compareLine,
  nextCheckLine, quickSubmitBody, lastFullAssessment, type Schedule,
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
      const [{ data: sch, error: sErr }, { data: rows }] = await Promise.all([
        supabase.from('user_mobility_schedule').select('next_check_at, next_retest_at, check_joints, last_assessed_at').eq('user_id', user.id).maybeSingle(),
        supabase.from('assessments').select('*').eq('user_id', user.id).order('assessed_at', { ascending: false }).limit(10),
      ])
      if (cancelled) return
      const s = (sErr ? null : sch) as Schedule | null
      if (!s?.check_joints?.length) { setGone(true); return }
      setSchedule(s)
      setDay1(lastFullAssessment((rows ?? []) as Record<string, unknown>[]))
      setPhase('intro')
    })()
    return () => { cancelled = true }
  }, [user?.id])

  const steps = useMemo(() => quickCheckSteps(STEPS, schedule?.check_joints), [schedule])
  const names = useMemo(() => steps.flatMap(s => s.fields.map(f => jointName(s, f))), [steps])

  if (gone) return <Navigate to={TODAY} replace />
  if (phase === 'loading') return <Spinner />

  const submit = async () => {
    if (!session?.access_token || !schedule?.check_joints) return
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
      if (!res.ok || !data.ok) { setError('Something went wrong. Please try again.'); return }
      track('quick_check_completed', { joints: schedule.check_joints.length })
      const { data: sch } = await supabase.from('user_mobility_schedule').select('next_check_at, next_retest_at, check_joints, last_assessed_at').eq('user_id', user!.id).maybeSingle()
      if (sch) setSchedule(sch as Schedule)
      setPhase('result')
    } catch {
      setLoading(false)
      setError('Something went wrong. Please try again.')
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
    const next = nextCheckLine(schedule)
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
