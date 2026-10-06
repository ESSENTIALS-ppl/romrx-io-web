/**
 * Shoulder flexion, SITTING in a chair with a back (Jim, Oct 6 11:54 AM).
 *
 * Grip: phone in that hand, standing on its long side, in line with the arm, screen facing out (away from the body).
 * The arm lifts forward and straight up over the head: a turn about the side-to-side axis through the shoulder, which
 * is the screen normal here, so "down" turns inside the screen plane. The meter shows the angle between "down" at zero
 * and "down" now (tiltDeltaDeg, acos of a dot product), which runs smoothly 0..180 with no fold or wrap at 90.
 * Synthetic W3C deviceorientation readings go through the real sensor store and zero code, as in PhoneMeter.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import { averageQuats, eulerToQuat, gravityInDevice, tiltDeltaDeg } from './orientation'
import { __resetSensorForTests, feedOrientation, latestQuat, recentQuats } from './meterSensor'
import { STEPS } from '../pages/assessmentSteps'

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

function toEuler(R: M): { alpha: number; beta: number; gamma: number } {
  const beta = Math.asin(Math.max(-1, Math.min(1, R[2][1])))
  if (Math.cos(beta) < 1e-9) return { alpha: Math.atan2(R[1][0], R[0][0]) / D, beta: beta / D, gamma: 0 }   // long edge exactly vertical
  return { alpha: Math.atan2(-R[0][1], R[1][1]) / D, beta: beta / D, gamma: Math.atan2(-R[2][0], R[2][2]) / D }
}

// Earth: x = east, y = north, z = up. Sitting facing north: your left side is west, your right side is east.
type Arm = 'left' | 'right'
const out = (arm: Arm): V => (arm === 'left' ? [-1, 0, 0] : [1, 0, 0])

/** Arm straight down, phone on its long side in line with the arm, screen facing out. topDown: top edge toward the fingers. */
function armDown(arm: Arm, topDown = true): M {
  const y: V = topDown ? [0, 0, -1] : [0, 0, 1]
  const z = out(arm)
  return cols(cross(y, z), y, z)
}
/** Lift forward and up by deg: turn about the side-to-side (east) axis through the shoulder. */
const lift = (deg: number): M => rotX(deg)

function pose(arm: Arm, deg: number, topDown = true, heading = 0, grip: M = rotX(0)): M {
  return mm(rotZ(heading), mm(lift(deg), mm(armDown(arm, topDown), grip)))
}
function feed(R: M, n = 1) { const e = toEuler(R); for (let i = 0; i < n; i++) feedOrientation(e.alpha, e.beta, e.gamma) }
function zeroThen(arm: Arm, degs: number[], topDown = true, heading = 0, grip?: M): number[] {
  __resetSensorForTests()
  feed(pose(arm, 0, topDown, heading, grip), 10)
  const q0 = averageQuats(recentQuats())
  return degs.map(d => { feed(pose(arm, d, topDown, heading, grip)); return tiltDeltaDeg(q0, latestQuat()!) })
}

beforeEach(() => __resetSensorForTests())

describe('test setup is right', () => {
  it('poses are proper rotations; toEuler -> eulerToQuat gives back the same "down" (including straight down and straight up)', () => {
    for (const R of [armDown('left'), armDown('right', false), pose('left', 90), pose('right', 180), pose('left', 140, true, 77, rotY(8))]) {
      expect(det(R)).toBeCloseTo(1, 9)
      const e = toEuler(R)
      const g = gravityInDevice(eulerToQuat(e.alpha, e.beta, e.gamma))
      const want: V = [-R[2][0], -R[2][1], -R[2][2]]
      g.forEach((v, i) => expect(v).toBeCloseTo(want[i], 6))
    }
  })
  it('the lift goes forward at 90 and straight overhead at 180, not out to the side', () => {
    const hand = (d: number) => mv(lift(d), [0, 0, -1])
    expect(hand(90)[1]).toBeCloseTo(1, 9)          // straight ahead (north)
    expect(hand(180)[2]).toBeCloseTo(1, 9)         // straight up
    for (const d of [0, 45, 90, 140, 180]) expect(hand(d)[0]).toBeCloseTo(0, 9)
  })
})

describe('shoulder flexion sitting: meter reading, both arms', () => {
  const marks = [90, 140, 170, 180]
  for (const arm of ['left', 'right'] as Arm[]) {
    it(`${arm} arm: 0 (arm down) -> 90, 140, 170, 180 reads each within 1 degree, positive`, () => {
      const r = zeroThen(arm, marks)
      r.forEach((v, i) => { expect(v).toBeGreaterThan(0); expect(Math.abs(v - marks[i])).toBeLessThan(1) })
    })
    it(`${arm} arm: monotonic from 0 to 180 in 1 degree steps, no fold or wrap past 90`, () => {
      const degs = Array.from({ length: 181 }, (_, i) => i)
      const r = zeroThen(arm, degs)
      for (let i = 1; i < r.length; i++) {
        expect(r[i]).toBeGreaterThan(r[i - 1])
        expect(Math.abs(r[i] - degs[i])).toBeLessThan(1)
      }
      expect(r[91]).toBeGreaterThan(90)            // past 90 keeps rising (does not come back down)
      expect(r[100]).toBeCloseTo(100, 0)
    })
  }
  it('same readings with the phone flipped end for end, any compass heading, and a slightly off-line grip', () => {
    for (const arm of ['left', 'right'] as Arm[]) for (const top of [true, false]) for (const h of [0, 120, 300]) for (const g of [rotX(0), rotY(8), rotX(-6)]) {
      const r = zeroThen(arm, marks, top, h, g)
      r.forEach((v, i) => { expect(v).toBeGreaterThan(0); expect(Math.abs(v - marks[i])).toBeLessThan(1) })
    }
  })
})

describe('shoulder flexion sitting: copy (Jim, Oct 6 11:54 AM; pending Stacy)', () => {
  const s = STEPS.find(x => x.id === 'shoulder_flex')!
  const text = [s.tool, ...s.position, ...s.howTo, s.mistake, s.mistakeFix, s.meter!.grip].join(' ')
  it('says sitting in a chair, not standing or lying', () => {
    expect(s.tool).toBe('Your phone. Sitting in a chair with a back.')
    expect(s.position[0]).toBe('Sit tall with your back against the chair and your feet flat. Let your arm hang straight down by your side, palm facing your body, thumb forward.')
    expect(text).not.toMatch(/\bstand(ing)? tall\b|\bStanding\.|\bstand\b|\blie\b|\blying\b|on your back on the floor/i)
  })
  it('grip, move, cues and mistake are Jim\'s wording', () => {
    expect(s.position[1]).toBe('Hold the phone in that hand, standing on its long side, in line with your arm. The screen faces out, away from your body.')
    expect(s.position[2]).toBe('Tap Start with your other hand, then let your arm hang straight down and hold still while it counts down from 5. It zeroes at the end.')
    expect(s.howTo[0]).toBe('Keep your arm straight and your elbow locked. Lift your arm forward and straight up over your head, not out to the side. Keep your palm facing in.')
    expect(s.mistake).toBe('Arching your back or leaning back to get the arm higher.')
    for (const cue of ["Keep your back against the chair. Don't arch your back or lean back.", 'Keep your wrist straight.', "Don't bend your elbow or turn your arm out.", "Don't shrug your shoulder up to your ear."]) expect(s.mistakeFix).toContain(cue)
  })
  it('target range, keys and order unchanged', () => {
    expect(s.fields.map(f => [f.key, f.normalLow, f.normalHigh, f.rangeSource])).toEqual([['shoulder_flex_l', 140, 180, 'Gill et al., 2020'], ['shoulder_flex_r', 140, 180, 'Gill et al., 2020']])
  })
})
