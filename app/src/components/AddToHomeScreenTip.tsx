// P1-13: tip after session 1 to add ROMRx to the home screen. Renders nothing until A2HS_TIP_COPY has Stacy's words.
import { useEffect, useState } from 'react'
import { Smartphone } from 'lucide-react'
import { track } from '../lib/track'
import { A2HS_TIP_COPY, A2HS_DISMISS_KEY, a2hsPlatform, isStandalone, shouldShowA2hsTip } from '../lib/addToHomeScreen'

type InstallPromptEvent = Event & { prompt: () => Promise<void> }

export function AddToHomeScreenTip() {
  const copy = A2HS_TIP_COPY
  const platform = a2hsPlatform(typeof navigator === 'undefined' ? '' : navigator.userAgent)
  const [dismissed, setDismissed] = useState(() => { try { return localStorage.getItem(A2HS_DISMISS_KEY) === '1' } catch { return false } })
  const [installEvent, setInstallEvent] = useState<InstallPromptEvent | null>(null)

  useEffect(() => {
    const onPrompt = (e: Event) => { e.preventDefault(); setInstallEvent(e as InstallPromptEvent) }
    window.addEventListener('beforeinstallprompt', onPrompt)
    return () => window.removeEventListener('beforeinstallprompt', onPrompt)
  }, [])

  if (!copy || !shouldShowA2hsTip(copy, platform, isStandalone(window as never), dismissed)) return null

  const dismiss = () => { try { localStorage.setItem(A2HS_DISMISS_KEY, '1') } catch { /* ignore */ } setDismissed(true); track('a2hs_tip_dismissed', { platform }) }

  return (
    <div className="rounded-card border border-cobalt/20 bg-white p-4 space-y-2" data-testid="a2hs-tip">
      <div className="flex items-start gap-2">
        <Smartphone size={16} className="text-cobalt mt-0.5 shrink-0" />
        <div>
          <p className="text-sm font-bold text-cobalt-ink">{copy.title}</p>
          <p className="text-xs text-slate-600 mt-1">{copy.body}</p>
          {platform === 'ios' && <p className="text-xs text-slate-600 mt-1">{copy.iosSteps}</p>}
        </div>
      </div>
      <div className="flex gap-2">
        {platform === 'android' && installEvent && (
          <button type="button" className="btn-primary flex-1 text-sm" onClick={() => { track('a2hs_prompt_opened', {}); void installEvent.prompt(); setInstallEvent(null) }}>
            {copy.androidButton}
          </button>
        )}
        <button type="button" className="btn-ghost text-sm px-3" onClick={dismiss}>{copy.dismiss}</button>
      </div>
    </div>
  )
}
