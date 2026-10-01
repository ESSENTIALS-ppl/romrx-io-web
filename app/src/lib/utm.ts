// utm.ts — first-party attribution capture (Kai UTM dict → signup user_metadata)
//
// First-touch: write once when URL has attrib params and storage is empty.
// Signup prefers live URL params, then stored, then fallback signup_source 'romrx.io'.
// Storage key shared with assets/partials.js so /beta + marketing landings persist across /app.

export const UTM_STORAGE_KEY = 'romrx.utm'

const PARAM_KEYS = [
  'utm_source',
  'utm_medium',
  'utm_campaign',
  'utm_content',
  'utm_term',
  'gclid',
  'fbclid',
] as const

export type UtmParamKey = (typeof PARAM_KEYS)[number]

export type UtmAttribution = Partial<Record<UtmParamKey, string>> & {
  captured_at?: string
  landing_path?: string
}

function readParams(search: string): UtmAttribution {
  const sp = new URLSearchParams(search.startsWith('?') ? search : `?${search}`)
  const out: UtmAttribution = {}
  for (const k of PARAM_KEYS) {
    const v = sp.get(k)?.trim()
    if (v) out[k] = v
  }
  return out
}

function hasAttrib(a: UtmAttribution): boolean {
  return PARAM_KEYS.some((k) => !!a[k])
}

export function loadStoredUtm(): UtmAttribution | null {
  try {
    const raw = localStorage.getItem(UTM_STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as UtmAttribution
    return hasAttrib(parsed) ? parsed : null
  } catch {
    return null
  }
}

/** Capture first-touch UTM/click ids from the current URL into localStorage. Idempotent. */
export function captureUtmFromUrl(search?: string, path?: string): UtmAttribution | null {
  try {
    const fromUrl = readParams(search ?? (typeof window !== 'undefined' ? window.location.search : ''))
    if (!hasAttrib(fromUrl)) return loadStoredUtm()

    const existing = loadStoredUtm()
    if (existing) return existing

    const payload: UtmAttribution = {
      ...fromUrl,
      captured_at: new Date().toISOString(),
      landing_path: path ?? (typeof window !== 'undefined' ? `${window.location.pathname}${window.location.search}` : undefined),
    }
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify(payload))
    return payload
  } catch {
    return null
  }
}

/**
 * Resolved attribution for signup metadata.
 * Live URL wins when present; else first-touch storage; signup_source falls back to 'romrx.io'.
 */
export function getSignupAttribution(search?: string): {
  signup_source: string
  meta: Record<string, string>
} {
  const fromUrl = readParams(search ?? (typeof window !== 'undefined' ? window.location.search : ''))
  const stored = loadStoredUtm() ?? {}
  const merged: UtmAttribution = { ...stored, ...fromUrl }

  const meta: Record<string, string> = {}
  for (const k of PARAM_KEYS) {
    const v = merged[k]
    if (v) meta[k] = v
  }

  const signup_source = meta.utm_source || 'romrx.io'
  return { signup_source, meta }
}
