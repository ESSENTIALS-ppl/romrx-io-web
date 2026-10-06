/**
 * Meter sounds. Web Audio only, no vibration, same on iPhone and Android.
 *
 * iOS Safari reliability (Jim, Oct 5: beeps played on one side and not the other, no lock ding):
 * - ONE shared AudioContext for the whole assessment.
 * - unlockMeterAudio() runs inside EVERY meter tap (Turn on the meter, Start, Reset, Use this number):
 *   it creates the context if needed, resumes it if it is not running (the iOS motion prompt and
 *   backgrounding leave it 'suspended' or 'interrupted'), and plays a silent 1-sample buffer.
 * - The whole countdown (ticks on 5, 4, 3, 2, then GO) is scheduled on the audio clock in the Start
 *   tap, so timer jitter cannot drop or reorder a beep.
 * - Before the lock ding the state is checked again; if not running we resume first, then play.
 * - When the page comes back to the foreground we try to resume (the next tap always does).
 * On iPhone, Web Audio follows the silent switch, hence the "Turn off silent mode" line.
 */
import { ZERO_COUNTDOWN_SEC } from './meterLock'

type AC = AudioContext
let ctx: AC | null = null

export interface ToneSpec {
  freq: number
  peak: number
  attack: number
  /** Seconds at full level before the decay (0 = straight into decay). */
  hold: number
  decay: number
  type: OscillatorType
}

/** Small soft tick on 5, 4, 3, 2. Short, low, quiet. */
export const COUNTDOWN_TICK: ToneSpec = { freq: 480, peak: 0.05, attack: 0.004, hold: 0, decay: 0.066, type: 'sine' }
/** GO at zero: louder and higher than the ticks (game-start style), still short. */
export const GO_TONE: ToneSpec[] = [
  { freq: 988, peak: 0.14, attack: 0.006, hold: 0.18, decay: 0.16, type: 'triangle' },
  { freq: 1976, peak: 0.03, attack: 0.006, hold: 0.12, decay: 0.12, type: 'sine' },
]
/** Lock ding: bright microwave-style bell with a longer ring. Partials at 2.0x and 2.76x decay faster. */
export const LOCK_DING: ToneSpec[] = [
  { freq: 1319, peak: 0.12, attack: 0.004, hold: 0, decay: 1.3, type: 'sine' },
  { freq: 2638, peak: 0.035, attack: 0.003, hold: 0, decay: 0.7, type: 'sine' },
  { freq: 1319 * 2.76, peak: 0.02, attack: 0.003, hold: 0, decay: 0.35, type: 'sine' },
]

/** Countdown shown and heard after Start: 5, 4, 3, 2 (tick each), then GO (zero is set). */
export const COUNTDOWN_FROM = ZERO_COUNTDOWN_SEC
export type CountdownEvent = { at: number; show: number | 'GO'; sound: 'tick' | 'go' }
export function countdownPlan(from: number = COUNTDOWN_FROM): CountdownEvent[] {
  const ev: CountdownEvent[] = []
  for (let n = from, i = 0; n >= 2; n--, i++) ev.push({ at: i, show: n, sound: 'tick' })
  ev.push({ at: from - 1, show: 'GO', sound: 'go' })
  return ev
}
/** Seconds from the Start tap to GO, when the start position is captured. */
export const ZERO_AT_SEC = COUNTDOWN_FROM - 1

function getCtx(): AC | null {
  if (ctx) return ctx
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx && ctx.state !== 'running') void ctx.resume().catch(() => {})
  })
  return ctx
}

/** Call directly inside a tap. Safe to call on every tap. */
export function unlockMeterAudio(): void {
  try {
    const c = getCtx()
    if (!c) return
    if (c.state !== 'running') void c.resume().catch(() => {})
    const src = c.createBufferSource()
    src.buffer = c.createBuffer(1, 1, 22050)
    src.connect(c.destination); src.start(0)
  } catch { /* no audio: the meter still works */ }
}

function tone(c: AC, s: ToneSpec, t: number): OscillatorNode {
  const o = c.createOscillator(), g = c.createGain()
  o.type = s.type; o.frequency.value = s.freq
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(s.peak, t + s.attack)
  if (s.hold > 0) g.gain.setValueAtTime(s.peak, t + s.attack + s.hold)
  g.gain.exponentialRampToValueAtTime(0.0001, t + s.attack + s.hold + s.decay)
  o.connect(g); g.connect(c.destination)
  o.start(t); o.stop(t + s.attack + s.hold + s.decay + 0.05)
  return o
}

/**
 * Schedule the whole countdown on the audio clock. Call right after unlockMeterAudio() in the Start
 * tap. Returns a cancel function (Reset / Close during the countdown stops every pending beep).
 */
export function scheduleCountdownSounds(from: number = COUNTDOWN_FROM): () => void {
  const c = ctx
  if (!c) return () => {}
  const nodes: OscillatorNode[] = []
  try {
    const base = c.currentTime + 0.03
    for (const e of countdownPlan(from)) {
      const specs = e.sound === 'tick' ? [COUNTDOWN_TICK] : GO_TONE
      for (const s of specs) nodes.push(tone(c, s, base + e.at))
    }
  } catch { /* ignore */ }
  return () => { for (const n of nodes) { try { n.stop(); n.disconnect() } catch { /* already done */ } } }
}

/** Lock ding. Re-checks the context first; resumes, then plays. */
export function playLockDing(): void {
  const c = ctx
  if (!c) return
  const play = () => { try { const t = c.currentTime + 0.02; for (const s of LOCK_DING) tone(c, s, t) } catch { /* ignore */ } }
  if (c.state === 'running') play()
  else void c.resume().then(play, () => {})
}

/** Tests only. */
export function __setAudioContextForTests(c: AudioContext | null): void { ctx = c }
