import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { PLAYER_COPY, parseDose, lowerSeconds, buildSteps, isSwitchSides, nextUpName, formatClock } from './guidedPlayer'

describe('P1-20 guided player', () => {
  it('parses the dose the Today card builds', () => {
    expect(parseDose('3 sets x 10-12')).toEqual({ sets: 3, reps: '10-12' })
    expect(parseDose('60-90')).toEqual({ sets: 1, reps: '60-90' })
    expect(parseDose('')).toEqual({ sets: 1, reps: null })
  })
  it('timed ranges use the lower number', () => {
    expect(lowerSeconds('30-60')).toBe(30)
    expect(lowerSeconds('30-')).toBe(30)
    expect(lowerSeconds(null)).toBeNull()
  })
  it('builds steps: no per-side flag means one block per set, no side labels and no switch cue', () => {
    const steps = buildSteps([
      { name: 'Clamshell', dose: '2 sets x 15-20', slot: 'exercise' },
      { name: 'Figure-4', dose: '30-60', slot: 'stretch' },
      { name: 'Glute roll', dose: '60-90', slot: 'foam' },
    ])
    expect(steps.map(s => [s.name, s.set, s.side, s.seconds, s.reps])).toEqual([
      ['Clamshell', 1, null, null, '15-20'],
      ['Clamshell', 2, null, null, '15-20'],
      ['Figure-4', 1, null, 30, null],
      ['Glute roll', 1, null, 60, null],
    ])
    expect(steps.some((_, i) => isSwitchSides(steps, i))).toBe(false)
    expect(nextUpName(steps, 0)).toBe('Figure-4')
    expect(nextUpName(steps, 3)).toBeNull()
  })
  it('perSide === true splits each set into Side 1 and Side 2 with the switch cue between', () => {
    const steps = buildSteps([{ name: 'Figure-4', dose: '2 sets x 30', slot: 'stretch', perSide: true }])
    expect(steps.map(s => [s.set, s.side])).toEqual([[1, 'first'], [1, 'second'], [2, 'first'], [2, 'second']])
    expect(isSwitchSides(steps, 0)).toBe(true)
    expect(isSwitchSides(steps, 1)).toBe(false)
  })
  it('clock', () => {
    expect(formatClock(90)).toBe('1:30')
    expect(formatClock(5)).toBe('0:05')
    expect(formatClock(-1)).toBe('0:00')
  })
  it('Stacy words', () => {
    const c = PLAYER_COPY!
    expect(c.setLine(1, 3)).toBe('Set 1 of 3')
    expect(c.side('first')).toBe('Side 1')
    expect(c.repsLine('10-12')).toBe('10 to 12 reps')
    expect(c.repsLine('10')).toBe('10 reps')
    expect(c.nextUp('Figure-4')).toBe('Next up: Figure-4')
    const page = readFileSync(join(process.cwd(), 'src', 'pages', 'MyProtocol.tsx'), 'utf8')
    expect(page).toContain('{PLAYER_COPY && playerMovements.length > 0 && (')
  })
  it('player shows the approved STOP_LINE and side words only for per-side steps', async () => {
    const { STOP_LINE } = await import('./stopLine')
    expect(STOP_LINE).toBe("We don't want you hurt, so stop if anything hurts.")
    const comp = readFileSync(join(process.cwd(), 'src', 'components', 'GuidedPlayer.tsx'), 'utf8')
    expect(comp).toContain('{STOP_LINE}')
    expect(comp).toContain("{step.side ? ` · ${copy.side(step.side)}` : ''}")
  })
})
