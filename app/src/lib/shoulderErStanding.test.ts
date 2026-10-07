/**
 * Shoulder ER, STANDING goal-post test (Oct 6 2026, 8:19 PM, Jim-approved, Quinn spec; Stacy PASS title, cue, stop line).
 *
 * Pose: standing, arm out to the side with the upper arm level (elbow at shoulder height), elbow bent like a goal post,
 * forearm pointing straight ahead. Phone flat along the forearm, top edge toward the hand, screen facing out to the side.
 * Zero = forearm level and pointing ahead. The hand rotates up and back: the forearm turns about the upper arm, which is
 * level, so the turn is fully a tilt: straight up = 90, and it keeps reading past 90 (up to about 110). The meter shows the
 * angle between "down" at zero and "down" now (tiltDeltaDeg), which equals the turn for any level axis, so no math change
 * is needed (no per-step axis config exists). These tests feed synthetic W3C deviceorientation readings through the real
 * sensor store and zero code.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { averageQuats, eulerToQuat, gravityInDevice, relative, tiltDeltaDeg, twistAngleDeg } from './orientation'
import { __resetSensorForTests, feedOrientation, latestQuat, recentQuats } from './meterSensor'
import { STEPS } from '../pages/assessmentSteps'
import { JOINT_SCORE_TARGETS } from './mobilityBands'

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

// Earth: x = east, y = north, z = up. Standing facing north: the left arm goes out to the west, the right arm to the east.
type Arm = 'left' | 'right'
const outward = (arm: Arm): V => (arm === 'left' ? [-1, 0, 0] : [1, 0, 0])

/** Phone flat along the forearm (top edge toward the hand = ahead, north), screen facing out to the side. */
function forearmAhead(arm: Arm): M {
  const y: V = [0, 1, 0], z: V = outward(arm)
  return cols(cross(y, z), y, z)
}
/** Hand rotates up and back by deg: turn about the level upper arm (the east-west axis through the shoulder). */
const rotateUp = (deg: number): M => rotX(deg)

function pose(arm: Arm, deg: number, heading = 0, grip: M = rotX(0)): M {
  return mm(rotZ(heading), mm(rotateUp(deg), mm(forearmAhead(arm), grip)))
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
    for (const R of [forearmAhead('left'), forearmAhead('right'), pose('left', 45), pose('right', 105, 200, rotY(10)), pose('left', 90, 37, rotX(5))]) {
      expect(det(R)).toBeCloseTo(1, 9)
      const e = toEuler(R)
      const g = gravityInDevice(eulerToQuat(e.alpha, e.beta, e.gamma))
      const want: V = [-R[2][0], -R[2][1], -R[2][2]]
      g.forEach((v, i) => expect(v).toBeCloseTo(want[i], 6))
    }
  })
  it('zero pose: forearm (top edge) level and pointing ahead, screen facing out to the side', () => {
    for (const arm of ['left', 'right'] as Arm[]) {
      const R = pose(arm, 0)
      expect([R[0][1], R[1][1], R[2][1]]).toEqual([0, 1, 0])                        // device y (top edge) = ahead, level
      expect([R[0][2], R[1][2], R[2][2]].map(v => v + 0)).toEqual(outward(arm))     // screen normal = out to the side
    }
  })
  it('the hand goes up at 90 and up-and-back past 90', () => {
    for (const arm of ['left', 'right'] as Arm[]) {
      const up = mv(pose(arm, 90), [0, 1, 0]), back = mv(pose(arm, 105), [0, 1, 0])
      expect(up[2]).toBeCloseTo(1, 9)
      expect(back[2]).toBeGreaterThan(0.9)
      expect(back[1]).toBeLessThan(0)                                                 // behind the shoulder line
    }
  })
})

describe('shoulder_er standing goal-post: meter reading (0 / 90 / 105, Quinn)', () => {
  for (const arm of ['left', 'right'] as Arm[]) {
    it(`${arm} arm: forearm level and ahead reads 0`, () => {
      expect(measure(arm, 0).reading).toBeCloseTo(0, 3)
    })
    it(`${arm} arm: forearm straight up reads 90`, () => {
      expect(measure(arm, 90).reading).toBeCloseTo(90, 1)
    })
    it(`${arm} arm: past vertical, 105, reads 105 (values past 90 allowed)`, () => {
      expect(measure(arm, 105).reading).toBeCloseTo(105, 1)
    })
  }
  it('the turn is about the screen normal (screen faces out to the side): an in-screen-plane tilt', () => {
    const r = measure('left', 45).rel
    expect(Math.abs(twistAngleDeg(r, [0, 0, 1]))).toBeCloseTo(45, 1)
  })
  it('rises steadily from 0 through 90 to 110, both arms', () => {
    for (const arm of ['left', 'right'] as Arm[]) {
      let prev = -1
      for (let d = 0; d <= 110; d += 5) {
        const r = measure(arm, d).reading
        expect(r).toBeCloseTo(d, 1)
        expect(r).toBeGreaterThan(prev)
        prev = r
      }
    }
  })
  it('same number at any compass heading and with the phone held a little off the forearm line', () => {
    for (const arm of ['left', 'right'] as Arm[]) for (const heading of [0, 90, 233]) for (const g of [rotX(0), rotY(10), rotX(-12), mm(rotZ(8), rotY(-6))]) {
      for (const deg of [0, 45, 90, 105]) {
        expect(measure(arm, deg, heading, g).reading).toBeCloseTo(deg, 1)
      }
    }
  })
})

describe('shoulder_er copy and fields (Oct 6 8:19 PM; Stacy PASS title, cue, stop line)', () => {
  const s = STEPS.find(x => x.id === 'shoulder_er')!
  it('title "Shoulder External Rotation" (matches the hip step titles); id and field keys unchanged', () => {
    expect(s.title).toBe('Shoulder External Rotation')
    expect(s.id).toBe('shoulder_er')
    expect(s.fields.map(f => f.key)).toEqual(['shoulder_er_l', 'shoulder_er_r'])
  })
  it("Quinn's cue, word for word, in order (Setup 1-2, then How to Measure 1)", () => {
    expect(s.position[0]).toBe('Hold the phone along your forearm like a ruler, wrist straight.')
    expect(s.position[1]).toBe('Raise your arm out to the side, elbow at shoulder height and bent like a goal post, forearm pointing straight ahead.')
    expect(s.position[2]).toBe('Tap Start with your other hand, then hold this start position while it counts down from 5.')
    expect(s.howTo[0]).toBe('Rotate your hand up and back as far as it goes, keeping your elbow at shoulder height and your back from arching.')
  })
  it('standing, phone flat along the forearm, screen out to the side; nothing left from the lying step', () => {
    const text = [s.tool, ...s.position, ...s.howTo, s.mistake, s.mistakeFix, s.meter!.grip].join(' ')
    expect(s.tool).toBe('Your phone. Standing.')
    expect(s.meter!.grip).toBe('Phone flat along your forearm, top edge toward your hand, screen facing out to the side. Wrist straight.')
    expect(text).not.toMatch(/lying|on your back|floor|ceiling|tucked|screen facing your head|Extension/i)
    expect(s.mistakeFix).toBe('Keep your shoulder pressed down and your elbow at the same height the whole time. Only your forearm moves.')
  })
  it('NO typical range and NO source on this step (Stacy, Oct 6 8:19 PM); scoring target 85 elsewhere', () => {
    for (const f of s.fields) {
      expect([f.normalLow, f.normalHigh, f.rangeSource, f.referenceNote, f.unscored]).toEqual([undefined, undefined, undefined, undefined, undefined])
    }
    expect(JOINT_SCORE_TARGETS.shoulder_er).toBe(85)
  })
  it('shoulder flexion is a separate step: sitting in a chair, range unchanged', () => {
    const f = STEPS.find(x => x.id === 'shoulder_flex')!
    expect(f.tool).toBe('Your phone. Sitting in a chair with a back.')
    expect(f.fields.map(x => [x.normalLow, x.normalHigh])).toEqual([[140, 180], [140, 180]])
  })
})
