/** Plain-English copy for the Settings "Ads measurement" section (no em dashes). */
import type { ConsentState } from './consent'

export interface AdsSettingsView {
  on: boolean
  summary: string
  locked: boolean
  acceptLabel: string
  declineLabel: string
}

export const ADS_SETTINGS_INTRO =
  'On signup pages, we use Meta Pixel cookies and limited event data to measure our ads. Essential cookies still work either way.'
export const ADS_GPC_LOCKED_NOTE =
  "Your browser's Global Privacy Control signal was honored. Ads measurement is off. Your browser's privacy signal keeps it off while that setting is on."

export function adsSettingsView(state: ConsentState, region: 'us' | 'eu_uk', gpc: boolean): AdsSettingsView {
  const isEu = region === 'eu_uk'
  const acceptLabel = isEu ? 'Allow' : 'Accept'
  const declineLabel = isEu ? 'Reject' : 'Decline'
  if (gpc) {
    return { on: false, locked: true, acceptLabel, declineLabel, summary: 'Off. Your browser is sending a Global Privacy Control signal.' }
  }
  if (state === 'granted') {
    return { on: true, locked: false, acceptLabel, declineLabel, summary: 'On. You chose to allow ads measurement.' }
  }
  if (state === 'denied' || state === 'revoked') {
    return { on: false, locked: false, acceptLabel, declineLabel, summary: 'Off. You turned ads measurement off.' }
  }
  return isEu
    ? { on: false, locked: false, acceptLabel, declineLabel, summary: 'Off. You have not made a choice yet, so it stays off unless you allow it.' }
    : { on: true, locked: false, acceptLabel, declineLabel, summary: 'On. You have not made a choice yet. You can decline at any time.' }
}
