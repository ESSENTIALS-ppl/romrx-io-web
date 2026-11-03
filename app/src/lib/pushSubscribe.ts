// FG-12 browser push subscribe helper (Avery, staged, hidden behind SHOW_PUSH = false in Settings).
// Uses the existing `save-push-subscription` edge function (v18: stores the subscription on
// notification_preferences.push_subscription and sets push_reminders = true). Single device per user.
// Turning push OFF only saves push_reminders = false through the normal notification save; the sender checks that flag.
// Needs VITE_VAPID_PUBLIC_KEY and a sender (not live). No copy here is live.
type InvokeResult = { data: unknown; error: unknown }
export type InvokeFn = (name: string, opts: { body: Record<string, unknown> }) => Promise<InvokeResult>
export type PushResult = { ok: true } | { ok: false; reason: 'unsupported' | 'denied' | 'no_key' | 'failed' }

export function urlBase64ToUint8Array(b64: string): Uint8Array {
  const pad = '='.repeat((4 - (b64.length % 4)) % 4)
  const raw = atob((b64 + pad).replace(/-/g, '+').replace(/_/g, '/'))
  return Uint8Array.from(raw, c => c.charCodeAt(0))
}

export async function enablePush(invoke: InvokeFn, vapidPublicKey: string | undefined): Promise<PushResult> {
  if (typeof window === 'undefined' || !('Notification' in window) || !('serviceWorker' in navigator)) return { ok: false, reason: 'unsupported' }
  if (!vapidPublicKey) return { ok: false, reason: 'no_key' }
  try {
    if ((await Notification.requestPermission()) !== 'granted') return { ok: false, reason: 'denied' }
    const reg = await navigator.serviceWorker.ready
    const sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlBase64ToUint8Array(vapidPublicKey) as unknown as BufferSource })
    const { error } = await invoke('save-push-subscription', { body: { subscription: sub.toJSON() } })
    return error ? { ok: false, reason: 'failed' } : { ok: true }
  } catch {
    return { ok: false, reason: 'failed' }
  }
}
