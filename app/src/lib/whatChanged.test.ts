import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WHAT_CHANGED_COPY, compareAssessments, fullAssessmentsNewestFirst, SAME_BAND_PCT } from './whatChanged'

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
  it('no words yet: route goes to My Body and a retest still lands on My Body', () => {
    expect(WHAT_CHANGED_COPY).toBeNull()
    expect(src('pages/WhatChanged.tsx')).toContain('if (!copy || state === \'none\') return <Navigate to="/dashboard/my-body" replace />')
    expect(src('pages/ResultsPreview.tsx')).toContain("WHAT_CHANGED_COPY && justAssessed ? WHAT_CHANGED_PATH : '/dashboard/my-body'")
    expect(src('pages/Assessment.tsx')).toContain("sessionStorage.setItem(JUST_ASSESSED_KEY, '1')")
  })
})
