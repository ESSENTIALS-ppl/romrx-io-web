/**
 * Supabase wiring for the consent log (kept out of consent.ts / consentLog.ts
 * so those stay pure and testable).
 * - Access token for signed-in consent writes (server verifies it; user_id is
 *   never sent in the body).
 * - Current choice saved in public.user_ads_consent (written only by the
 *   consent-log function with the service role; users can read only their own
 *   row; coaches and school admins cannot read it).
 */
import { supabase } from './supabase'
import { setConsentTokenGetter } from './consentLog'
import { adoptProfileChoice } from './consent'

export interface ProfileConsent {
  state: 'granted' | 'denied' | 'revoked' | null
  updatedAt: string | null
  declinedAt: string | null
}

let wired = false
export function wireConsentAuth(): void {
  if (wired) return
  wired = true
  setConsentTokenGetter(async () => {
    const { data } = await supabase.auth.getSession()
    return data.session?.access_token ?? null
  })
}

export async function fetchProfileConsent(userId: string): Promise<ProfileConsent | null> {
  try {
    // Own row only (RLS self read). Coaches / school admins cannot read this table.
    const { data, error } = await supabase
      .from('user_ads_consent')
      .select('state, updated_at, declined_at')
      .eq('user_id', userId)
      .maybeSingle()
    if (error || !data) return null
    const row = data as { state: string | null; updated_at: string | null; declined_at: string | null }
    const s = row.state
    return {
      state: s === 'granted' || s === 'denied' || s === 'revoked' ? s : null,
      updatedAt: row.updated_at,
      declinedAt: row.declined_at,
    }
  } catch {
    return null
  }
}

/** Signed-in: bring this browser in line with the saved profile choice (suppresses re-prompts). */
export async function syncConsentFromProfile(): Promise<ProfileConsent | null> {
  try {
    const { data } = await supabase.auth.getSession()
    const uid = data.session?.user?.id
    if (!uid) return null
    const prof = await fetchProfileConsent(uid)
    if (prof) adoptProfileChoice(prof)
    return prof
  } catch {
    return null
  }
}
