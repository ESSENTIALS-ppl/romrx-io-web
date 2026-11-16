// P1-17: the user's newest day 3 ROMBot check-in and whether it is unread. Shared by the nav dot (Layout), the Today
// card (My Protocol) and the ROMBot page. Re-reads on focus, on tab return and when any screen marks the note read.
import { useCallback, useEffect, useState } from 'react'
import { CHECKIN_READ_EVENT, isCheckinUnread, loadLatestCheckin, markCheckinRead, readKey, type Checkin } from '../lib/rombotCheckin'

export function useRombotCheckin(userId: string | undefined) {
  const [checkin, setCheckin] = useState<Checkin | null>(null)
  const [failed, setFailed] = useState(false)
  const [tick, setTick] = useState(0)

  const refresh = useCallback(async () => {
    if (!userId) { setCheckin(null); return }
    const r = await loadLatestCheckin(userId)
    if (!r.ok) { setFailed(true); setCheckin(null); return } // fail quiet: no dot, no card
    setFailed(false); setCheckin(r.checkin)
  }, [userId])

  useEffect(() => { void refresh() }, [refresh])

  useEffect(() => {
    const onRead = () => setTick(t => t + 1)
    const onStorage = (e: StorageEvent) => { if (userId && e.key === readKey(userId)) setTick(t => t + 1) }
    const onBack = () => { if (document.visibilityState === 'visible') void refresh() }
    window.addEventListener(CHECKIN_READ_EVENT, onRead)
    window.addEventListener('storage', onStorage)
    document.addEventListener('visibilitychange', onBack)
    return () => {
      window.removeEventListener(CHECKIN_READ_EVENT, onRead)
      window.removeEventListener('storage', onStorage)
      document.removeEventListener('visibilitychange', onBack)
    }
  }, [userId, refresh])

  void tick // re-render on read events so `unread` below is recomputed from storage
  const unread = !!userId && isCheckinUnread(userId, checkin)
  const markRead = useCallback(() => { if (userId && checkin) markCheckinRead(userId, checkin.conversationId) }, [userId, checkin])
  return { checkin, unread, failed, markRead, refresh }
}
