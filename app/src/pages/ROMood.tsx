import { useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { ROMOOD_COPY as C } from '../lib/romoodCopy'
import { romoodSaveEnabled, saveMoodEntry, setMoodSaving, shouldSaveMood, trackMoodSkipped, romoodStepCounter, romoodStepEyebrow } from '../lib/romood'
import { STEPS } from './assessmentSteps'
import { MoodInput, type MoodValue } from '../components/MoodInput'

type Props = {
  /** Injected for tests; defaults to the env flag (OFF until the /legal mood line is live). */
  saveEnabled?: boolean
  /** Embedded in the assessment flow: called after Skip or Next. Standalone route navigates instead. */
  onDone?: () => void
  onBack?: () => void
  onNavigate?: (to: string) => void
}

export function ROMood({ saveEnabled, onDone, onBack, onNavigate }: Props) {
  const navigate = useNavigate()
  const location = useLocation()
  const { session } = useAuth()
  const counter = romoodStepCounter(C.counter, STEPS.length)
  const eyebrow = romoodStepEyebrow(C.eyebrow)
  const [mood, setMood] = useState<MoodValue>({ energy: 50, pleasantness: 50, word: null })
  const [optIn, setOptIn] = useState(false) // Stacy req 1: unchecked by default
  const [optedInAt, setOptedInAt] = useState<string | null>(null) // real tick time (Stacy fix 6)
  const [busy, setBusy] = useState(false)

  const nextUrl = `/onboarding/assessment${location.search}`
  const done = () => (onDone ? onDone() : onNavigate ? onNavigate(nextUrl) : navigate(nextUrl))
  const back = () => (onBack ? onBack() : onNavigate ? onNavigate('back') : navigate(-1))
  const flag = saveEnabled ?? romoodSaveEnabled()
  const canSave = shouldSaveMood({ optIn, signedIn: !!session?.user, saveEnabled: flag, optedInAt })

  const skip = () => {
    // Stacy req 2: saves nothing. Skip event disabled (Q11, Grant Oct 26): live RLS rejects no-id rows.
    void trackMoodSkipped()
    done()
  }
  const next = async () => {
    if (canSave && session?.user && optedInAt) {
      setBusy(true)
      const s = await setMoodSaving(session.user.id, true, optedInAt)
      if (s.ok) await saveMoodEntry(session.user.id, { energy: mood.energy, pleasantness: mood.pleasantness, word: mood.word?.word ?? null, optedInAt })
      setBusy(false)
    }
    done()
  }

  return (
    <div className="min-h-screen bg-cobalt-ink py-10 px-4" data-testid="romood-screen">
      <div className="max-w-lg mx-auto bg-white rounded-2xl p-5 space-y-4">
        {counter && <p className="text-sm text-slate-500" data-testid="romood-counter">{counter}</p>}
        {eyebrow && <p className="text-xs font-semibold text-slate-600" data-testid="romood-eyebrow">{eyebrow}</p>}
        <h1 className="text-2xl font-bold text-cobalt-ink">{C.heading}</h1>
        {C.nutritionLine && <p className="text-sm" data-testid="romood-nutrition">{C.nutritionLine}</p>}
        <p data-testid="romood-question">{C.question}</p>
        <p className="text-sm font-semibold">{C.instruction}</p>

        <MoodInput value={mood} onChange={setMood} />

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
