// P1-06: Today card banner (day 7 to 14, quick check due) and the "Your next check" line. Behind QUICK_CHECK_ON (false).
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { QUICK_CHECK_ON, QUICK_CHECK_COPY as Q, QUICK_CHECK_PATH, isQuickCheckDue, nextCheckLine, quickCheckDismissKey, type Schedule } from '../lib/quickCheck'

export function QuickCheckBanner({ userId }: { userId: string }) {
  if (!QUICK_CHECK_ON || !userId) return null
  return <QuickCheckBannerInner userId={userId} />
}

function QuickCheckBannerInner({ userId }: { userId: string }) {
  const navigate = useNavigate()
  const [s, setS] = useState<Schedule | null>(null)
  const [later, setLater] = useState(false)
  useEffect(() => {
    let cancelled = false
    supabase.from('user_mobility_schedule').select('next_check_at, next_retest_at, check_joints').eq('user_id', userId).maybeSingle()
      .then(({ data, error }) => { if (!cancelled && !error && data) setS(data as Schedule) })
    return () => { cancelled = true }
  }, [userId])
  if (!s) return null
  const due = isQuickCheckDue(s)
  const dismissed = later || (due && (() => { try { return localStorage.getItem(quickCheckDismissKey(userId, s.next_check_at!)) === '1' } catch { return false } })())
  const line = nextCheckLine(s)
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
