// P1-17: day 3 ROMBot check-in, client pieces. (1) the check-in button (from context_snapshot.button), (2) the unread dot
// on the ROMBot tab, (3) the Today card on My Protocol. Words: Stacy's button labels (lib/rombotCheckin.ts) and her client
// words (9d8fe291 items 1 and 2: the card line and the tab's screen-reader label). The Today card never renders any server
// note text (no name, count or focus area on the Today screen); the note itself shows only inside ROMBot.
import { Link, useNavigate } from 'react-router-dom'
import { MessageSquare } from 'lucide-react'
import { track } from '../lib/track'
import { CHECKIN_TAB_SR_LABEL, CHECKIN_TODAY_LINE, type Checkin } from '../lib/rombotCheckin'
import { useRombotCheckin } from '../hooks/useRombotCheckin'

/** (1) Button. Opens only the server path; marks the note read; fires today_session_started {source: rombot_checkin}. */
export function RombotCheckinButton({ checkin, onRead, className }: { checkin: Checkin; onRead: () => void; className?: string }) {
  const navigate = useNavigate()
  if (!checkin.button) return null
  const { label, path } = checkin.button
  return (
    <button
      type="button"
      data-testid="rombot-checkin-button"
      onClick={() => {
        onRead()
        track('today_session_started', { source: 'rombot_checkin', branch: checkin.branch })
        navigate(path)
      }}
      className={className ?? 'mt-3 w-full rounded-xl py-3 text-sm font-bold text-white bg-cobalt hover:opacity-90 transition-opacity'}
    >
      {label}
    </button>
  )
}

/** (2) Unread dot. Hidden from screen readers; the tab carries Stacy's label instead (RombotTabUnread). */
export function RombotUnreadDot({ show }: { show: boolean }) {
  if (!show) return null
  return <span data-testid="rombot-unread-dot" aria-hidden="true" className="inline-block w-2 h-2 rounded-full bg-red-500 shrink-0" />
}

/** (2) On the ROMBot tab, after the tab name, while unread: the dot plus Stacy's visually hidden label. Gone once read. */
export function RombotTabUnread({ unread }: { unread: boolean }) {
  if (!unread) return null
  return (
    <>
      <RombotUnreadDot show />
      <span className="sr-only" data-testid="rombot-tab-sr-label">{CHECKIN_TAB_SR_LABEL}</span>
    </>
  )
}

/** (3) Today card: shown on My Protocol while the check-in is unread. */
export function RombotCheckinCard({ userId }: { userId: string }) {
  const { checkin, unread, markRead } = useRombotCheckin(userId)
  if (!checkin || !unread) return null
  return (
    <div data-testid="rombot-checkin-card" data-branch={checkin.branch} className="rounded-card border border-cobalt/20 bg-white shadow-sm p-4">
      <Link to="/dashboard/rombot" className="flex items-center gap-2 text-cobalt" data-testid="rombot-checkin-open">
        <MessageSquare size={14} className="shrink-0" />
        <span className="text-sm font-bold" data-testid="rombot-checkin-line">{CHECKIN_TODAY_LINE}</span>
        <RombotUnreadDot show />
      </Link>
      <RombotCheckinButton checkin={checkin} onRead={markRead} />
    </div>
  )
}
