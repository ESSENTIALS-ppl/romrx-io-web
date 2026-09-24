/**
 * Supabase wiring for the consent log (kept out of consent.ts / consentLog.ts
 * so those stay pure and testable).
 * - Access token for signed-in consent writes (server verifies it; user_id is
 *   never sent in the body).
 * - Current choice saved on public.users.ads_consent_* (written only by the
 *   consent-log function with the service role; users can read their own row).
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
    const { data, error } = await supabase
      .from('users')
      .select('ads_consent_state, ads_consent_updated_at, ads_consent_declined_at')
      .eq('id', userId)
      .maybeSingle()
    if (error || !data) return null
    const row = data as { ads_consent_state: string | null; ads_consent_updated_at: string | null; ads_consent_declined_at: string | null }
    const s = row.ads_consent_state
    return {
      state: s === 'granted' || s === 'denied' || s === 'revoked' ? s : null,
      updatedAt: row.ads_consent_updated_at,
      declinedAt: row.ads_consent_declined_at,
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
