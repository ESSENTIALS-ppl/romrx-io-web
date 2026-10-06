import { useEffect, useRef, useState, useSyncExternalStore } from 'react'
import { Lock, Crosshair, X } from 'lucide-react'
import { cn } from '../lib/cn'
import { averageQuats, tiltDeltaDeg, type Quat } from '../lib/orientation'
import { initialLock, meterValueToUse, nextPeak, stepLock, type LockState } from '../lib/meterLock'
import { getSensorSnapshot, latestQuat, latestRaw, recentQuats, startSensor, subscribeSensor } from '../lib/meterSensor'
import { playLockDing, playZeroTick, resumeMeterAudio } from '../lib/meterAudio'
import { METER_COPY as C } from '../lib/meterCopy'

const TICK_MS = 50
const showDebug = () => typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('debug') === '1'

interface View { angle: number | null; peak: number | null; locked: boolean; lockVal: number | null; holdFrac: number | null }

/**
 * Inline phone meter for one angle field. Same math as the sandbox Jim tested (lib/orientation.ts
 * tiltDeltaDeg: gravity angle since Zero, smooth past 90, no heading drift) and the same lock rule
 * (lib/meterLock.ts). Shows only: movement, grip line, big number / Locked, hold bar, Zero, Reset,
 * Use this number, Peak. Debug readout only with ?debug=1.
 */
export function PhoneMeter({ movement, sideLabel, grip, zeroDelaySec = 0, notice, onUse, onClose }: {
  movement: string
  sideLabel: string
  grip: string
  zeroDelaySec?: number
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
  const [countdown, setCountdown] = useState<number | null>(null)
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
  useEffect(() => () => { timers.current.forEach(t => window.clearTimeout(t)) }, [])
  const onZero = () => {
    resumeMeterAudio()
    timers.current.forEach(t => window.clearTimeout(t)); timers.current = []
    if (!zeroDelaySec) { setCountdown(null); captureZero(); return }
    // Head and leg steps: the screen is out of view, so Zero waits a few seconds, then ticks softly.
    q0.current = null; setZeroed(false)
    lock.current = initialLock()
    setView({ angle: null, peak: null, locked: false, lockVal: null, holdFrac: null })
    setCountdown(zeroDelaySec)
    for (let i = 1; i <= zeroDelaySec; i++) {
      timers.current.push(window.setTimeout(() => {
        const left = zeroDelaySec - i
        if (left > 0) setCountdown(left)
        else { setCountdown(null); captureZero(); playZeroTick() }
      }, i * 1000))
    }
  }
  const onReset = () => {
    resumeMeterAudio()
    lock.current = initialLock()
    peak.current = live.current
    setView(v => ({ ...v, locked: false, lockVal: null, holdFrac: null, peak: live.current == null ? null : Math.round(live.current), angle: live.current == null ? v.angle : Math.round(live.current) }))
  }
  const onUseClick = () => {
    const v = meterValueToUse(lock.current, zeroed ? live.current : null)
    if (v != null) onUse(v)
  }

  const live_ = sensor.status === 'live'
  const fallback = sensor.status === 'denied' ? C.denied : sensor.status === 'error' ? C.error
    : (sensor.status === 'nodata' || sensor.status === 'unsupported') ? C.noData : null
  const shown = view.locked ? view.lockVal : view.angle
  const status = countdown != null ? C.zeroCountdown(countdown)
    : !zeroed ? (zeroDelaySec ? C.needZeroDelayed(zeroDelaySec) : C.needZero)
    : view.locked ? C.locked : (view.holdFrac ?? 0) >= 0.15 ? C.holding : C.live

  return (
    <div data-phone-meter className={cn('rounded-card border bg-white p-4 space-y-3 transition-colors', view.locked ? 'border-2 border-cobalt shadow-md' : 'border-cobalt/15')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wide text-cobalt">{C.measuringPrefix}: {sideLabel}</p>
          <p className="font-display font-bold text-cobalt-ink leading-tight">{movement}</p>
        </div>
        <button type="button" onClick={onClose} aria-label={C.closeButton}
          className="-mr-2 -mt-2 min-h-[44px] min-w-[44px] flex items-center justify-center rounded-full text-slate-400 hover:text-cobalt-ink hover:bg-surface">
          <X size={18} />
        </button>
      </div>
      <p className="text-sm text-slate-600 leading-snug bg-cobalt-light rounded-card px-3 py-2">{grip}</p>
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
            className="btn-primary w-full min-h-[48px] text-base gap-2">
            <Crosshair size={18} /> {sensor.status === 'starting' ? C.starting : C.startButton}
          </button>
          <p className="text-xs text-slate-500 text-center">{C.startNote}</p>
        </div>
      ) : (
        <>
          <div className="text-center" aria-live="polite">
            <div className={cn('mx-auto inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-bold transition-opacity',
              view.locked ? 'bg-cobalt text-white opacity-100' : 'opacity-0 pointer-events-none')} data-locked-badge>
              <Lock size={14} /> {C.lockedPrefix}: {view.lockVal ?? '--'}°
            </div>
            <div className={cn('font-display font-extrabold tabular-nums leading-none tracking-tight mt-1',
              view.locked ? 'text-cobalt' : 'text-cobalt-ink')} style={{ fontSize: 'clamp(72px, 24vw, 104px)' }} data-meter-number>
              {countdown != null
                ? <span className="text-slate-300" data-countdown>{countdown}</span>
                : shown == null ? <span className="text-slate-300">--</span>
                : <>{shown}<span className="text-cobalt align-top" style={{ fontSize: '0.5em' }}>°</span></>}
            </div>
            <div className="h-1.5 bg-cobalt-light rounded-full overflow-hidden mt-3" aria-hidden>
              <div className="h-full bg-cobalt rounded-full" style={{ width: `${Math.round((view.locked ? 1 : view.holdFrac ?? 0) * 100)}%`, transition: 'width 50ms linear' }} />
            </div>
            <p className="text-xs text-slate-500 mt-2 min-h-[16px]" data-meter-status>{status}</p>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={onZero} className="btn-ghost min-h-[48px] text-base">{C.zeroButton}</button>
            <button type="button" onClick={onReset} disabled={!zeroed} className="btn-ghost min-h-[48px] text-base disabled:opacity-40">{C.resetButton}</button>
            <button type="button" onClick={onUseClick} disabled={!zeroed || view.angle == null} className="btn-primary min-h-[48px] px-2 leading-tight disabled:opacity-40">{C.useButton}</button>
          </div>
          <div className="flex items-center justify-between border-t border-cobalt/10 pt-2">
            <span className="text-sm text-slate-500">{C.peakLabel}</span>
            <span className="font-display font-bold text-xl text-cobalt-ink tabular-nums" data-meter-peak>{view.peak == null ? '--' : `${view.peak}°`}</span>
          </div>
          {debug && <p className="font-mono text-[11px] text-slate-400" data-meter-debug>{dbg}</p>}
        </>
      )}
    </div>
  )
}
