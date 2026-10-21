/**
 * Per-step direction check for the phone meter (Grant approved Oct 21 2026; axes in
 * proof-20261020/meter-fixes.md). tiltDeltaDeg is unsigned, so a wrong-way move used to read
 * and lock like a right-way one. Each step declares the expected sign of ONE gravity-delta
 * measure in the zero-pose device frame (x right of screen, y toward top edge, z out of screen):
 *  - 'z': change in gravity's z (screen-normal) component. Used when the movement tips the
 *    screen; independent of which way the top edge points.
 *  - 'y': change in gravity's y (top-edge) component. Used when the start pose has the screen
 *    facing straight up or down (z is symmetric there) and the top edge is set by the copy.
 *  - 'twist': (g0 x g1).z, the in-plane turn seen from the screen. Used when the movement turns
 *    the phone within its own screen plane; independent of which way the top edge points.
 * sideFlip: the expected sign is mirrored on the right side (key ending _r).
 * Steps not listed (hip_flex, cervical_flex/ext) have no check: behavior unchanged.
 */
import { gravityInDevice, tiltDeltaDeg, type Quat } from './orientation'

export type DirAxis = 'z' | 'y' | 'twist'
export interface DirectionSpec { axis: DirAxis; sign: 1 | -1 }
/** Wrong-way readings beyond this many degrees block the lock and show the message. */
export const WRONG_WAY_MARGIN_DEG = 3

const STEP_DIR: Record<string, { axis: DirAxis; left: 1 | -1; right: 1 | -1 }> = {
  hip_er: { axis: 'z', left: -1, right: -1 },
  hip_ir: { axis: 'twist', left: -1, right: 1 },
  shoulder_er: { axis: 'y', left: -1, right: -1 },
  shoulder_flex: { axis: 'twist', left: 1, right: -1 },
  cervical_lat: { axis: 'twist', left: 1, right: -1 },
  hip_abd: { axis: 'z', left: -1, right: -1 },
}

/** Direction spec for one meter field key (for example 'hip_ir_r'), or null when unchecked. */
export function directionForField(key: string): DirectionSpec | null {
  const m = /^(.*)_(l|r)$/.exec(key)
  if (!m) return null
  const d = STEP_DIR[m[1]]
  if (!d) return null
  return { axis: d.axis, sign: m[2] === 'l' ? d.left : d.right }
}

/** Raw signed measure (before the expected sign) from two gravity vectors in device axes. */
export function dirMeasure(g0: [number, number, number], g1: [number, number, number], axis: DirAxis): number {
  if (axis === 'z') return g1[2] - g0[2]
  if (axis === 'y') return g1[1] - g0[1]
  return g0[0] * g1[1] - g0[1] * g1[0]
}

/** Signed degrees: +tilt when moving the expected way, -tilt when moving the wrong way. */
export function signedTiltDeg(q0: Quat, q: Quat, spec: DirectionSpec): number {
  const t = tiltDeltaDeg(q0, q)
  const m = dirMeasure(gravityInDevice(q0), gravityInDevice(q), spec.axis) * spec.sign
  return m < 0 ? -t : t
}

export const isWrongWay = (signedDeg: number) => signedDeg < -WRONG_WAY_MARGIN_DEG

/**
 * What the meter loop feeds the lock. Wrong way past the margin: NaN (clears the hold window, so
 * no lock) and wrong=true (status shows METER_COPY.wrongWay). Otherwise the unsigned tilt, exactly
 * as before. No spec: always the unsigned tilt (unchanged behavior).
 */
export function gateReading(q0: Quat, q: Quat, tilt: number, spec?: DirectionSpec | null): { wrong: boolean; lockInput: number } {
  if (!spec) return { wrong: false, lockInput: tilt }
  const wrong = isWrongWay(signedTiltDeg(q0, q, spec))
  return { wrong, lockInput: wrong ? NaN : tilt }
}
