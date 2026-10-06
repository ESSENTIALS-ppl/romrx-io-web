// Relative-angle math for the in-app inclinometer.
// Never subtract raw Euler angles: W3C DeviceOrientationEvent uses intrinsic Z-X'-Y''
// (alpha, beta, gamma) with beta in [-180,180) and gamma in [-90,90). When the phone
// is on its side (gamma near +/-90) or passes upright (beta near +/-90), beta folds or
// jumps by 180, gamma flips sign and alpha jumps 180. We use quaternions instead.

export interface Quat { w: number; x: number; y: number; z: number }
const D2R = Math.PI / 180
const R2D = 180 / Math.PI

/** W3C DeviceOrientation (ZXY intrinsic) -> unit quaternion, device frame -> earth frame. */
export function eulerToQuat(alpha: number | null, beta: number | null, gamma: number | null): Quat {
  const x = (beta ?? 0) * D2R, y = (gamma ?? 0) * D2R, z = (alpha ?? 0) * D2R
  const cX = Math.cos(x / 2), cY = Math.cos(y / 2), cZ = Math.cos(z / 2)
  const sX = Math.sin(x / 2), sY = Math.sin(y / 2), sZ = Math.sin(z / 2)
  return normalize({
    w: cX * cY * cZ - sX * sY * sZ,
    x: sX * cY * cZ - cX * sY * sZ,
    y: cX * sY * cZ + sX * cY * sZ,
    z: cX * cY * sZ + sX * sY * cZ,
  })
}

export const conj = (q: Quat): Quat => ({ w: q.w, x: -q.x, y: -q.y, z: -q.z })

export function mul(a: Quat, b: Quat): Quat {
  return {
    w: a.w * b.w - a.x * b.x - a.y * b.y - a.z * b.z,
    x: a.w * b.x + a.x * b.w + a.y * b.z - a.z * b.y,
    y: a.w * b.y - a.x * b.z + a.y * b.w + a.z * b.x,
    z: a.w * b.z + a.x * b.y - a.y * b.x + a.z * b.w,
  }
}

export function normalize(q: Quat): Quat {
  const n = Math.hypot(q.w, q.x, q.y, q.z) || 1
  return { w: q.w / n, x: q.x / n, y: q.y / n, z: q.z / n }
}

/** Rotation since zero, expressed in the zero-pose device frame: qrel = conj(q0) * q. */
export const relative = (q0: Quat, q: Quat): Quat => mul(conj(q0), q)

/** Total rotation angle since zero, 0..180. Includes any yaw (alpha) drift. */
export const totalAngleDeg = (r: Quat): number => 2 * Math.acos(Math.min(1, Math.abs(r.w))) * R2D

/** Signed rotation about one device axis of the zero pose (swing-twist), -180..180. */
export function twistAngleDeg(r: Quat, axis: [number, number, number]): number {
  const p = r.x * axis[0] + r.y * axis[1] + r.z * axis[2]
  let a = 2 * Math.atan2(p, r.w) * R2D
  if (a > 180) a -= 360
  if (a <= -180) a += 360
  return a
}

/** Earth "down" expressed in device axes. Ignores alpha, so it is immune to iOS heading drift. */
export function gravityInDevice(q: Quat): [number, number, number] {
  const v = mul(mul(conj(q), { w: 0, x: 0, y: 0, z: -1 }), q)
  return [v.x, v.y, v.z]
}

/**
 * Angle between "down" at zero and "down" now, 0..180. Equals the joint rotation for any
 * rotation about a HORIZONTAL axis (true for all 9 phone-based Base assessment movements),
 * works for any grip, stays smooth through 90, and does not drift.
 */
export function tiltDeltaDeg(q0: Quat, q: Quat): number {
  const a = gravityInDevice(q0), b = gravityInDevice(q)
  const d = Math.max(-1, Math.min(1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  return Math.acos(d) * R2D
}

/** Average of nearby quaternions (sign-aligned), for a steadier zero capture. */
export function averageQuats(qs: Quat[]): Quat {
  if (!qs.length) return { w: 1, x: 0, y: 0, z: 0 }
  const ref = qs[0]
  const acc = { w: 0, x: 0, y: 0, z: 0 }
  for (const q of qs) {
    const s = ref.w * q.w + ref.x * q.x + ref.y * q.y + ref.z * q.z < 0 ? -1 : 1
    acc.w += s * q.w; acc.x += s * q.x; acc.y += s * q.y; acc.z += s * q.z
  }
  return normalize(acc)
}
