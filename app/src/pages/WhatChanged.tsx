// P1-11: "What changed" after a retest. Redirects to My Body when there are no words yet or fewer than two full assessments.
import { useEffect, useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { supabase } from '../lib/supabase'
import { Spinner } from '../components/Spinner'
import { track } from '../lib/track'
import { gateAssessment, gateJointScores } from '../lib/hipFlexGate'
import type { JointScoreRow } from '../lib/mobilityBands'
import { loadHipScoredIds } from '../lib/hipFlexCutover'
import { WHAT_CHANGED_COPY, compareAssessments, fullAssessmentsNewestFirst, type Comparison, type JointChange } from '../lib/whatChanged'

export function WhatChanged() {
  const copy = WHAT_CHANGED_COPY
  const { user } = useAuth()
  const navigate = useNavigate()
  const [state, setState] = useState<'loading' | 'none' | 'ready'>('loading')
  const [cmp, setCmp] = useState<Comparison | null>(null)

  useEffect(() => {
    if (!copy || !user) return
    let cancelled = false
    ;(async () => {
      const { data } = await supabase.from('assessments').select('*').eq('user_id', user.id).order('assessed_at', { ascending: false }).limit(10)
      const rows = fullAssessmentsNewestFirst((data ?? []) as Record<string, unknown>[])
      if (rows.length < 2) { if (!cancelled) setState('none'); return }
      const [latest, previous] = rows
      const ids = [latest.id, previous.id].filter((x): x is string => typeof x === 'string')
      // Same inputs as My Body (useProfile): the latest assessment's joint_scores rows, gated against the raw latest row
      const [hip, scoresRes] = await Promise.all([
        loadHipScoredIds(ids),
        supabase.from('joint_scores')
          .select('joint_key, score, left_value, right_value, asymmetry_pct, asymmetry_flag')
          .eq('assessment_id', String(latest.id)),
      ])
      if (cancelled) return
      const latestScores = gateJointScores(latest, (scoresRes.error ? [] : (scoresRes.data ?? [])) as JointScoreRow[])
      setCmp(compareAssessments(gateAssessment(previous, hip), gateAssessment(latest, hip), null, latestScores))
      setState('ready')
      track('what_changed_viewed', {})
    })()
    return () => { cancelled = true }
  }, [copy, user])

  if (!copy || state === 'none') return <Navigate to="/dashboard/my-body" replace />
  if (state === 'loading' || !cmp) return <div className="flex justify-center py-16"><Spinner /></div>

  const section = (heading: string, list: JointChange[], tone: string) => list.length > 0 && (
    <div className="bg-white rounded-xl border border-slate-200 p-4">
      <h2 className={`text-sm font-bold mb-2 ${tone}`}>{heading}</h2>
      <ul className="space-y-1.5">
        {list.map(c => <li key={c.key} className="text-sm text-slate-700">{copy.jointLine(c.label, c.before, c.now)}</li>)}
      </ul>
    </div>
  )

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-4" data-testid="what-changed">
      <h1 className="text-xl font-bold text-cobalt-ink">{copy.title}</h1>
      <p className="text-base font-semibold text-slate-800">{copy.overallLine(cmp.overall.before, cmp.overall.now)}</p>
      {section(copy.improvedHeading, cmp.improved, 'text-emerald-700')}
      {section(copy.sameHeading, cmp.same, 'text-slate-700')}
      {section(copy.lowerHeading, cmp.lower, 'text-amber-700')}
      <button type="button" onClick={() => navigate('/dashboard/my-protocol')} className="w-full rounded-xl bg-cobalt text-white font-bold py-3">{copy.cta}</button>
    </div>
  )
}
