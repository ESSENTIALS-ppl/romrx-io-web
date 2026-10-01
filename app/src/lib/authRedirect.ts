import type { EmailOtpType } from '@supabase/supabase-js'
import { supabase } from './supabase'

export interface AuthResult {
  ok: boolean
  next: string | null
  lead: string | null
  error?: string
}

// Reads a param from either the query string or the URL hash fragment, since
// Supabase link formats differ (PKCE uses query params, implicit uses the hash).
function paramReader() {
  const search = new URLSearchParams(window.location.search)
  const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
  return (key: string) => search.get(key) ?? hash.get(key)
}

function message(e: unknown) {
  return e instanceof Error ? e.message : String(e)
}

// Resolves once a session exists or the timeout elapses. detectSessionInUrl
// parses code/hash tokens asynchronously on load, so we poll for the result.
function waitForSession(timeoutMs: number) {
  return new Promise<boolean>(resolve => {
    let settled = false
    const finish = (hasSession: boolean) => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      listener.subscription.unsubscribe()
      resolve(hasSession)
    }
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) finish(true)
    })
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) finish(true)
    })
    const timer = setTimeout(() => finish(false), timeoutMs)
  })
}

// Establishes a Supabase session from whatever the redirect placed in the URL.
// Handles every supabase-js v2 magic-link / OAuth format:
//   - PKCE token_hash: ?token_hash=...&type=magiclink -> verifyOtp
//   - PKCE code:       ?code=...                       -> detectSessionInUrl (fallback exchange)
//   - implicit hash:   #access_token=...               -> detectSessionInUrl
// Works regardless of whether the link points at /app/auth/confirm or
// /app/auth/callback, so links already in the wild keep working.
export async function completeAuthFromUrl(): Promise<AuthResult> {
  const get = paramReader()
  const next = get('next')
  const lead = get('lead')

  const authError = get('error_description') ?? get('error')
  if (authError) return { ok: false, next, lead, error: authError }

  const token_hash = get('token_hash')
  const type = get('type') as EmailOtpType | null
  const code = get('code')

  // token_hash verify links are NOT auto-processed by detectSessionInUrl.
  if (token_hash && type) {
    try {
      const { data, error } = await supabase.auth.verifyOtp({ token_hash, type })
      if (!error && data.session) return { ok: true, next, lead }
      return { ok: false, next, lead, error: error?.message }
    } catch (e) {
      return { ok: false, next, lead, error: message(e) }
    }
  }

  // code (PKCE) and #access_token (implicit) are auto-processed by
  // detectSessionInUrl on client init. Wait for that to finish.
  let hasSession = await waitForSession(3000)

  // Fallback: exchange the code ourselves if auto-detect did not. Guarded so a
  // "code already used" error (already consumed by detectSessionInUrl) is a no-op.
  if (!hasSession && code) {
    try {
      const { data } = await supabase.auth.exchangeCodeForSession(code)
      hasSession = !!data.session || (await waitForSession(1000))
    } catch {
      /* code already consumed by detectSessionInUrl */
    }
  }

  return { ok: hasSession, next, lead }
}
