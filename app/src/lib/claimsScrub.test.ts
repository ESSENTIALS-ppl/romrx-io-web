/**
 * Claims scrub guard (#61, #63 and the 2026-09-29 leftovers pass).
 * Base copy: no unbacked counts ("140+", "400 exercises", "thousands of athletes"),
 * no injury-prediction claim on the Results preview, score shown with its band.
 * Sport-pack GREEN / YELLOW / RED language is intentionally NOT checked here.
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = resolve(__dirname, '..')
const ROOT = resolve(__dirname, '..', '..', '..')
const read = (p: string) => readFileSync(p, 'utf8')

describe('claims scrub leftovers (2026-09-29)', () => {
  it('Results preview: no injury-predictor claim; plain gap explainer instead', () => {
    const s = read(join(SRC, 'pages', 'ResultsPreview.tsx'))
    expect(s).not.toMatch(/predictors? of injury/i)
    expect(s).toMatch(/Gap is the difference between your left and right side\./)
  })

  it('no "140+" style counts on the scoped pages', () => {
    for (const f of ['index.html', 'dashboard.html', 'investors.html', 'legal.html']) {
      expect(read(join(ROOT, f)), f).not.toMatch(/\b1\d\d\+/)
    }
    expect(read(join(SRC, 'pages', 'ResultsPreview.tsx'))).not.toMatch(/\b1\d\d\+/)
  })

  it('investors: no unbacked "400 exercises" or "thousands of athletes"', () => {
    const s = read(join(ROOT, 'investors.html'))
    expect(s).not.toMatch(/400 exercises/)
    expect(s).not.toMatch(/thousands of athletes/i)
  })

  it('dashboard: Home tab names the score with its Base band, no "ROM health score"', () => {
    const s = read(join(ROOT, 'dashboard.html'))
    expect(s).not.toMatch(/ROM health score/i)
    expect(s).toMatch(/Your ROM score out of 100 with its band \(Needs focus, Building, or Steady\)/)
  })

  it('scoped copy has no em dashes', () => {
    for (const f of ['dashboard.html', 'investors.html']) expect(read(join(ROOT, f)), f).not.toMatch(/\u2014/)
    // Customer copy only: code comments are not rendered.
    const code = read(join(SRC, 'pages', 'ResultsPreview.tsx')).replace(/\/\/.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '')
    expect(code).not.toMatch(/\u2014/)
  })
})
