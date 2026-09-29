// "Cancel subscription" button in Settings > Subscription (CA auto-renewal law, Legal plan
// ca-arl-plan-20260929 section 4B; Jim GO via Grant 2026-09-29).
// Talks to the romrxbjj-v2 edge function `create-portal-session` (v13+), which checks the caller's JWT
// and only ever uses the caller's own subscription (the id is never sent from the browser).
//   action "cancel_status" -> { cancelable, kind }  (DB only)
//   action "cancel"        -> { url }  Stripe Customer Portal opened on the cancel screen (flow_data subscription_cancel)

// Labels are Legal's exact text (plan sections 3c and 4B).
export const CANCEL_BUTTON_LABEL = 'Cancel subscription'
export const CANCEL_BASE_CASCADE_NOTE = 'Cancelling Base also cancels any sport packs.'

export type CancelStatus = { cancelable: boolean; kind: 'base' | 'sport' | null }

type InvokeResult = { data: unknown; error: unknown }
export type InvokeFn = (name: string, opts: { body: Record<string, unknown> }) => Promise<InvokeResult>

export async function fetchCancelStatus(invoke: InvokeFn): Promise<CancelStatus> {
  try {
    const { data, error } = await invoke('create-portal-session', { body: { action: 'cancel_status' } })
    if (error) return { cancelable: false, kind: null }
    const d = data as { cancelable?: unknown; kind?: unknown } | null
    const kind = d?.kind === 'base' || d?.kind === 'sport' ? d.kind : null
    return { cancelable: d?.cancelable === true, kind }
  } catch {
    return { cancelable: false, kind: null }
  }
}

export type CancelOpenResult = { ok: true; url: string } | { ok: false }

export async function openCancelFlow(invoke: InvokeFn): Promise<CancelOpenResult> {
  try {
    const { data, error } = await invoke('create-portal-session', { body: { action: 'cancel' } })
    if (error) return { ok: false }
    const url = (data as { url?: unknown } | null)?.url
    if (typeof url === 'string' && url.startsWith('https://billing.stripe.com/')) return { ok: true, url }
    return { ok: false }
  } catch {
    return { ok: false }
  }
}
