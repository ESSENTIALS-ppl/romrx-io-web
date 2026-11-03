import { describe, expect, it, vi } from 'vitest'

vi.mock('./supabase', () => ({ supabase: {} }))
import { buildJointTrends, buildStartVsNowTrends, type HistoryRow } from './jointHistory'
import { setHipFlexScoredAtMs } from './hipFlexCutoverState'

const row = (id: string, at: string, joint_key: string, l: number, r: number): HistoryRow =>
  ({ assessment_id: id, assessed_at: at, joint_key, left_value: l, right_value: r })

describe('FG-08 trends from my_joint_history', () => {
  it('uses the Base % formula on the rpc values, one point per assessment, oldest first', () => {
    const s = buildJointTrends([
      row('b', '2026-11-10T00:00:00Z', 'hip_abd', 40, 40),
      row('a', '2026-11-01T00:00:00Z', 'hip_abd', 20, 30),
    ])
    const hip = s.find(x => x.key === 'hip_abd')!
    expect(hip.n).toBe(2)
    expect(hip.points.map(p => p.i)).toEqual([0, 1])
    expect(hip.points[0].pct).toBeLessThan(hip.points[1].pct)
    expect(hip.points[1].pct).toBe(100)
  })
  it('a joint missing from an assessment is a gap, never zero', () => {
    const s = buildJointTrends([
      row('a', '2026-11-01T00:00:00Z', 'hip_abd', 30, 30), row('a', '2026-11-01T00:00:00Z', 'ankle_df', 5, 5),
      row('b', '2026-11-05T00:00:00Z', 'hip_abd', 35, 35),
      row('c', '2026-11-09T00:00:00Z', 'hip_abd', 40, 40), row('c', '2026-11-09T00:00:00Z', 'ankle_df', 6, 6),
    ])
    expect(s.find(x => x.key === 'ankle_df')!.points.map(p => p.i)).toEqual([0, 2])
    expect(s.find(x => x.key === 'hip_abd')!.points.every(p => p.pct > 0)).toBe(true)
  })
  it('hip flexion from before the cutover is dropped; at or after it counts at 120', () => {
    setHipFlexScoredAtMs(Date.parse('2026-11-05T00:00:00Z'))
    try {
      const s = buildJointTrends([
        row('a', '2026-11-01T00:00:00Z', 'hip_flex', 60, 60),
        row('b', '2026-11-08T00:00:00Z', 'hip_flex', 60, 60),
        row('c', '2026-11-09T00:00:00Z', 'hip_flex', 120, 120),
      ])
      const hip = s.find(x => x.key === 'hip_flex')!
      expect(hip.points.map(p => p.i)).toEqual([1, 2])
      expect(hip.points.map(p => p.pct)).toEqual([50, 100])
    } finally { setHipFlexScoredAtMs(null) }
  })
  it('start vs now gives two points', () => {
    const s = buildStartVsNowTrends([{ joint_key: 'hip_abd', first_assessed_at: '2026-11-01T00:00:00Z', latest_assessed_at: '2026-11-09T00:00:00Z',
      first_left: 20, first_right: 20, latest_left: 40, latest_right: 40 }])
    expect(s[0].points.map(p => p.i)).toEqual([0, 1])
    expect(s[0].points[1].pct).toBe(100)
  })
})
