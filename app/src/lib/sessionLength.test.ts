import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { pickMovements, readSessionLength, SESSION_LENGTH_COPY } from './sessionLength'

const rx = { exercises: ['e1', 'e2'], stretches: ['s1', 's2'], foam: ['f1'] }
describe('P1-19 session length', () => {
  it('standard is the current Today card; quick 2; full everything', () => {
    expect(pickMovements(rx, 'standard')).toEqual(['e1', 's1', 'f1'])
    expect(pickMovements(rx, 'quick')).toEqual(['e1', 's1'])
    expect(pickMovements(rx, 'full')).toEqual(['e1', 'e2', 's1', 's2', 'f1'])
    expect(pickMovements(null, 'full')).toEqual([])
    expect(pickMovements({ exercises: [], stretches: ['s1'], foam: [] }, 'standard')).toEqual(['s1'])
  })
  it('Stacy words in place; standard is the default; Full keeps the Movement N label past 3', () => {
    expect(SESSION_LENGTH_COPY).toEqual({ heading: 'Session length', quick: 'Quick', standard: 'Standard', full: 'Full' })
    expect(readSessionLength('u1')).toBe('standard')
    expect(readSessionLength('u1', null)).toBe('standard')
    const page = readFileSync(join(process.cwd(), 'src', 'pages', 'MyProtocol.tsx'), 'utf8')
    expect(page).toContain('{SESSION_LENGTH_COPY && (')
    expect(page).toContain('pickMovements<Rx>(rx, sessionLength)')
    expect(page).toContain('{labels[index] ?? `Movement ${index + 1}`}')
  })
})
