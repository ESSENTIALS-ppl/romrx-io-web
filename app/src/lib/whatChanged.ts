// P1-11 (Base engagement): "What changed" screen after every retest, active users included.
// Compares the latest full assessment with the one before it using the same Base formulas as My Body
// (jointDisplayRowsForAssessment, mobilityScoreForAssessment), after the hip flexion gate.
// Words: headings and before/now lines are new. Until Stacy supplies them (Jim yes), WHAT_CHANGED_COPY is null,
// the route redirects to My Body and a retest goes to My Body as it does today. Words needed (NEEDS JIM WORDING):
//   title, overallLine(before, now), improvedHeading, sameHeading, lowerHeading, jointLine(label, before, now, unit), cta.
import { jointDisplayRowsForAssessment, mobilityScoreForAssessment, type JointScoreRow } from './mobilityBands'

export type WhatChangedCopy = {
  title: string
  overallLine: (before: number, now: number) => string
  improvedHeading: string
  sameHeading: string
  lowerHeading: string
  jointLine: (label: string, before: number, now: number) => string
  cta: string
}
export const WHAT_CHANGED_COPY: WhatChangedCopy | null = null
export const WHAT_CHANGED_PATH = '/dashboard/what-changed'
/** sessionStorage flag set by Assessment when it hands off to the results page; read once and cleared there. */
export const JUST_ASSESSED_KEY = 'romrx.hq.just_assessed'

export function takeJustAssessed(): boolean {
  try {
    const v = sessionStorage.getItem(JUST_ASSESSED_KEY) === '1'
    sessionStorage.removeItem(JUST_ASSESSED_KEY)
    return v
  } catch {
    return false
  }
}

/** A change smaller than this many percentage points counts as the same (measurement noise). */
export const SAME_BAND_PCT = 2

export type JointChange = { key: string; label: string; before: number; now: number; delta: number }
export type Comparison = {
  overall: { before: number; now: number }
  improved: JointChange[]
  same: JointChange[]
  lower: JointChange[]
}

type Row = Record<string, unknown>

/** Full assessments only (quick checks from P1-06 carry check_kind 'quick'), newest first. */
export function fullAssessmentsNewestFirst<T extends Row>(rows: readonly T[]): T[] {
  return rows
    .filter(r => (r.check_kind ?? 'full') !== 'quick')
    .slice()
    .sort((a, b) => Date.parse(String(b.assessed_at)) - Date.parse(String(a.assessed_at)))
}

export function compareAssessments(previous: object, latest: object, prevScores?: JointScoreRow[] | null, latestScores?: JointScoreRow[] | null): Comparison {
  const before = new Map(jointDisplayRowsForAssessment(previous, prevScores).map(r => [r.key, r]))
  const out: Comparison = {
    overall: { before: mobilityScoreForAssessment(previous, prevScores), now: mobilityScoreForAssessment(latest, latestScores) },
    improved: [], same: [], lower: [],
  }
  for (const r of jointDisplayRowsForAssessment(latest, latestScores)) {
    const b = before.get(r.key)
    if (r.pct == null || b?.pct == null) continue
    const c: JointChange = { key: r.key, label: r.label, before: b.pct, now: r.pct, delta: r.pct - b.pct }
    if (c.delta >= SAME_BAND_PCT) out.improved.push(c)
    else if (c.delta <= -SAME_BAND_PCT) out.lower.push(c)
    else out.same.push(c)
  }
  out.improved.sort((a, b) => b.delta - a.delta)
  out.lower.sort((a, b) => a.delta - b.delta)
  return out
}
