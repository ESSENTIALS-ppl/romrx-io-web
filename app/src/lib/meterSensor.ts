import { eulerToQuat, type Quat } from './orientation'
import { unlockMeterAudio } from './meterAudio'

/**
 * One shared motion-sensor connection for the whole assessment, so permission is asked once.
 * - iOS 13+: DeviceOrientationEvent.requestPermission() is called ONLY from start(), which must be
 *   called directly from a tap handler (no await before it). Never on load.
 * - Android Chrome: no permission prompt (newer Chromium has requestPermission and may answer
 *   'prompt'); only a hard 'denied' stops us, otherwise we attach and wait for readings.
 * - Android Chrome may fire 'deviceorientationabsolute' (compass alpha) as well as, or instead of,
 *   'deviceorientation'. We listen to both: the tilt math uses gravity only (beta/gamma), so absolute
 *   vs relative alpha does not change the number. Events with null beta/gamma are ignored.
 * - No readings within NO_DATA_MS (desktop, blocked sensors): status 'nodata' and the UI falls back
 *   to typing the number.
 */
export type SensorStatus = 'idle' | 'starting' | 'live' | 'denied' | 'error' | 'unsupported' | 'nodata'
export const NO_DATA_MS = 2500

type PermFn = () => Promise<string>
interface Snapshot { status: SensorStatus; samples: number }

let snap: Snapshot = { status: 'idle', samples: 0 }
let latest: Quat | null = null
let raw: { a: number | null; b: number; g: number } | null = null
const recent: Quat[] = []
const subs = new Set<() => void>()
let attached = false

function set(status: SensorStatus) {
  if (snap.status === status) return
  snap = { ...snap, status }
  subs.forEach(f => f())
}

/** Feed one orientation reading (the deviceorientation handler; also used by tests). */
export function feedOrientation(alpha: number | null, beta: number | null, gamma: number | null): void {
  if (beta == null || gamma == null) return
  const q = eulerToQuat(alpha ?? 0, beta, gamma)
  latest = q
  raw = { a: alpha, b: beta, g: gamma }
  recent.push(q)
  if (recent.length > 10) recent.shift()
  snap = { ...snap, samples: snap.samples + 1 }
  if (snap.status !== 'live') { snap = { ...snap, status: 'live' }; subs.forEach(f => f()) }
}

const onEvent = (e: DeviceOrientationEvent) => feedOrientation(e.alpha, e.beta, e.gamma)

function attach() {
  if (!attached) {
    window.addEventListener('deviceorientation', onEvent)
    window.addEventListener('deviceorientationabsolute' as 'deviceorientation', onEvent)
    attached = true
  }
  if (snap.samples === 0) {
    window.setTimeout(() => { if (snap.samples === 0) set('nodata') }, NO_DATA_MS)
  }
}

/** True when this device can plausibly measure (touch device with the orientation API). */
export function meterLikelyAvailable(): boolean {
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window)) return false
  const touch = (navigator.maxTouchPoints ?? 0) > 0 || 'ontouchstart' in window
  return touch && window.isSecureContext !== false
}

/** Call DIRECTLY from a tap handler. */
export function startSensor(): Promise<SensorStatus> {
  unlockMeterAudio()                                    // iOS: audio must be unlocked inside the tap
  if (snap.status === 'live') return Promise.resolve('live')
  if (typeof window === 'undefined' || !('DeviceOrientationEvent' in window) || window.isSecureContext === false) {
    set('unsupported'); return Promise.resolve('unsupported')
  }
  const DOE = window.DeviceOrientationEvent as unknown as { requestPermission?: PermFn }
  let pending: Promise<string> | null = null
  try {
    if (typeof DOE.requestPermission === 'function') pending = DOE.requestPermission()   // inside the tap, before any await
  } catch {
    set('error'); return Promise.resolve('error')
  }
  set('starting')
  const finish = (res: string): SensorStatus => {
    if (res === 'denied') { set('denied'); return 'denied' }
    attach()
    return snap.status
  }
  if (!pending) return Promise.resolve(finish('granted'))
  return pending.then(finish, () => { set('error'); return 'error' as SensorStatus })
}

export function subscribeSensor(f: () => void): () => void { subs.add(f); return () => { subs.delete(f) } }
export const getSensorSnapshot = (): Snapshot => snap
export const latestQuat = (): Quat | null => latest
export const recentQuats = (): Quat[] => recent.slice()
export const latestRaw = () => raw

/** Tests only. */
export function __resetSensorForTests(): void {
  if (attached && typeof window !== 'undefined') {
    window.removeEventListener('deviceorientation', onEvent)
    window.removeEventListener('deviceorientationabsolute' as 'deviceorientation', onEvent)
  }
  attached = false; latest = null; raw = null; recent.length = 0; snap = { status: 'idle', samples: 0 }
  subs.forEach(f => f())
}
