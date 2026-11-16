// P1-13 Add to Home Screen (web app only). Manifest: /assets/pwa/base.webmanifest, linked from app/index.html.
// Tip words: Stacy's STACY-P1-JULES-SLOTS-WORDS-20261115-2138.md, byte-exact (Jim yes pending). The tip shows after session 1
// on phones only. If a slot is ever removed again, set A2HS_TIP_COPY to null and the tip renders nothing.
export type A2hsCopy = { title: string; body: string; iosSteps: string; androidButton: string; dismiss: string }
export const A2HS_TIP_COPY: A2hsCopy | null = {
  title: 'Put ROMRx on your home screen',
  body: 'Tap the icon to open ROMRx right to today\'s session. On Android, you can also use the Chrome menu (⋮), then Add to Home screen.',
  iosSteps: 'In Safari, tap the Share button, then Add to Home Screen. If you don\'t see Share, tap ••• first.',
  androidButton: 'Add to Home screen',
  dismiss: 'Not now',
}

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

/** Stacy's note 6: the "On Android, ..." sentence in `body` is for Android only. The words stay byte-exact in A2HS_TIP_COPY;
 * iPhone shows `body` up to that sentence, Android shows all of it. */
export const ANDROID_BODY_MARKER = ' On Android, '
export function bodyForPlatform(body: string, platform: A2hsPlatform): string {
  if (platform === 'android') return body
  const i = body.indexOf(ANDROID_BODY_MARKER)
  return i === -1 ? body : body.slice(0, i)
}
