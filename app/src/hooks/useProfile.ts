import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { JointScoreRow } from '../lib/mobilityBands'

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
  /** Research demographics (existing users columns; required by Settings / Layout gate). */
  gender?: string | null
  age_bucket?: string | null
  height_bucket?: string | null
  weight_bucket?: string | null
  marketing_opt_out?: boolean | null
  /** Base (HQ) subscription status. Gates /dashboard/*. Set 'active' by Stripe webhook or activate-beta-base (beta). */
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
  const [jointScores, setJointScores] = useState<JointScoreRow[]>([])
  const [sessionDates, setSessionDates] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!userId) return

    async function load() {
      setLoading(true)

      // Use SECURITY DEFINER / INVOKER RPC — bypasses or respects RLS via auth.uid().
      const [{ data, error }, sessionsRes] = await Promise.all([
        supabase.rpc('get_my_profile'),
        supabase
          .from('protocol_sessions')
          .select('session_date')
          .eq('user_id', userId)
          .order('session_date', { ascending: false })
          .limit(365),
      ])

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
      setSessionDates(
        (sessionsRes.data ?? [])
          .map((r: { session_date: string }) => r.session_date)
          .filter(Boolean),
      )

      // Shared scoring path with ROMBot: persisted joint_scores for latest assessment.
      // RLS: "joint_scores: athlete reads own" via assessments.user_id = auth.uid().
      if (result.assessment?.id) {
        const { data: scores, error: scoresErr } = await supabase
          .from('joint_scores')
          .select('joint_key, score, left_value, right_value, asymmetry_pct, asymmetry_flag')
          .eq('assessment_id', result.assessment.id)
        if (scoresErr) {
          console.error('joint_scores fetch error:', scoresErr.message)
          setJointScores([])
        } else {
          setJointScores((scores as JointScoreRow[]) ?? [])
        }
      } else {
        setJointScores([])
      }

      setLoading(false)
    }

    load()
  }, [userId])

  return { profile, assessment, assessments, jointScores, sessionDates, loading }
}
