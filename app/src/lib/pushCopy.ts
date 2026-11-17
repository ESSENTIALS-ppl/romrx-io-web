// P1-14 web push: client words. NONE of these are cleared. Every value is a NEEDS STACY placeholder and must be replaced
// with Stacy's words before SHOW_PUSH is turned on. With SHOW_PUSH = false (Settings.tsx) none of them render, and the
// build drops them as dead code. Stacy's P1-14 file (219378b5) clears only the notification text the server sends.
import type { PushFailReason } from './pushSubscribe'

export const PUSH_NEEDS_STACY = 'NEEDS STACY'

export const PUSH_COPY = {
  toggleTitle: 'NEEDS STACY: push toggle title',
  toggleHelp: 'NEEDS STACY: push toggle help line',
  denied: 'NEEDS STACY: notifications are blocked in this browser',
  unsupported: 'NEEDS STACY: this browser cannot get notifications',
  deviceLimit: 'NEEDS STACY: device limit reached',
  genericError: 'NEEDS STACY: notifications could not be turned on',
} as const

/** Message under the toggle for a failed turn-on. null = stay quiet (missing VAPID key or no worker: a set-up gap, not the user's). */
export function pushMessageFor(reason: PushFailReason): string | null {
  switch (reason) {
    case 'no_key':
    case 'no_worker':
      return null
    case 'denied': return PUSH_COPY.denied
    case 'unsupported': return PUSH_COPY.unsupported
    case 'device_limit': return PUSH_COPY.deviceLimit
    default: return PUSH_COPY.genericError // invalid (400), unauthorized (401), failed (405, 409 other, 500 save_failed, network)
  }
}
