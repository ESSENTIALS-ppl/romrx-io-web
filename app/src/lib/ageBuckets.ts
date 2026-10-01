/**
 * Age group options (Jim 2026-09-29: app minimum age 18+).
 * Adults only: no under-18 bucket anywhere (Signup, CompleteProfile, Settings).
 * Server side: public.users trigger + auth.users signup trigger reject '13-17'
 * (supabase/migrations/20260929041729_age_18_plus.sql). No extra UI copy; the
 * Terms of Service eligibility line covers the 18+ statement.
 */
export const AGE_BUCKETS = [
  { v: '18-29', l: '18 to 29' },
  { v: '30-44', l: '30 to 44' },
  { v: '45-59', l: '45 to 59' },
  { v: '60+', l: '60 and over' },
] as const

export type AgeBucket = (typeof AGE_BUCKETS)[number]['v']

/** Retired under-18 bucket value (kept only so old rows can be recognized). */
export const RETIRED_UNDER_18_BUCKETS = ['13-17'] as const

export function isAllowedAgeBucket(v: unknown): v is AgeBucket {
  return AGE_BUCKETS.some(b => b.v === v)
}
