// P1-06 quick check UI helpers and gate.
process.env.TZ = 'America/New_York'
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { STEPS } from '../pages/assessmentSteps'
import {
  QUICK_CHECK_ON, QUICK_CHECK_PATH, QUICK_CHECK_COPY as Q, quickCheckSteps, jointName, compareLine, nextCheckLine,
  isQuickCheckDue, isQuickCheckPending, quickSubmitBody, lastFullAssessment, dayOneAssessment, formatCheckDate, SCHEDULE_COLUMNS,
} from './quickCheck'

describe('P1-06 quick check', () => {
  it('is OFF until Avery\'s 65c3a036 compute-tiers guard and bda32302 ship; route matches the emails', () => {
    expect(QUICK_CHECK_ON).toBe(false)
    expect(QUICK_CHECK_PATH).toBe('/dashboard/quick-check')
    const app = readFileSync(join(process.cwd(), 'src', 'App.tsx'), 'utf8')
    expect(app).toContain('<Route path="/dashboard/quick-check" element={<QuickCheck />} />')
  })
  it('measures only the scheduled sides', () => {
    const steps = quickCheckSteps(STEPS, ['hip_er_r', 'shoulder_flex_l'])
    expect(steps.map(s => s.id)).toEqual(['hip_er', 'shoulder_flex'])
    expect(steps.flatMap(s => s.fields.map(f => f.key))).toEqual(['hip_er_r', 'shoulder_flex_l'])
    expect(jointName(steps[0], steps[0].fields[0])).toBe(`${steps[0].title} (Right)`)
    expect(quickCheckSteps(STEPS, null)).toEqual([])
  })
  it('submit body has check_kind quick and only the scheduled fields', () => {
    expect(quickSubmitBody({ hip_er_r: '31', hip_er_l: '20' }, ['hip_er_r'])).toEqual({ check_kind: 'quick', hip_er_r: 31 })
    expect(quickSubmitBody({}, ['hip_er_r'])).toEqual({ check_kind: 'quick', hip_er_r: null })
  })
  it('before and now lines: up, down (neutral), about the same', () => {
    expect(compareLine(30, 35, '°')).toBe('Up 5° since day 1.')
    expect(compareLine(30, 27.5, '°')).toBe('Down 2.5° since day 1. Readings can change from day to day.')
    expect(compareLine(30, 30.2, '°')).toBe('About the same as day 1.')
  })
  it('next check line and due banner', () => {
    const now = new Date('2026-11-15T12:00:00-05:00')
    expect(formatCheckDate('2026-12-28T17:00:00Z')).toBe('Monday, December 28')
    expect(nextCheckLine({ next_check_at: '2026-12-28T17:00:00Z', next_retest_at: null, check_joints: ['x'] }, now)).toBe('Your next check: Monday, December 28')
    expect(nextCheckLine({ next_check_at: '2026-11-14T17:00:00Z', next_retest_at: null, check_joints: ['x'] }, now)).toBe(Q.nextCheckDue)
    expect(nextCheckLine(null, now)).toBeNull()
    expect(isQuickCheckDue({ next_check_at: '2026-11-14T17:00:00Z', next_retest_at: null, check_joints: ['hip_er_r'] }, now)).toBe(true)
    expect(isQuickCheckDue({ next_check_at: '2026-11-14T17:00:00Z', next_retest_at: null, check_joints: [] }, now)).toBe(false)
  })
  it('day 1 = last full assessment, quick rows skipped', () => {
    expect(lastFullAssessment([{ id: 'q', check_kind: 'quick' }, { id: 'f', check_kind: null }, { id: 'old' }])).toEqual({ id: 'f', check_kind: null })
  })
  it('65c3a036 schedule rules: pending only while next_check_at differs from next_retest_at', () => {
    const now = new Date('2026-11-15T12:00:00-05:00')
    const retest = '2026-12-13T17:00:00Z'
    // full save: day 7 check, day 42 retest; due once day 7 is reached
    expect(isQuickCheckDue({ next_check_at: '2026-11-08T17:00:00Z', next_retest_at: retest, check_joints: ['hip_er_r'] }, new Date('2026-11-08T18:00:00Z'))).toBe(true)
    expect(isQuickCheckDue({ next_check_at: '2026-11-08T17:00:00Z', next_retest_at: retest, check_joints: ['hip_er_r'] }, new Date('2026-11-07T18:00:00Z'))).toBe(false)
    // rule 2 (quick saved) and the roll both set next_check_at = next_retest_at: no banner, even on retest day
    const done = { next_check_at: retest, next_retest_at: retest, check_joints: ['hip_er_r'] }
    expect(isQuickCheckPending(done)).toBe(false)
    expect(isQuickCheckDue(done, new Date('2026-12-14T12:00:00Z'))).toBe(false)
    expect(isQuickCheckDue({ ...done, next_check_at: '2026-12-13T17:00:00.000Z' }, new Date('2026-12-14T12:00:00Z'))).toBe(false)
    // the next check line then names the retest date
    expect(nextCheckLine(done, now)).toBe('Your next check: Sunday, December 13')
    // backfilled rows have check_joints NULL until the next full save: never due
    expect(isQuickCheckDue({ next_check_at: '2026-11-08T17:00:00Z', next_retest_at: retest, check_joints: null }, now)).toBe(false)
  })
  it('day 1 = the schedule last_assessment_id when present, else newest full row', () => {
    const rows = [{ id: 'q', check_kind: 'quick' }, { id: 'f2', check_kind: 'full' }, { id: 'f1' }]
    expect(dayOneAssessment(rows, 'f1')).toEqual({ id: 'f1' })
    expect(dayOneAssessment(rows, null)).toEqual({ id: 'f2', check_kind: 'full' })
    expect(dayOneAssessment(rows, 'q')).toEqual({ id: 'f2', check_kind: 'full' })
    expect(dayOneAssessment(rows, 'gone')).toEqual({ id: 'f2', check_kind: 'full' })
  })
  it('banner and screen read the same schedule columns; page cites 65c3a036', () => {
    expect(SCHEDULE_COLUMNS).toBe('next_check_at, next_retest_at, check_joints, last_assessed_at, last_assessment_id')
    const page = readFileSync(join(process.cwd(), 'src', 'pages', 'QuickCheck.tsx'), 'utf8')
    const banner = readFileSync(join(process.cwd(), 'src', 'components', 'QuickCheckBanner.tsx'), 'utf8')
    expect(page.match(/select\(SCHEDULE_COLUMNS\)/g)?.length).toBe(2)
    expect(banner).toContain('select(SCHEDULE_COLUMNS)')
    expect(page).toContain('65c3a036')
    expect(page).not.toMatch(/65a251b8|c8769478/)
  })
  it('words: Stacy exact, no dashes', () => {
    expect(Q.note).toBe('A quick check is a snapshot, not a full retest. Your plan stays the same until your 6-week retest.')
    expect(Q.introBody('Hip')).toBe("We'll re-measure Hip. Then you'll see your day 1 result next to today's.")
    expect(JSON.stringify(Q)).not.toMatch(/[\u2013\u2014]/)
  })
})
