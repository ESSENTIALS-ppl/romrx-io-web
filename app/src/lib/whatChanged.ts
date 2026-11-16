// P1-11 (Base engagement): "What changed" screen after every retest, active users included.
// Compares the latest full assessment with the one before it using the same Base formulas as My Body
// (jointDisplayRowsForAssessment, mobilityScoreForAssessment), after the hip flexion gate.
// Words: Stacy's STACY-P1-JULES-SLOTS-WORDS-20261115-2138.md, byte-exact (Jim yes pending). The lowerNote she suggests
// ("Readings can change from day to day.") has no slot in her file's block, so it is not added.
// Body score matches My Body exactly: My Body shows mobilityScoreForAssessment(latest, latest joint_scores) and, for the
// previous assessment, mobilityScoreForAssessment(previous) with no score rows (MyBody.tsx previousPrs). The page passes the
// same inputs (latest joint_scores gated with gateJointScores, as useProfile does), and joint % use the same rows as the bars.
import { jointDisplayRowsForAssessment, mobilityScoreForAssessment, type JointScoreRow } from './mobilityBands'
import { baseLumbarRemoved, isLumbarKey } from './lumbarFlag'

export type WhatChangedCopy = {
  title: string
  overallLine: (before: number, now: number) => string
  improvedHeading: string
  sameHeading: string
  lowerHeading: string
  jointLine: (label: string, before: number, now: number) => string
  cta: string
}
export const WHAT_CHANGED_COPY: WhatChangedCopy | null = {
  title: 'What changed since your last assessment',
  overallLine: (before, now) => {
    const b = Math.round(before), n = Math.round(now)
    if (n > b) return `Body score: ${n}, up ${n-b} from ${b}.`
    if (n < b) return `Body score: ${n}, down ${b-n} from ${b}.`
    return `Body score: ${n}, the same as last time.`
  },
  improvedHeading: 'Up since last time',
  sameHeading: 'About the same',
  lowerHeading: 'Down since last time',
  jointLine: (label, before, now) => `${label}: ${Math.round(before)}% to ${Math.round(now)}% of your Base target`,
  cta: 'Go to today\'s session',
}
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

/** prevScores stays null to match My Body's previous score; latestScores = the latest assessment's gated joint_scores rows. */
export function compareAssessments(previous: object, latest: object, prevScores?: JointScoreRow[] | null, latestScores?: JointScoreRow[] | null): Comparison {
  const before = new Map(jointDisplayRowsForAssessment(previous, prevScores).map(r => [r.key, r]))
  const out: Comparison = {
    overall: { before: mobilityScoreForAssessment(previous, prevScores), now: mobilityScoreForAssessment(latest, latestScores) },
    improved: [], same: [], lower: [],
  }
  // Same joint list as My Body's Joint Breakdown: lumbar bars hidden while the low-back flag is on (MyBody.tsx hideLumbar).
  // The Body score above gets every joint_scores row, lumbar included, exactly as My Body passes them.
  const hideLumbar = baseLumbarRemoved()
  for (const r of jointDisplayRowsForAssessment(latest, latestScores)) {
    if (hideLumbar && isLumbarKey(r.key)) continue
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
