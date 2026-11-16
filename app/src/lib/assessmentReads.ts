// P1-06b: assessment reads skip quick-check rows (P1-06 writes check_kind = 'quick').
// Null-safe, the same as SQL `check_kind IS DISTINCT FROM 'quick'`: older rows with no check_kind still count.
// SHIP DEPENDENCY: the check_kind column arrives in Avery's migration 20261116031000. Before that migration is live,
// PostgREST rejects the filter (unknown column) and every read below gets an error, so this must ship with or after
// that migration and with P1-06 (5ab7443).
export const SKIP_QUICK_OR = 'check_kind.is.null,check_kind.neq.quick'

/** Adds the null-safe "not a quick check" filter to a supabase-js query on public.assessments. */
export function skipQuick<Q extends { or: (filters: string) => Q }>(query: Q): Q {
  return query.or(SKIP_QUICK_OR)
}

/** Same rule in code, for rows that come back from an RPC (get_my_profile). */
export function isFullAssessment(row: unknown): boolean {
  if (!row || typeof row !== 'object') return false
  const kind = (row as { check_kind?: unknown }).check_kind
  return kind == null || kind !== 'quick'
}

/**
 * get_my_profile is server-side, so its rows are filtered here: history drops quick rows, and the latest is the newest
 * full row. If the RPC returned no full row at all, the original latest is kept rather than showing no assessment.
 * AVERY: get_my_profile should apply the same filter server-side (and my_joint_history, my_joint_start_vs_now).
 */
export function pickFullAssessments<T>(latest: T | null, history: readonly T[]): { latest: T | null; history: T[] } {
  const full = history.filter(isFullAssessment)
  if (!latest || isFullAssessment(latest)) return { latest, history: full }
  return { latest: full[0] ?? latest, history: full }
}
