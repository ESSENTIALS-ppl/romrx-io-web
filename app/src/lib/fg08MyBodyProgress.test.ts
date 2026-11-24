// FG-08 (Grant 4:23 PM ET, Reid FAIL): assessed_at ordering (never created_at), first vs latest per joint and total,
// the single-assessment case, and trend points that carry their date and value.
import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))
import { assessedAtMs, pickFullAssessments, sortByAssessedAtNewestFirst } from './assessmentReads'
import { bodyScoreChange, buildJointTrends, buildLocalTrends, buildStartedVsNow, type HistoryRow } from './jointHistory'
import { jointDisplayRowsForAssessment, mobilityRawScoreForAssessment } from './mobilityBands'
import { setHipFlexScoredAtMs } from './hipFlexCutoverState'

// Base display joints (lumbar hidden): the 10 on Joint Breakdown.
const KEYS = ['hip_er', 'hip_ir', 'hip_abd', 'hip_flex', 'shoulder_er', 'shoulder_flex', 'ankle_df', 'cervical_lat', 'cervical_flex', 'cervical_ext']

type A = { id: string; assessed_at: string; created_at: string; [k: string]: unknown }
/** f = fraction of each Base target (1 = at target), both sides the same. */
function mk(id: string, assessed_at: string, created_at: string, f: number): A {
  const v = (t: number) => Math.round(t * f * 10) / 10
  return {
    id, assessed_at, created_at,
    hip_er_l: v(23), hip_er_r: v(23), hip_ir_l: v(24), hip_ir_r: v(24), hip_abd_l: v(40), hip_abd_r: v(40),
    hip_flex_l: v(120), hip_flex_r: v(120), shoulder_er_l: v(85), shoulder_er_r: v(85),
    shoulder_flex_l: v(141), shoulder_flex_r: v(141), ankle_df_l: v(6.1), ankle_df_r: v(6.1),
    cervical_lat_l: v(37), cervical_lat_r: v(37), cervical_flex: v(39), cervical_ext: v(48),
    lumbar_flex: null, lumbar_ext: null,
  }
}

// Reid's seed shape: Nov 10 and Nov 17 share one created_at, and created_at order is the reverse of assessed_at order.
const oct4 = mk('oct4', '2026-10-04T15:00:00Z', '2026-11-24T21:12:25.000Z', 0.5)
const nov10 = mk('nov10', '2026-11-10T15:00:00Z', '2026-11-24T21:12:24.540Z', 0.7)
const nov17 = mk('nov17', '2026-11-17T15:00:00Z', '2026-11-24T21:12:24.540Z', 0.95)

describe('FG-08 assessed_at ordering (never created_at)', () => {
  it('sorts newest first by assessed_at even when created_at order is the reverse or tied', () => {
    const byCreated = [oct4, nov10, nov17] // newest created_at first, as a created_at DESC read would return them
    expect(sortByAssessedAtNewestFirst(byCreated).map(a => a.id)).toEqual(['nov17', 'nov10', 'oct4'])
    expect(sortByAssessedAtNewestFirst([nov10, nov17]).map(a => a.id)).toEqual(['nov17', 'nov10'])
  })
  it('is stable for equal or missing assessed_at, and rows with no assessed_at go last', () => {
    const x = { id: 'x' }, y = { id: 'y', assessed_at: '2026-11-01T00:00:00Z' }, z = { id: 'z' }
    expect(sortByAssessedAtNewestFirst([x, y, z]).map(r => r.id)).toEqual(['y', 'x', 'z'])
    expect(assessedAtMs({ assessed_at: 'not a date' })).toBeNull()
    expect(assessedAtMs({ created_at: '2026-11-01T00:00:00Z' })).toBeNull()
  })
  it('pickFullAssessments: the latest is the newest by assessed_at, not the server pick', () => {
    // Server handed back nov10 as "latest" (created_at tie) and the history in created_at order.
    const out = pickFullAssessments<A>(nov10, [oct4, nov10, nov17])
    expect(out.latest?.id).toBe('nov17')
    expect(out.history.map(a => a.id)).toEqual(['nov17', 'nov10', 'oct4'])
    // A correct server pick is kept.
    expect(pickFullAssessments<A>(nov17, [nov17, nov10]).latest?.id).toBe('nov17')
  })
  it('local trend axis is oldest first by assessed_at whatever the input order', () => {
    const s = buildLocalTrends([oct4, nov17, nov10], 'nov17', null, KEYS)
    const hip = s.find(t => t.key === 'hip_er')!
    expect(hip.n).toBe(3)
    expect(hip.points.map(p => p.date)).toEqual([oct4.assessed_at, nov10.assessed_at, nov17.assessed_at])
  })
  it('rpc trend axis is oldest first by assessed_at whatever the row order', () => {
    const r = (id: string, at: string, l: number): HistoryRow => ({ assessment_id: id, assessed_at: at, joint_key: 'hip_abd', left_value: l, right_value: l })
    const s = buildJointTrends([r('c', '2026-11-17T15:00:00Z', 40), r('a', '2026-10-04T15:00:00Z', 20), r('b', '2026-11-10T15:00:00Z', 30)])
    expect(s[0].points.map(p => p.date)).toEqual(['2026-10-04T15:00:00Z', '2026-11-10T15:00:00Z', '2026-11-17T15:00:00Z'])
  })
  it('My Body source orders history by assessed_at and never by created_at', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const page = readFileSync(join(process.cwd(), 'src', 'pages', 'MyBody.tsx'), 'utf8')
    const lib = readFileSync(join(process.cwd(), 'src', 'lib', 'jointHistory.ts'), 'utf8')
    expect(page).not.toMatch(/order\(\s*'created_at'|\.created_at\b|\['created_at'\]/)
    expect(page).toContain('sortByAssessedAtNewestFirst(loadedAssessments)')
    expect(lib).toContain(".order('assessed_at', { ascending: true })")
    expect(lib).not.toMatch(/order\('created_at'/)
  })
})

describe('FG-08 Where you started vs Where you are now', () => {
  it('first vs latest per joint uses the Joint Breakdown %, and total is the unclamped Body score (same as the chip)', () => {
    setHipFlexScoredAtMs(Date.parse('2026-10-01T00:00:00Z')) // every fixture is after the hip flexion cutover
    try {
      const c = buildStartedVsNow(oct4, nov17, null, KEYS)!
      expect(c).not.toBeNull()
      expect(c.started.date).toBe(oct4.assessed_at)
      expect(c.now.date).toBe(nov17.assessed_at)
      expect(c.started.total).toBe(mobilityRawScoreForAssessment(oct4))
      expect(c.now.total).toBe(mobilityRawScoreForAssessment(nov17))
      expect(c.delta).toBe(c.now.total - c.started.total)
      expect(c).toMatchObject({ started: { total: bodyScoreChange(oct4, nov17).before }, now: { total: bodyScoreChange(oct4, nov17).now }, delta: bodyScoreChange(oct4, nov17).delta })
      expect(c.started.total).toBeLessThan(c.now.total)
      expect(c.joints.map(j => j.key)).toEqual(KEYS)
      expect(c.joints).toHaveLength(10)
      const before = new Map(jointDisplayRowsForAssessment(oct4).map(r => [r.key, r.pct]))
      const now = new Map(jointDisplayRowsForAssessment(nov17).map(r => [r.key, r.pct]))
      for (const j of c.joints) {
        expect(j.started).toBe(before.get(j.key))
        expect(j.now).toBe(now.get(j.key))
      }
      expect(c.joints.find(j => j.key === 'hip_er')).toMatchObject({ label: 'Hip ER', started: 50 })
    } finally { setHipFlexScoredAtMs(null) }
  })
  it('a joint not measured on the first assessment shows no value (null), never zero', () => {
    const first = { ...oct4, hip_flex_l: null, hip_flex_r: null }
    const c = buildStartedVsNow(first, nov17, null, KEYS)!
    expect(c.joints.find(j => j.key === 'hip_flex')!.started).toBeNull()
  })
  it('single assessment: no comparison', () => {
    expect(buildStartedVsNow(nov17, nov17, null, KEYS)).toBeNull()
    expect(buildStartedVsNow(null, nov17, null, KEYS)).toBeNull()
    expect(buildLocalTrends([nov17], 'nov17', null, KEYS)).toEqual([])
  })
  it('never compares against a row that is not older by assessed_at', () => {
    expect(buildStartedVsNow(nov17, nov10, null, KEYS)).toBeNull()
  })
})

describe('FG-08 sparkline points carry date and value', () => {
  it('every local trend point has its assessed_at date and the bar % value', () => {
    const s = buildLocalTrends([nov17, nov10, oct4], 'nov17', null, KEYS)
    const hip = s.find(t => t.key === 'hip_abd')!
    expect(hip.points).toEqual([
      { date: oct4.assessed_at, pct: 50, i: 0 },
      { date: nov10.assessed_at, pct: 70, i: 1 },
      { date: nov17.assessed_at, pct: jointDisplayRowsForAssessment(nov17).find(r => r.key === 'hip_abd')!.pct, i: 2 },
    ])
    for (const t of s) for (const p of t.points) {
      expect(typeof p.date).toBe('string')
      expect(Number.isFinite(p.pct)).toBe(true)
    }
  })
})

describe('FG-08 first-assessment read', () => {
  it('the direct assessments read in jointHistory skips quick checks', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const s = readFileSync(join(process.cwd(), 'src', 'lib', 'jointHistory.ts'), 'utf8')
    const reads = s.split(".from('assessments')").length - 1
    expect(reads).toBe(1)
    expect(s.split('skipQuick(supabase.from(').length - 1).toBe(reads)
  })
})
