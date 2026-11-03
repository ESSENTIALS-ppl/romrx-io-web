import { useEffect, useSyncExternalStore } from 'react'
import { supabase } from './supabase'
import { hipFlexScoredAtMs, setHipFlexScoredAtMs, subscribeHipFlexScoredAt } from './hipFlexCutoverState'

// FG-36: one source for the hip flexion cutover = scoring_cutovers.hip_flex_scored.effective_at (Avery, set when the push happens).
// Read-only select. If the table, the row or read access is missing, nothing is set and everything stays pre-cutover (fail safe).
let inflight = false
export async function loadHipFlexScoredAt(): Promise<void> {
  if (hipFlexScoredAtMs() != null || inflight) return
  inflight = true
  try {
    // scoring_cutovers is readable by signed-in users only (RLS), so a signed-out visitor would get a 401. No session: skip the read and stay pre-cutover (fail safe).
    const { data: sess } = await supabase.auth.getSession()
    if (!sess?.session) return
    const { data, error } = await supabase.from('scoring_cutovers').select('effective_at').eq('key', 'hip_flex_scored').maybeSingle()
    const t = !error && data?.effective_at ? Date.parse(String(data.effective_at)) : NaN
    if (Number.isFinite(t)) setHipFlexScoredAtMs(t)
  } catch { /* stay pre-cutover */ } finally { inflight = false }
}

/** Call in any component that shows a score or a hip flexion row: loads the cutover once and re-renders when it arrives. */
export function useHipFlexCutover(): number | null {
  useEffect(() => {
    void loadHipFlexScoredAt()
    // Signed out on mount, signs in later: read once the session exists.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => { if (session) void loadHipFlexScoredAt() })
    return () => sub.subscription.unsubscribe()
  }, [])
  return useSyncExternalStore(subscribeHipFlexScoredAt, hipFlexScoredAtMs, () => null)
}

/** L937: ids of these assessments that have a hip flexion score (joint_scores row, key 'hip_flex', score not null). Read-only; on any error returns an empty set (date gate applies). */
export async function loadHipScoredIds(ids: string[]): Promise<Set<string>> {
  const out = new Set<string>()
  if (!ids.length) return out
  try {
    const { data, error } = await supabase.from('joint_scores').select('assessment_id').eq('joint_key', 'hip_flex').not('score', 'is', null).in('assessment_id', ids)
    if (!error && Array.isArray(data)) for (const r of data as { assessment_id: string }[]) out.add(r.assessment_id)
  } catch { /* date gate applies */ }
  return out
}
