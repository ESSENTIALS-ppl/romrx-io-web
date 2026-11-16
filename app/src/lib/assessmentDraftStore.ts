// The only file that talks to Supabase for assessment drafts. Every call is the member's own row
// (RLS: user_id = auth.uid()). Nothing here sends created_at or expires_at: the database owns both.
// The client is loaded on first use, so pages that only import the saver (and their tests) never build it.
const db = async () => (await import('./supabase')).supabase
import type { DraftStore } from './assessmentDraft'
import { skipQuick } from './assessmentReads'

export const supabaseDraftStore: DraftStore = {
  async save(_userId, row) {
    const { error } = await (await db()).from('assessment_drafts').upsert(row, { onConflict: 'user_id' })
    return !error
  },
  async load(userId) {
    const { data, error } = await (await db())
      .from('assessment_drafts')
      .select('step_values, completed_steps, step_idx, client_saved_at, created_at, updated_at, expires_at')
      .eq('user_id', userId)
      .gt('expires_at', new Date().toISOString())
      .maybeSingle()
    if (error) return null
    return data ?? null
  },
  async remove(userId) {
    const { error } = await (await db()).from('assessment_drafts').delete().eq('user_id', userId)
    return !error
  },
  async newestAssessmentAt(userId) {
    // P1-06b: a quick check is not a newer full assessment, so it never makes a full-assessment draft stale (needs migration 20261116031000)
    const { data, error } = await skipQuick((await db())
      .from('assessments')
      .select('created_at')
      .eq('user_id', userId))
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error || !data?.created_at) return null
    const t = Date.parse(data.created_at as string)
    return Number.isFinite(t) ? t : null
  },
}
