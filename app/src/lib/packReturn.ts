// Pack apps (romrxbjj.com, romrxbodybuilding.com) no longer have their own assessment:
// the Base assessment here is the single source of truth (Jim, Oct 6 2026, CLOSED).
// A pack app sends a signed-in member to
//   /app/login?next=/onboarding/assessment?return_to=<pack>
// Login (or the magic link) signs them in on romrx.io, the assessment saves to their
// account (same Supabase user, same assessments table the pack app reads), and on
// "done" we send them back to their pack dashboard instead of the Base results page.
//
// Open-redirect safety: return_to is a KEY, never a URL. Only the fixed URLs below
// can ever be used. `next` is only honored as a same-app relative path.

export const PACK_RETURN_URLS = {
  bjj: 'https://romrxbjj.com/dashboard/my-body',
  bodybuilding: 'https://romrxbodybuilding.com/dashboard/my-game',
} as const

export type PackKey = keyof typeof PACK_RETURN_URLS

/** Reads ?return_to=bjj|bodybuilding. Anything else (including a full URL) returns null. */
export function packReturnKey(search: string): PackKey | null {
  const raw = new URLSearchParams(search).get('return_to')
  const key = (raw ?? '').trim().toLowerCase()
  return Object.prototype.hasOwnProperty.call(PACK_RETURN_URLS, key) ? (key as PackKey) : null
}

export function packReturnUrl(key: PackKey | null): string | null {
  return key ? PACK_RETURN_URLS[key] : null
}

/** Login path that signs the member in and then opens the assessment with the same return_to. */
export function loginForPackAssessment(key: PackKey): string {
  return `/login?next=${encodeURIComponent(`/onboarding/assessment?return_to=${key}`)}`
}

/**
 * `next` from a URL, accepted only as an in-app path ("/onboarding/assessment?...").
 * Rejects absolute URLs, protocol-relative "//host", backslash tricks and anything
 * that does not start with a single "/". Returns null when not safe.
 */
export function safeNextPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  const next = raw.trim()
  if (!next.startsWith('/')) return null
  if (next.startsWith('//') || next.startsWith('/\\') || next.includes('\\')) return null
  if (/^\/[a-z][a-z0-9+.-]*:/i.test(next)) return null
  // /app is the router basename; a next that repeats it would 404 inside the SPA.
  return next.replace(/^\/app(?=\/|$)/, '') || '/'
}

// Magic link: the email opens /app/auth/confirm without our `next`, usually in the same
// browser. Keep the pending `next` for a short time so AuthConfirm can still honor it.
const STASH_KEY = 'romrx_post_auth_next'
const STASH_TTL_MS = 30 * 60 * 1000

type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

function storage(): StorageLike | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage } catch { return null }
}

export function stashPostAuthNext(next: string, now = Date.now(), store: StorageLike | null = storage()): void {
  const safe = safeNextPath(next)
  if (!safe || !store) return
  try { store.setItem(STASH_KEY, JSON.stringify({ next: safe, at: now })) } catch { /* private mode */ }
}

/** Returns the stashed next (if fresh and safe) and clears it. */
export function takePostAuthNext(now = Date.now(), store: StorageLike | null = storage()): string | null {
  if (!store) return null
  let raw: string | null = null
  try { raw = store.getItem(STASH_KEY); store.removeItem(STASH_KEY) } catch { return null }
  if (!raw) return null
  try {
    const { next, at } = JSON.parse(raw) as { next?: string; at?: number }
    if (typeof at !== 'number' || now - at > STASH_TTL_MS || now < at) return null
    return safeNextPath(next)
  } catch {
    return null
  }
}

export function clearPostAuthNext(store: StorageLike | null = storage()): void {
  try { store?.removeItem(STASH_KEY) } catch { /* ignore */ }
}
