import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WHAT_CHANGED_COPY, WHAT_CHANGED_ADDENDUM, showLowerNote, compareAssessments, fullAssessmentsNewestFirst, SAME_BAND_PCT } from './whatChanged'
import { mobilityScoreForAssessment, type JointScoreRow } from './mobilityBands'
import { baseLumbarRemoved } from './lumbarFlag'

const src = (f: string) => readFileSync(join(process.cwd(), 'src', f), 'utf8')

describe('P1-11 what changed', () => {
  it('keeps full assessments only, newest first', () => {
    const rows = [
      { id: 'a', assessed_at: '2026-10-01T10:00:00Z' },
      { id: 'q', assessed_at: '2026-11-10T10:00:00Z', check_kind: 'quick' },
      { id: 'b', assessed_at: '2026-11-01T10:00:00Z', check_kind: 'full' },
    ]
    expect(fullAssessmentsNewestFirst(rows).map(r => r.id)).toEqual(['b', 'a'])
  })
  it('sorts joints into improved, same and lower', () => {
    const prev = { assessed_at: '2026-10-01T10:00:00Z', hip_er_l: 12, hip_er_r: 12, ankle_df_l: 10, ankle_df_r: 10, shoulder_er_l: 80, shoulder_er_r: 80 }
    const now = { assessed_at: '2026-11-01T10:00:00Z', hip_er_l: 22, hip_er_r: 22, ankle_df_l: 10, ankle_df_r: 10, shoulder_er_l: 60, shoulder_er_r: 60 }
    const c = compareAssessments(prev, now)
    expect(c.improved.map(j => j.key)).toContain('hip_er')
    expect(c.same.map(j => j.key)).toContain('ankle_df')
    expect(c.lower.map(j => j.key)).toContain('shoulder_er')
    for (const j of c.same) expect(Math.abs(j.delta)).toBeLessThan(SAME_BAND_PCT)
    // unmeasured joints are left out, never shown as zero
    expect([...c.improved, ...c.same, ...c.lower].some(j => j.key === 'lumbar_flex')).toBe(false)
  })
  it('Body score matches My Body exactly (latest with its joint_scores rows incl. lumbar, previous with none)', () => {
    const prev = { assessed_at: '2026-10-01T10:00:00Z', hip_er_l: 15, hip_er_r: 16, ankle_df_l: 8, ankle_df_r: 9, shoulder_er_l: 70, shoulder_er_r: 72, lumbar_flex: 40 }
    const latest = { assessed_at: '2026-11-01T10:00:00Z', hip_er_l: 30, hip_er_r: 31, ankle_df_l: 8, ankle_df_r: 8, shoulder_er_l: 90, shoulder_er_r: 92, lumbar_flex: 50 }
    // persisted rows that put hip_er in a worse band than the raw ratio would, so passing them changes the score
    const scores: JointScoreRow[] = [
      { joint_key: 'hip_er', score: 1, left_value: 30, right_value: 31 },
      { joint_key: 'lumbar_flex', score: 1, left_value: 50, right_value: null },
    ]
    const c = compareAssessments(prev, latest, null, scores)
    // My Body: prs = mobilityScoreForAssessment(assessment, jointScores); previousPrs = mobilityScoreForAssessment(previousAssessment)
    expect(c.overall.now).toBe(mobilityScoreForAssessment(latest, scores))
    expect(c.overall.before).toBe(mobilityScoreForAssessment(prev))
    expect(c.overall.now).not.toBe(mobilityScoreForAssessment(latest)) // the rows matter, so the page must pass them
    if (baseLumbarRemoved()) expect([...c.improved, ...c.same, ...c.lower].some(j => j.key.startsWith('lumbar'))).toBe(false)
  })
  it('page passes the latest joint_scores rows, gated as useProfile does', () => {
    const page = src('pages/WhatChanged.tsx')
    expect(page).toContain(".select('joint_key, score, left_value, right_value, asymmetry_pct, asymmetry_flag')")
    expect(page).toContain('gateJointScores(latest,')
    expect(page).toContain('compareAssessments(gateAssessment(previous, hip), gateAssessment(latest, hip), null, latestScores)')
  })
  it('Stacy words', () => {
    const c = WHAT_CHANGED_COPY!
    expect(c.overallLine(70, 75)).toBe('Body score: 75, up 5 from 70.')
    expect(c.overallLine(75, 70)).toBe('Body score: 70, down 5 from 75.')
    expect(c.overallLine(70, 70)).toBe('Body score: 70, the same as last time.')
    expect(c.jointLine('Hip ER', 80.4, 91.6)).toBe('Hip ER: 80% to 92% of your Base target')
  })
  it('retest hand-off wiring', () => {
    expect(src('pages/ResultsPreview.tsx')).toContain('WHAT_CHANGED_COPY && justAssessed ? WHAT_CHANGED_PATH : TODAY_PATH')
    expect(src('pages/Assessment.tsx')).toContain("sessionStorage.setItem(JUST_ASSESSED_KEY, '1')")
  })
  it('lowerNote (2157 addendum) shows under the Body score only when it went down', () => {
    expect(WHAT_CHANGED_ADDENDUM.lowerNote).toBe('Readings can change from day to day.')
    expect(showLowerNote(75, 70)).toBe(true)
    expect(showLowerNote(70, 75)).toBe(false)
    expect(showLowerNote(70.2, 69.9)).toBe(false) // both round to 70: overallLine says "the same"
    const page = src('pages/WhatChanged.tsx')
    expect(page.indexOf('copy.overallLine(')).toBeLessThan(page.indexOf('WHAT_CHANGED_ADDENDUM.lowerNote'))
  })
})
