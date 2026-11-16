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
  it('builds steps: exercise by reps, stretch per side with a switch cue, foam one timed block', () => {
    const steps = buildSteps([
      { name: 'Clamshell', dose: '2 sets x 15-20', slot: 'exercise' },
      { name: 'Figure-4', dose: '30-60', slot: 'stretch' },
      { name: 'Glute roll', dose: '60-90', slot: 'foam' },
    ])
    expect(steps.map(s => [s.name, s.set, s.side, s.seconds, s.reps])).toEqual([
      ['Clamshell', 1, null, null, '15-20'],
      ['Clamshell', 2, null, null, '15-20'],
      ['Figure-4', 1, 'first', 30, null],
      ['Figure-4', 1, 'second', 30, null],
      ['Glute roll', 1, null, 60, null],
    ])
    expect(isSwitchSides(steps, 2)).toBe(true)
    expect(isSwitchSides(steps, 3)).toBe(false)
    expect(nextUpName(steps, 0)).toBe('Figure-4')
    expect(nextUpName(steps, 4)).toBeNull()
  })
  it('clock', () => {
    expect(formatClock(90)).toBe('1:30')
    expect(formatClock(5)).toBe('0:05')
    expect(formatClock(-1)).toBe('0:00')
  })
  it('no words yet: no player button on the Today card', () => {
    expect(PLAYER_COPY).toBeNull()
    const page = readFileSync(join(process.cwd(), 'src', 'pages', 'MyProtocol.tsx'), 'utf8')
    expect(page).toContain('{PLAYER_COPY && playerMovements.length > 0 && (')
  })
})
