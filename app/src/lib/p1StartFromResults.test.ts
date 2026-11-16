// P1-03 (Base engagement): session 1 starts from the results on the Today card.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { completeProfileNext } from './completeProfileNext'

const SRC = join(process.cwd(), 'src')
const read = (...p: string[]) => readFileSync(join(SRC, ...p), 'utf8')

describe('P1-03 start session 1 from the results', () => {
  it('ResultsPreview sends unlocked and active users to the Today card, never My Body', () => {
    const s = read('pages', 'ResultsPreview.tsx')
    expect(s).toMatch(/export const TODAY_PATH = '\/dashboard\/my-protocol'/)
    expect(s.match(/navigate\(TODAY_PATH, \{ replace: true \}\)/g)?.length).toBe(2)
    expect(s).not.toMatch(/navigate\('\/dashboard\/my-body'/)
  })

  it('My Protocol daily tab renders the Today card before the WHY text, band and retest banner after the session', () => {
    const s = read('pages', 'MyProtocol.tsx')
    const main = s.slice(s.indexOf('export function MyProtocol'))
    const today = main.indexOf('<TodayCard')
    expect(today).toBeGreaterThan(0)
    expect(main.indexOf('<WhyStatement heading="WHY DAILY"')).toBeGreaterThan(today)
    expect(main.indexOf('<RetestBanner')).toBeGreaterThan(today)
    expect(main.indexOf('{/* Mobility band')).toBeGreaterThan(today)
  })

  it('WHY text is collapsed by default and opened by its existing heading', () => {
    const s = read('pages', 'MyProtocol.tsx')
    const why = s.slice(s.indexOf('function WhyStatement'), s.indexOf('// ---- Today movement card'))
    expect(why).toMatch(/useState\(false\)/)
    expect(why).toMatch(/aria-expanded=\{open\}/)
    expect(why).toMatch(/\{open && \(/)
  })

  it('the profile wall returns to the interrupted dashboard page', () => {
    expect(completeProfileNext('?next=%2Fdashboard%2Fmy-protocol')).toBe('/dashboard/my-protocol')
    expect(completeProfileNext('')).toBe('/dashboard/my-body')
    expect(completeProfileNext('?next=https%3A%2F%2Fevil.example')).toBe('/dashboard/my-body')
    expect(completeProfileNext('?next=%2Fdashboard%2Fcomplete-profile')).toBe('/dashboard/my-body')
    expect(read('components', 'Layout.tsx')).toMatch(/complete-profile\?next=\$\{encodeURIComponent\(location\.pathname\)\}/)
  })
})
