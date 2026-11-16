/** P1-03: return to the page the profile wall interrupted (dashboard paths only), else My Body. */
export function completeProfileNext(search: string): string {
  const next = new URLSearchParams(search).get('next') ?? ''
  if (/^\/dashboard\/[a-z-]+$/.test(next) && next !== '/dashboard/complete-profile') return next
  return '/dashboard/my-body'
}
