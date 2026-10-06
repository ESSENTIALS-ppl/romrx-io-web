/**
 * Meter sounds. Web Audio only, no vibration, same on iPhone and Android.
 *
 * iOS Safari reliability (Jim, real iPhone, Oct 6 9:05 AM: countdown ticks sometimes silent):
 * - ONE shared AudioContext for the whole assessment.
 * - unlockMeterAudio() runs synchronously inside EVERY meter tap (Turn on the meter, Start, Reset,
 *   Use this number): creates the context if needed, calls ctx.resume() inside the gesture, plays a
 *   silent 1-sample buffer, and (Safari 16.4+, feature-detected) sets navigator.audioSession.type =
 *   'playback' so the session does not drop short beeps.
 * - Each tone is played when the on-screen number changes (same timer), never far ahead. Before every
 *   tone the state is re-checked; if not 'running' we await resume() with a short retry and play only
 *   once it is running (skipped if it would land too late, or if the countdown was cancelled).
 * - Ticks are a clearly audible ~940 Hz beep (tiny iPhone speakers barely reproduce 480 Hz); GO is
 *   higher, louder and longer; the lock ding is a distinct bright bell.
 * - Coming back to the foreground: resume + session type again (the next tap always does too).
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

/** Countdown tick on 5, 4, 3, 2, 1: short, clearly audible on a phone speaker. */
export const COUNTDOWN_TICK: ToneSpec[] = [
  { freq: 940, peak: 0.16, attack: 0.004, hold: 0.04, decay: 0.07, type: 'triangle' },
]
/** GO at zero: higher, louder and longer than the ticks. */
export const GO_TONE: ToneSpec[] = [
  { freq: 1320, peak: 0.2, attack: 0.005, hold: 0.22, decay: 0.35, type: 'triangle' },
  { freq: 2640, peak: 0.03, attack: 0.005, hold: 0.12, decay: 0.2, type: 'sine' },
]
/** Lock ding: bright microwave-style bell with a long ring (distinct from tick and GO). */
export const LOCK_DING: ToneSpec[] = [
  { freq: 1760, peak: 0.13, attack: 0.004, hold: 0, decay: 1.3, type: 'sine' },
  { freq: 3520, peak: 0.035, attack: 0.003, hold: 0, decay: 0.7, type: 'sine' },
  { freq: Math.round(1760 * 2.76), peak: 0.018, attack: 0.003, hold: 0, decay: 0.35, type: 'sine' },
]
const TONES = { tick: COUNTDOWN_TICK, go: GO_TONE, ding: LOCK_DING } as const
export type ToneKind = keyof typeof TONES

/** Countdown shown and heard after Start: 5, 4, 3, 2, 1 (tick each, one second apart), then GO at 5 s (zero is set). */
export const COUNTDOWN_FROM = ZERO_COUNTDOWN_SEC
export type CountdownEvent = { at: number; show: number | 'GO'; sound: 'tick' | 'go' }
export function countdownPlan(from: number = COUNTDOWN_FROM): CountdownEvent[] {
  const ev: CountdownEvent[] = []
  for (let n = from, i = 0; n >= 1; n--, i++) ev.push({ at: i, show: n, sound: 'tick' })
  ev.push({ at: from, show: 'GO', sound: 'go' })
  return ev
}
/** Seconds from the Start tap to GO, when the start position is captured. */
export const ZERO_AT_SEC = COUNTDOWN_FROM

/** A tone that had to wait for resume() is dropped if it would sound later than this. */
export const MAX_LATE_MS = 600
const RESUME_TRY_MS = 250
const RESUME_TRIES = 3

function setPlaybackSession(): void {
  try {
    const nav = navigator as unknown as { audioSession?: { type: string } }
    if (nav.audioSession && nav.audioSession.type !== 'playback') nav.audioSession.type = 'playback'
  } catch { /* unsupported */ }
}

function getCtx(): AC | null {
  if (ctx) return ctx
  if (typeof window === 'undefined') return null
  const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
  if (!Ctor) return null
  ctx = new Ctor()
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && ctx) { setPlaybackSession(); if (ctx.state !== 'running') void ctx.resume().catch(() => {}) }
  })
  return ctx
}

/** Call synchronously inside a tap (no await before it). Safe on every tap. */
export function unlockMeterAudio(): void {
  try {
    setPlaybackSession()
    const c = getCtx()
    if (!c) return
    if (c.state !== 'running') void c.resume().catch(() => {})
    const src = c.createBufferSource()
    src.buffer = c.createBuffer(1, 1, 22050)
    src.connect(c.destination); src.start(0)
  } catch { /* no audio: the meter still works */ }
}

/** Resolve true once the context is 'running': resume(), wait up to RESUME_TRY_MS, retry. */
export async function ensureAudioRunning(c: AC | null = ctx, tries = RESUME_TRIES): Promise<boolean> {
  if (!c) return false
  for (let i = 0; i < tries; i++) {
    if (c.state === 'running') return true
    try {
      await Promise.race([c.resume(), new Promise(r => setTimeout(r, RESUME_TRY_MS))])
    } catch { /* retry */ }
  }
  return (c.state as string) === 'running'
}

function tone(c: AC, s: ToneSpec, t: number) {
  const o = c.createOscillator(), g = c.createGain()
  o.type = s.type; o.frequency.value = s.freq
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(s.peak, t + s.attack)
  if (s.hold > 0) g.gain.setValueAtTime(s.peak, t + s.attack + s.hold)
  g.gain.exponentialRampToValueAtTime(0.0001, t + s.attack + s.hold + s.decay)
  o.connect(g); g.connect(c.destination)
  o.start(t); o.stop(t + s.attack + s.hold + s.decay + 0.05)
}

/**
 * Play one tone NOW (called when the on-screen number changes). Re-checks the state first; if the
 * context is not running it awaits resume (short retry) and plays then, unless that is later than
 * MAX_LATE_MS or stillWanted() says the countdown was cancelled. Resolves true if it played.
 */
export async function playMeterTone(kind: ToneKind, stillWanted: () => boolean = () => true): Promise<boolean> {
  const c = ctx
  if (!c) return false
  const asked = Date.now()
  const play = () => { try { const t = c.currentTime + 0.005; for (const s of TONES[kind]) tone(c, s, t); return true } catch { return false } }
  if (c.state === 'running') return play()
  const ok = await ensureAudioRunning(c)
  if (!ok || !stillWanted() || Date.now() - asked > MAX_LATE_MS) return false
  return play()
}

/** Lock ding (kept as its own name for callers). */
export function playLockDing(): void { void playMeterTone('ding') }

/** Tests only. */
export function __setAudioContextForTests(c: AudioContext | null): void { ctx = c }
