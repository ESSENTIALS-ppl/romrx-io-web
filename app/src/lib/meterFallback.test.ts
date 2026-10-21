/** Max-reached fallback (Grant approved Oct 21 2026). */
import { describe, expect, it } from 'vitest'
import { FALLBACK_MS, initialFallback, stepFallback } from './meterFallback'
import { initialLock, stepLock } from './meterLock'
import { gateReading, directionForField } from './meterDirection'
import { mul, tiltDeltaDeg, type Quat } from './orientation'
import { METER_COPY } from './meterCopy'

/** Feed through the real lock + fallback, as PhoneMeter does. */
function run(fn: (t: number) => number, ms: number) {
  let lock = initialLock(), fb = initialFallback(), offer: number | null = null, firstOfferAt: number | null = null
  for (let t = 0; t <= ms; t += 50) {
    const v = fn(t)
    lock = stepLock(lock, v, t).state
    const f = stepFallback(fb, v, t, lock.locked); fb = f.state; offer = f.offer
    if (offer != null && firstOfferAt == null) firstOfferAt = t
  }
  return { lock, offer, firstOfferAt }
}
// never still: alternates 20 and 26 every tick (outside the 2 deg band), so it never locks
const jitter = (t: number) => (t < 1000 ? 0 : Math.floor(t / 50) % 2 ? 26 : 20)

describe('max-reached fallback', () => {
  it('new user string, exact', () => expect(METER_COPY.maxReached).toBe('Highest reading shown. Tap Use this number to save it.'))
  it('10 s window', () => expect(FALLBACK_MS).toBe(10000))
  it('appears about 10 s after movement starts with the highest reading, never before', () => {
    const r = run(jitter, 15000)
    expect(r.lock.locked).toBe(false)
    expect(r.offer).toBe(26)
    expect(r.firstOfferAt).toBeGreaterThanOrEqual(1000 + FALLBACK_MS)
    expect(r.firstOfferAt).toBeLessThan(1000 + FALLBACK_MS + 100)
    expect(run(jitter, 10900).offer).toBeNull()
  })
  it('is never offered when a lock happens (lock wins)', () => {
    expect(run(t => (t < 1000 ? 0 : 50), 15000).offer).toBeNull()
  })
  it('a still hold within the zero guard never starts the clock', () => {
    expect(run(() => 4, 20000).offer).toBeNull()
  })
  it('wrong-way-only motion never offers a number', () => {
    const spec = directionForField('hip_er_l')!
    // hip ER left: screen faces right (-Y); wrong way = foot outward = +angle about forward X
    const q0: Quat = { w: Math.SQRT1_2, x: Math.SQRT1_2, y: 0, z: 0 }
    let lock = initialLock(), fb = initialFallback(), offer: number | null = null
    for (let t = 0; t <= 20000; t += 50) {
      const deg = t < 1000 ? 0 : (Math.floor(t / 50) % 2 ? 26 : 20)
      const h = (deg * Math.PI) / 360
      const q = mul({ w: Math.cos(h), x: Math.sin(h), y: 0, z: 0 }, q0)
      const g = gateReading(q0, q, tiltDeltaDeg(q0, q), spec)
      expect(g.wrong || deg < 4).toBe(true)
      lock = stepLock(lock, g.lockInput, t).state
      const f = stepFallback(fb, g.lockInput, t, lock.locked); fb = f.state; offer = f.offer
      expect(offer).toBeNull()
    }
    expect(lock.locked).toBe(false)
  })
})
