/**
 * /signup/:sport redirect target. Keeps every incoming query param (utm_*,
 * fbclid, ref...) so UTM and Meta click matching (_fbc) survive the hop.
 * Known sport: set/override `add=<sport>`. Unknown sport: keep params, no add
 * (any incoming `add` is dropped so an unknown slug cannot inject one).
 * stripAddParam (metaAttribution.ts) later removes only `add` before PageView.
 */
export const KNOWN_SPORTS: ReadonlySet<string> = new Set(['bjj', 'bodybuilding'])

export function signupSportRedirectTarget(sport: string | undefined, search: string, hash = ''): string {
  const key = (sport ?? '').toLowerCase()
  const params = new URLSearchParams(search || '')
  params.delete('add')
  if (KNOWN_SPORTS.has(key)) params.set('add', key)
  const qs = params.toString()
  return `/signup${qs ? `?${qs}` : ''}${hash || ''}`
}
