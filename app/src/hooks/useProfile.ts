import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export interface SportEntitlement {
  sport: string
  status: string
  expires_at: string | null
}

export interface Profile {
  id: string
  email: string
  full_name: string | null
  portal_role: string
  subscription_status: string
  subscription_tier?: string
  /** Base (HQ) subscription status. Gates access to /dashboard/*. Set to 'active' only by the Stripe webhook. */
  base_status?: 'inactive' | 'active' | 'past_due' | 'canceled'
  base_stripe_subscription_id?: string
  base_expiry?: string
  platforms: string[]
  /** Slug of the sport this user is currently focused on (FK -> sport_config.sport). */
  active_sport: string
  /** Slugs of every sport this user can access. Mirrors platforms via DB trigger. */
  sports_enabled: string[]
  /** Per-sport add-on entitlements (BJJ, BodyBuilding, etc.). Each sport app manages its own dashboard. */
  sport_entitlements?: SportEntitlement[]
}

export interface Assessment {
  id: string
  user_id: string
  assessed_at: string
  hip_er_l: number | null
  hip_er_r: number | null
  hip_ir_l: number | null
  hip_ir_r: number | null
  hip_abd_l: number | null
  hip_abd_r: number | null
  hip_flex_l: number | null
  hip_flex_r: number | null
  shoulder_er_l: number | null
  shoulder_er_r: number | null
  shoulder_flex_l: number | null
  shoulder_flex_r: number | null
  ankle_df_l: number | null
  ankle_df_r: number | null
  lumbar_flex: number | null
  lumbar_ext: number | null
  cervical_rot_l: number | null
  cervical_rot_r: number | null
  cervical_lat_l: number | null
  cervical_lat_r: number | null
  cervical_flex: number | null
  cervical_ext: number | null
  thoracic_rot: number | null
  thoracic_rot_l: number | null
  thoracic_rot_r: number | null
  rom_total: number | null
  rom_percentile: number | null
  worst_joints: string[] | null
  red_flag_triggered: boolean
  red_flag_reasons: string[] | null
}

export function useProfile(userId: string | undefined) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [assessment, setAssessment] = useState<Assessment | null>(null)
  const [assessments, setAssessments] = useState<Assessment[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function load() {
      setLoading(true)

      // Use SECURITY DEFINER function - bypasses RLS entirely,
      // filters by auth.uid() server-side so it's still secure.
      const { data, error } = await supabase.rpc('get_my_profile')

      if (error) {
        console.error('get_my_profile error:', error.message)
        setLoading(false)
        return
      }

      const result = data as {
        profile: Profile | null
        assessment: Assessment | null
        assessments: Assessment[]
        sport_entitlements?: SportEntitlement[]
      }

      setProfile(
        result.profile
          ? { ...result.profile, sport_entitlements: result.sport_entitlements ?? result.profile.sport_entitlements ?? [] }
          : null,
      )
      setAssessment(result.assessment)
      setAssessments(result.assessments ?? [])
      setLoading(false)
    }

    load()
  }, [userId])

  return { profile, assessment, assessments, loading }
}
