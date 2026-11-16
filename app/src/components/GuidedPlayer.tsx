// P1-20: full-screen guided follow-along for today's movements. Only mounted when PLAYER_COPY has words.
import { useEffect, useMemo, useRef, useState } from 'react'
import { X } from 'lucide-react'
import { track } from '../lib/track'
import { type PlayerCopy, type PlayerStep, buildSteps, isSwitchSides, nextUpName, formatClock, type MovementSlot } from '../lib/guidedPlayer'

type Movement = { name: string; dose: string; slot: MovementSlot }

export function GuidedPlayer({ copy, movements, completedToday, onMarkComplete, onClose }: {
  copy: PlayerCopy
  movements: Movement[]
  completedToday: boolean
  onMarkComplete: () => void
  onClose: () => void
}) {
  const steps = useMemo<PlayerStep[]>(() => buildSteps(movements), [movements])
  const [i, setI] = useState(0)
  const [left, setLeft] = useState<number | null>(steps[0]?.seconds ?? null)
  const [running, setRunning] = useState(false)
  const [cue, setCue] = useState(false)
  const done = i >= steps.length
  const step = steps[i]
  const tick = useRef<number | null>(null)

  useEffect(() => { track('player_opened', { steps: steps.length }) }, [steps.length])

  const go = (n: number) => {
    const next = Math.max(0, Math.min(steps.length, n))
    setCue(isSwitchSides(steps, i) && next === i + 1)
    setI(next)
    setLeft(steps[next]?.seconds ?? null)
    setRunning(steps[next]?.seconds != null && running)
    if (next >= steps.length) track('player_finished', { steps: steps.length })
  }

  useEffect(() => {
    if (!running || left == null) return
    tick.current = window.setInterval(() => setLeft(l => (l == null ? l : l - 1)), 1000)
    return () => { if (tick.current) window.clearInterval(tick.current) }
  }, [running, left == null])

  useEffect(() => {
    if (left != null && left <= 0 && running) go(i + 1)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [left])

  useEffect(() => { if (cue) { const t = window.setTimeout(() => setCue(false), 2500); return () => window.clearTimeout(t) } }, [cue])

  const upNext = step ? nextUpName(steps, i) : null

  return (
    <div className="fixed inset-0 z-50 bg-cobalt-ink text-white flex flex-col" role="dialog" aria-modal="true" data-testid="guided-player">
      <div className="flex justify-end p-4">
        <button type="button" onClick={onClose} aria-label={copy.close} className="p-2 rounded-full hover:bg-white/10"><X size={22} /></button>
      </div>
      <div className="flex-1 flex flex-col items-center justify-center px-6 text-center gap-4">
        {done ? (
          <>
            <h2 className="text-2xl font-bold">{copy.doneTitle}</h2>
            {!completedToday && (
              <button type="button" onClick={() => { onMarkComplete(); onClose() }} className="rounded-xl bg-white text-cobalt-ink font-bold px-6 py-3.5">{copy.markComplete}</button>
            )}
          </>
        ) : (
          <>
            {cue && <p className="text-lg font-bold text-amber-300" role="status">{copy.switchSides}</p>}
            <p className="text-xs uppercase tracking-widest text-white/60">{copy.setLine(step.set, step.sets)}{step.side ? ` · ${copy.side(step.side)}` : ''}</p>
            <h2 className="text-2xl font-bold leading-tight">{step.name}</h2>
            {step.seconds != null
              ? <p className="text-6xl font-bold tabular-nums" aria-live="polite">{formatClock(left ?? step.seconds)}</p>
              : step.reps && <p className="text-xl font-semibold">{copy.repsLine(step.reps)}</p>}
            {step.seconds != null && (
              <button type="button" onClick={() => setRunning(r => !r)} className="rounded-xl bg-white text-cobalt-ink font-bold px-8 py-3">
                {running ? copy.pause : left === step.seconds ? copy.start : copy.resume}
              </button>
            )}
            <p className="text-sm text-white/70 mt-2">{upNext ? copy.nextUp(upNext) : copy.lastStep}</p>
          </>
        )}
      </div>
      {!done && (
        <div className="flex gap-3 p-4">
          <button type="button" onClick={() => go(i - 1)} disabled={i === 0} className="flex-1 rounded-xl border border-white/30 py-3 font-semibold disabled:opacity-40">{copy.back}</button>
          <button type="button" onClick={() => go(i + 1)} className="flex-1 rounded-xl bg-white text-cobalt-ink py-3 font-bold">{copy.next}</button>
        </div>
      )}
    </div>
  )
}
