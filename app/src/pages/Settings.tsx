import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import type { Assessment } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { Spinner } from '../components/Spinner'
import { FeedbackWidget } from '../components/FeedbackWidget'
import { cn } from '../lib/cn'
import {
  Save, Loader2, ExternalLink, LogOut, Mail, HelpCircle, ChevronRight,
  ClipboardList, TrendingUp, Bell, KeyRound, Trash2, MessageSquarePlus,
  CheckCircle2,
} from 'lucide-react'

const PORTAL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`

// PRS scoring mirror of MyBody.tsx / BJJ Settings for Assessment History rows
const PRS_BILATERAL = [
  { l: 'hip_er_l', r: 'hip_er_r', riskBelow: 40, normalMin: 40 },
  { l: 'hip_ir_l', r: 'hip_ir_r', riskBelow: 30, normalMin: 30 },
  { l: 'hip_abd_l', r: 'hip_abd_r', riskBelow: 30, normalMin: 40 },
  { l: 'hip_flex_l', r: 'hip_flex_r', riskBelow: 100, normalMin: 100 },
  { l: 'shoulder_er_l', r: 'shoulder_er_r', riskBelow: 60, normalMin: 60 },
  { l: 'shoulder_flex_l', r: 'shoulder_flex_r', riskBelow: 120, normalMin: 140 },
  { l: 'ankle_df_l', r: 'ankle_df_r', riskBelow: 10, normalMin: 10 },
  { l: 'cervical_lat_l', r: 'cervical_lat_r', riskBelow: 30, normalMin: 40 },
]
const PRS_UNILATERAL = [
  { key: 'lumbar_flex', riskBelow: 40, normalMin: 40 },
  { key: 'lumbar_ext', riskBelow: 15, normalMin: 20 },
  { key: 'cervical_flex', riskBelow: 35, normalMin: 45 },
  { key: 'cervical_ext', riskBelow: 40, normalMin: 55 },
]

function computePRS(a: Assessment): number {
  let score = 100
  const rec = a as unknown as Record<string, number | null>
  for (const j of PRS_BILATERAL) {
    const l = rec[j.l], r = rec[j.r]
    if (l != null && r != null) {
      const minVal = Math.min(l, r)
      const gap = Math.abs(l - r)
      if (minVal < j.riskBelow) score -= 8
      else if (minVal < j.normalMin) score -= 4
      if (gap >= 15) score -= 6
      else if (gap >= 8) score -= 3
    }
  }
  for (const j of PRS_UNILATERAL) {
    const v = rec[j.key]
    if (v != null) {
      if (v < j.riskBelow) score -= 6
      else if (v < j.normalMin) score -= 3
    }
  }
  return Math.max(0, Math.min(100, Math.round(score)))
}

function getPRSTier(s: number) {
  if (s >= 85) return { label: 'ELITE', color: 'text-cobalt', bg: 'bg-cobalt-light' }
  if (s >= 70) return { label: 'STRONG', color: 'text-cobalt', bg: 'bg-cobalt-light' }
  if (s >= 55) return { label: 'DEVELOPING', color: 'text-amber-700', bg: 'bg-amber-50' }
  if (s >= 40) return { label: 'RESTRICTED', color: 'text-amber-700', bg: 'bg-amber-50' }
  return { label: 'AT RISK', color: 'text-red-700', bg: 'bg-red-50' }
}

const GENDERS = [
  { v: 'male', l: 'Male' },
  { v: 'female', l: 'Female' },
  { v: 'other', l: 'Other' },
  { v: 'prefer_not_to_say', l: 'Prefer not to say' },
] as const

const AGE_BUCKETS = [
  { v: '13-17', l: '13 to 17' },
  { v: '18-29', l: '18 to 29' },
  { v: '30-44', l: '30 to 44' },
  { v: '45-59', l: '45 to 59' },
  { v: '60+', l: '60 and over' },
] as const

const HEIGHT_BUCKETS = [
  { v: 'under_5_0', l: "Under 5'0\"" },
  { v: '5_0_5_3', l: "5'0\" to 5'3\"" },
  { v: '5_4_5_7', l: "5'4\" to 5'7\"" },
  { v: '5_8_5_11', l: "5'8\" to 5'11\"" },
  { v: '6_0_6_3', l: "6'0\" to 6'3\"" },
  { v: '6_4_plus', l: "6'4\" and over" },
] as const

const WEIGHT_BUCKETS = [
  { v: 'under_120', l: 'Under 120 lb' },
  { v: '120_149', l: '120 to 149 lb' },
  { v: '150_179', l: '150 to 179 lb' },
  { v: '180_209', l: '180 to 209 lb' },
  { v: '210_239', l: '210 to 239 lb' },
  { v: '240_269', l: '240 to 269 lb' },
  { v: '270_plus', l: '270 lb and over' },
] as const

type ExtProfile = {
  gender?: string | null
  age_bucket?: string | null
  height_bucket?: string | null
  weight_bucket?: string | null
  marketing_opt_out?: boolean | null
}

export function Settings() {
  const { user, session, signOut } = useAuth()
  const { profile, loading } = useProfile(user?.id)
  const ext = profile as unknown as ExtProfile | null
  const browserTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    [],
  )

  // Profile state
  const [fullName, setFullName] = useState('')
  const [gender, setGender] = useState<string>('')
  const [ageBucket, setAgeBucket] = useState<string>('')
  const [heightBucket, setHeightBucket] = useState<string>('')
  const [weightBucket, setWeightBucket] = useState<string>('')
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileSaved, setProfileSaved] = useState(false)
  const [profileErr, setProfileErr] = useState('')

  // Assessment history (full list, not the recent-4 useProfile cap)
  const [history, setHistory] = useState<Assessment[]>([])
  const [historyLoading, setHistoryLoading] = useState(false)

  // Subscription / billing
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalErr, setPortalErr] = useState('')

  // Notifications
  const [notifLoading, setNotifLoading] = useState(true)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)
  const [notifErr, setNotifErr] = useState('')
  const [marketingOptOut, setMarketingOptOut] = useState(false)
  const [retestReminders, setRetestReminders] = useState(true)
  const [weeklyDigest, setWeeklyDigest] = useState(false)
  const [emailReminders, setEmailReminders] = useState(true)
  const [pushReminders, setPushReminders] = useState(false)
  const [reminderTime, setReminderTime] = useState('07:00')

  // Account
  const [newPassword, setNewPassword] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwSaving, setPwSaving] = useState(false)
  const [pwMsg, setPwMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null)

  // Delete modal
  const [showDelete, setShowDelete] = useState(false)
  const [deleteText, setDeleteText] = useState('')
  const [deleting, setDeleting] = useState(false)

  // ── Hydrate profile fields ─────────────────────────────────────────────
  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name)
    if (ext?.gender) setGender(ext.gender)
    if (ext?.age_bucket) setAgeBucket(ext.age_bucket)
    if (ext?.height_bucket) setHeightBucket(ext.height_bucket)
    if (ext?.weight_bucket) setWeightBucket(ext.weight_bucket)
    if (ext?.marketing_opt_out != null) setMarketingOptOut(!!ext.marketing_opt_out)
  }, [profile, ext])

  // ── Load full assessment history ───────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    setHistoryLoading(true)
    supabase.from('assessments')
      .select('*')
      .eq('user_id', user.id)
      .order('assessed_at', { ascending: false })
      .then(({ data }) => {
        setHistory((data ?? []) as Assessment[])
        setHistoryLoading(false)
      })
  }, [user?.id])

  // ── Load notification prefs ────────────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    setNotifLoading(true)
    supabase.from('notification_preferences')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setEmailReminders(!!data.email_reminders)
          setPushReminders(!!data.push_reminders)
          setReminderTime(data.reminder_time ?? '07:00')
          setRetestReminders(data.retest_reminders !== false)
          setWeeklyDigest(!!data.weekly_digest)
        }
        setNotifLoading(false)
      })
  }, [user?.id])

  // ── Save Profile ───────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user) return
    setProfileSaving(true); setProfileSaved(false); setProfileErr('')

    const userUpdate: Record<string, unknown> = { full_name: fullName || null }
    if (gender) userUpdate.gender = gender
    if (ageBucket) userUpdate.age_bucket = ageBucket
    if (heightBucket) userUpdate.height_bucket = heightBucket
    if (weightBucket) userUpdate.weight_bucket = weightBucket

    const { error: uErr } = await supabase.from('users').update(userUpdate).eq('id', user.id)
    setProfileSaving(false)
    if (uErr) {
      setProfileErr(uErr.message)
      return
    }
    setProfileSaved(true)
    setTimeout(() => setProfileSaved(false), 2000)
  }

  // ── Manage billing ─────────────────────────────────────────────────────
  const handleManageBilling = async () => {
    if (!session) return
    setPortalLoading(true); setPortalErr('')
    try {
      const res = await fetch(PORTAL_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ user_id: user?.id }),
      })
      const { url, error: err } = await res.json()
      if (url) { window.location.href = url; return }
      setPortalErr(err ?? 'Could not open billing portal.')
    } catch {
      setPortalErr('Something went wrong. Please try again.')
    } finally {
      setPortalLoading(false)
    }
  }

  // ── Save notifications ─────────────────────────────────────────────────
  const handleSaveNotifications = async () => {
    if (!user) return
    setNotifSaving(true); setNotifSaved(false); setNotifErr('')

    const { error: mErr } = await supabase.from('users')
      .update({ marketing_opt_out: marketingOptOut })
      .eq('id', user.id)
    if (mErr) { setNotifErr(mErr.message); setNotifSaving(false); return }

    const { error: nErr } = await supabase.from('notification_preferences').upsert({
      user_id: user.id,
      email_reminders: emailReminders,
      push_reminders: pushReminders,
      reminder_time: reminderTime,
      timezone: browserTimezone,
      retest_reminders: retestReminders,
      weekly_digest: weeklyDigest,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })

    setNotifSaving(false)
    if (nErr) { setNotifErr(nErr.message); return }
    setNotifSaved(true)
    setTimeout(() => setNotifSaved(false), 2000)
  }

  // ── Change password ────────────────────────────────────────────────────
  const handleChangePassword = async () => {
    if (!newPassword) return
    setPwMsg(null)
    if (newPassword.length < 8) {
      setPwMsg({ type: 'err', text: 'Password must be at least 8 characters.' })
      return
    }
    if (newPassword !== confirmPw) {
      setPwMsg({ type: 'err', text: 'Passwords do not match.' })
      return
    }
    setPwSaving(true)
    const { error } = await supabase.auth.updateUser({ password: newPassword })
    setPwSaving(false)
    if (error) {
      setPwMsg({ type: 'err', text: error.message })
      return
    }
    setPwMsg({ type: 'ok', text: 'Password updated.' })
    setNewPassword('')
    setConfirmPw('')
  }

  // ── Delete account ─────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!user || deleteText !== 'DELETE') return
    setDeleting(true)
    try {
      // Soft-signal via feedback + sign out. Actual hard delete is a support-mediated action.
      await supabase.functions.invoke('submit-feedback', {
        body: {
          category: 'general',
          message: `Account deletion requested by ${user.email} (id: ${user.id})`,
          sport: 'base',
          page_url: '/settings',
        },
      })
      await signOut()
      window.location.href = '/'
    } finally {
      setDeleting(false)
    }
  }

  if (loading) return <Spinner />

  return (
    <>
      <div className="space-y-5 pb-16">
        <PageHeader title="Settings" subtitle="Manage your profile, subscription, notifications, and account" />

        {/* ── PROFILE ────────────────────────────────────────────────── */}
        <SectionCard title="Profile">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Full name</label>
              <input type="text" value={fullName} onChange={e => setFullName(e.target.value)} className="input" />
            </div>

            <div>
              <p className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Gender</p>
              <div className="flex gap-2 flex-wrap">
                {GENDERS.map(g => (
                  <button
                    key={g.v}
                    type="button"
                    onClick={() => setGender(g.v)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-xs font-semibold transition-colors',
                      gender === g.v
                        ? 'bg-cobalt text-white'
                        : 'bg-white text-cobalt-ink border border-slate-200 hover:bg-slate-50',
                    )}
                  >
                    {g.l}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Age group</label>
                <select value={ageBucket} onChange={e => setAgeBucket(e.target.value)} className="input">
                  <option value="">Select...</option>
                  {AGE_BUCKETS.map(b => (<option key={b.v} value={b.v}>{b.l}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Height</label>
                <select value={heightBucket} onChange={e => setHeightBucket(e.target.value)} className="input">
                  <option value="">Select...</option>
                  {HEIGHT_BUCKETS.map(b => (<option key={b.v} value={b.v}>{b.l}</option>))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Weight</label>
                <select value={weightBucket} onChange={e => setWeightBucket(e.target.value)} className="input">
                  <option value="">Select...</option>
                  {WEIGHT_BUCKETS.map(b => (<option key={b.v} value={b.v}>{b.l}</option>))}
                </select>
              </div>
            </div>

            {profileErr && <p className="text-xs text-red-700 bg-red-50 rounded-card px-3 py-2">{profileErr}</p>}
            <button onClick={handleSaveProfile} disabled={profileSaving} className="btn-primary text-sm flex items-center gap-1.5">
              {profileSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {profileSaved ? 'Saved' : 'Save profile'}
            </button>
          </div>
        </SectionCard>

        {/* ── ACCOUNT (email + password) ─────────────────────────────── */}
        <SectionCard title="Account">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Email</label>
              <input type="email" value={profile?.email ?? user?.email ?? ''} disabled className="input opacity-60" />
            </div>

            <div className="border-t border-slate-200 pt-4 space-y-3">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1.5">
                <KeyRound size={12} /> Change password
              </p>
              <input type="password" value={newPassword} onChange={e => setNewPassword(e.target.value)} placeholder="New password" className="input" />
              <input type="password" value={confirmPw} onChange={e => setConfirmPw(e.target.value)} placeholder="Confirm new password" className="input" />
              {pwMsg && (
                <p className={cn('text-xs font-medium flex items-center gap-1.5', pwMsg.type === 'ok' ? 'text-cobalt' : 'text-red-700')}>
                  {pwMsg.type === 'ok' && <CheckCircle2 size={12} />}
                  {pwMsg.text}
                </p>
              )}
              <button onClick={handleChangePassword} disabled={pwSaving || !newPassword} className="btn-primary text-sm flex items-center gap-1.5 disabled:opacity-50">
                {pwSaving ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                {pwSaving ? 'Updating...' : 'Update password'}
              </button>
            </div>

            <div className="border-t border-slate-200 pt-4">
              <button
                onClick={() => signOut()}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-card bg-white border border-slate-200 text-sm font-medium text-cobalt-ink hover:bg-slate-50 transition-colors"
              >
                <LogOut size={15} className="text-slate-500 shrink-0" />
                <span className="flex-1 text-left">Sign out</span>
                <ChevronRight size={14} className="text-slate-500" />
              </button>
            </div>
          </div>
        </SectionCard>

        {/* ── SUBSCRIPTION ─────────────────────────────────────────── */}
        <SectionCard title="Subscription">
          <div className="space-y-3">
            <div className="flex justify-between items-center py-2 border-b border-cobalt/10">
              <span className="text-sm text-slate-500">Base plan</span>
              <span className="text-sm font-semibold text-cobalt-ink capitalize">{profile?.base_status ?? 'inactive'}</span>
            </div>
            {profile?.sport_entitlements && profile.sport_entitlements.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sport packs</p>
                {profile.sport_entitlements.map(e => (
                  <div key={e.sport} className="flex justify-between items-center py-1.5">
                    <span className="text-sm text-cobalt-ink capitalize">{e.sport}</span>
                    <span className="text-xs font-bold bg-cobalt-light text-cobalt px-2 py-0.5 rounded-full capitalize">{e.status}</span>
                  </div>
                ))}
              </div>
            )}
            {portalErr && <p className="text-xs text-red-700 bg-red-50 rounded-card px-3 py-2">{portalErr}</p>}
            <button onClick={handleManageBilling} disabled={portalLoading} className="btn-ghost text-sm flex items-center gap-1.5">
              {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
              Manage billing
            </button>
          </div>
        </SectionCard>

        {/* ── ASSESSMENT HISTORY ─────────────────────────────────── */}
        <SectionCard title="Assessment History">
          <div className="mb-1">
            <p className="text-xs text-slate-500">Your past ROM snapshots</p>
          </div>

          {historyLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 size={18} className="animate-spin text-cobalt" />
            </div>
          ) : history.length === 0 ? (
            <div className="text-center py-6">
              <ClipboardList size={28} className="mx-auto text-slate-400 mb-2" />
              <p className="text-sm text-slate-500 mb-2">No assessments on file yet.</p>
              <Link to="/onboarding/assessment" className="inline-block text-sm font-semibold text-cobalt hover:underline">
                Take your first assessment
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {history.map((a, i) => {
                const prs = computePRS(a)
                const tier = getPRSTier(prs)
                return (
                  <div key={a.id} className="flex items-center justify-between py-3 first:pt-0 last:pb-0">
                    <div className="flex items-center gap-3">
                      <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', tier.bg)}>
                        <span className={cn('font-display font-bold text-sm leading-none', tier.color)}>{prs}</span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-cobalt-ink">
                          {new Date(a.assessed_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                        <p className={cn('text-xs font-bold', tier.color)}>{tier.label}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      {i === 0 && (
                        <span className="text-xs bg-cobalt-light text-cobalt px-2 py-0.5 rounded-full font-semibold">
                          Latest
                        </span>
                      )}
                      <Link to="/onboarding/assessment" className="flex items-center gap-1 text-xs font-semibold text-cobalt hover:underline">
                        <TrendingUp size={12} />
                        Retest
                      </Link>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </SectionCard>

        {/* ── NOTIFICATIONS ──────────────────────────────────────── */}
        <SectionCard title="Notifications">
          {notifLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 size={14} className="animate-spin text-cobalt" />
              <span className="text-sm text-slate-500">Loading preferences...</span>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Timezone</p>
                <span className="text-xs font-medium text-cobalt-ink bg-cobalt-light px-2.5 py-1 rounded-full">{browserTimezone}</span>
              </div>

              <ToggleRow
                title="Email product updates"
                subtitle="Occasional emails about new features and tips"
                checked={!marketingOptOut}
                onChange={v => setMarketingOptOut(!v)}
              />

              <ToggleRow
                title="Retest reminders"
                subtitle="Prompt to retake your assessment every 42 days"
                checked={retestReminders}
                onChange={setRetestReminders}
              />

              <ToggleRow
                title="Weekly progress digest"
                subtitle="Sunday summary of PRS trend and streak"
                checked={weeklyDigest}
                onChange={setWeeklyDigest}
              />

              <div className="space-y-3 border-t border-slate-200 pt-4">
                <ToggleRow
                  title="Email reminders"
                  subtitle="Get an email on your protocol days"
                  checked={emailReminders}
                  onChange={setEmailReminders}
                />
                {emailReminders && (
                  <div className="flex items-center gap-3 pl-1">
                    <label className="text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">
                      Reminder time
                    </label>
                    <input
                      type="time"
                      value={reminderTime}
                      onChange={e => setReminderTime(e.target.value)}
                      className="input max-w-[8rem]"
                    />
                    <span className="text-xs text-slate-500">({browserTimezone})</span>
                  </div>
                )}
              </div>

              <ToggleRow
                title="Push notifications"
                subtitle="Browser push alerts (must allow in your browser)"
                checked={pushReminders}
                onChange={setPushReminders}
                icon={<Bell size={14} className="text-slate-500" />}
              />

              {notifErr && <p className="text-xs text-red-700 bg-red-50 rounded-card px-3 py-2">{notifErr}</p>}

              <button onClick={handleSaveNotifications} disabled={notifSaving} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50">
                {notifSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {notifSaved ? 'Saved' : 'Save notification settings'}
              </button>
            </div>
          )}
        </SectionCard>

        {/* ── SUPPORT ────────────────────────────────────────────── */}
        <SectionCard title="Support">
          <div className="space-y-2">
            <a
              href="mailto:hello@romrx.io"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-card bg-white border border-slate-200 text-sm font-medium text-cobalt-ink hover:bg-slate-50 transition-colors"
            >
              <Mail size={15} className="text-cobalt shrink-0" />
              <span className="flex-1">
                Email us
                <span className="block text-xs text-slate-500 font-normal mt-0.5">hello@romrx.io</span>
              </span>
              <ChevronRight size={14} className="text-slate-500" />
            </a>
            <a
              href="mailto:hello@romrx.io?subject=ROMRx%20HQ%20Question"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-card bg-white border border-slate-200 text-sm font-medium text-cobalt-ink hover:bg-slate-50 transition-colors"
            >
              <HelpCircle size={15} className="text-cobalt shrink-0" />
              <span className="flex-1">Questions and help</span>
              <ChevronRight size={14} className="text-slate-500" />
            </a>
            <a
              href="/legal"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-card bg-white border border-slate-200 text-sm font-medium text-cobalt-ink hover:bg-slate-50 transition-colors"
            >
              <ExternalLink size={15} className="text-cobalt shrink-0" />
              <span className="flex-1">
                Terms of Service and Privacy Policy
                <span className="block text-xs text-slate-500 font-normal mt-0.5">romrx.io/legal</span>
              </span>
              <ChevronRight size={14} className="text-slate-500" />
            </a>
          </div>
        </SectionCard>

        {/* ── FEEDBACK ───────────────────────────────────────────── */}
        <SectionCard title="Send feedback">
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
            <MessageSquarePlus size={14} className="text-cobalt" />
            Found a bug or have an idea? Your account is attached automatically.
          </div>
          <FeedbackWidget />
        </SectionCard>

        {/* ── DANGER ZONE ────────────────────────────────────────── */}
        <SectionCard title="Danger zone">
          <button
            onClick={() => setShowDelete(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-card bg-red-50 border border-red-200 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            <Trash2 size={15} className="shrink-0" />
            <span className="flex-1 text-left">
              Delete account
              <span className="block text-xs font-normal mt-0.5 opacity-70">Closes your account and cancels access</span>
            </span>
            <ChevronRight size={14} />
          </button>
        </SectionCard>
      </div>

      {/* ── DELETE MODAL ─────────────────────────────────────── */}
      {showDelete && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4 pb-4 sm:pb-0">
          <div className="bg-white rounded-card p-6 w-full max-w-sm shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-red-50 flex items-center justify-center shrink-0">
                <Trash2 size={16} className="text-red-700" />
              </div>
              <h3 className="font-display font-bold text-lg text-cobalt-ink">Delete account</h3>
            </div>
            <p className="text-sm text-slate-500 leading-relaxed">
              This closes your account and cancels your access. Aggregated data may be retained for legal, security, and analytics purposes.
              Type <span className="font-bold text-cobalt-ink">DELETE</span> to confirm.
            </p>
            <input
              type="text"
              value={deleteText}
              onChange={e => setDeleteText(e.target.value)}
              placeholder="Type DELETE"
              className="input"
            />
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => { setShowDelete(false); setDeleteText('') }}
                className="btn-ghost flex-1 text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleteText !== 'DELETE' || deleting}
                className="flex-1 px-4 py-2.5 rounded-card bg-red-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
              >
                {deleting && <Loader2 size={14} className="animate-spin" />}
                {deleting ? 'Submitting...' : 'Request delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ── Toggle row primitive ──────────────────────────────────────────────
function ToggleRow({
  title, subtitle, checked, onChange, icon,
}: {
  title: string
  subtitle?: string
  checked: boolean
  onChange: (v: boolean) => void
  icon?: React.ReactNode
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="flex items-start gap-2">
        {icon}
        <div>
          <p className="text-sm font-medium text-cobalt-ink">{title}</p>
          {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
      </div>
      <button
        role="switch"
        aria-checked={checked}
        aria-label={title}
        onClick={() => onChange(!checked)}
        className={cn(
          'relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-cobalt focus:ring-offset-2',
          checked ? 'bg-cobalt' : 'bg-slate-300',
        )}
      >
        <span
          className={cn(
            'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform',
            checked ? 'translate-x-6' : 'translate-x-1',
          )}
        />
      </button>
    </div>
  )
}

