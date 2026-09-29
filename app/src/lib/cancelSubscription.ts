// "Cancel subscription" button and canceled state in Settings > Subscription (CA auto-renewal law, Legal plan
// ca-arl-plan-20260929 section 4B; Jim GO via Grant 2026-09-29).
// Talks to the romrxbjj-v2 edge function `create-portal-session` (v13+), which checks the caller's JWT
// and only ever uses the caller's own subscription (the id is never sent from the browser).
//   action "cancel_status" -> { cancelable, kind, base: {state, date, cancelable}, sports: [...] }  (DB only)
//   action "cancel", target? -> { url }  Stripe Customer Portal opened on the cancel screen (flow_data subscription_cancel)
import { withStripeTestFlag } from './stripeTestMode'

// Labels are Legal's exact text (plan sections 3c and 4B, Sep 29 revisions). American spelling.
export const CANCEL_BUTTON_LABEL = 'Cancel subscription'
export const CANCEL_BASE_CASCADE_NOTE = 'Canceling Base also cancels any sport packs.'
export const CANCELED_SCHEDULED = (date: string) => `Canceled. Your plan will not renew and you will not be charged on ${date}.`
export const CANCELED_NOW = 'Canceled. You will not be charged.'

export type SubState = 'active' | 'canceling' | 'canceled' | 'none'
export type SportStatus = { sport: string; state: string; date: string | null; own_subscription: boolean; cancelable: boolean }
export type CancelStatus = {
  cancelable: boolean
  kind: 'base' | 'sport' | null
  /** null when the server did not report detailed state (older function version or error). */
  base: { state: SubState; date: string | null; cancelable: boolean } | null
  sports: SportStatus[]
}
export const EMPTY_CANCEL_STATUS: CancelStatus = { cancelable: false, kind: null, base: null, sports: [] }

type InvokeResult = { data: unknown; error: unknown }
export type InvokeFn = (name: string, opts: { body: Record<string, unknown> }) => Promise<InvokeResult>

const STATES: SubState[] = ['active', 'canceling', 'canceled', 'none']

export async function fetchCancelStatus(invoke: InvokeFn): Promise<CancelStatus> {
  try {
    const { data, error } = await invoke('create-portal-session', { body: withStripeTestFlag({ action: 'cancel_status' }) })
    if (error) return EMPTY_CANCEL_STATUS
    const d = data as Record<string, any> | null
    const kind = d?.kind === 'base' || d?.kind === 'sport' ? d.kind : null
    const b = d?.base
    const base = b && STATES.includes(b.state)
      ? { state: b.state as SubState, date: typeof b.date === 'string' ? b.date : null, cancelable: b.cancelable === true }
      : null
    const sports: SportStatus[] = Array.isArray(d?.sports)
      ? d!.sports.filter((s: any) => s && typeof s.sport === 'string').map((s: any) => ({
          sport: s.sport, state: String(s.state ?? ''), date: typeof s.date === 'string' ? s.date : null,
          own_subscription: s.own_subscription === true, cancelable: s.cancelable === true,
        }))
      : []
    return { cancelable: d?.cancelable === true, kind, base, sports }
  } catch {
    return EMPTY_CANCEL_STATUS
  }
}

export type CancelOpenResult = { ok: true; url: string } | { ok: false }

/** target: 'base' or a sport slug for a separately billed pack. Omit to cancel the first cancelable subscription. */
export async function openCancelFlow(invoke: InvokeFn, target?: string): Promise<CancelOpenResult> {
  try {
    const body: Record<string, unknown> = { action: 'cancel', ...(target ? { target } : {}) }
    const { data, error } = await invoke('create-portal-session', { body: withStripeTestFlag(body) })
    if (error) return { ok: false }
    const url = (data as { url?: unknown } | null)?.url
    if (typeof url === 'string' && url.startsWith('https://billing.stripe.com/')) return { ok: true, url }
    return { ok: false }
  } catch {
    return { ok: false }
  }
}

/** "January 1, 2027" in Eastern time (Stripe period ends fall at midnight ET on Jan 1 for beta trials). */
export function formatCancelDate(iso: string | null | undefined): string | null {
  if (!iso) return null
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('en-US', { timeZone: 'America/New_York', year: 'numeric', month: 'long', day: 'numeric' })
}

/** Legal's canceled message for a state, or null when the subscription is not canceled. */
export function canceledMessage(state: string | null | undefined, date: string | null | undefined): string | null {
  if (state === 'canceled') return CANCELED_NOW
  if (state === 'canceling') {
    const f = formatCancelDate(date)
    return f ? CANCELED_SCHEDULED(f) : CANCELED_NOW
  }
  return null
}

/**
 * Status label for a row. Never "active" for a canceled-but-not-yet-ended subscription: a canceling/canceled
 * state from the server always wins over the raw DB status. While the server state is still loading, an
 * active raw status shows a neutral placeholder instead of "active".
 */
export function statusLabel(raw: string | null | undefined, serverState: string | null | undefined, loading: boolean): string {
  if (serverState === 'canceling' || serverState === 'canceled') return 'Canceled'
  if (loading && (raw === 'active' || raw === 'trialing' || raw === 'past_due')) return '...'
  return raw ?? 'inactive'
}
