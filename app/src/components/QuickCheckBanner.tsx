// P1-06: Today card banner (quick check due) and the "Your next check" line. Behind QUICK_CHECK_ON (false).
// v4: due only inside Avery's server window (romrxbjj-v2 34835f66): local days 7 to 14 after the cycle's full assessment,
// stored time zone else America/New_York, and not if a quick check is already done this cycle (schedule or quick row).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { QUICK_CHECK_ON, QUICK_CHECK_COPY as Q, QUICK_CHECK_PATH, isQuickCheckDue, nextCheckLineInCycle, quickCheckDismissKey, type QuickContext, type Schedule } from '../lib/quickCheck'
import { loadQuickContext } from '../lib/quickCheckLoad'

export function QuickCheckBanner({ userId }: { userId: string }) {
  if (!QUICK_CHECK_ON || !userId) return null
  return <QuickCheckBannerInner userId={userId} />
}

function QuickCheckBannerInner({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const [s, setS] = useState<Schedule | null>(null)
  const [ctx, setCtx] = useState<QuickContext>({})
  const [later, setLater] = useState(false)
  useEffect(() => {
    let cancelled = false
    loadQuickContext(userId).then(r => { if (!cancelled && !r.failed && r.schedule) { setCtx(r.ctx); setS(r.schedule) } }).catch(() => { /* nothing shown */ })
    return () => { cancelled = true }
  }, [userId])
  if (!s) return null
  const due = isQuickCheckDue(s, new Date(), ctx)
  const dismissed = later || (due && (() => { try { return localStorage.getItem(quickCheckDismissKey(userId, s.next_check_at!)) === '1' } catch { return false } })())
  const line = nextCheckLineInCycle(s, new Date(), ctx)
  if (due && !dismissed) {
    return (
      <div className="rounded-card border border-cobalt/20 bg-white p-4 space-y-2" data-testid="quick-check-banner">
        <p className="text-sm font-bold text-cobalt-ink">{Q.bannerTitle}</p>
        <p className="text-xs text-slate-600">{Q.bannerLine}</p>
        <div className="flex gap-2">
          <button type="button" className="btn-primary flex-1 text-sm" onClick={() => navigate(QUICK_CHECK_PATH)}>{Q.bannerButton}</button>
          <button
            type="button"
            className="btn-ghost text-sm px-3"
            onClick={() => { try { localStorage.setItem(quickCheckDismissKey(userId, s.next_check_at!), '1') } catch { /* ignore */ } setLater(true) }}
          >
            {Q.bannerDismiss}
          </button>
        </div>
      </div>
    )
  }
  if (!line) return null
  return (
    <div data-testid="next-check-line">
      <p className="text-xs font-semibold text-cobalt-ink">{line}</p>
      <p className="text-[11px] text-slate-500">{Q.nextCheckHelper}</p>
    </div>
  )
}
