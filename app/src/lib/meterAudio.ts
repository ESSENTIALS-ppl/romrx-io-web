/**
 * Soft chime for the phone meter. Web Audio only, no vibration, same on iPhone and Android.
 * iOS needs the AudioContext created/resumed inside a tap: call unlockMeterAudio() from the
 * Start sensor tap handler (it also plays a silent buffer). On iPhone the ringer switch must be on.
 */
type AC = AudioContext
let ctx: AC | null = null

export function unlockMeterAudio(): void {
  try {
    const Ctor = (window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext)
    if (!Ctor) return
    if (!ctx) ctx = new Ctor()
    if (ctx.state !== 'running') void ctx.resume()
    const buf = ctx.createBuffer(1, 1, 22050)
    const src = ctx.createBufferSource()
    src.buffer = buf; src.connect(ctx.destination); src.start(0)
  } catch { /* no audio: the meter still works */ }
}

function tone(c: AC, freq: number, peak: number, attack: number, decay: number, t: number) {
  const o = c.createOscillator(), g = c.createGain()
  o.type = 'sine'; o.frequency.value = freq
  g.gain.setValueAtTime(0.0001, t)
  g.gain.linearRampToValueAtTime(peak, t + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay)
  o.connect(g); g.connect(c.destination)
  o.start(t); o.stop(t + attack + decay + 0.05)
}

/** Lock chime: 880 Hz sine, ~8 ms attack, ~500 ms decay, plus a quiet 2.76x partial (~250 ms). Peak ~0.1. */
export function playLockDing(): void {
  if (!ctx) return
  try {
    if (ctx.state !== 'running') void ctx.resume()
    const t = ctx.currentTime + 0.02
    tone(ctx, 880, 0.08, 0.008, 0.5, t)
    tone(ctx, 880 * 2.76, 0.022, 0.005, 0.25, t)
  } catch { /* ignore */ }
}

/**
 * Zero countdown tick (5-4-3-2-1): short, soft, lower than the lock ding so the two never sound alike.
 * 480 Hz sine, ~4 ms attack, fades out over ~65 ms (about 70 ms total), peak 0.06. No pip at zero.
 */
export const COUNTDOWN_TICK = { freq: 480, peak: 0.06, attack: 0.004, decay: 0.065 } as const
export function playCountdownTick(): void {
  if (!ctx) return
  try {
    if (ctx.state !== 'running') void ctx.resume()
    tone(ctx, COUNTDOWN_TICK.freq, COUNTDOWN_TICK.peak, COUNTDOWN_TICK.attack, COUNTDOWN_TICK.decay, ctx.currentTime + 0.02)
  } catch { /* ignore */ }
}

/** Resume after iOS interruptions; safe to call from any tap. */
export function resumeMeterAudio(): void {
  if (ctx && ctx.state !== 'running') void ctx.resume().catch(() => {})
}
