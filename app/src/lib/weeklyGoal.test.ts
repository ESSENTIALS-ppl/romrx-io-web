import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { WEEKLY_GOAL_COPY, weekStart, daysThisWeek, weeklyStreak, readWeeklyGoal, weekBarPct } from './weeklyGoal'

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
  it('Stacy words byte-exact behaviour', () => {
    const c = WEEKLY_GOAL_COPY!
    expect(c.pickerTitle).toBe('How many days a week do you want to do your session?')
    expect(c.pickerOption(4)).toBe('4 days')
    expect(c.thisWeek(2, 4)).toBe('2 of 4 days this week')
    expect(c.streak(1)).toBe('1 week in a row at your goal')
    expect(c.streak(3)).toBe('3 weeks in a row at your goal')
    expect(c.change).toBe('Change goal')
  })
  it('the bar follows the week, never the 42-session cycle, while the goal is on', () => {
    expect(weekBarPct(2, 4)).toBe(50)
    expect(weekBarPct(9, 4)).toBe(100)
    expect(weekBarPct(0, 3)).toBe(0)
    expect(readWeeklyGoal('u1')).toBeNull()
    const page = readFileSync(join(process.cwd(), 'src', 'pages', 'MyProtocol.tsx'), 'utf8')
    expect(page).toContain('{!WEEKLY_GOAL_COPY && (')
    expect(page.split('{!WEEKLY_GOAL_COPY && (').length - 1).toBe(2) // Session N/42 and its bar both hidden
    const comp = readFileSync(join(process.cwd(), 'src', 'components', 'WeeklyGoal.tsx'), 'utf8')
    expect(comp).toContain('weekBarPct(shown, goal)')
    expect(comp).not.toContain('42')
  })
})
