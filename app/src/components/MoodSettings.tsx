/**
 * Settings > ROMood check-ins (Stacy pass 8c61152, fixes 1 and 2).
 * - Delete my mood check-ins, with a confirm step.
 * - Turn saving off later. On turn-off we OFFER to delete (Q9 default 'offer'); 'auto' deletes.
 * Hidden entirely while VITE_ROMOOD_SAVE is off, because nothing can be saved yet.
 */
import { useEffect, useState } from 'react'
import { SectionCard } from './SectionCard'
import { ROMOOD_PLACEHOLDERS, ROMOOD_SETTINGS_COPY as S } from '../lib/romoodCopy'
import { deleteAllMoodEntries, getMoodSaving, romoodSaveEnabled, setMoodSaving } from '../lib/romood'

type Props = { userId?: string | null; saveEnabled?: boolean; turnOffBehavior?: 'offer' | 'auto' }
type Dialog = null | 'confirmDelete' | 'offerDelete'

export function MoodSettings({ userId, saveEnabled, turnOffBehavior = ROMOOD_PLACEHOLDERS.Q9_turnOff }: Props) {
  const enabled = saveEnabled ?? romoodSaveEnabled()
  const [savingOn, setSavingOn] = useState(false)
  const [dialog, setDialog] = useState<Dialog>(null)
  const [msg, setMsg] = useState('')
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!enabled || !userId) return
    let live = true
    void getMoodSaving(userId).then(r => { if (live && r) setSavingOn(r.savingOn) })
    return () => { live = false }
  }, [enabled, userId])

  if (!enabled || !userId) return null

  const doDelete = async () => {
    setBusy(true)
    const r = await deleteAllMoodEntries(userId)
    setBusy(false); setDialog(null); setMsg(r.ok ? S.deleted : S.error)
  }
  const toggle = async () => {
    setBusy(true); setMsg('')
    const r = await setMoodSaving(userId, !savingOn, new Date().toISOString())
    setBusy(false)
    if (!r.ok) { setMsg(S.error); return }
    const nowOn = !savingOn
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
        {ROMOOD_PLACEHOLDERS.retentionLine && <p className="text-xs text-slate-500">{ROMOOD_PLACEHOLDERS.retentionLine}</p>}
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-secondary" disabled={busy} onClick={toggle} data-testid="mood-toggle">{savingOn ? S.turnOff : S.turnOn}</button>
          <button type="button" className="btn-secondary" disabled={busy} onClick={() => setDialog('confirmDelete')} data-testid="mood-delete">{S.deleteButton}</button>
        </div>
        {dialog && (
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
