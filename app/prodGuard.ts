// Preview prod guard (2026-10-20). A build may point the client at the prod
// Supabase project ONLY when Netlify's deploy CONTEXT is exactly "production".
// Any other build (deploy-preview, branch-deploy, dev, local CLI draft, or
// CONTEXT unset) has VITE_SUPABASE_URL swapped for an unroutable host, so every
// client call (auth, REST writes, product_events, edge functions) fails before
// it leaves the browser. Prod deploys must set CONTEXT=production.
export const PROD_SUPABASE_REF = 'cqzvqzwwevnflinxgnpp'
export const BLOCKED_SUPABASE_URL = 'https://preview-blocked-no-prod.invalid'

export function guardSupabaseUrl(url: string | undefined, context: string | undefined): { url: string | undefined; blocked: boolean } {
  if (url && url.includes(PROD_SUPABASE_REF) && context !== 'production') {
    return { url: BLOCKED_SUPABASE_URL, blocked: true }
  }
  return { url, blocked: false }
}
