import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WEEKLY_GOAL_COPY, weekStart, daysThisWeek, weeklyStreak, readWeeklyGoal } from './weeklyGoal'

describe('P1-09 weekly goal', () => {
  it('weeks start on Sunday', () => {
    expect(weekStart('2026-11-15')).toBe('2026-11-15') // Sunday
    expect(weekStart('2026-11-21')).toBe('2026-11-15') // Saturday
    expect(weekStart('2026-11-22')).toBe('2026-11-22')
    expect(weekStart('2027-01-01')).toBe('2026-12-27')
  })
  it('days this week are distinct days', () => {
    expect(daysThisWeek(['2026-11-15', '2026-11-15', '2026-11-17', '2026-11-14'], '2026-11-18')).toBe(2)
  })
  it('weekly streak: current week counts once met, else start last week', () => {
    const lastTwoWeeksMet = ['2026-11-01', '2026-11-03', '2026-11-05', '2026-11-08', '2026-11-09', '2026-11-10']
    expect(weeklyStreak(lastTwoWeeksMet, 3, '2026-11-16')).toBe(2)
    expect(weeklyStreak([...lastTwoWeeksMet, '2026-11-15', '2026-11-16', '2026-11-17'], 3, '2026-11-17')).toBe(3)
    expect(weeklyStreak(lastTwoWeeksMet, 4, '2026-11-16')).toBe(0)
    expect(weeklyStreak([], 3, '2026-11-16')).toBe(0)
  })
  it('no words yet: the Today card keeps Session N/42', () => {
    expect(WEEKLY_GOAL_COPY).toBeNull()
    expect(readWeeklyGoal('u1')).toBeNull()
    const page = readFileSync(join(process.cwd(), 'src', 'pages', 'MyProtocol.tsx'), 'utf8')
    expect(page).toContain('{!WEEKLY_GOAL_COPY && (')
  })
})
