import { useState, useEffect, useMemo, useRef } from 'react'
import { loadHipScoredIds, useHipFlexCutover } from '../lib/hipFlexCutover'
import { gateAssessment } from '../lib/hipFlexGate'
import { Link } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import type { Assessment } from '../hooks/useProfile'
import { supabase } from '../lib/supabase'
import { SHOW_MARKETING_TOGGLE } from '../lib/marketingToggle'
import { SETTINGS_REMINDER_COPY as R, PRIVACY_URL, friendlyTimeZone } from '../lib/reminderCopy'
import { toWholeHour, reminderStateFromRow, saveReminderChanges, NO_REMINDERS, type ReminderState } from '../lib/reminderOptIn'
import { loadDeletionStatus, DELETION_STATUS_COPY, type DeletionStatus } from '../lib/deletionStatus'
import { requestMyDataExport, saveJsonDownload, exportErrorCopy, EXPORT_BUTTON_LABEL } from '../lib/exportMyData'
import { YOUR_DATA_COPY as YD, PLAN_LINE_INDEX, dialogLines } from '../lib/yourDataCopy'
import { enablePush, disablePush, makePushPost, hasLivePushSubscription } from '../lib/pushSubscribe'
import { PUSH_COPY, pushMessageFor } from '../lib/pushCopy'
import { ADD_TO_CALENDAR_COPY as CAL, fetchCalendarIcs, saveIcsDownload } from '../lib/addToCalendar'
import { PageHeader } from '../components/PageHeader'
import { SectionCard } from '../components/SectionCard'
import { Spinner } from '../components/Spinner'
import { FeedbackWidget } from '../components/FeedbackWidget'
import { AdsMeasurementSettings } from '../components/AdsMeasurementSettings'
import { MoodSettings } from '../components/MoodSettings'
import { CrisisHelp } from '../components/CrisisLine'
import { cn } from '../lib/cn'
import {
  fetchCancelStatus, openCancelFlow, CANCEL_BUTTON_LABEL, CANCEL_BASE_CASCADE_NOTE, type CancelStatus,
  EMPTY_CANCEL_STATUS, canceledMessage, statusLabel,
} from '../lib/cancelSubscription'
import { withStripeTestFlag } from '../lib/stripeTestMode'
import {
  requestAccountDeletion, deletionErrorCopy, DELETION_BUTTON_LABEL, DELETION_SUCCESS_COPY, deletionSiteForHost,
} from '../lib/accountDeletionRequest'
import { bandFull, formatScoreBand, mobilityScoreForAssessment, overallBandForAssessment, BAND_TONE, type BandScore } from '../lib/mobilityBands'
import {
  Save, Loader2, ExternalLink, LogOut, Mail, HelpCircle, ChevronRight,
  ClipboardList, TrendingUp, Bell, Calendar, KeyRound, Trash2, MessageSquarePlus,
  CheckCircle2, XCircle,
} from 'lucide-react'
import { AGE_BUCKETS, isAllowedAgeBucket } from '../lib/ageBuckets'
import { skipQuick } from '../lib/assessmentReads'

const PORTAL_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/create-portal-session`

function getBandTier(band: BandScore) {
  // Locked Base bands via lib/mobilityBands (single source of truth)
  const tone = BAND_TONE[band]
  return { label: bandFull(band), color: tone.color, bg: tone.bg }
}

const GENDERS = [
  { v: 'male', l: 'Male' },
  { v: 'female', l: 'Female' },
  { v: 'other', l: 'Other' },
  { v: 'prefer_not_to_say', l: 'Prefer not to say' },
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

// P1-01 (Jim L1031, D1): the notification section and the three reminder toggles are shown. Each toggle still loads OFF
// unless the database holds toggle AND server-set opt-in marker (reminderStateFromRow); nothing here opts anyone in.
const SHOW_REMINDER_TOGGLES = true
const SHOW_NOTIFICATIONS = true
// FG-12 / P1-14: push toggle shown (r10, Grant Nov 17). Words: PUSH_COPY (Stacy 666e6603; deviceLimit Stacy 3f9a069f).
// Opt-in only: the toggle starts OFF, and nothing prompts or subscribes on load. Notification.requestPermission and
// pushManager.subscribe run only inside enablePush, which is called only from handlePushToggle(true) after a tap.
// Needs VITE_VAPID_PUBLIC_KEY at build time; without it a tap fails quietly (no_key). Settings.pushFlag.test.tsx fails if this is false.
const SHOW_PUSH = true
// FG-13: "Export my data". Jim's "go on all 31" (ledger L1229); Stacy cleared the words (007f8638, 2529bbfa).
const SHOW_EXPORT_MY_DATA = true // P1-23 unhide (Grant, Nov 16 r3). SHOW_DELETION_STATUS stays false.
// FG-21: show the deletion request status (new copy, NEEDS JIM WORDING). Off: nothing is read or shown.
const SHOW_DELETION_STATUS = false
// P1-12: "Add to my calendar" (.ics download). r9 turns it on (Grant, Nov 16). Settings.calendarFlag.test.tsx fails if this is false.
const SHOW_CALENDAR_ICS = true
// FG-22: gender, height and weight are saved but unused. Hide the fields. The data model and saved values stay.
const SHOW_GENDER_HEIGHT_WEIGHT = false
// FG-23: no metric/imperial control exists in Base Settings (values are in degrees). Off so one is not added un-gated. No new copy.
const SHOW_UNITS = false

export function Settings() {
  const { user, session, signOut } = useAuth()
  const { profile, loading } = useProfile(user?.id)
  const ext = profile as unknown as ExtProfile | null
  const browserTimezone = useMemo(
    () => Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
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
  const [rawHistory, setHistory] = useState<Assessment[]>([])
  const cutover = useHipFlexCutover() // FG-36
  const [hipScoredIds, setHipScoredIds] = useState<ReadonlySet<string>>(new Set()) // L937: a hip flexion score shows whatever the date
  const history = useMemo(() => rawHistory.map(a => gateAssessment(a, hipScoredIds)), [rawHistory, cutover, hipScoredIds]) // eslint-disable-line react-hooks/exhaustive-deps
  const [historyLoading, setHistoryLoading] = useState(false)

  // Subscription / billing
  const [portalLoading, setPortalLoading] = useState(false)
  const [portalErr, setPortalErr] = useState('')
  const [cancelStatus, setCancelStatus] = useState<CancelStatus>(EMPTY_CANCEL_STATUS)
  const [cancelStatusLoading, setCancelStatusLoading] = useState(true)
  const [cancelLoading, setCancelLoading] = useState<string | null>(null)

  // Notifications
  const [notifLoading, setNotifLoading] = useState(true)
  const [notifSaving, setNotifSaving] = useState(false)
  const [notifSaved, setNotifSaved] = useState(false)
  const [notifErr, setNotifErr] = useState('')
  const [marketingOptOut, setMarketingOptOut] = useState(false)
  const [retestReminders, setRetestReminders] = useState(false)
  const [weeklyDigest, setWeeklyDigest] = useState(false)
  const [emailReminders, setEmailReminders] = useState(false)
  // P1-14 r10: pushReminders is what the toggle shows on THIS device: ON only when the account has push_reminders = true AND this
  // browser has a live subscription (read-only check, no prompt). pushPref is the account value the form saves (off stays account-wide).
  const [pushReminders, setPushReminders] = useState(false)
  const [pushPref, setPushPref] = useState(false)
  const [pushMsg, setPushMsg] = useState<string | null>(null)
  const [calendarMsg, setCalendarMsg] = useState<string | null>(null)
  const [calendarBusy, setCalendarBusy] = useState(false)
  const [exportBusy, setExportBusy] = useState(false)
  const [exportErr, setExportErr] = useState<string | null>(null)
  const [exportDone, setExportDone] = useState(false) // P1-23: Stacy's success line after a download
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
  const [deleteDone, setDeleteDone] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)
  const [deleteAlreadyOpen, setDeleteAlreadyOpen] = useState(false) // P1-23: function said a request is already open
  const deleteInFlight = useRef(false)
  const [deletionStatus, setDeletionStatus] = useState<DeletionStatus | null>(null)
  // What the database holds for the three reminder switches (ON = toggle AND server-set opt-in marker). Save only calls set_reminder_opt_in for switches that changed.
  const reminderBaseline = useRef<ReminderState>(NO_REMINDERS)

  // ── Hydrate profile fields ─────────────────────────────────────────────
  useEffect(() => {
    if (profile?.full_name) setFullName(profile.full_name)
    if (ext?.gender) setGender(ext.gender)
    if (isAllowedAgeBucket(ext?.age_bucket)) setAgeBucket(ext.age_bucket)
    if (ext?.height_bucket) setHeightBucket(ext.height_bucket)
    if (ext?.weight_bucket) setWeightBucket(ext.weight_bucket)
    if (ext?.marketing_opt_out != null) setMarketingOptOut(!!ext.marketing_opt_out)
  }, [profile, ext])

  // ── Load full assessment history ───────────────────────────────────────
  useEffect(() => {
    if (!user?.id) return
    setHistoryLoading(true)
    // P1-06b: skip quick-check rows (needs migration 20261116031000)
    skipQuick(supabase.from('assessments')
      .select('*')
      .eq('user_id', user.id))
      .order('assessed_at', { ascending: false })
      .then(async ({ data }) => {
        const rows = (data ?? []) as Assessment[]
        setHipScoredIds(await loadHipScoredIds(rows.map(r => r.id)))
        setHistory(rows)
        setHistoryLoading(false)
      })
  }, [user?.id])

  // ── Cancel subscription: server says which subscriptions are active, canceling, or canceled ──
  // Re-read after the portal sends the user back with ?canceled=1 (webhook may land a moment later).
  useEffect(() => {
    if (!user?.id) return
    let alive = true
    const load = () => fetchCancelStatus((name, opts) => supabase.functions.invoke(name, opts))
      .then(st => { if (alive) { setCancelStatus(st); setCancelStatusLoading(false) } })
    load()
    const cameBack = typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('canceled') === '1'
    const timers = cameBack ? [setTimeout(load, 3000), setTimeout(load, 8000)] : []
    return () => { alive = false; timers.forEach(clearTimeout) }
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
          const shown = reminderStateFromRow(data)
          reminderBaseline.current = shown
          setEmailReminders(shown.protocol)
          const savedPush = !!data.push_reminders
          setPushPref(savedPush)
          setPushReminders(false) // a saved true alone renders OFF
          if (SHOW_PUSH && savedPush) void hasLivePushSubscription().then(live => setPushReminders(live))
          setReminderTime(toWholeHour((data.reminder_time ?? '07:00').slice(0, 5)))
          setRetestReminders(shown.retest)
          setWeeklyDigest(shown.digest)
        }
        setNotifLoading(false)
      })
  }, [user?.id])

  // ── Save Profile ───────────────────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!user) return
    setProfileSaving(true); setProfileSaved(false); setProfileErr('')

    const userUpdate: Record<string, unknown> = { full_name: fullName || null }
    userUpdate.gender = gender || null
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
        body: JSON.stringify(withStripeTestFlag({ user_id: user?.id })),
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

  // ── Cancel subscription (Stripe portal, straight to the cancel screen) ──
  const handleCancelSubscription = async (target: string) => {
    if (!session) return
    setCancelLoading(target); setPortalErr('')
    const result = await openCancelFlow((name, opts) => supabase.functions.invoke(name, opts), target)
    if (result.ok) { window.location.href = result.url; return }
    setCancelLoading(null)
    setPortalErr('Could not open billing portal.')
  }

  // ── FG-21: deletion request status (only when SHOW_DELETION_STATUS) ──
  useEffect(() => {
    if (!SHOW_DELETION_STATUS || !user?.id) return
    let live = true
    loadDeletionStatus((t) => supabase.from(t) as never).then((st) => { if (live) setDeletionStatus(st) })
    return () => { live = false }
  }, [user?.id, deleteDone])

  // ── P1-12: web-only .ics download (no native calendar). Ships with calendar-ics on 47aad435. ──
  const handleAddToCalendar = async () => {
    if (!SHOW_CALENDAR_ICS) return // P1-12 flag off: no request to calendar-ics, no error line
    if (!session?.access_token) { setCalendarMsg(CAL.error); return }
    setCalendarBusy(true)
    setCalendarMsg(null)
    const res = await fetchCalendarIcs({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      accessToken: session.access_token,
    })
    if (res.ok) saveIcsDownload(res.filename, res.ics)
    else setCalendarMsg(CAL.error)
    setCalendarBusy(false)
  }

  // ── Save notifications ─────────────────────────────────────────────────
  const handleSaveNotifications = async () => {
    if (!user) return
    setNotifSaving(true); setNotifSaved(false); setNotifErr('')

    const { error: mErr } = await supabase.from('users')
      .update({ marketing_opt_out: marketingOptOut })
      .eq('id', user.id)
    if (mErr) { setNotifErr(R.error); setNotifSaving(false); return }

    const { error: nErr } = await supabase.from('notification_preferences').upsert({
      user_id: user.id,
      push_reminders: pushPref, // account value: a device that never subscribed does not turn push off for the account
      reminder_time: toWholeHour(reminderTime), // hour only: the sender ignores minutes (Stacy note 3b)
      timezone: browserTimezone,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' })
    if (nErr) { setNotifSaving(false); setNotifErr(R.error); return }

    // The three email reminder switches go through set_reminder_opt_in (the only way an opt-in marker is set); a plain save can never opt anyone in.
    const rem = await saveReminderChanges(
      (fn, args) => supabase.rpc(fn, args),
      reminderBaseline.current,
      { retest: retestReminders, protocol: emailReminders, digest: weeklyDigest },
    )
    reminderBaseline.current = rem.applied
    setNotifSaving(false)
    if (!rem.ok) { setNotifErr(R.error); return }
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

  // ── Export my data (FG-13, hidden behind SHOW_EXPORT_MY_DATA) ──
  const handleExportMyData = async () => {
    setExportBusy(true)
    setExportErr(null)
    setExportDone(false)
    const res = await requestMyDataExport((name, opts) => supabase.functions.invoke(name, opts))
    if (res.ok) { saveJsonDownload(res.filename, res.json); setExportDone(true) }
    else setExportErr(exportErrorCopy(res.reason))
    setExportBusy(false)
  }

  // ── Push on/off (FG-12 / P1-14, hidden behind SHOW_PUSH). On = tap -> permission -> subscribe -> save-push-subscription.
  // Off = browser unsubscribe + {unsubscribe, endpoint} to the same function, and push_reminders = false saved with the form (as before). ──
  const handlePushToggle = async (on: boolean) => {
    if (!SHOW_PUSH) return // P1-14 flag off: no prompt, no subscribe, no request
    setPushMsg(null)
    const post = makePushPost({
      supabaseUrl: import.meta.env.VITE_SUPABASE_URL,
      anonKey: import.meta.env.VITE_SUPABASE_ANON_KEY,
      getAccessToken: () => session?.access_token ?? null,
    })
    if (!on) { setPushReminders(false); setPushPref(false); void disablePush({ post }); return }
    const res = await enablePush({ post, vapidPublicKey: import.meta.env.VITE_VAPID_PUBLIC_KEY })
    if (res.ok) { setPushReminders(true); setPushPref(true) }
    else { setPushReminders(false); setPushMsg(pushMessageFor(res.reason)) }
  }

  // ── Request account deletion ───────────────────────────────────────────
  // Emails privacy@romrx.io via the request-account-deletion edge function.
  // Nothing is deleted or canceled here, and the user stays signed in.
  const handleDelete = async () => {
    if (!user || deleteText !== 'DELETE' || deleteDone || deleteInFlight.current) return
    deleteInFlight.current = true
    setDeleting(true)
    setDeleteError(null)
    try {
      const result = await requestAccountDeletion(
        (name, opts) => supabase.functions.invoke(name, opts),
        deletionSiteForHost(window.location.hostname), // P1-23: romrx.io, romrxbjj.com or romrxbodybuilding.com
      )
      if (result.ok) { setDeleteAlreadyOpen(result.alreadyOpen); setDeleteDone(true) }
      else setDeleteError(deletionErrorCopy(result.reason))
    } finally {
      deleteInFlight.current = false
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

            {/* FG-22: hidden. Restore by setting SHOW_GENDER_HEIGHT_WEIGHT = true. No new copy. */}
            {SHOW_GENDER_HEIGHT_WEIGHT && (
            <div>
              <p className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">Gender <span className="normal-case font-normal text-slate-400">(optional)</span></p>
              <div className="flex gap-2 flex-wrap">
                {GENDERS.map(g => (
                  <button
                    key={g.v}
                    type="button"
                    onClick={() => setGender(gender === g.v ? '' : g.v)}
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
            )}

            <div className={SHOW_GENDER_HEIGHT_WEIGHT ? 'grid grid-cols-1 sm:grid-cols-3 gap-4' : undefined}>
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Age group</label>
                <select value={ageBucket} onChange={e => setAgeBucket(e.target.value)} className="input">
                  <option value="">Select...</option>
                  {AGE_BUCKETS.map(b => (<option key={b.v} value={b.v}>{b.l}</option>))}
                </select>
              </div>
              {SHOW_GENDER_HEIGHT_WEIGHT && (
              <>
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
              </>
              )}
            </div>
            {/* FG-23: no units control exists. This flag is referenced so a form cannot be added un-gated. No new copy. */}
            {SHOW_UNITS && null}

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
              <span data-testid="base-status" className="text-sm font-semibold text-cobalt-ink capitalize">{statusLabel(profile?.base_status, cancelStatus.base?.state, cancelStatusLoading)}</span>
            </div>
            {canceledMessage(cancelStatus.base?.state) && (
              <p data-testid="base-canceled-message" className="text-sm text-cobalt-ink">{canceledMessage(cancelStatus.base?.state)}</p>
            )}
            {profile?.sport_entitlements && profile.sport_entitlements.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide">Sport packs</p>
                {profile.sport_entitlements.map(e => {
                  const srv = cancelStatus.sports.find(x => x.sport === e.sport)
                  const msg = canceledMessage(srv?.state)
                  return (
                    <div key={e.sport} className="py-1.5 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-sm text-cobalt-ink capitalize">{e.sport}</span>
                        <span className="text-xs font-bold bg-cobalt-light text-cobalt px-2 py-0.5 rounded-full capitalize">{statusLabel(e.status, srv?.state, cancelStatusLoading)}</span>
                      </div>
                      {msg && <p className="text-xs text-cobalt-ink">{msg}</p>}
                      {srv?.cancelable && (
                        <button
                          onClick={() => handleCancelSubscription(e.sport)}
                          disabled={cancelLoading !== null}
                          data-testid={`cancel-subscription-${e.sport}`}
                          className="text-xs font-semibold flex items-center gap-1.5 px-3 py-1.5 rounded-card border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
                        >
                          {cancelLoading === e.sport ? <Loader2 size={12} className="animate-spin" /> : <XCircle size={12} />}
                          {CANCEL_BUTTON_LABEL}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
            {portalErr && <p className="text-xs text-red-700 bg-red-50 rounded-card px-3 py-2">{portalErr}</p>}
            <div className="flex flex-wrap items-center gap-2">
              <button onClick={handleManageBilling} disabled={portalLoading} className="btn-ghost text-sm flex items-center gap-1.5">
                {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
                Manage billing
              </button>
              {(cancelStatus.base ? cancelStatus.base.cancelable : (cancelStatus.cancelable && cancelStatus.kind === 'base')) && (
                <button
                  onClick={() => handleCancelSubscription('base')}
                  disabled={cancelLoading !== null}
                  data-testid="cancel-subscription"
                  className="text-sm font-semibold flex items-center gap-1.5 px-4 py-2 rounded-card border border-red-200 bg-white text-red-700 hover:bg-red-50 disabled:opacity-50 transition-colors"
                >
                  {cancelLoading === 'base' ? <Loader2 size={14} className="animate-spin" /> : <XCircle size={14} />}
                  {CANCEL_BUTTON_LABEL}
                </button>
              )}
            </div>
            {(cancelStatus.base ? cancelStatus.base.cancelable : (cancelStatus.cancelable && cancelStatus.kind === 'base')) && (
              <p className="text-xs text-slate-500">{CANCEL_BASE_CASCADE_NOTE}</p>
            )}
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
                const prs = mobilityScoreForAssessment(a)
                const band: BandScore = overallBandForAssessment(a) ?? 3
                const tier = getBandTier(band)
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
                        <p className={cn('text-xs font-bold', tier.color)}>{formatScoreBand(prs, band)}</p>
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
        {/* FG-04: whole section hidden. send-whats-new is retired, so 'Email product updates' has no sender; other reminders have none either. Restore when FG-09 to FG-12 ship. */}
        {SHOW_NOTIFICATIONS && (
        <SectionCard title={R.title}>
          {notifLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 size={14} className="animate-spin text-cobalt" />
              <span className="text-sm text-slate-500">Loading preferences...</span>
            </div>
          ) : (
            <div className="space-y-5">
              <p className="text-sm text-slate-600">{R.intro}</p>

              {/* P1-01: product updates have no sender (send-whats-new retired), so this row stays behind the shared SHOW_MARKETING_TOGGLE (false). */}
              {SHOW_MARKETING_TOGGLE && (
              <ToggleRow
                title="Email product updates"
                subtitle="Occasional emails about new features and tips"
                checked={!marketingOptOut}
                onChange={v => setMarketingOptOut(!v)}
              />
              )}

              {/* P1-01: the three reminder toggles (order per Stacy: plan day, check, weekly). Each loads OFF unless toggle AND marker. */}
              {SHOW_REMINDER_TOGGLES && (
                <>
                <ToggleRow
                  title={R.protocolTitle}
                  subtitle={R.protocolHelp}
                  checked={emailReminders}
                  onChange={setEmailReminders}
                />

                <ToggleRow
                  title={R.retestTitle}
                  subtitle={R.retestHelp}
                  checked={retestReminders}
                  onChange={setRetestReminders}
                />

                <ToggleRow
                  title={R.digestTitle}
                  subtitle={R.digestHelp}
                  checked={weeklyDigest}
                  onChange={setWeeklyDigest}
                />

                {(emailReminders || retestReminders) && (
                  <div className="space-y-1 border-t border-slate-200 pt-4">
                    <div className="flex items-center gap-3 pl-1">
                      <label htmlFor="settings-reminder-time" className="text-xs text-slate-500 font-semibold uppercase tracking-wide whitespace-nowrap">
                        {R.timeLabel}
                      </label>
                      {/* whole hours only: the sender reads the hour (Stacy note 3b) */}
                      <input
                        id="settings-reminder-time"
                        type="time"
                        step={3600}
                        value={reminderTime}
                        onChange={e => setReminderTime(toWholeHour(e.target.value))}
                        className="input max-w-[8rem]"
                      />
                    </div>
                    <p className="text-xs text-slate-500 pl-1">{R.timeHelper(friendlyTimeZone(browserTimezone))}</p>
                  </div>
                )}

                {SHOW_CALENDAR_ICS && (
                  <div className="space-y-1 border-t border-slate-200 pt-4">
                    <button
                      type="button"
                      onClick={handleAddToCalendar}
                      disabled={calendarBusy || !session}
                      className="w-full rounded-xl border border-cobalt/20 bg-white py-2.5 px-3 text-sm font-semibold text-cobalt-ink flex items-center justify-center gap-2 disabled:opacity-60"
                      data-testid="add-to-calendar"
                    >
                      {calendarBusy ? <Loader2 size={14} className="animate-spin" /> : <Calendar size={14} />}
                      {CAL.button}
                    </button>
                    <p className="text-xs text-slate-500 pl-1">{CAL.help}</p>
                    {calendarMsg && <p className="text-xs text-red-700 bg-red-50 rounded-card px-3 py-2">{calendarMsg}</p>}
                  </div>
                )}

                {SHOW_PUSH && (
                  <ToggleRow
                    title={PUSH_COPY.toggleTitle}
                    subtitle={PUSH_COPY.toggleHelp}
                    checked={pushReminders}
                    onChange={handlePushToggle}
                    icon={<Bell size={14} className="text-slate-500" />}
                  />
                )}
                {SHOW_PUSH && pushMsg && <p className="text-xs text-red-700 bg-red-50 rounded-card px-3 py-2">{pushMsg}</p>}

                {/* P1-01: turn off all emails = users.marketing_opt_out (already stops every lifecycle email). ON means opted out. */}
                <div className="border-t border-slate-200 pt-4">
                  <ToggleRow
                    title={R.offAllTitle}
                    subtitle={R.offAllHelp}
                    checked={marketingOptOut}
                    onChange={setMarketingOptOut}
                  />
                </div>

                <p className="text-xs text-slate-500">{R.privacyBefore}<a href={PRIVACY_URL} target="_blank" rel="noopener noreferrer" className="underline">{R.privacyLink}</a>{R.privacyAfter}</p>
                </>
              )}

              {notifErr && <p className="text-xs text-red-700 bg-red-50 rounded-card px-3 py-2">{notifErr}</p>}

              <button onClick={handleSaveNotifications} disabled={notifSaving} className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50">
                {notifSaving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                {notifSaved ? R.saved : R.save}
              </button>
            </div>
          )}
        </SectionCard>
        )}

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
              href="https://romrx.io/legal"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full flex items-center gap-3 px-4 py-3 rounded-card bg-white border border-slate-200 text-sm font-medium text-cobalt-ink hover:bg-slate-50 transition-colors"
            >
              <ExternalLink size={15} className="text-cobalt shrink-0" />
              <span className="flex-1">
                Terms of Service, Privacy Policy & Refund Policy
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

        {/* ── ADS MEASUREMENT (consent log, Legal 2026-09-24) ─────── */}
        <AdsMeasurementSettings userId={user?.id} />

        {/* ROMood check-ins: delete + turn saving off (Stacy pass 8c61152). Hidden while saving flag is OFF. */}
        <MoodSettings userId={user?.id} />
        <div className="rounded-card bg-white border border-slate-200 p-4"><CrisisHelp /></div>

        {/* ── YOUR DATA (P1-23): export (behind SHOW_EXPORT_MY_DATA) and delete, folded into one section (Stacy note 8) ── */}
        <SectionCard title={YD.title}>
          {/* The intro offers a download, so it shows only with export on (Vera F1) */}
          {SHOW_EXPORT_MY_DATA && <p className="text-sm text-slate-600 mb-3">{YD.intro}</p>}
          {SHOW_EXPORT_MY_DATA && (
            <div className="mb-4" data-testid="your-data-export">
              <button
                onClick={handleExportMyData}
                disabled={exportBusy}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-card bg-white border border-slate-200 text-sm font-medium text-cobalt-ink hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                <span className="flex-1 text-left">{exportBusy ? YD.exportBusy : EXPORT_BUTTON_LABEL}</span>
              </button>
              <p className="text-xs text-slate-500 mt-1.5">{YD.exportHelp}</p>
              {exportDone && <p role="status" className="text-xs text-cobalt-ink mt-2">{YD.exportSuccess}</p>}
              {exportErr && <p className="text-xs text-red-700 mt-2">{exportErr}</p>}
            </div>
          )}
          {SHOW_DELETION_STATUS && deletionStatus && (
            <p role="status" className="text-xs text-cobalt-ink mb-2">{DELETION_STATUS_COPY[deletionStatus]}</p>
          )}
          <button
            onClick={() => setShowDelete(true)}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-card bg-red-50 border border-red-200 text-sm font-medium text-red-700 hover:bg-red-100 transition-colors"
          >
            <Trash2 size={15} className="shrink-0" />
            <span className="flex-1 text-left">
              {DELETION_BUTTON_LABEL}
              <span className="block text-xs font-normal mt-0.5 opacity-70">{YD.deleteHelp}</span>
            </span>
            <ChevronRight size={14} />
          </button>
          <p className="text-xs text-slate-500 mt-4" data-testid="your-data-email-fallback">{YD.emailFallback}</p>
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
              <h3 className="font-display font-bold text-lg text-cobalt-ink">{YD.dialogTitle}</h3>
            </div>
            {deleteDone ? (
              <>
                <p role="status" className="text-sm text-cobalt-ink leading-relaxed">{deleteAlreadyOpen ? YD.alreadyOpen : DELETION_SUCCESS_COPY}</p>
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setShowDelete(false); setDeleteText(''); setDeleteAlreadyOpen(false) }}
                    className="btn-ghost flex-1 text-sm"
                  >
                    Close
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Stacy's dialog body in her order. The plan line comes before the confirm field and the send button:
                    request-account-deletion does NOT cancel Stripe (Avery contract). */}
                <div className="space-y-2 max-h-[45vh] overflow-y-auto" data-testid="delete-dialog-body">
                  {dialogLines(SHOW_EXPORT_MY_DATA).map(({ line, index: i }) => (
                    <p
                      key={i}
                      data-testid={i === PLAN_LINE_INDEX ? 'delete-plan-line' : undefined}
                      className={i === PLAN_LINE_INDEX
                        ? 'text-sm font-semibold text-red-700 bg-red-50 border border-red-200 rounded-card px-3 py-2 leading-relaxed'
                        : 'text-sm text-slate-600 leading-relaxed'}
                    >
                      {line}
                    </p>
                  ))}
                </div>
                <label htmlFor="delete-confirm" className="block text-xs font-semibold text-slate-600">{YD.confirmLabel}</label>
                <input
                  id="delete-confirm"
                  type="text"
                  value={deleteText}
                  onChange={e => setDeleteText(e.target.value)}
                  placeholder={YD.confirmPlaceholder}
                  className="input"
                />
                {deleteError && (
                  <p role="alert" className="text-sm text-red-700">{deleteError}</p>
                )}
                <div className="flex gap-3 pt-1">
                  <button
                    onClick={() => { setShowDelete(false); setDeleteText(''); setDeleteError(null) }}
                    className="btn-ghost flex-1 text-sm"
                  >
                    {YD.cancel}
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteText !== 'DELETE' || deleting}
                    className="flex-1 px-4 py-2.5 rounded-card bg-red-600 text-white text-sm font-medium disabled:opacity-40 hover:bg-red-700 transition-colors flex items-center justify-center gap-2"
                  >
                    {deleting && <Loader2 size={14} className="animate-spin" />}
                    {deleting ? YD.sending : YD.send}
                  </button>
                </div>
              </>
            )}
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

