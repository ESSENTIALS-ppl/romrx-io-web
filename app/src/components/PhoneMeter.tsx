import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Lock, Crosshair, X, Smartphone } from 'lucide-react'
import { cn } from '../lib/cn'
import { averageQuats, tiltDeltaDeg, type Quat } from '../lib/orientation'
import { initialLock, meterValueToUse, nextPeak, stepLock, type LockState } from '../lib/meterLock'
import { getSensorSnapshot, latestQuat, latestRaw, recentQuats, startSensor, subscribeSensor } from '../lib/meterSensor'
import { countdownPlan, playLockDing, playMeterTone, unlockMeterAudio } from '../lib/meterAudio'
import { METER_COPY as C, isInAppBrowser } from '../lib/meterCopy'

const TICK_MS = 50
/** How long the big GO stays up after zero is set before the live number shows. */
const GO_SHOW_MS = 800
const showDebug = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'

interface View { angle: number | null; peak: number | null; locked: boolean; lockVal: number | null; holdFrac: number | null }

/**
 * Inline phone meter for one angle field. Same math as the sandbox Jim tested (lib/orientation.ts
 * tiltDeltaDeg: gravity angle since Zero, smooth past 90, no heading drift) and the same lock rule
 * (lib/meterLock.ts). Shows only: side, grip line, Locked badge, big number, hold bar, status, ONE big
 * button (Start until it locks, then Use this number), and small Start / Reset only when useful.
 * The movement name is the screen-reader label only (the step header shows it). Peak and the debug
 * readout show only with ?debug=1 (layout review, Oct 6).
 */
export function PhoneMeter({ movement, sideLabel, grip, notice, onUse, onClose }: {
  movement: string
  sideLabel: string
  grip: string
  notice?: string | null
  onUse: (deg: number) => void
  onClose: () => void
}) {
  const sensor = useSyncExternalStore(subscribeSensor, getSensorSnapshot, getSensorSnapshot)
  const q0 = useRef<Quat | null>(null)
  const lock = useRef<LockState>(initialLock())
  const peak = useRef<number | null>(null)
  const live = useRef<number | null>(null)
  const [view, setView] = useState<View>({ angle: null, peak: null, locked: false, lockVal: null, holdFrac: null })
  const [countdown, setCountdown] = useState<number | 'GO' | null>(null)
  const [inApp] = useState(() => isInAppBrowser())
  const [zeroed, setZeroed] = useState(false)
  const [debug] = useState(showDebug)
  const [dbg, setDbg] = useState('')

  // One loop: read the latest orientation, update lock + peak, publish what the screen shows.
  useEffect(() => {
    const id = window.setInterval(() => {
      const q = latestQuat()
      if (!q0.current || !q) return
      const v = tiltDeltaDeg(q0.current, q)
      live.current = v
      const st = stepLock(lock.current, v, performance.now())
      lock.current = st.state
      peak.current = nextPeak(peak.current, v, st.state.locked)
      if (st.justLocked) playLockDing()
      const next: View = {
        angle: Math.round(v),
        peak: peak.current == null ? null : Math.round(peak.current),
        locked: st.state.locked,
        lockVal: st.state.lockVal,
        holdFrac: st.holdFrac == null ? null : Math.round(st.holdFrac * 50) / 50,
      }
      setView(prev => (prev.angle === next.angle && prev.peak === next.peak && prev.locked === next.locked &&
        prev.lockVal === next.lockVal && prev.holdFrac === next.holdFrac) ? prev : next)
      if (debug) {
        const r = latestRaw()
        setDbg(`tilt ${v.toFixed(1)}° · β/γ/α ${r ? `${Math.round(r.b)}/${Math.round(r.g)}/${Math.round(r.a ?? 0)}` : '--'} · samples ${getSensorSnapshot().samples} · hold ${st.holdFrac == null ? '-' : st.holdFrac.toFixed(2)}`)
      }
    }, TICK_MS)
    return () => window.clearInterval(id)
  }, [debug])

  const captureZero = () => {
    const qs = recentQuats()
    if (!qs.length) return
    q0.current = averageQuats(qs)
    lock.current = initialLock()
    peak.current = 0
    live.current = 0
    setZeroed(true)
    setView({ angle: 0, peak: 0, locked: false, lockVal: null, holdFrac: null })
  }

  const timers = useRef<number[]>([])
  const run = useRef(0)                  // bumps on every Start / cancel, so a late tone from an old run never plays
  const clearTimers = () => { timers.current.forEach(t => window.clearTimeout(t)); timers.current = [] }
  useEffect(() => () => { clearTimers(); run.current++ }, [])
  const cancelCountdown = () => { clearTimers(); run.current++; setCountdown(null) }
  // Start = counts down from 5: 5, 4, 3, 2, 1 shown big with a tick each (one second apart), then GO
  // (higher, louder) at 5 s when it zeroes at the start position. Each tone fires from the same timer
  // that changes the number, after re-checking the audio state (lib/meterAudio playMeterTone).
  // While counting there is no zero (q0 null), so nothing can lock.
  const onZero = () => {
    unlockMeterAudio()                   // synchronous, inside the tap: resume + silent buffer + playback session
    cancelCountdown()
    const id = ++run.current
    const wanted = () => run.current === id
    q0.current = null; setZeroed(false)
    lock.current = initialLock(); peak.current = null; live.current = null
    setView({ angle: null, peak: null, locked: false, lockVal: null, holdFrac: null })
    for (const e of countdownPlan()) {
      const fire = () => {
        if (!wanted()) return
        if (e.show === 'GO') {
          captureZero(); setCountdown('GO')
          timers.current.push(window.setTimeout(() => setCountdown(c => (c === 'GO' ? null : c)), GO_SHOW_MS))
        } else setCountdown(e.show)
        void playMeterTone(e.sound, wanted)
      }
      if (e.at === 0) fire()
      else timers.current.push(window.setTimeout(fire, e.at * 1000))
    }
  }
  const onReset = () => {
    unlockMeterAudio()
    if (typeof countdown === 'number') { cancelCountdown(); return }   // Reset during the countdown cancels it
    if (countdown === 'GO') setCountdown(null)
    lock.current = initialLock()
    peak.current = live.current
    setView(v => ({ ...v, locked: false, lockVal: null, holdFrac: null, peak: live.current == null ? null : Math.round(live.current), angle: live.current == null ? v.angle : Math.round(live.current) }))
  }
  // Use this number only fills a LOCKED reading (Reid, Oct 5: tapping it at GO saved 0°). Not shown from
  // the Start tap, through the countdown, until a lock; Reset unlocks and hides it again. The guard
  // below stays as a second line of defense.
  const onUseClick = () => {
    unlockMeterAudio()
    if (!lock.current.locked) return
    const v = meterValueToUse(lock.current, null)
    if (v != null) onUse(v)
  }

  const live_ = sensor.status === 'live'
  const fallback = sensor.status === 'denied' ? (inApp ? C.inApp : C.denied) : sensor.status === 'error' ? C.error
    : (sensor.status === 'nodata' || sensor.status === 'unsupported') ? (inApp ? C.inApp : C.noData) : null
  const counting = typeof countdown === 'number'
  const showUse = view.locked && !counting
  const showReset = zeroed || counting
  const shown = view.locked ? view.lockVal : view.angle
  const status = counting ? C.zeroCountdown
    : !zeroed ? C.needZero
    : view.locked ? C.locked : (view.holdFrac ?? 0) >= 0.15 ? C.holding : C.live

  return (
    <div data-phone-meter role="group" aria-label={movement} className={cn('rounded-card border bg-white p-4 space-y-3 transition-colors', view.locked ? 'border-2 border-cobalt shadow-md' : 'border-cobalt/15')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {/* Layout item 6: no movement name here; the step header above already shows it. */}
          <p className="text-[11px] font-bold uppercase tracking-wide text-cobalt">{C.measuringPrefix}: {sideLabel}</p>
        </div>
        <button type="button" onClick={() => { cancelCountdown(); onClose() }} aria-label={C.closeButton}
          className="-mr-2 -my-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-cobalt-ink hover:bg-surface">
          <X size={18} />
        </button>
      </div>
      {/* Layout item 8: plain grip line with a small phone icon, no box. Same words. */}
      <p className="flex gap-2 text-sm text-slate-600 leading-snug" data-meter-grip><Smartphone size={16} className="text-slate-400 shrink-0 mt-0.5" aria-hidden />{grip}</p>
      {notice && <p className="text-xs font-semibold text-cobalt" role="status">{notice}</p>}

      {fallback ? (
        <div className="space-y-2" role="alert">
          <p className="text-sm text-slate-700 bg-surface border border-slate-200 rounded-card px-3 py-2">{fallback}</p>
          {sensor.status !== 'denied' && (
            <button type="button" onClick={() => { void startSensor() }} className="btn-ghost w-full min-h-[44px]">{C.startButton}</button>
          )}
        </div>
      ) : !live_ ? (
        <div className="space-y-2">
          <button type="button" onClick={() => { void startSensor() }} disabled={sensor.status === 'starting'}
            className="btn-primary w-full min-h-[44px] py-2 gap-2">
            <Crosshair size={18} /> {sensor.status === 'starting' ? C.starting : C.startButton}
          </button>
          <p className="text-xs text-slate-500 text-center">{C.startNote}</p>
          <p className="text-xs text-slate-500 text-center" data-sound-line>{C.soundLine}</p>
          {inApp && <p className="text-xs text-slate-700 bg-surface border border-slate-200 rounded-card px-3 py-2" data-inapp-note>{C.inApp}</p>}
        </div>
      ) : (
        <>
          <div className="text-center" aria-live="polite">
            <div className={cn('mx-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold transition-opacity',
              view.locked ? 'bg-cobalt text-white opacity-100' : 'opacity-0 pointer-events-none')} data-locked-badge aria-hidden={!view.locked}>
              {/* Layout item 1: the badge says just "Locked"; the big number below shows the value. */}
              {view.locked ? <><Lock size={14} /> {C.lockedPrefix}</> : <span className="inline-block h-[14px]">{'\u00a0'}</span>}
            </div>
            <div className={cn('font-display font-extrabold tabular-nums leading-none tracking-tight mt-1',
              view.locked ? 'text-cobalt' : 'text-cobalt-ink')} style={{ fontSize: 'clamp(72px, 24vw, 104px)' }} data-meter-number>
              {countdown != null
                ? <span className="text-cobalt" data-countdown>{countdown === 'GO' ? C.go : countdown}</span>
                : shown == null ? <span className="text-slate-300">--</span>
                : <>{shown}<span className="text-cobalt align-top" style={{ fontSize: '0.5em' }}>°</span></>}
            </div>
            <div className="h-1.5 bg-cobalt-light rounded-full overflow-hidden mt-3" aria-hidden>
              <div className="h-full bg-cobalt rounded-full" style={{ width: `${Math.round((view.locked ? 1 : view.holdFrac ?? 0) * 100)}%`, transition: 'width 50ms linear' }} />
            </div>
            <p className="text-xs text-slate-500 mt-2 min-h-[16px]" data-meter-status>{status}</p>
          </div>
          {/* Layout items 3, 4, 5: ONE big button. Start until the reading locks; then Use this number
              (not shown at all before a lock). Start again and Reset are small text buttons underneath,
              and Reset shows only when there is something to reset (a countdown or a zeroed reading). */}
          <div className="space-y-1">
            {showUse
              ? <button type="button" onClick={onUseClick} data-use-btn data-meter-primary className="btn-primary w-full min-h-[44px] py-2">{C.useButton}</button>
              : <button type="button" onClick={onZero} data-zero-btn data-meter-primary className="btn-primary w-full min-h-[44px] py-2">{C.zeroButton}</button>}
            {(showUse || showReset) && (
              <div className="flex justify-center gap-2" data-meter-small>
                {showUse && <button type="button" onClick={onZero} data-zero-btn className="min-h-[44px] px-4 text-sm font-semibold text-slate-600 hover:text-cobalt-ink">{C.zeroButton}</button>}
                {showReset && <button type="button" onClick={onReset} data-reset-btn className="min-h-[44px] px-4 text-sm font-semibold text-slate-600 hover:text-cobalt-ink">{C.resetButton}</button>}
              </div>
            )}
          </div>
          {/* Layout item 2: Peak hidden (the locked number is the one that is saved); ?debug=1 still shows it. */}
          {debug && (
            <div className="flex items-center justify-between border-t border-cobalt/10 pt-2">
              <span className="text-sm text-slate-500">{C.peakLabel}</span>
              <span className="font-display font-bold text-xl text-cobalt-ink tabular-nums" data-meter-peak>{view.peak == null ? '--' : `${view.peak}°`}</span>
            </div>
          )}
          {debug && <p className="font-mono text-[11px] text-slate-400" data-meter-debug>{dbg}</p>}
        </>
      )}
    </div>
  )
}
