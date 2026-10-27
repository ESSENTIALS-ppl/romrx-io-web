/**
 * Settings > ROMood check-ins (Stacy pass 8c61152, fixes 1 and 2).
 * - Delete my mood check-ins, with a confirm step.
 * - Turn saving off later. On turn-off we OFFER to delete (Jim decided Oct 26: 'offer'); 'auto' deletes.
 * Hidden entirely while VITE_ROMOOD_SAVE is off, because nothing can be saved yet.
 */
import { useEffect, useState } from 'react'
import { SectionCard } from './SectionCard'
import { RETENTION_LINES, ROMOOD_TURN_OFF_BEHAVIOR, ROMOOD_COPY, ROMOOD_PLACEHOLDERS, ROMOOD_SETTINGS_COPY as S } from '../lib/romoodCopy'
import { deleteAllMoodEntries, getMoodSaving, hasCurrentConsent, isValidTickTime, romoodSaveEnabled, setMoodSaving } from '../lib/romood'

type Props = { userId?: string | null; saveEnabled?: boolean; turnOffBehavior?: 'offer' | 'auto' }
type Dialog = null | 'confirmDelete' | 'offerDelete' | 'optIn'

export function MoodSettings({ userId, saveEnabled, turnOffBehavior = ROMOOD_TURN_OFF_BEHAVIOR }: Props) {
  const enabled = saveEnabled ?? romoodSaveEnabled()
  const [savingOn, setSavingOn] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const [tickAt, setTickAt] = useState<string | null>(null)

  useEffect(() => {
    if (!enabled || !userId) return
    let live = true
    // Re-consent rule (Vera GAP B): "on" means saving is on under the CURRENT opt-in text with a valid tick time.
    // Someone with an older opt-in sees saving OFF and the existing opt-in panel with an UNTICKED box; the old
    // opt-in is never shown as on, and a fresh tick writes the current consent version.
    void getMoodSaving(userId).then(r => {
      if (!live || !r) return
      const current = hasCurrentConsent(r)
      setSavingOn(current)
      if (r.savingOn && !current) { setTickAt(null); setDialog(d => d ?? 'optIn') }
    })
    return () => { live = false }
  }, [enabled, userId])

  if (!enabled || !userId) return null

  const doDelete = async () => {
    setBusy(true)
    const r = await deleteAllMoodEntries(userId)
    setBusy(false); setDialog(null); setMsg(r.ok ? S.deleted : S.error)
  }
  // Stacy MUST FIX A: turning saving back on shows the full opt-in text, Privacy Policy link and an
  // UNTICKED box; consent is recorded only with the real tick time.
  const toggle = async () => {
    if (!savingOn) { setTickAt(null); setMsg(''); setDialog('optIn'); return }
    await applySaving(false, new Date().toISOString())
  }
  const confirmOptIn = async () => {
    if (!isValidTickTime(tickAt)) return
    setDialog(null)
    await applySaving(true, tickAt)
  }
  const applySaving = async (on: boolean, at: string) => {
    setBusy(true); setMsg('')
    const r = await setMoodSaving(userId, on, at)
    setBusy(false)
    if (!r.ok) { setMsg(S.error); return }
    const nowOn = on
    setSavingOn(nowOn)
    if (!nowOn) {
      if (turnOffBehavior === 'auto') await doDelete()
      else setDialog('offerDelete')
    }
  }

  return (
    <SectionCard title={S.title}>
      <div className="space-y-3 text-sm" data-testid="mood-settings">
        <p data-testid="mood-saving-state">{savingOn ? S.savingOn : S.savingOff}</p>
        <p className="text-xs text-slate-500" data-testid="mood-retention">{RETENTION_LINES[ROMOOD_PLACEHOLDERS.retention]}</p>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" disabled={busy} onClick={toggle} data-testid="mood-toggle">{savingOn ? S.turnOff : S.turnOn}</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => setDialog('confirmDelete')} data-testid="mood-delete">{S.deleteButton}</button>
        </div>
        {dialog === 'optIn' && (
          <div role="dialog" aria-label={S.turnOn} className="rounded-lg border border-cobalt/20 p-3 space-y-2" data-testid="mood-optin-panel">
            <label className="flex items-start gap-2">
              <input type="checkbox" checked={!!tickAt} onChange={e => setTickAt(e.target.checked ? new Date().toISOString() : null)} data-testid="mood-settings-optin" />
              <span>{ROMOOD_COPY.optInBefore}<a href="/legal#privacy" className="underline" data-testid="mood-settings-privacy">{ROMOOD_COPY.optInLink}</a>{ROMOOD_COPY.optInAfter}</span>
            </label>
            <div className="flex gap-2">
              <button type="button" className="btn-primary" disabled={busy || !tickAt} onClick={confirmOptIn} data-testid="mood-optin-confirm">{S.turnOn}</button>
              <button type="button" className="btn-secondary" onClick={() => { setDialog(null); setTickAt(null) }} data-testid="mood-optin-cancel">{S.cancel}</button>
            </div>
          </div>
        )}
        {dialog && dialog !== 'optIn' && (
          <div role="alertdialog" className="rounded-lg border border-cobalt/20 p-3 space-y-2" data-testid="mood-dialog">
            <p>{dialog === 'confirmDelete' ? S.deleteConfirm : S.offerDelete}</p>
            <div className="flex gap-2">
              <button type="button" className="btn-primary" disabled={busy} onClick={doDelete} data-testid="mood-dialog-yes">{dialog === 'confirmDelete' ? S.deleteButton : S.yesDelete}</button>
              <button type="button" className="btn-secondary" onClick={() => setDialog(null)} data-testid="mood-dialog-no">{dialog === 'confirmDelete' ? S.cancel : S.keep}</button>
            </div>
          </div>
        )}
        {msg && <p className="text-xs" data-testid="mood-msg">{msg}</p>}
      </div>
    </SectionCard>
  )
}
