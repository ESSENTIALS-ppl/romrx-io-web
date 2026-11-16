// P1-13 Add to Home Screen (web app only). Manifest: /assets/pwa/base.webmanifest, linked from app/index.html.
// The tip after session 1 needs new words. Until Stacy supplies them (and Jim says yes) A2HS_TIP_COPY is null and the tip
// renders nothing, so no placeholder ever reaches the bundle. Words needed (NEEDS JIM WORDING), by key:
//   title: tip heading                          iosSteps: one line, "tap Share, then Add to Home Screen" style
//   androidButton: button that opens the browser's install prompt   dismiss: "not now" style
export type A2hsCopy = { title: string; body: string; iosSteps: string; androidButton: string; dismiss: string }
export const A2HS_TIP_COPY: A2hsCopy | null = null

export type A2hsPlatform = 'ios' | 'android' | 'other'

export function a2hsPlatform(ua: string): A2hsPlatform {
  if (/iPhone|iPad|iPod/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua)) return 'ios' // iOS Safari: Share sheet only
  if (/Android/i.test(ua)) return 'android'
  return 'other'
}

/** Already opened from the home screen (no tip then). */
export function isStandalone(w: { matchMedia?: (q: string) => { matches: boolean }; navigator?: { standalone?: boolean } }): boolean {
  return !!w.matchMedia?.('(display-mode: standalone)').matches || w.navigator?.standalone === true
}

export const A2HS_DISMISS_KEY = 'romrx_hq_a2hs_tip_dismissed'

/** Show only with words supplied, on a phone, not already installed, not dismissed. */
export function shouldShowA2hsTip(copy: A2hsCopy | null, platform: A2hsPlatform, standalone: boolean, dismissed: boolean): boolean {
  return copy !== null && platform !== 'other' && !standalone && !dismissed
}
