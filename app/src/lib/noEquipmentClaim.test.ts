/**
 * Jim, Oct 6 2026, 12:10 PM: the phone IS equipment. The self-assessment intro says exactly
 * "Approximately 15 minutes using the ROMeter. Equipment needed: ..." (12:29: your phone, a chair, a wall, and a tape measure or ruler). App copy must never
 * say the test is equipment-less. Phrases are built from pieces so this file never matches itself.
 */
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const SRC = resolve(__dirname, '..')
const APP = resolve(SRC, '..')
const INTRO = 'Approximately 15 minutes using the ROMeter. Equipment needed: your phone, a chair, a wall, and a tape measure or ruler.'   // Jim, Oct 6 12:29 PM

const p = (...w: string[]) => new RegExp(w.join(' '), 'i')
const BANNED: RegExp[] = [
  p('no', 'equipment'),
  p('equipment[- ]free'),
  p('just', 'your', 'phone'),
  p('only', 'your', 'phone'),
  p('nothing', 'but', 'your', 'phone'),
  p('all', 'you', 'need', 'is', 'your', 'phone'),
  p('no', 'gear'),
  p('no', 'tools'),
]

function files(dir: string): string[] {
  return readdirSync(dir).flatMap(n => {
    const f = join(dir, n)
    return statSync(f).isDirectory() ? files(f) : /\.(tsx?|jsx?|html|json)$/.test(n) ? [f] : []
  })
}

describe('the phone is equipment (Jim, Oct 6 12:10 PM)', () => {
  it('the self-assessment intro line is exactly Jim\'s wording', () => {
    const src = readFileSync(join(SRC, 'pages', 'AssessmentPhases.tsx'), 'utf8')
    expect(src).toContain(`>${INTRO}<`)
  })
  it('zero hits in app/src and app/index.html for any no-equipment phrase', () => {
    const hits: string[] = []
    for (const f of [...files(SRC), join(APP, 'index.html')]) {
      const text = readFileSync(f, 'utf8')
      for (const re of BANNED) if (re.test(text)) hits.push(`${f.slice(APP.length + 1)}: ${re.source}`)
    }
    expect(hits).toEqual([])
  })
})
