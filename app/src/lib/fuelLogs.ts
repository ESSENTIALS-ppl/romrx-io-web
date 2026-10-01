// Persist My Fuel calculator captures to public.fuel_logs (per-user must-track).
// Fire-and-forget from UI; never throws into the calculator flow.
import { supabase } from './supabase'

export type FuelKind = 'nutrition' | 'hydration'

export async function saveFuelLog(
  userId: string,
  kind: FuelKind,
  inputs: Record<string, unknown>,
  outputs: Record<string, unknown>,
): Promise<{ id?: string; error?: string }> {
  const { data, error } = await supabase
    .from('fuel_logs')
    .insert({
      user_id: userId,
      kind,
      inputs,
      outputs,
    })
    .select('id')
    .single()
  if (error) return { error: error.message }
  return { id: data?.id as string | undefined }
}

/** Latest body inputs from any recent fuel_log for this user (prefills Step 1). */
export async function loadLatestFuelBody(userId: string): Promise<Record<string, unknown> | null> {
  const { data, error } = await supabase
    .from('fuel_logs')
    .select('inputs, kind, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(5)
  if (error || !data?.length) return null
  for (const row of data) {
    const body = (row.inputs as { body?: Record<string, unknown> } | null)?.body
    if (body && typeof body === 'object') return body
  }
  return null
}
