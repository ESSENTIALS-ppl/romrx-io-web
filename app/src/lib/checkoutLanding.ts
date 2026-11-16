// P1-03: Stripe sends paid users back to /app/dashboard?checkout=base_success (or unlock_success); that URL is set server side
// in create-checkout-session and changing it needs Jim's yes, so the client routes it instead.
// /dashboard sits inside ProtectedRoute, which only renders it once users.base_status is 'active' (set by the Stripe webhook
// or activate-beta-base). Not active yet: ProtectedRoute sends them to /onboarding/results as before, and ResultsPreview's
// own base_status check sends active users to My Protocol. So this only changes where an ACTIVE success landing goes.
export const CHECKOUT_SUCCESS_VALUES = ['base_success', 'unlock_success'] as const
export const TODAY_ROUTE = '/dashboard/my-protocol'
export const DEFAULT_DASHBOARD_ROUTE = '/dashboard/my-body'

export function dashboardIndexTarget(search: string): string {
  const v = new URLSearchParams(search).get('checkout') ?? ''
  return (CHECKOUT_SUCCESS_VALUES as readonly string[]).includes(v) ? TODAY_ROUTE : DEFAULT_DASHBOARD_ROUTE
}
