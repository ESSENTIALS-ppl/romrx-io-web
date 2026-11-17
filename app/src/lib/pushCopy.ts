// P1-14 web push: client words, Stacy STACY-P1-14-CLIENT-STRINGS-20261116-2054.md (sha256 666e6603), inserted by script, verbatim.
// With SHOW_PUSH = false (Settings.tsx) none of them render, and the build drops them as dead code.
// unsupported: Stacy's long form (iPhone/iPad Home Screen clause). Her condition 1 holds: app/index.html links
//   /assets/pwa/base.webmanifest (display "standalone", scope "/app/", start_url "/app/dashboard/my-protocol"), served as a
//   static file, and the one worker /app/sw.js registers with scope "/app/" (VITE_P1_26_OFFLINE_CACHE = "on"). If P1-26 is
//   turned off there is no worker; switch to her short form then: "This browser can't show notifications. Try another browser."
// deviceLimit: her text ends at "...no longer use." The "or email ... and we'll help" clause is dropped: Avery confirmed
//   support cannot clear push_subscriptions rows (Grant, 8:56 PM ET).
import type { PushFailReason } from './pushSubscribe'

export const PUSH_COPY = {
  toggleTitle: "Reminder notifications",
  toggleHelp: "Get your daily reminder at your reminder time, and a note when your retest is due. Your browser will ask you to allow notifications. Turning this off stops them on all your devices.",
  denied: "Notifications are blocked for ROMRx in your browser. To get reminders, allow notifications for romrx.io in your browser settings, then try again.",
  unsupported: "This browser can't show notifications. Try another browser, or on iPhone or iPad, add ROMRx to your Home Screen from Safari and turn this on there.",
  deviceLimit: "Reminders are already on for 10 devices, the most we allow. Turn them off on a device you no longer use.",
  genericError: "Notifications could not be turned on. Please try again.",
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
