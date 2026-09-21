import { supabase } from './supabase'
import { track } from './track'

/** Default post-login home when the user already has an assessment. */
export const DEFAULT_HOME = '/dashboard/my-body'

/** First-session destination for Base users with zero assessments. */
export const ASSESSMENT_PATH = '/onboarding/assessment'

/**
 * Resolve where to send a user after login / auth confirm.
 * Explicit `next` (signup confirm, unlock) always wins.
 * Otherwise: no assessment row → assessment; else My Body.
 * Fail-open to My Body on any query error (do not block login).
 */
export async function resolvePostAuthDest(
  userId: string | null | undefined,
  explicitNext?: string | null,
): Promise<string> {
  if (explicitNext && explicitNext.startsWith('/')) return explicitNext
  if (!userId) return DEFAULT_HOME
  try {
    const { count, error } = await supabase
      .from('assessments')
      .select('id', { count: 'exact', head: true })
      .eq('user_id', userId)
    if (error) return DEFAULT_HOME
    if ((count ?? 0) === 0) {
      track('login_redirected_to_assessment', { reason: 'no_assessment' })
      return ASSESSMENT_PATH
    }
  } catch {
    return DEFAULT_HOME
  }
  return DEFAULT_HOME
}
