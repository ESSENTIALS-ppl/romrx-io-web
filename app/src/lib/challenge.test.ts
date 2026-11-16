import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { CHALLENGE_COPY, CHALLENGE_DAYS, CHALLENGE_GOAL_DAYS, challengeEnd, challengeStatus, readChallenge } from './challenge'

const days = (start: string, n: number) => Array.from({ length: n }, (_, k) => {
  const d = new Date(`${start}T00:00:00Z`); d.setUTCDate(d.getUTCDate() + k); return d.toISOString().slice(0, 10)
})

describe('P1-21 solo challenge', () => {
  const st = { start: '2026-11-15', joint: 'hip_flex' }
  it('14 days, end exclusive', () => {
    expect(CHALLENGE_DAYS).toBe(14)
    expect(challengeEnd('2026-11-15')).toBe('2026-11-29')
  })
  it('not started', () => expect(challengeStatus(null, [], '2026-11-15')).toEqual({ kind: 'none' }))
  it('active counts distinct days inside the window only', () => {
    expect(challengeStatus(st, ['2026-11-14', '2026-11-15', '2026-11-15', '2026-11-16'], '2026-11-17')).toEqual({ kind: 'active', done: 2, day: 3 })
  })
  it('badge at the goal, even before day 14', () => {
    expect(challengeStatus(st, days('2026-11-15', CHALLENGE_GOAL_DAYS), '2026-11-24')).toEqual({ kind: 'won', done: CHALLENGE_GOAL_DAYS })
  })
  it('expired after day 14 without the goal; day 15 sessions do not count', () => {
    expect(challengeStatus(st, [...days('2026-11-15', 3), '2026-11-29'], '2026-11-29')).toEqual({ kind: 'expired', done: 3 })
  })
  it('L1080: goal 10 of 14, title with no joint name, Stacy words', () => {
    expect(CHALLENGE_GOAL_DAYS).toBe(10)
    const c = CHALLENGE_COPY!
    expect(c.title('Hip Flexion')).toBe('14-day session challenge')
    expect(c.pitch).toContain('10 of the next 14 days')
    expect(c.progress(3, CHALLENGE_GOAL_DAYS, 5)).toBe('Day 5 of 14. 3 of 10 session days done.')
    expect(readChallenge('u1')).toBeNull()
    const comp = readFileSync(join(process.cwd(), 'src', 'components', 'SoloChallenge.tsx'), 'utf8')
    expect(comp).toContain('if (!copy || !jointKey || !jointLabel) return null')
  })
})
