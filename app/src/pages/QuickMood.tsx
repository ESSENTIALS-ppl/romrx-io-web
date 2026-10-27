import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CrisisLine } from '../components/CrisisLine'
import { MoodInput, type MoodValue } from '../components/MoodInput'
import { useAuth } from '../hooks/useAuth'
import { ROMOOD_COPY as C, ROMOOD_QUICK_COPY as Q } from '../lib/romoodCopy'
import { getMoodSaving, hasCurrentConsent, romoodSaveEnabled, saveMoodEntry, setMoodSaving, shouldSaveMood, ROMOOD_CONTEXT_QUICK } from '../lib/romood'

type Status = 'idle' | 'saved' | 'capped' | 'failed'
type Props = { saveEnabled?: boolean; onNavigate?: (to: string) => void }

/**
 * Quick ROMood check-in from My Body (protected route /dashboard/mood). No step counter, no eyebrow.
 * Saves through the same gate as ROMood: opt-in tick under the current text + signed in + VITE_ROMOOD_SAVE=on.
 * No analytics, no Meta, no push. The DB caps saves at 4 per America/New_York day (RM429).
 */
export function QuickMood({ saveEnabled, onNavigate }: Props) {
  const navigate = useNavigate()
  const { session } = useAuth()
  const userId = session?.user?.id
  const flag = saveEnabled ?? romoodSaveEnabled()
  const [mood, setMood] = useState<MoodValue>({ energy: 50, pleasantness: 50, word: null })
  const [consented, setConsented] = useState(false) // saving already on under the current opt-in text
  const [optIn, setOptIn] = useState(false)
  const [optedInAt, setOptedInAt] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState<Status>('idle')

  useEffect(() => {
    if (!flag || !userId) return
    let live = true
    void getMoodSaving(userId).then(r => {
      if (!live || !r || !hasCurrentConsent(r)) return
      setConsented(true); setOptIn(true); setOptedInAt(r.optedInAt)
    })
    return () => { live = false }
  }, [flag, userId])

  const goBack = () => (onNavigate ? onNavigate('/dashboard/my-body') : navigate('/dashboard/my-body'))
  const canSave = shouldSaveMood({ optIn, signedIn: !!userId, saveEnabled: flag, optedInAt })

  const save = async () => {
    if (!canSave || !userId || !optedInAt) return
    setBusy(true)
    let ok = true
    if (!consented) {
      ok = (await setMoodSaving(userId, true, optedInAt)).ok
      if (ok) setConsented(true)
    }
    if (ok) {
      const r = await saveMoodEntry(userId, { energy: mood.energy, pleasantness: mood.pleasantness, word: mood.word?.word ?? null, optedInAt }, ROMOOD_CONTEXT_QUICK)
      setStatus(r.ok ? 'saved' : r.capped ? 'capped' : 'failed')
    } else setStatus('failed')
    setBusy(false)
  }

  return (
    <div className="max-w-lg mx-auto bg-white rounded-2xl p-5 space-y-4" data-testid="quick-mood-screen">
      <h1 className="text-2xl font-bold text-cobalt-ink">{Q.heading}</h1>
      <p data-testid="quick-mood-question">{C.question}</p>
      <p className="text-sm font-semibold">{C.instruction}</p>
      <MoodInput value={mood} onChange={setMood} />

      {!flag && <p className="text-sm" data-testid="quick-mood-not-saved">{Q.notSaved}</p>}

      {flag && !consented && (
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" checked={optIn} data-testid="quick-mood-optin"
            onChange={e => { setOptIn(e.target.checked); setOptedInAt(e.target.checked ? new Date().toISOString() : null) }} />
          <span>{C.optInBefore}<a href="/legal#privacy" className="underline">{C.optInLink}</a>{C.optInAfter}</span>
        </label>
      )}
      {flag && !canSave && status === 'idle' && <p className="text-sm" data-testid="quick-mood-tick">{Q.tickToSave}</p>}

      {status === 'saved' && <p className="text-sm" role="status" data-testid="quick-mood-saved">{Q.saved}</p>}
      {status === 'capped' && <p className="text-sm" role="status" data-testid="quick-mood-capped">{Q.capReached}</p>}
      {status === 'failed' && <p className="text-sm" role="status" data-testid="quick-mood-failed">{Q.saveFailed}</p>}

      <div className="grid grid-cols-2 gap-2">
        <button type="button" className="btn-secondary" onClick={goBack} data-testid="quick-mood-back">{Q.backToMyBody}</button>
        {flag
          ? <button type="button" className="btn-primary" onClick={save} disabled={!canSave || busy || status === 'saved' || status === 'capped'} data-testid="quick-mood-save">{Q.save}</button>
          : <button type="button" className="btn-primary" onClick={goBack} data-testid="quick-mood-done">{Q.done}</button>}
      </div>
      <CrisisLine />
    </div>
  )
}
