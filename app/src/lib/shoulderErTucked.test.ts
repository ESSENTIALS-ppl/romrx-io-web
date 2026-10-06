/**
 * Shoulder ER, tucked-elbow version lying on your back (Jim, Oct 6 11:45 AM).
 *
 * Pose: lying face up, elbow on the floor tucked in at your side, forearm pointing at the ceiling, phone in that hand
 * along the forearm on its edge, screen facing your head. The hand falls outward toward the floor: the forearm turns
 * about the upper arm, which lies flat along the body (a level, head-to-feet axis). The meter shows the angle between
 * "down" at zero and "down" now (tiltDeltaDeg), which equals the turn for any level axis, so no math change is needed.
 * These tests feed synthetic W3C deviceorientation readings through the real sensor store and zero code.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { averageQuats, eulerToQuat, gravityInDevice, relative, tiltDeltaDeg, twistAngleDeg } from './orientation'
import { __resetSensorForTests, feedOrientation, latestQuat, recentQuats } from './meterSensor'
import { STEPS } from '../pages/assessmentSteps'
import { METER_COPY } from './meterCopy'

type V = [number, number, number]
type M = [V, V, V]
const D = Math.PI / 180
const mm = (a: M, b: M): M => [0, 1, 2].map(i => [0, 1, 2].map(j => a[i][0] * b[0][j] + a[i][1] * b[1][j] + a[i][2] * b[2][j])) as M
const mv = (a: M, v: V): V => [0, 1, 2].map(i => a[i][0] * v[0] + a[i][1] * v[1] + a[i][2] * v[2]) as V
const cols = (x: V, y: V, z: V): M => [[x[0], y[0], z[0]], [x[1], y[1], z[1]], [x[2], y[2], z[2]]]
const cross = (a: V, b: V): V => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]]
const det = (R: M) => R[0][0] * (R[1][1] * R[2][2] - R[1][2] * R[2][1]) - R[0][1] * (R[1][0] * R[2][2] - R[1][2] * R[2][0]) + R[0][2] * (R[1][0] * R[2][1] - R[1][1] * R[2][0])
const rotX = (d: number): M => { const c = Math.cos(d * D), s = Math.sin(d * D); return [[1, 0, 0], [0, c, -s], [0, s, c]] }
const rotY = (d: number): M => { const c = Math.cos(d * D), s = Math.sin(d * D); return [[c, 0, s], [0, 1, 0], [-s, 0, c]] }
const rotZ = (d: number): M => { const c = Math.cos(d * D), s = Math.sin(d * D); return [[c, -s, 0], [s, c, 0], [0, 0, 1]] }

/** Device->earth matrix to W3C deviceorientation angles (R = Rz(alpha) Rx(beta) Ry(gamma)). */
function toEuler(R: M): { alpha: number; beta: number; gamma: number } {
  const beta = Math.asin(Math.max(-1, Math.min(1, R[2][1])))
  if (Math.cos(beta) < 1e-9) return { alpha: Math.atan2(R[1][0], R[0][0]) / D, beta: beta / D, gamma: 0 }   // long edge exactly vertical
  return { alpha: Math.atan2(-R[0][1], R[1][1]) / D, beta: beta / D, gamma: Math.atan2(-R[2][0], R[2][2]) / D }
}

// Earth: x = east, y = north, z = up. Lying face up with the head to the north: your left side is east, your right is west.
type Arm = 'left' | 'right'
const outward = (arm: Arm): V => (arm === 'left' ? [1, 0, 0] : [-1, 0, 0])

/** Phone in that hand along the forearm (top toward the knuckles = up), on its edge, screen facing your head (north). */
function forearmUp(): M {
  const y: V = [0, 0, 1], z: V = [0, 1, 0]
  return cols(cross(y, z), y, z)
}
/** Hand falls outward by deg: turn about the upper arm (the north axis through the elbow). */
const fall = (arm: Arm, deg: number): M => rotY(arm === 'left' ? deg : -deg)

function pose(arm: Arm, deg: number, heading = 0, grip: M = rotX(0)): M {
  return mm(rotZ(heading), mm(fall(arm, deg), mm(forearmUp(), grip)))
}
function feed(R: M, n = 1) { const e = toEuler(R); for (let i = 0; i < n; i++) feedOrientation(e.alpha, e.beta, e.gamma) }
function measure(arm: Arm, deg: number, heading = 0, grip?: M) {
  __resetSensorForTests()
  feed(pose(arm, 0, heading, grip), 10)
  const q0 = averageQuats(recentQuats())
  feed(pose(arm, deg, heading, grip))
  const q = latestQuat()!
  return { reading: tiltDeltaDeg(q0, q), rel: relative(q0, q) }
}

beforeEach(() => __resetSensorForTests())

describe('test setup is right', () => {
  it('poses are proper rotations, and toEuler -> eulerToQuat gives back the same "down"', () => {
    for (const R of [forearmUp(), pose('left', 45), pose('right', 75, 200, rotY(10))]) {
      expect(det(R)).toBeCloseTo(1, 9)
      const e = toEuler(R)
      const g = gravityInDevice(eulerToQuat(e.alpha, e.beta, e.gamma))
      const want: V = [-R[2][0], -R[2][1], -R[2][2]]
      g.forEach((v, i) => expect(v).toBeCloseTo(want[i], 6))
    }
  })
  it('the hand falls outward (away from the body) and down toward the floor', () => {
    for (const arm of ['left', 'right'] as Arm[]) {
      const hand = mv(fall(arm, 30), [0, 0, 1])
      expect(hand[0] * outward(arm)[0]).toBeCloseTo(0.5, 6)
      expect(hand[2]).toBeLessThan(1)
    }
  })
})

describe('shoulder_er tucked elbow, lying on your back: meter reading', () => {
  it('the turn is about the screen normal (screen faces your head), so it reads like the old step did', () => {
    const r = measure('left', 45).rel
    expect(Math.abs(twistAngleDeg(r, [0, 0, 1]))).toBeCloseTo(45, 1)
  })
  for (const arm of ['left', 'right'] as Arm[]) {
    for (const deg of [30, 45, 75]) {
      it(`${arm} arm, forearm up to ${deg}° outward: reads about ${deg} and positive`, () => {
        const { reading } = measure(arm, deg)
        expect(reading).toBeGreaterThan(0)
        expect(reading).toBeCloseTo(deg, 1)
      })
    }
  }
  it('rises steadily from the zero to 75, both arms', () => {
    for (const arm of ['left', 'right'] as Arm[]) {
      let prev = -1
      for (let d = 0; d <= 75; d += 5) {
        const r = measure(arm, d).reading
        expect(r).toBeCloseTo(d, 1)
        expect(r).toBeGreaterThan(prev)
        prev = r
      }
    }
  })
  it('same number at any compass heading and with the phone held a little off the forearm line', () => {
    for (const arm of ['left', 'right'] as Arm[]) for (const heading of [0, 90, 233]) for (const g of [rotX(0), rotY(10), rotX(-12), mm(rotZ(8), rotY(-6))]) {
      for (const deg of [30, 45, 75]) {
        const { reading } = measure(arm, deg, heading, g)
        expect(reading).toBeGreaterThan(0)
        expect(reading).toBeCloseTo(deg, 1)
      }
    }
  })
})

describe('shoulder_er copy and fields (Jim, Oct 6 11:45 AM; copy pending Stacy)', () => {
  const s = STEPS.find(x => x.id === 'shoulder_er')!
  const text = [s.tool, ...s.position, ...s.howTo, s.mistake, s.mistakeFix, s.meter!.grip].join(' ')
  it('lying on your back, elbow on the floor, forearm at the ceiling; never "upper arm on the floor"', () => {
    expect(s.tool).toBe('Your phone. Lying on your back on the floor.')
    expect(text).toContain('elbow on the floor')
    expect(text).toContain('forearm points at the ceiling')
    expect(text).toContain('Let your hand fall slowly outward')
    expect(text).not.toMatch(/upper arm/i)
    expect(text).not.toMatch(/shoulder height|like a T|Seated/i)
  })
  it('grip keeps the phone in that hand along the forearm, wrist straight and stiff', () => {
    expect(s.meter!.grip).toBe('Phone in that hand, along your forearm like a ruler, on its edge, screen facing your head. Wrist straight and stiff.')
    expect(s.position[1]).toMatch(/^Hold the phone in that hand along your forearm like a ruler/)
    expect(s.position[1]).toContain('Keep your wrist straight and stiff the whole time.')
    expect(s.position[2]).toBe('Tap Start with your other hand, then hold this start position while it counts down from 5.')
  })
  it('title shown to users is "Shoulder Extension" (Jim, Oct 6 11:56 AM; pending Stacy); id stays shoulder_er', () => {
    expect(s.title).toBe('Shoulder Extension')
    expect(s.id).toBe('shoulder_er')
  })
  it('fields: typical range 40-75 (Gill et al., 2020), riskBelow 40 (the Steady target), keys unchanged', () => {
    expect(s.fields.map(f => f.key)).toEqual(['shoulder_er_l', 'shoulder_er_r'])
    for (const f of s.fields) {
      expect([f.normalLow, f.normalHigh, f.riskBelow, f.rangeSource]).toEqual([40, 75, 40, 'Gill et al., 2020'])
      expect(METER_COPY.typicalRange(f.normalLow!, f.normalHigh!)).toBe('Typical range: 40-75°')
    }
  })
  it('shoulder flexion is a separate step: sitting in a chair (Jim, Oct 6 11:54 AM), range unchanged', () => {
    const f = STEPS.find(x => x.id === 'shoulder_flex')!
    expect(f.tool).toBe('Your phone. Sitting in a chair with a back.')
    expect(f.fields.map(x => [x.normalLow, x.normalHigh])).toEqual([[140, 180], [140, 180]])
  })
})
