/**
 * Hip ER phone spot moved from the front of the shin to flat on the inner calf (Jim, Oct 6, 11:36 AM).
 *
 * Axis/sign check. On the shin the screen faces forward and the lower leg swings in the plane of the
 * screen (rotation about the screen normal). On the inner calf the screen faces the other leg, so the
 * same swing is a rotation about an axis lying IN the screen plane (the phone's short edge). The meter
 * does not pick a device axis or a sign per step: PhoneMeter shows tiltDeltaDeg(q0, q), the angle between
 * "down" at zero and "down" now (lib/orientation.ts). For any rotation about a horizontal axis that
 * angle equals the rotation, whatever way the phone faces, and it is never negative. These tests feed
 * synthetic W3C deviceorientation readings (alpha, beta, gamma) through the real sensor store
 * (feedOrientation -> recentQuats/averageQuats zero, same as PhoneMeter) and check the number.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { averageQuats, eulerToQuat, gravityInDevice, relative, tiltDeltaDeg, twistAngleDeg } from './orientation'
import { __resetSensorForTests, feedOrientation, latestQuat, recentQuats } from './meterSensor'
import { STEPS } from '../pages/assessmentSteps'

type V = [number, number, number]
type M = [V, V, V]                      // rows; columns are the device x, y, z axes in earth coords (E, N, Up)
const D = Math.PI / 180
const mm = (a: M, b: M): M => [0, 1, 2].map(i => [0, 1, 2].map(j => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j])) as M
const mv = (a: M, v: V): V => [0, 1, 2].map(i => a[i][0] * v[0] + a[i][1] * v[1] + a[i][2] * v[2]) as V
const cols = (x: V, y: V, z: V): M => [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]]
const rotX = (d: number): M => { const c = Math.cos(d * D), s = Math.sin(d * D); return [[1, 0, 0], [0, c, -s], [0, s, c]] }
const rotY = (d: number): M => { const c = Math.cos(d * D), s = Math.sin(d * D); return [[c, 0, s], [0, 1, 0], [-s, 0, c]] }
const rotZ = (d: number): M => { const c = Math.cos(d * D), s = Math.sin(d * D); return [[c, -s, 0], [s, c, 0], [0, 0, 1]] }

/** Device->earth matrix to W3C deviceorientation angles (R = Rz(alpha) Rx(beta) Ry(gamma)). */
function toEuler(R: M): { alpha: number; beta: number; gamma: number } {
  const beta = Math.asin(Math.max(-1, Math.min(1, R[2][1])))
  if (Math.cos(beta) < 1e-9) return { alpha: Math.atan2(R[1][0], R[0][0]) / D, beta: beta / D, gamma: 0 }   // long edge exactly vertical
  return { alpha: Math.atan2(-R[0][1], R[1][1]) / D, beta: beta / D, gamma: Math.atan2(-R[2][0], R[2][2]) / D }
}

// Earth frame: x = east, y = north, z = up. The person sits facing north, so front-to-back = y.
// Left leg: the inner side faces east (toward the right leg). Right leg: the inner side faces west.
type Leg = 'left' | 'right'
const medial = (leg: Leg): V => (leg === 'left' ? [1, 0, 0] : [-1, 0, 0])

/** Phone flat on the inner calf: screen (device z) toward the other leg, long edge (device y) along the leg. */
function innerCalf(leg: Leg, topToKnee = true): M {
  const z = medial(leg)
  const y: V = topToKnee ? [0, 0, 1] : [0, 0, -1]
  const x: V = [y[1] * z[2] - y[2] * z[1], y[2] * z[0] - y[0] * z[2], y[0] * z[1] - y[1] * z[0]]
  return cols(x, y, z)
}
/** Phone flat on the front of the shin (hip_ir, unchanged): screen forward, long edge along the shin, top to knee. */
const frontOfShin = (): M => cols([-1, 0, 0], [0, 0, 1], [0, 1, 0])

/**
 * Seated hip rotation: the lower leg swings about the front-to-back axis through the knee.
 * dir 'in' = foot toward the other leg (hip ER), 'out' = foot away from it (hip IR).
 */
function swing(leg: Leg, dir: 'in' | 'out', deg: number): M {
  const footToMedial = (leg === 'left') === (dir === 'in')     // left foot going in moves east
  return rotY(footToMedial ? -deg : deg)
}

/** Full pose: heading (which way the person faces), leg swing, phone spot, small grip offset in the phone's own frame. */
function pose(spot: M, leg: Leg, dir: 'in' | 'out', deg: number, heading = 0, grip: M = rotX(0)): M {
  return mm(rotZ(heading), mm(swing(leg, dir, deg), mm(spot, grip)))
}

function feed(R: M, n = 1) { const e = toEuler(R); for (let i = 0; i < n; i++) feedOrientation(e.alpha, e.beta, e.gamma) }

/** Same path as PhoneMeter: average the recent readings as zero, then tiltDeltaDeg against the latest. */
function measure(spot: M, leg: Leg, dir: 'in' | 'out', deg: number, heading = 0, grip?: M) {
  __resetSensorForTests()
  feed(pose(spot, leg, dir, 0, heading, grip), 10)
  const q0 = averageQuats(recentQuats())
  feed(pose(spot, leg, dir, deg, heading, grip))
  const q = latestQuat()!
  return { reading: tiltDeltaDeg(q0, q), rel: relative(q0, q) }
}

beforeEach(() => __resetSensorForTests())

describe('test helpers are right (so the checks below mean something)', () => {
  it('toEuler -> eulerToQuat gives back the same "down" in device axes, including the exactly-vertical zero pose', () => {
    for (const R of [innerCalf('left'), innerCalf('right', false), frontOfShin(), pose(innerCalf('left'), 'left', 'in', 37, 120, rotY(12))]) {
      const e = toEuler(R)
      const g = gravityInDevice(eulerToQuat(e.alpha, e.beta, e.gamma))
      const want: V = [-R[2][0], -R[2][1], -R[2][2]]              // R^T * (0, 0, -1)
      g.forEach((v, i) => expect(v).toBeCloseTo(want[i], 6))
    }
  })
  it('hip ER swing moves the foot toward the other leg; hip IR swing moves it away', () => {
    for (const leg of ['left', 'right'] as Leg[]) {
      const foot = mv(swing(leg, 'in', 30), [0, 0, -1])
      expect(foot[0] * medial(leg)[0]).toBeGreaterThan(0.49)
      const footOut = mv(swing(leg, 'out', 30), [0, 0, -1])
      expect(footOut[0] * medial(leg)[0]).toBeLessThan(-0.49)
    }
  })
})

describe('hip_er: phone flat on the inner calf', () => {
  it('the swing axis is now IN the screen plane (not the screen normal as on the shin)', () => {
    const calf = measure(innerCalf('left'), 'left', 'in', 30).rel
    const shin = measure(frontOfShin(), 'left', 'out', 30).rel
    expect(Math.abs(twistAngleDeg(calf, [0, 0, 1]))).toBeLessThan(0.5)     // no rotation about the screen normal
    expect(Math.abs(twistAngleDeg(calf, [1, 0, 0]))).toBeCloseTo(30, 0)    // all of it about the short edge
    expect(Math.abs(twistAngleDeg(shin, [0, 0, 1]))).toBeCloseTo(30, 0)    // shin: all of it about the screen normal
  })

  for (const leg of ['left', 'right'] as Leg[]) {
    for (const deg of [30, 45]) {
      it(`${leg} leg, 0 to ${deg}°: reads about ${deg} and positive`, () => {
        const { reading } = measure(innerCalf(leg), leg, 'in', deg)
        expect(reading).toBeGreaterThan(0)
        expect(reading).toBeCloseTo(deg, 1)
      })
    }
  }

  it('rises steadily from the zero to end range (0, 5, ... 45), every step positive', () => {
    for (const leg of ['left', 'right'] as Leg[]) {
      let prev = -1
      for (let d = 0; d <= 45; d += 5) {
        const r = measure(innerCalf(leg), leg, 'in', d).reading
        expect(r).toBeCloseTo(d, 1)
        expect(r).toBeGreaterThan(prev)
        prev = r
      }
    }
  })

  it('same number with the phone upside down, any compass heading, and a tilted calf surface', () => {
    const grips = [rotX(0), rotY(12), rotX(-8), mm(rotY(-15), rotX(10))]   // phone a bit toward the back or front of the calf, or tipped by the calf bulge
    for (const leg of ['left', 'right'] as Leg[]) for (const top of [true, false]) for (const heading of [0, 73, 250]) for (const g of grips) {
      for (const deg of [30, 45]) {
        const { reading } = measure(innerCalf(leg, top), leg, 'in', deg, heading, g)
        expect(reading).toBeGreaterThan(0)
        expect(reading).toBeCloseTo(deg, 1)
      }
    }
  })
})

describe('hip_ir: phone still on the front of the shin (unchanged)', () => {
  for (const leg of ['left', 'right'] as Leg[]) {
    for (const deg of [30, 45]) {
      it(`${leg} leg, 0 to ${deg}°: reads about ${deg} and positive`, () => {
        const { reading } = measure(frontOfShin(), leg, 'out', deg)
        expect(reading).toBeGreaterThan(0)
        expect(reading).toBeCloseTo(deg, 1)
      })
    }
  }
  it('hip_ir phone spot is unchanged: still the front of the shin; tool line no longer says same spot as hip ER', () => {
    const ir = STEPS.find(s => s.id === 'hip_ir')!
    expect(ir.meter?.grip).toBe('Phone flat on the front of your shin, just below the knee. Screen faces forward, long edge along the shin.')
    expect(ir.tool).toBe('Same chair. Phone on the front of your shin. Only the foot direction changes.')   // pending Stacy
    expect(ir.tool).not.toMatch(/same phone spot/i)
    expect(ir.position).toEqual([
      'Stay in the same chair and the same position.',
      'Keep your phone flat on the front of your shin, just below the knee, screen facing forward.',
      'Before each leg, tap Start and hold your shin straight up and down while it counts down from 5.',
    ])
  })
})

describe('hip_er copy (Jim, Oct 6, 11:36 AM; pending Stacy)', () => {
  const er = STEPS.find(s => s.id === 'hip_er')!
  it('grip and setup say the phone goes flat on the inner calf, zeroed there', () => {
    expect(er.meter?.grip).toBe('Phone flat on your inner calf, just below the knee. Screen faces your other leg, long edge along the calf.')
    expect(er.position).toEqual([
      'Sit tall in a firm chair with both feet flat on the floor and your knees bent to 90°.',
      'Hold your phone flat on your INNER calf, just below the knee. The screen faces your other leg and the long edge runs along your calf.',
      'Tap Start, then hold your lower leg straight up and down and stay still while it counts down from 5. It zeroes at the end.',
    ])
  })
  it('no hip_er setup, how-to or grip line puts the phone on the shin any more', () => {
    for (const t of [er.tool, ...er.position, ...er.howTo, er.meter!.grip]) expect(t).not.toMatch(/shin|front of your/i)
  })
})
