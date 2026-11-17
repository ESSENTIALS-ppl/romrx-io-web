import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react'
import { JUST_ASSESSED_KEY } from '../lib/whatChanged'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { useProfile } from '../hooks/useProfile'
import { bandFull, mobilityScoreForAssessment, overallBandForAssessment } from '../lib/mobilityBands'
import { STEPS } from './assessmentSteps'
import { AssessmentPhases, type Phase } from './AssessmentPhases'
import { track } from '../lib/track'
import { loginForPackAssessment, packReturnKey, packReturnUrl } from '../lib/packReturn'
import { Spinner } from '../components/Spinner'
import {
  buildSnapshot, clearMirror, createDraftSaver, guardDecision, isResumable, isStaleVersusAssessment, leaveSheetKind,
  pickDraft, readMirror, rowToDraft, valuesToStrings, withTimeout,
  type Draft, type DraftSaver, type SaveStatus,
} from '../lib/assessmentDraft'
import { supabaseDraftStore } from '../lib/assessmentDraftStore'
import { postSubmitAssessment } from '../lib/offlineSubmitQueue'

// localStorage for the per-member progress copy. Signed-in members only (Stacy Oct 28): no copy for signed-out visitors.
const draftStorage = () => { try { return window.localStorage } catch { return null } }

// Authenticated Base HQ → submit-assessment (great-job). Lead path unchanged.
const SUBMIT_ASSESSMENT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-assessment`
const SUBMIT_LEAD_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/submit-lead-assessment`

export function Assessment() {
  const { session, loading: authLoading } = useAuth()
  const { profile } = useProfile(session?.user?.id)
  const navigate = useNavigate()
  // Sent here by a pack app (?return_to=bjj|bodybuilding): the pack has no assessment of
  // its own any more. Sign in first so the result saves to the member's account (never the
  // signed-out lead path), and go back to the pack dashboard when done (lib/packReturn).
  const [returnKey] = useState(() => packReturnKey(window.location.search))
  const needsPackSignIn = returnKey !== null && !authLoading && !session

  useEffect(() => {
    if (needsPackSignIn && returnKey) navigate(loginForPackAssessment(returnKey), { replace: true })
  }, [needsPackSignIn, returnKey, navigate])
  const [phase, setPhase] = useState<Phase>('setup')
  const [stepIdx, setStepIdx] = useState(0)
  const [values, setValues] = useState<Record<string, string>>({})
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // ---- Progress drafts (signed in only). See lib/assessmentDraft.ts for the rules. ----
  const userId = session?.user?.id ?? null
  const [draftChecked, setDraftChecked] = useState(false)
  const [resumeDraft, setResumeDraft] = useState<Draft | null>(null)
  const [startOverArmed, setStartOverArmed] = useState(false)
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [leaveOpen, setLeaveOpen] = useState(false)
  const saverRef = useRef<{ uid: string; saver: DraftSaver } | null>(null)
  const finalPending = useRef(false)
  const leavingRef = useRef(false)
  const phaseRef = useRef<Phase>(phase)
  const stepIdxRef = useRef(stepIdx)
  const valuesRef = useRef(values)
  phaseRef.current = phase
  stepIdxRef.current = stepIdx
  valuesRef.current = values

  const getSaver = useCallback((seed?: Draft | null): DraftSaver | null => {
    if (!userId) return null
    const cur = saverRef.current
    if (cur && cur.uid === userId && !seed) return cur.saver
    const saver = createDraftSaver({
      store: supabaseDraftStore, userId, storage: draftStorage(), onStatus: setSaveStatus,
      createdAt: seed?.createdAt ?? null, lastSavedAt: seed ? (seed.serverUpdatedAt ?? seed.savedAt) : null,
    })
    saverRef.current = { uid: userId, saver }
    return saver
  }, [userId])

  // Load the member's draft once the session is known. The setup screen waits (up to 4 seconds) so a first
  // save cannot overwrite a draft the member has not seen yet.
  useEffect(() => {
    if (authLoading) return
    if (!userId) { setDraftChecked(true); return }
    let live = true
    ;(async () => {
     try {
      const [row, newest] = await withTimeout(
        Promise.all([supabaseDraftStore.load(userId), supabaseDraftStore.newestAssessmentAt(userId)]),
        4000, [null, null] as [Awaited<ReturnType<typeof supabaseDraftStore.load>>, number | null],
      )
      const now = Date.now()
      let d = pickDraft(rowToDraft(row), readMirror(draftStorage(), userId, now), now)
      if (d && isStaleVersusAssessment(d, newest)) { clearMirror(draftStorage(), userId); d = null }
      if (!live) return
      if (d && isResumable(d, now)) {
        setResumeDraft(d)
        setPhase(ph => (ph === 'setup' ? 'resume' : ph))
        track('assessment_resume_shown', { completed_steps: d.completedSteps.length, total_steps: STEPS.length })
      }
     } finally {
      if (live) setDraftChecked(true)
     }
    })()
    return () => { live = false }
  }, [authLoading, userId])

  // Retry an unsaved snapshot when the network or the tab comes back.
  useEffect(() => {
    const retry = () => { void saverRef.current?.saver.retry() }
    const vis = () => { if (document.visibilityState === 'visible') retry() }
    window.addEventListener('online', retry)
    document.addEventListener('visibilitychange', vis)
    return () => { window.removeEventListener('online', retry); document.removeEventListener('visibilitychange', vis) }
  }, [])

  // Back button and leave guard, measure screens only. One sentinel history entry makes browser Back land here
  // instead of leaving the page (lib/assessmentDraft.guardDecision decides what Back does).
  useEffect(() => {
    if (phase !== 'measure') return
    leavingRef.current = false
    const mark = { ...(window.history.state ?? {}), romrxAssessmentGuard: true }
    window.history.pushState(mark, '')
    const onPop = () => {
      if (leavingRef.current) return
      const d = guardDecision({ phase: phaseRef.current, stepIdx: stepIdxRef.current })
      if (d === 'none') return
      window.history.pushState(mark, '')
      if (d === 'previous-step') { setStepIdx(i => Math.max(0, i - 1)); window.scrollTo({ top: 0 }) }
      else { setLeaveOpen(true); track('assessment_leave_guard_shown', { step_index: stepIdxRef.current }) }
    }
    const onBefore = (e: BeforeUnloadEvent) => {
      if (leavingRef.current) return
      const unsavedWork = saverRef.current ? saverRef.current.saver.isDirty() : Object.values(valuesRef.current).some(v => v !== '')
      if (!unsavedWork) return
      e.preventDefault()
      e.returnValue = ''
    }
    window.addEventListener('popstate', onPop)
    window.addEventListener('beforeunload', onBefore)
    return () => { window.removeEventListener('popstate', onPop); window.removeEventListener('beforeunload', onBefore) }
  }, [phase])

  const handleLeave = () => {
    leavingRef.current = true
    setLeaveOpen(false)
    track('assessment_leave_confirmed', { step_index: stepIdx })
    window.history.go(-2)
    // First entry in this tab: there is nowhere to go back to, so go home.
    window.setTimeout(() => { if (leavingRef.current && window.location.pathname.includes('/onboarding/assessment')) navigate('/', { replace: true }) }, 250)
  }

  const handleResume = () => {
    if (!resumeDraft) return
    getSaver(resumeDraft)
    setValues(valuesToStrings(resumeDraft.values))
    setStepIdx(Math.min(resumeDraft.stepIdx, STEPS.length - 1))
    track('assessment_resumed', { step_index: resumeDraft.stepIdx, completed_steps: resumeDraft.completedSteps.length })
    setPhase('measure')
    window.scrollTo({ top: 0 })
  }

  const handleStartOver = async () => {
    if (!startOverArmed) { setStartOverArmed(true); return }
    track('assessment_start_over')
    const saver = getSaver()
    if (saver) await saver.discard()
    else if (userId) { await supabaseDraftStore.remove(userId); clearMirror(draftStorage(), userId) }
    saverRef.current = null
    setResumeDraft(null); setStartOverArmed(false); setValues({}); setStepIdx(0); setSaveStatus('idle')
    setPhase('setup')
  }

  const handleChange = (key: string, val: string) => setValues(p => ({ ...p, [key]: val }))

  const handleNext = async (opts?: { skipped?: boolean }) => {
    if (finalPending.current) return
    track('assessment_step_completed', { step_index: stepIdx, step_key: STEPS[stepIdx]?.id ?? String(stepIdx), total_steps: STEPS.length, authenticated: !!session })
    const step = STEPS[stepIdx]
    const skipKeys = opts?.skipped && step ? step.fields.map(f => f.key) : []
    // The Skip button clears fields and calls us in the same tick, so `values` here is still the old closure:
    // build what this step really holds.
    const effective: Record<string, string> = { ...values }
    for (const k of skipKeys) effective[k] = ''
    const isLast = stepIdx >= STEPS.length - 1
    const saver = getSaver()
    let finalSave: Promise<boolean> | null = null
    if (saver) {
      const { snapshot, dropped } = buildSnapshot({ values: effective, stepIds: STEPS.map(s => s.id), finishedIdx: stepIdx, skipKeys })
      if (dropped.length > 0) track('assessment_draft_value_dropped', { count: dropped.length })
      const saving = saver.save(snapshot)
      track('assessment_draft_saved', { step_index: stepIdx, step_key: step?.id ?? String(stepIdx) })
      if (isLast) finalSave = saving
    }
    if (!isLast) {
      setStepIdx(s => s + 1)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } else if (session) {
      // Wait for the final save (up to 5 seconds) before submit, so it cannot land after the database has cleared the
      // draft (Vera D3). A save that fails or times out never blocks Submit.
      finalPending.current = true
      setLoading(true); setError('')
      if (finalSave) await withTimeout(finalSave, 5000, false)
      saver?.close()
      await submit(undefined, undefined, effective)
      finalPending.current = false
    } else {
      track('assessment_lead_gate_shown', { total_steps: STEPS.length })
      setPhase('lead')
    }
  }

  function computeAssessmentData(source: Record<string, string> = values) {
    const data: Record<string, number | null> = {}
    for (const [k, v] of Object.entries(source)) {
      data[k] = v === '' ? null : parseFloat(v)
    }
    return data
  }

  const submit = async (leadEmail?: string, leadName?: string, valuesNow?: Record<string, string>) => {
    setLoading(true); setError('')
    const assessment_data = computeAssessmentData(valuesNow ?? values)

    // Logged-in Base HQ path: same edge as sport apps (insert + great-job email).
    // Payload is flat ROM fields; submit-assessment reads active_sport for brand.
    if (session) {
      if (!session.access_token) {
        saverRef.current?.saver.reopen()
        setLoading(false)
        setError('Session expired - please sign in again.')
        return
      }
      try {
        // P1-26: when the offline-cache flag is on, a network drop queues this signed-in submit
        // and syncs on reconnect. Success and HTTP-error paths are unchanged. Lead submits are not queued.
        const result = await postSubmitAssessment({
          url: SUBMIT_ASSESSMENT_URL,
          accessToken: session.access_token,
          apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
          body: assessment_data,
        })
        setLoading(false)
        if (!result.ok) {
          saverRef.current?.saver.reopen()
          setError(result.error ?? 'Submission failed. Please try again.')
          return
        }
        // Done: the database clears the draft on insert. Drop this device's copy now and delete the row once any
        // save still in flight has finished (it was closed above, so nothing new can start).
        clearMirror(draftStorage(), userId)
        void saverRef.current?.saver.finish()
        track('assessment_completed_ui', { authenticated: true, measured_fields: Object.values(assessment_data).filter(v => v !== null).length })
        // Outro replaces the 2 s 'done' spinner (Grant Oct 21 2026). The great-job email was sent by
        // submit-assessment before this response returned; Continue goes to results or the pack.
        setPhase('outro')
      } catch {
        saverRef.current?.saver.reopen()
        setLoading(false)
        setError('Something went wrong. Please try again.')
      }
      return
    }

    // Unauthenticated lead capture (marketing funnel) — keep lead edge.
    // Same shared /100 number every Base surface shows (lib/mobilityBands).
    const prs_score = mobilityScoreForAssessment(assessment_data)
    const body: Record<string, unknown> = {
      assessment_data,
      prs_score,
      tier: bandFull(overallBandForAssessment(assessment_data) ?? 3),
      email: leadEmail,
      full_name: leadName,
    }
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
    }

    try {
      const res = await fetch(SUBMIT_LEAD_URL, { method: 'POST', headers, body: JSON.stringify(body) })
      const data = await res.json()
      setLoading(false)
      if (!data.ok) { setError(data.error ?? 'Submission failed. Please try again.'); return }
      // Lead email already sent by submit-lead-assessment before this response returned.
      setPhase('lead-done')
    } catch {
      setLoading(false)
      setError('Something went wrong. Please try again.')
    }
  }

  const handleOutroContinue = () => {
    const packUrl = packReturnUrl(returnKey)
    // P1-11: tell the results page this is straight after an assessment, so an active user can see what changed
    if (!packUrl) { try { sessionStorage.setItem(JUST_ASSESSED_KEY, '1') } catch { /* ignore */ } }
    if (packUrl) window.location.assign(packUrl)
    else navigate('/onboarding/results', { replace: true })
  }

  const handleLeadSubmit = (e: FormEvent) => {
    e.preventDefault()
    if (!email) { setError('Please enter your email.'); return }
    submit(email, fullName)
  }

  // Pack hand-off: hold a spinner until we know the member is signed in.
  if (returnKey && (authLoading || !session)) return <Spinner />
  // Wait for the draft check before showing the first screen (4 second limit), so Resume can show instead of a blank form.
  if (phase === 'setup' && (authLoading || (userId && !draftChecked))) return <Spinner />

  // -- Setup screen -----------------------------------------------------------
  
    return (
    <AssessmentPhases
      phase={phase}
      stepIdx={stepIdx}
      values={values}
      email={email}
      fullName={fullName}
      loading={loading}
      error={error}
      setPhase={setPhase}
      setStepIdx={setStepIdx}
      setEmail={setEmail}
      setFullName={setFullName}
      handleChange={handleChange}
      gender={profile?.gender}
      handleNext={handleNext}
      handleLeadSubmit={handleLeadSubmit}
      onOutroContinue={handleOutroContinue}
      saveStatus={userId ? saveStatus : undefined}
      resume={resumeDraft ? {
        done: resumeDraft.completedSteps.length, total: STEPS.length, startOverArmed,
        onResume: handleResume, onStartOver: () => { void handleStartOver() },
      } : undefined}
      leave={{ open: leaveOpen, kind: leaveSheetKind({ signedIn: !!userId, lastSaveFailed: saveStatus === 'failed' }), onStay: () => setLeaveOpen(false), onLeave: handleLeave }}
    />
  )
}
