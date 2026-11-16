// P1-06 v4: client window matches Avery's server guard (romrxbjj-v2 34835f66 rejectQuickWindow).
// Device zone set far from New York so a test passes only if the stored zone / America/New_York rule is used.
process.env.TZ = 'Asia/Tokyo'
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  QUICK_CHECK_ON, QUICK_CHECK_COPY as Q, isQuickCheckDue, nextCheckLineInCycle, quickCheckPageGate, quickSubmitOutcome,
  resolveTz, localDayNumber, quickRowAfter, GENERIC_ERROR, QUICK_NOT_SCHEDULED_ERROR, DEFAULT_TZ,
} from './quickCheck'

// Full assessment Sun Nov 1, 2026, 10:00 AM ET (15:00Z). Rule 1: next_check_at +7 days, next_retest_at +42 days.
const row = {
  last_assessed_at: '2026-11-01T15:00:00.000Z',
  next_check_at: '2026-11-08T15:00:00.000Z',
  next_retest_at: '2026-12-13T15:00:00.000Z',
  check_joints: ['hip_er_r'],
}
const at = (iso: string) => new Date(iso)
const day6late = at('2026-11-08T04:30:00Z')   // Sat Nov 7, 11:30 PM ET
const day7early = at('2026-11-08T05:30:00Z')  // Sun Nov 8, 12:30 AM ET (before next_check_at's clock time)
const day14late = at('2026-11-16T04:30:00Z')  // Sun Nov 15, 11:30 PM ET
const day15early = at('2026-11-16T05:30:00Z') // Mon Nov 16, 12:30 AM ET, before the hourly roll runs

describe('P1-06 v4 quick check window (34835f66 rule)', () => {
  it('feature stays off', () => { expect(QUICK_CHECK_ON).toBe(false) })

  it('day numbers: day 0 is the local date of last_assessed_at, in New York when no zone is stored', () => {
    expect(localDayNumber(row.last_assessed_at, day6late, resolveTz(null))).toBe(6)
    expect(localDayNumber(row.last_assessed_at, day7early, resolveTz(null))).toBe(7)
    expect(localDayNumber(row.last_assessed_at, day14late, resolveTz(null))).toBe(14)
    expect(localDayNumber(row.last_assessed_at, day15early, resolveTz(null))).toBe(15)
  })

  it('day 6 hidden', () => { expect(isQuickCheckDue(row, day6late)).toBe(false) })
  it('day 7 shown (from local midnight, like the server)', () => { expect(isQuickCheckDue(row, day7early)).toBe(true) })
  it('day 14 late shown', () => { expect(isQuickCheckDue(row, day14late)).toBe(true) })
  it('day 15 before the roll hidden (next_check_at not rolled yet)', () => {
    expect(row.next_check_at).not.toBe(row.next_retest_at)
    expect(isQuickCheckDue(row, day15early)).toBe(false)
    expect(nextCheckLineInCycle(row, day15early)).toBe('Your next check: Sunday, December 13')
  })
  it('before the window the line names the quick check date; inside it says ready now', () => {
    expect(nextCheckLineInCycle(row, day6late)).toBe('Your next check: Sunday, November 8')
    expect(nextCheckLineInCycle(row, day7early)).toBe(Q.nextCheckDue)
  })

  it('quick check already done this cycle hidden: by a quick row after the full assessment, or by the schedule', () => {
    const rows = [{ assessed_at: '2026-11-09T14:00:00Z', check_kind: 'quick' }]
    expect(quickRowAfter(rows, row.last_assessed_at)).toBe(true)
    expect(quickRowAfter([{ assessed_at: '2026-10-20T14:00:00Z', check_kind: 'quick' }], row.last_assessed_at)).toBe(false)
    expect(isQuickCheckDue(row, at('2026-11-10T15:00:00Z'), { quickDone: true })).toBe(false)
    expect(isQuickCheckDue({ ...row, next_check_at: row.next_retest_at }, at('2026-11-10T15:00:00Z'))).toBe(false)
    expect(nextCheckLineInCycle(row, at('2026-11-10T15:00:00Z'), { quickDone: true })).toBe('Your next check: Sunday, December 13')
  })

  it('no zone (null, empty, invalid) falls back to America/New_York, not the device zone', () => {
    expect(DEFAULT_TZ).toBe('America/New_York')
    for (const tz of [null, undefined, '', 'Not/AZone']) expect(resolveTz(tz)).toBe('America/New_York')
    // Tokyo device would already be Nov 16 afternoon (day 15) at day14late; New York rule keeps it day 14.
    expect(isQuickCheckDue(row, day14late, { tz: '' })).toBe(true)
    expect(isQuickCheckDue(row, day15early, { tz: 'Not/AZone' })).toBe(false)
  })
  it('a stored zone wins: Los Angeles is still day 14 when New York is day 15', () => {
    expect(resolveTz('America/Los_Angeles')).toBe('America/Los_Angeles')
    expect(isQuickCheckDue(row, day15early, { tz: 'America/Los_Angeles' })).toBe(true)
    expect(isQuickCheckDue(row, at('2026-11-16T08:30:00Z'), { tz: 'America/Los_Angeles' })).toBe(false)
  })

  it('page load: not due redirects to Today with no form; due shows the intro', () => {
    expect(quickCheckPageGate(row, day6late)).toBe('today')
    expect(quickCheckPageGate(row, day15early)).toBe('today')
    expect(quickCheckPageGate(row, day7early, { quickDone: true })).toBe('today')
    expect(quickCheckPageGate(null, day7early)).toBe('today')
    expect(quickCheckPageGate(row, day7early)).toBe('intro')
    const page = readFileSync(join(process.cwd(), 'src', 'pages', 'QuickCheck.tsx'), 'utf8')
    expect(page).toContain("if (!s || !load || load.failed || quickCheckPageGate(s, new Date(), load.ctx) !== 'intro') { setGone(true); return }")
    expect(page).toContain('if (gone) return <Navigate to={TODAY} replace />')
  })

  it('400 No quick re-check is scheduled goes to Today (no loop); other failures show the generic line', () => {
    expect(QUICK_NOT_SCHEDULED_ERROR).toBe('No quick re-check is scheduled')
    expect(quickSubmitOutcome(400, { error: 'No quick re-check is scheduled' })).toEqual({ kind: 'today' })
    expect(quickSubmitOutcome(400, { error: 'Quick re-check only accepts the scheduled joints' })).toEqual({ kind: 'error', message: GENERIC_ERROR })
    expect(quickSubmitOutcome(500, { ok: false })).toEqual({ kind: 'error', message: GENERIC_ERROR })
    expect(quickSubmitOutcome(200, { ok: true })).toEqual({ kind: 'result' })
    const page = readFileSync(join(process.cwd(), 'src', 'pages', 'QuickCheck.tsx'), 'utf8')
    expect(page).toContain("if (outcome.kind === 'today') { navigate(TODAY, { replace: true }); return }")
    expect(page).not.toContain('data.error}') // the raw server text is never shown
  })

  it('no sign-in token shows the existing generic line', () => {
    expect(GENERIC_ERROR).toBe('Something went wrong. Please try again.')
    const assessment = readFileSync(join(process.cwd(), 'src', 'pages', 'Assessment.tsx'), 'utf8')
    expect(assessment).toContain("setError('Something went wrong. Please try again.')") // existing, already cleared line
    const page = readFileSync(join(process.cwd(), 'src', 'pages', 'QuickCheck.tsx'), 'utf8')
    expect(page).toContain('if (!session?.access_token) { setError(GENERIC_ERROR); return }')
  })

  it('only the one gate read selects quick rows; it fails closed', () => {
    const loader = readFileSync(join(process.cwd(), 'src', 'lib', 'quickCheckLoad.ts'), 'utf8')
    expect(loader).toContain(".eq('check_kind', 'quick')")
    expect(loader).toContain('if (qErr) return { schedule, ctx: { ...ctx, quickDone: true }, failed: true }')
  })
})
