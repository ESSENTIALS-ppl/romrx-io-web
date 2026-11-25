// Length tiers (Grant 7:32 PM ET, Jim's phone: Tue Neck Flexion Standard and Full were the same 3 movements).
// For every Base area x every rotation day x Quick/Standard/Full, using the real Base library rows (sports 'general',
// read-only export 2026-11-24, __fixtures__/baseLibrary-20261124.json) and EVERY possible saved protocol for that area
// (the server saves exactly 1 exercise, 1 stretch and 1 foam roll per joint): no two lengths are the same, and
// Quick < Standard < Full by movement count. Every movement and dose comes from the library unchanged.
import { describe, expect, it, vi } from 'vitest'
vi.mock('../lib/supabase', () => ({ supabase: {} }))
import { groupByJoint, ROTATION } from './MyProtocol'
import { FULL_ROUNDS_LABEL, SMALL_POOL_BELOW, pickMovements, pickWithSlots, planSession, SESSION_LENGTHS } from '../lib/sessionLength'
import rows from '../lib/__fixtures__/baseLibrary-20261124.json'

// The 10 Base areas, plus every other area with a Base library (lumbar_ext, lumbar_flex, cervical_rot): no exceptions.
const BASE_AREAS = ['hip_er', 'hip_ir', 'hip_abd', 'hip_flex', 'shoulder_er', 'shoulder_flex', 'ankle_df', 'cervical_lat', 'cervical_flex', 'cervical_ext', 'lumbar_ext', 'lumbar_flex', 'cervical_rot']
const DAYS = [0, 1, 2, 3, 4, 5, 6]
type Rx = { id: string; name: string; dose: string }
type P = { exercises: Rx[]; stretches: Rx[]; foam: Rx[] }
const library = groupByJoint(rows as never) as unknown as Record<string, P>
const libPairs = new Set((Object.values(library) as P[]).flatMap(p => [...p.exercises, ...p.stretches, ...p.foam]).map(r => `${r.name}|${r.dose}`))

/** Every saved protocol the server could write for an area: one of each list (none when the list is empty). */
function savedOptions(p: P): P[] {
  const pick = (l: Rx[]) => (l.length ? l.map(x => [x]) : [[]])
  const out: P[] = []
  for (const e of pick(p.exercises)) for (const s of pick(p.stretches)) for (const f of pick(p.foam)) out.push({ exercises: e, stretches: s, foam: f })
  return out
}
const names = (l: Rx[]) => l.map(r => r.name).join(' + ')

describe('Length tiers: Quick < Standard < Full for every area, day and saved protocol', () => {
  it('covers all areas, each with a library', () => {
    for (const a of BASE_AREAS) expect(library[a], a).toBeTruthy()
  })
  for (const day of DAYS) {
    for (const area of BASE_AREAS) {
      it(`day ${day} (priority ${ROTATION[day]}) ${area}`, () => {
        // Today's area is the ranked joint at ROTATION[day]; put this area there.
        const ranked = ['x', 'y', 'z']; ranked[ROTATION[day]] = area
        const todayArea = ranked[ROTATION[day]]
        const lib = library[todayArea]
        for (const saved of savedOptions(lib)) {
          const [pq, ps, pf] = SESSION_LENGTHS.map(l => planSession<Rx>(saved, l, lib))
          const [q, s, f] = [pq, ps, pf].map(p => p.movements.map(m => m.item))
          const total = (p: typeof pq) => p.movements.length * p.rounds
          const sig = (p: typeof pq) => `${names(p.movements.map(m => m.item))} x${p.rounds}`
          const ctx = `${area} day ${day}: Q[${sig(pq)}] S[${sig(ps)}] F[${sig(pf)}]`
          expect(total(pq), ctx).toBeLessThan(total(ps))
          expect(total(ps), ctx).toBeLessThan(total(pf))
          expect(sig(pq), ctx).not.toBe(sig(ps))
          expect(sig(ps), ctx).not.toBe(sig(pf))
          expect(sig(pq), ctx).not.toBe(sig(pf))
          expect(q.length, ctx).toBeGreaterThan(0)
          expect(pq.rounds).toBe(1); expect(ps.rounds).toBe(1)
          expect(pickMovements<Rx>(saved, 'full', lib)).toEqual(f)
          const poolSize = new Set([...lib.exercises, ...lib.stretches, ...lib.foam, ...saved.exercises, ...saved.stretches, ...saved.foam]
            .map(r => r.name.replace(/\([^)]*\)/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''))).size
          if (poolSize >= SMALL_POOL_BELOW) {
            // Standard is still the saved protocol (what ROMBot reads), in order; Full is one round.
            expect(s).toEqual([...saved.exercises, ...saved.stretches, ...saved.foam])
            expect(pf.rounds, ctx).toBe(1)
          } else {
            // Small pool: Quick 1, Standard 2, Full = the Standard set x 2 rounds.
            expect([q.length, s.length, f.length, pf.rounds], ctx).toEqual([1, 2, 2, 2])
            expect(f).toEqual(s)
          }
          // Only existing library names and doses; each movement once in Full.
          for (const r of f) expect(libPairs.has(`${r.name}|${r.dose}`), r.name).toBe(true)
          expect(new Set(f.map(r => r.name.replace(/\([^)]*\)/g, '').toLowerCase().replace(/[^a-z0-9]/g, ''))).size).toBe(f.length)
          // The player gets the same movements as the card.
          expect(pickWithSlots<Rx>(saved, 'full', lib).map(x => x.item)).toEqual(f)
        }
      })
    }
  }
  it('lumbar_ext (pool of 2): Quick 1 < Standard 2 < Full 2 x 2 rounds, doses unchanged', () => {
    const lib = library.lumbar_ext
    const saved = { exercises: [lib.exercises[0]], stretches: [], foam: [] }
    const [q, s, f] = SESSION_LENGTHS.map(l => planSession<Rx>(saved, l, lib))
    expect([q.movements.length * q.rounds, s.movements.length * s.rounds, f.movements.length * f.rounds]).toEqual([1, 2, 4])
    expect(f.rounds).toBe(2)
    expect(f.movements.map(m => m.item)).toEqual(s.movements.map(m => m.item))
    for (const m of f.movements) expect(libPairs.has(`${m.item.name}|${m.item.dose}`)).toBe(true)
    expect(FULL_ROUNDS_LABEL).toBe('2 rounds')
  })
  it('card shows FULL_ROUNDS_LABEL only for 2 rounds, and the player plays the set twice', async () => {
    const { readFileSync } = await import('node:fs')
    const { join } = await import('node:path')
    const page = readFileSync(join(process.cwd(), 'src', 'pages', 'MyProtocol.tsx'), 'utf8')
    expect(page).toContain('{todayRounds === 2 && (')
    expect(page).toContain('{FULL_ROUNDS_LABEL}</span>')
    expect(page).toContain("rounds === 2 ? [...one, ...one] : one")
  })
  it('Jim\'s case: Tuesday (priority 1) Neck Flexion', () => {
    expect(ROTATION[2]).toBe(1)
    const lib = library.cervical_flex
    const saved = savedOptions(lib)[0]
    const [q, s, f] = SESSION_LENGTHS.map(l => pickMovements<Rx>(saved, l, lib))
    expect([q.length, s.length, f.length]).toEqual([2, 3, 5])
    // Before the fix Full was built from the saved protocol alone: the same 3 as Standard.
    expect(pickMovements<Rx>(saved, 'full')).toEqual(s)
  })
})
