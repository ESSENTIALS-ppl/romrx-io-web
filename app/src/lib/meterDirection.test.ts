/**
 * Direction check (Oct 21 2026). Each case builds the zero pose from the step copy (screen normal z
 * and top edge y as world vectors; world X = user's forward, Y = user's left, Z = up), then turns
 * the phone about the body's rotation axis the RIGHT way and the WRONG way. Every step and both
 * sides, and both top-edge directions wherever the copy does not fix the top edge.
 */
import { describe, expect, it } from 'vitest'
import { mul, tiltDeltaDeg, type Quat } from './orientation'
import { initialLock, stepLock } from './meterLock'
import { directionForField, gateReading, signedTiltDeg, WRONG_WAY_MARGIN_DEG } from './meterDirection'
const signedTiltDegFor = (q0: Quat, q: Quat) => signedTiltDeg(q0, q, directionForField('shoulder_er_l')!)
import { METER_COPY } from './meterCopy'

type V = [number, number, number]
const X: V = [1, 0, 0], Y: V = [0, 1, 0], Z: V = [0, 0, 1]
const neg = (v: V): V => [-v[0], -v[1], -v[2]]
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]

/** Device-to-world quaternion from the device axes written in world coordinates. */
function fromAxes(y: V, z: V): Quat {
  const x = cross(y, z)
  const m = [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]]
  const tr = m[0][0] + m[1][1] + m[2][2]
  if (tr > 0) { const s = Math.sqrt(tr + 1) * 2; return { w: s / 4, x: (m[2][1] - m[1][2]) / s, y: (m[0][2] - m[2][0]) / s, z: (m[1][0] - m[0][1]) / s } }
  if (m[0][0] > m[1][1] && m[0][0] > m[2][2]) { const s = Math.sqrt(1 + m[0][0] - m[1][1] - m[2][2]) * 2; return { w: (m[2][1] - m[1][2]) / s, x: s / 4, y: (m[0][1] + m[1][0]) / s, z: (m[0][2] + m[2][0]) / s } }
  if (m[1][1] > m[2][2]) { const s = Math.sqrt(1 + m[1][1] - m[0][0] - m[2][2]) * 2; return { w: (m[0][2] - m[2][0]) / s, x: (m[0][1] + m[1][0]) / s, y: s / 4, z: (m[1][2] + m[2][1]) / s } }
  const s = Math.sqrt(1 + m[2][2] - m[0][0] - m[1][1]) * 2; return { w: (m[1][0] - m[0][1]) / s, x: (m[0][2] + m[2][0]) / s, y: (m[1][2] + m[2][1]) / s, z: s / 4 }
}
const axisAngle = (a: V, deg: number): Quat => { const h = (deg * Math.PI) / 360; return { w: Math.cos(h), x: a[0] * Math.sin(h), y: a[1] * Math.sin(h), z: a[2] * Math.sin(h) } }

interface Case { key: string; z: V; ys: V[]; axis: V; rightSign: 1 | -1; deg: number }
const L_MED = neg(Y), R_MED = Y, L_LAT = Y, R_LAT = neg(Y)
const CASES: Case[] = [
  // hip_er: inner calf, screen to the other leg; foot swings inward about the thigh (forward) axis
  { key: 'hip_er_l', z: L_MED, ys: [Z, neg(Z)], axis: X, rightSign: -1, deg: 29 },
  { key: 'hip_er_r', z: R_MED, ys: [Z, neg(Z)], axis: X, rightSign: 1, deg: 29 },
  // hip_ir: front of shin, screen forward; foot swings outward about the thigh axis
  { key: 'hip_ir_l', z: X, ys: [Z, neg(Z)], axis: X, rightSign: 1, deg: 32 },
  { key: 'hip_ir_r', z: X, ys: [Z, neg(Z)], axis: X, rightSign: -1, deg: 32 },
  // shoulder_er (Jim 12:58 PM): phone naturally in hand, screen facing you (z = backward), top edge
  // up, or tipped toward the thumb side either way; forearm turns up and back about the side-to-side axis
  { key: 'shoulder_er_l', z: neg(X), ys: [Z, Y, neg(Y)], axis: Y, rightSign: -1, deg: 85 },
  { key: 'shoulder_er_r', z: neg(X), ys: [Z, Y, neg(Y)], axis: Y, rightSign: -1, deg: 85 },
  // shoulder_flex: in hand along the hanging arm, screen out to the side; arm lifts forward
  { key: 'shoulder_flex_l', z: L_LAT, ys: [Z, neg(Z)], axis: Y, rightSign: -1, deg: 140 },
  { key: 'shoulder_flex_r', z: R_LAT, ys: [Z, neg(Z)], axis: Y, rightSign: -1, deg: 140 },
  // cervical_lat: forehead, screen forward; head tilts toward the named shoulder about the forward axis
  { key: 'cervical_lat_l', z: X, ys: [Z, neg(Z)], axis: X, rightSign: -1, deg: 40 },
  { key: 'cervical_lat_r', z: X, ys: [Z, neg(Z)], axis: X, rightSign: 1, deg: 40 },
  // hip_abd: outer thigh, screen out; leg moves out to the side about the forward axis
  { key: 'hip_abd_l', z: L_LAT, ys: [Z, neg(Z)], axis: X, rightSign: 1, deg: 40 },
  { key: 'hip_abd_r', z: R_LAT, ys: [Z, neg(Z)], axis: X, rightSign: -1, deg: 40 },
]

/** Ramp from 0 to deg over 1 s, then hold 4 s; returns lock result and whether wrong-way was shown. */
function sim(q0: Quat, axis: V, deg: number, key: string) {
  const spec = directionForField(key)
  let s = initialLock(), wrongSeen = false
  for (let t = 0; t <= 5000; t += 16) {
    const a = deg * Math.min(1, t / 1000)
    const q = mul(axisAngle(axis, a), q0)
    const tilt = tiltDeltaDeg(q0, q)
    const g = gateReading(q0, q, tilt, spec)
    if (g.wrong && !s.locked) wrongSeen = true
    s = stepLock(s, g.lockInput, t).state
  }
  return { s, wrongSeen }
}

describe('meter direction check', () => {
  it('new user string, exact', () => expect(METER_COPY.wrongWay).toBe('Wrong way, return to start'))
  it('margin is 3 deg', () => expect(WRONG_WAY_MARGIN_DEG).toBe(3))
  for (const c of CASES) for (const y of c.ys) {
    const tag = `${c.key} (top edge ${y.join(',')})`
    it(`${tag}: right way locks on the true angle, no message`, () => {
      const r = sim(fromAxes(y, c.z), c.axis, c.rightSign * c.deg, c.key)
      expect(r.s.locked).toBe(true)
      expect(r.s.lockVal).toBe(c.deg)
      expect(r.wrongSeen).toBe(false)
    })
    it(`${tag}: wrong way does not lock and shows the message`, () => {
      const r = sim(fromAxes(y, c.z), c.axis, -c.rightSign * c.deg, c.key)
      expect(r.s.locked).toBe(false)
      expect(r.wrongSeen).toBe(true)
    })
  }
  it('unchecked steps keep the old behavior: either way locks', () => {
    for (const key of ['hip_flex_l', 'hip_flex_r', 'cervical_flex', 'cervical_ext']) {
      expect(directionForField(key)).toBeNull()
      const q0 = fromAxes(Z, Y)
      expect(sim(q0, Y, 30, key).s.locked).toBe(true)
      expect(sim(q0, Y, -30, key).s.locked).toBe(true)
    }
  })
  it('a wrong-way wobble inside the 3 deg margin is not flagged', () => {
    const q0 = fromAxes(Z, L_MED)
    const q = mul(axisAngle(X, 2.5), q0)
    expect(gateReading(q0, q, tiltDeltaDeg(q0, q), directionForField('hip_er_l')).wrong).toBe(false)
  })
})

describe('shoulder ER natural hold, screen facing you: tilt tracks rotation 1:1', () => {
  for (const y of [Z, Y, neg(Y)]) it(`top edge ${y.join(',')}: 0, 45, 90 deg read 0, 45, 90 and the right way is positive`, () => {
    const q0 = fromAxes(y, neg(X))
    for (const deg of [0, 45, 90]) {
      const q = mul(axisAngle(Y, -deg), q0)        // forearm forward -> up
      expect(tiltDeltaDeg(q0, q)).toBeCloseTo(deg, 6)
      expect(signedTiltDegFor(q0, q)).toBeCloseTo(deg, 6)
      const w = mul(axisAngle(Y, deg), q0)         // forearm forward -> down (wrong way)
      expect(tiltDeltaDeg(q0, w)).toBeCloseTo(deg, 6)
      if (deg > 0) expect(signedTiltDegFor(q0, w)).toBeCloseTo(-deg, 6)
    }
  })
})
