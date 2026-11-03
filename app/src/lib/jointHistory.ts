import { useEffect, useState } from 'react'
import { supabase } from './supabase'
import { radarSideRowsForAssessment, ASSESSMENT_JOINTS } from './mobilityBands'
import { gateJointScores } from './hipFlexGate'

// FG-08: per-joint trend data from Avery's read-only rpcs (my_joint_history, my_joint_start_vs_now). Signed-in user only.
// If an rpc is missing or errors, the hook returns null for it and the page keeps its own on-device trend (silent fallback, no new text).

export type HistoryRow = {
  assessment_id: string
  assessed_at: string
  joint_key: string
  left_value: number | null
  right_value: number | null
  score?: number | null // L937: the joint_scores score (my_joint_history returns it)
}
export type StartNowRow = {
  joint_key: string
  first_assessed_at: string
  latest_assessed_at: string
  first_left: number | null
  first_right: number | null
  latest_left: number | null
  latest_right: number | null
  first_score?: number | null // L937: my_joint_start_vs_now returns these
  latest_score?: number | null
}
/** i = position on the time axis (0 .. n-1). A joint with no row for an assessment has no point there: a gap, never zero. */
export type TrendPoint = { date: string; pct: number; i: number }
export type TrendSeries = { key: string; n: number; points: TrendPoint[] }

const num = (v: unknown): number | null => (v == null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v))

/** Rebuild an assessment-shaped record from one joint's left/right values so the existing Base % formula is the only formula. */
function recordFor(jointKey: string, left: number | null, right: number | null): Record<string, number | null> {
  const def = ASSESSMENT_JOINTS.find(j => j.key === jointKey)
  if (!def) return {}
  if (def.single) return { [def.single]: left ?? right }
  return { [def.l!]: left, [def.r!]: right }
}

function pctFor(jointKey: string, left: number | null, right: number | null): number | null {
  const row = radarSideRowsForAssessment(recordFor(jointKey, left, right), null).find(r => r.key === jointKey)
  return row && row.measured ? row.worse : null
}

/** Pure. rows may arrive in any order; the time axis is the user's assessments, oldest first. Hip flexion rows from before the cutover are dropped. */
export function buildJointTrends(rows: HistoryRow[]): TrendSeries[] {
  const byAssessment = new Map<string, { at: string; rows: HistoryRow[] }>()
  for (const r of rows) {
    const e = byAssessment.get(r.assessment_id) ?? { at: r.assessed_at, rows: [] }
    e.rows.push(r)
    byAssessment.set(r.assessment_id, e)
  }
  const timeline = [...byAssessment.values()].sort((a, b) => Date.parse(a.at) - Date.parse(b.at))
  const n = timeline.length
  const series = new Map<string, TrendPoint[]>()
  timeline.forEach((t, i) => {
    for (const r of gateJointScores({ assessed_at: t.at }, t.rows)) {
      const pct = pctFor(r.joint_key, num(r.left_value), num(r.right_value))
      if (pct == null) continue
      const pts = series.get(r.joint_key) ?? []
      pts.push({ date: t.at, pct, i })
      series.set(r.joint_key, pts)
    }
  })
  return [...series.entries()].map(([key, points]) => ({ key, n, points }))
}

/** Pure. Two points per joint (first and latest) when only my_joint_start_vs_now is available. */
export function buildStartVsNowTrends(rows: StartNowRow[]): TrendSeries[] {
  const out: TrendSeries[] = []
  for (const r of rows) {
    const first = gateJointScores({ assessed_at: r.first_assessed_at }, [{ ...r, score: r.first_score }]).length ? pctFor(r.joint_key, num(r.first_left), num(r.first_right)) : null
    const latest = gateJointScores({ assessed_at: r.latest_assessed_at }, [{ ...r, score: r.latest_score }]).length ? pctFor(r.joint_key, num(r.latest_left), num(r.latest_right)) : null
    const points: TrendPoint[] = []
    if (first != null) points.push({ date: r.first_assessed_at, pct: first, i: 0 })
    if (latest != null) points.push({ date: r.latest_assessed_at, pct: latest, i: 1 })
    if (points.length) out.push({ key: r.joint_key, n: 2, points })
  }
  return out
}

export function useJointHistory(): { history: HistoryRow[] | null; startNow: StartNowRow[] | null } {
  const [history, setHistory] = useState<HistoryRow[] | null>(null)
  const [startNow, setStartNow] = useState<StartNowRow[] | null>(null)
  useEffect(() => {
    let live = true
    void (async () => {
      try {
        const { data, error } = await supabase.rpc('my_joint_history', { p_limit: 20 })
        if (live && !error && Array.isArray(data)) setHistory(data as HistoryRow[])
      } catch { /* keep the on-device trend */ }
      try {
        const { data, error } = await supabase.rpc('my_joint_start_vs_now')
        if (live && !error && Array.isArray(data)) setStartNow(data as StartNowRow[])
      } catch { /* keep the on-device trend */ }
    })()
    return () => { live = false }
  }, [])
  return { history, startNow }
}
