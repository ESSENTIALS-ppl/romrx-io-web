import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROMOOD_COPY as C, FEELING_WORDS, QUADRANT_NAMES, type FeelingWord, type Quadrant } from '../lib/romoodCopy'
import { positionFor, quadrantFor, readoutIndex, romoodSaveEnabled, saveMoodEntry, shouldSaveMood } from '../lib/romood'
import { track } from '../lib/track'

const GRID: Quadrant[][] = [
  ['high_unpleasant', 'high_pleasant'],
  ['low_unpleasant', 'low_pleasant'],
]

type Props = {
  /** Injected for tests; defaults to the env flag (OFF until the /legal mood line is live). */
  saveEnabled?: boolean
  onNavigate?: (to: string) => void
}

export function ROMood({ saveEnabled, onNavigate }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const [energy, setEnergy] = useState(50)
  const [pleasantness, setPleasantness] = useState(50)
  const [word, setWord] = useState<FeelingWord | null>(null)
  const [optIn, setOptIn] = useState(false) // Stacy req 1: unchecked by default
  const [optedInAt, setOptedInAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const go = (to: string) => (onNavigate ? onNavigate(to) : navigate(to))
  const back = () => (onNavigate ? onNavigate('back') : navigate(-1))
  const nextUrl = `/onboarding/assessment${location.search}`
  const activeQuadrant = quadrantFor(energy, pleasantness)
  const canSave = shouldSaveMood({ optIn, signedIn: !!session?.user, saveEnabled: saveEnabled ?? romoodSaveEnabled() })

  const pick = (w: FeelingWord) => {
    const p = positionFor(w)
    setWord(w); setEnergy(p.energy); setPleasantness(p.pleasantness)
  }
  const slide = (which: 'e' | 'p', v: number) => {
    if (which === 'e') setEnergy(v); else setPleasantness(v)
    setWord(null)
  }

  const skip = () => {
    // Stacy req 2: saves nothing. Non-personal event only (no mood values, no word).
    track('romood_skipped')
    go(nextUrl)
  }
  const next = async () => {
    if (canSave && session?.user) {
      setBusy(true)
      await saveMoodEntry(session.user.id, { energy, pleasantness, word: word?.word ?? null, optedInAt: optedInAt ?? new Date().toISOString() })
      setBusy(false)
    }
    go(nextUrl)
  }

  return (
    <div className="min-h-screen bg-cobalt-ink py-10 px-4">
      <div className="max-w-lg mx-auto bg-white rounded-2xl p-5 space-y-4">
        <p className="text-sm text-slate-500" data-testid="romood-counter">{C.counter}</p>
        <p className="text-xs font-semibold text-slate-600">{C.eyebrow}</p>
        <h1 className="text-2xl font-bold text-cobalt-ink">{C.heading}</h1>
        <p>{C.question}</p>
        <p className="text-sm font-semibold">{C.instruction}</p>

        {([['e', C.energy, energy], ['p', C.pleasantness, pleasantness]] as const).map(([k, s, v]) => (
          <div key={k}>
            <label className="text-sm font-medium" htmlFor={`romood-${k}`}>{s.label}</label>
            <input id={`romood-${k}`} type="range" min={0} max={100} value={v} className="w-full"
              aria-valuetext={s.readout[readoutIndex(v)]}
              onChange={e => slide(k, Number(e.target.value))} />
            <div className="flex justify-between text-xs text-slate-500"><span>{s.low}</span><span>{s.readout[readoutIndex(v)]}</span><span>{s.high}</span></div>
          </div>
        ))}

        <div role="group" aria-label={C.gridLabel} className="grid grid-cols-2 gap-2 bg-cobalt-ink rounded-xl p-2">
          {GRID.flat().map(q => (
            <div key={q} role="group" aria-label={QUADRANT_NAMES[q]}
              className={`grid grid-cols-2 gap-1 rounded-lg p-1 ${activeQuadrant === q ? 'ring-2 ring-white' : ''}`}>
              {FEELING_WORDS.filter(w => w.quadrant === q).map(w => (
                <button key={w.word} type="button" aria-pressed={word?.word === w.word}
                  onClick={() => pick(w)}
                  className="rounded-full aspect-square text-xs font-semibold bg-white/80">{w.word}</button>
              ))}
            </div>
          ))}
        </div>
        {word && <p className="text-sm" data-testid="romood-description">{word.description}</p>}

        <p className="text-sm">{C.encouragement}</p>

        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={optIn} data-testid="romood-optin"
            onChange={e => { setOptIn(e.target.checked); setOptedInAt(e.target.checked ? new Date().toISOString() : null) }} />
          <span>{C.optInBefore}<a href="/legal#privacy" className="underline">{C.optInLink}</a>{C.optInAfter}</span>
        </label>

        <div className="grid grid-cols-2 gap-2">
          <button type="button" className="btn-secondary" onClick={back} data-testid="romood-back">{C.back}</button>
          <button type="button" className="btn-secondary" onClick={skip} data-testid="romood-skip">{C.skip}</button>
        </div>
        <button type="button" className="btn-primary w-full" onClick={next} disabled={busy} data-testid="romood-next">{C.next}</button>
      </div>
    </div>
  )
}
