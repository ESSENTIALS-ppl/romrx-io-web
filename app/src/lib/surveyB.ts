/**
 * SURVEY CARD B (Jim approved by voice Oct 19 2026 2:52 PM ET, relayed by Grant). Sunday Oct 25 batch.
 * Split shell, one card per moment (Field build-on Sep 24 + Heavy co-builder copy):
 *   first    = after first results: 3 taps + 1 optional sentence
 *   reassess = after each reassessment: Q1 locked (profile match), Q2 WANT, Q3 DON'T, Q4 optional sentence
 * Stacy edits Oct 19 2:57 PM: no thank-you, Q4 'Optional: One sentence the team should hear.', health-details line under
 * every free-text box, recruit is its own unchecked box (email sent only if ticked).
 * No 0-10 recommend question. No "you asked, we built it" promise. Bands Needs focus / Building / Steady.
 *
 * Build-time flag: VITE_SURVEY_CARD_B=on turns it ON. Anything else (unset) = OFF. PRODUCTION DEFAULT IS OFF.
 * Needs migration 20261025xxxxxx_client_feedback_survey_category (adds category 'survey') BEFORE the flag is on.
 *
 * Copy for Stacy: STACY-SURVEY-B-COPY.md. Every user-facing string lives in SURVEY_B_COPY below.
 */
import type { BandScore } from './mobilityBands'

export function surveyCardBEnabled(): boolean {
  return import.meta.env.VITE_SURVEY_CARD_B === 'on'
}

export const SURVEY_B_VERSION = 'survey-b-2026-10-19'

export type SurveyMoment = 'first' | 'reassess'

export interface SurveyQuestion {
  id: 'q1' | 'q2' | 'q3' | 'q4'
  prompt: string
  why?: string
  options?: string[]
  /** Option that opens a short text box. */
  otherOption?: string
  optional?: boolean
}

export const SOMETHING_ELSE = 'Something else'

export const SURVEY_B_COPY = {
  title: 'Help build Base',
  intro: {
    first:
      'You just finished your first assessment. About a minute. Help us build the next version of Base with people who actually use it. Your answers go to the Base team.',
    reassess:
      'You just finished a reassessment. About a minute. Help us build the next version of Base with people who actually use it. Your answers go to the Base team.',
  },
  start: 'Start',
  askLater: 'Ask me later',
  noThanks: 'Not now',
  progress: (n: number, total: number) => `${n} of ${total}`,
  back: 'Back',
  next: 'Next',
  skip: 'Skip',
  send: 'Send',
  sending: 'Sending...',
  otherPlaceholder: 'A few words (optional)',
  sentencePlaceholder: 'One sentence',
  noHealthDetails: "Please don't include health or medical details.",
  recruit: 'OK to email me about a short feedback call.',
  sent: 'Sent.',
  error: 'Could not send. Try again.',
  questions: {
    first: [
      {
        id: 'q1',
        prompt: 'Was the assessment worth the time?',
        why: 'This tells us what to keep.',
        options: ['Yes', 'Almost', 'Not really'],
      },
      {
        id: 'q2',
        prompt: 'What almost made you quit mid-assessment?',
        why: 'This tells us what to fix in the assessment.',
        options: ['Nothing', 'Unclear instructions', 'Phone setup', 'Too long', "Wasn't sure what I was measuring", SOMETHING_ELSE],
        otherOption: SOMETHING_ELSE,
      },
      {
        id: 'q3',
        prompt: 'What should the daily protocol do first?',
        why: 'This decides what we try next.',
        options: ['Work on what feels stiff', 'Make training days feel easier', 'Show progress I can see', "Keep it short enough I'll do it", SOMETHING_ELSE],
        otherOption: SOMETHING_ELSE,
      },
      {
        id: 'q4',
        prompt: 'Optional: One sentence the team should hear.',
        optional: true,
      },
    ] as SurveyQuestion[],
    reassess: [
      {
        id: 'q1',
        prompt: 'Did this new Readiness Profile match how your body actually felt coming in?',
        why: 'This tells us what to keep.',
        options: ['Yes, close enough', 'Some joints, not others', 'No, it felt off'],
      },
      {
        id: 'q2',
        prompt: 'What should we put more weight on next cycle?',
        why: 'This decides what we try next.',
        options: [
          'Clearer "why this joint, why this drill"',
          'Shorter daily protocol',
          'Better progress from last assessment to this one',
          'Sport / activity-specific guidance',
          SOMETHING_ELSE,
        ],
        otherOption: SOMETHING_ELSE,
      },
      {
        id: 'q3',
        prompt: 'What got in the way this cycle?',
        why: 'This tells us what to cut or fix.',
        options: [
          'Protocol felt generic',
          "I didn't trust the joint scores",
          'Too many drills to keep up with',
          'Assessment itself was annoying or confusing',
          'Nothing. It worked.',
          SOMETHING_ELSE,
        ],
        otherOption: SOMETHING_ELSE,
      },
      {
        id: 'q4',
        prompt: 'Optional: One sentence the team should hear.',
        optional: true,
      },
    ] as SurveyQuestion[],
  },
} as const

/** Every user-facing string (for tests and the Stacy copy file). */
export function allSurveyBStrings(): string[] {
  const c = SURVEY_B_COPY
  const out: string[] = [c.title, c.intro.first, c.intro.reassess, c.start, c.askLater, c.noThanks, c.progress(1, 4),
    c.back, c.next, c.skip, c.send, c.sending, c.otherPlaceholder, c.sentencePlaceholder, c.noHealthDetails, c.recruit, c.sent, c.error]
  for (const q of [...c.questions.first, ...c.questions.reassess]) {
    out.push(q.prompt)
    if (q.why) out.push(q.why)
    for (const o of q.options ?? []) out.push(o)
  }
  return out
}

// ── Cadence ────────────────────────────────────────────────────────────────
export const SHOW_WINDOW_HOURS = 72          // only right after an assessment
export const COMPLETE_CAP_DAYS = 30          // 1 complete per user per 30 days
export const NO_THANKS_QUIET_DAYS = 14       // "Not now" = quiet 14 days
const DAY = 24 * 60 * 60 * 1000

export const STORE = {
  done: (assessmentId: string) => `romrx.surveyB.done.${assessmentId}`,
  later: (assessmentId: string) => `romrx.surveyB.later.${assessmentId}`,
  quietUntil: 'romrx.surveyB.quietUntil',
  lastComplete: 'romrx.surveyB.lastComplete',
  laterSession: 'romrx.surveyB.laterThisSession',
}

export interface EligibilityInput {
  enabled: boolean
  /** Assessments newest first. Empty = never assessed. */
  assessments: ReadonlyArray<{ id: string; assessed_at: string }>
  now: number
  otherPromptThisSession: boolean
  /** Latest survey complete by this user on the server (client_feedback category 'survey'), ms, or null. */
  serverLastCompleteAt: number | null
  local: {
    done: boolean
    laterCount: number
    laterThisSession: boolean
    quietUntil: number | null
    lastComplete: number | null
  }
}

export type Eligibility = { show: true; moment: SurveyMoment; cycle: number; assessmentId: string } | { show: false; reason: string }

export function surveyBEligibility(i: EligibilityInput): Eligibility {
  if (!i.enabled) return { show: false, reason: 'flag_off' }
  const latest = i.assessments[0]
  if (!latest) return { show: false, reason: 'not_assessed' }
  const at = new Date(latest.assessed_at).getTime()
  if (!Number.isFinite(at) || i.now - at > SHOW_WINDOW_HOURS * 60 * 60 * 1000 || at - i.now > DAY) {
    return { show: false, reason: 'not_right_after_assessment' }
  }
  if (i.otherPromptThisSession) return { show: false, reason: 'other_prompt_this_session' }
  if (i.local.done) return { show: false, reason: 'done_for_this_assessment' }
  if (i.local.laterThisSession) return { show: false, reason: 'asked_later_this_session' }
  if (i.local.laterCount >= 2) return { show: false, reason: 'asked_later_twice' }
  if (i.local.quietUntil && i.now < i.local.quietUntil) return { show: false, reason: 'no_thanks_quiet' }
  const last = Math.max(i.local.lastComplete ?? 0, i.serverLastCompleteAt ?? 0)
  if (last && i.now - last < COMPLETE_CAP_DAYS * DAY) return { show: false, reason: 'completed_within_30_days' }
  const cycle = i.assessments.length
  return { show: true, moment: cycle === 1 ? 'first' : 'reassess', cycle, assessmentId: latest.id }
}

export function noThanksQuietUntil(now: number): number {
  return now + NO_THANKS_QUIET_DAYS * DAY
}

// ── Payload for public.client_feedback (syncs to Notion via the feedback-to-notion trigger) ──
export interface SurveyAnswers { q1?: string; q2?: string; q3?: string; q4?: string; q2_other?: string; q3_other?: string; recruit_ok?: boolean }

export interface SurveyContext {
  userId: string
  email: string | null
  moment: SurveyMoment
  cycle: number
  assessmentId: string
  overallBand: BandScore | null
  bandMix: { needs_focus: number; building: number; steady: number }
  top3: string[]
  pageUrl: string
}

const clip = (s: string | undefined, n: number) => (s ?? '').normalize('NFC').trim().slice(0, n)

export function buildSurveyFeedbackRow(ctx: SurveyContext, a: SurveyAnswers) {
  const answers = {
    q1: clip(a.q1, 120) || null,
    q2: clip(a.q2, 120) || null,
    q2_other: clip(a.q2_other, 200) || null,
    q3: clip(a.q3, 120) || null,
    q3_other: clip(a.q3_other, 200) || null,
    q4: clip(a.q4, 280) || null,
  }
  const recruitOk = a.recruit_ok === true
  const qs = SURVEY_B_COPY.questions[ctx.moment]
  const label = (id: string) => qs.find(q => q.id === id)?.prompt ?? id
  const part = (id: 'q1' | 'q2' | 'q3' | 'q4', other?: string | null) => {
    const v = answers[id]
    if (!v) return `${label(id)}: (skipped)`
    return `${label(id)}: ${v}${other ? ` (${other})` : ''}`
  }
  // Notion "Notes" shows this message. Internal text, not shown to the user.
  const message = [
    `Survey B, ${ctx.moment === 'first' ? 'first assessment' : `reassessment (cycle ${ctx.cycle})`}`,
    part('q1'), part('q2', answers.q2_other), part('q3', answers.q3_other), part('q4'),
    `OK to email about a feedback call: ${recruitOk ? 'yes' : 'no'}`,
    `Bands: Needs focus ${ctx.bandMix.needs_focus}, Building ${ctx.bandMix.building}, Steady ${ctx.bandMix.steady}. Top 3: ${ctx.top3.join(', ') || '-'}`,
  ].join('\n').slice(0, 1000)
  return {
    user_id: ctx.userId,
    sport: 'base' as const,
    category: 'survey' as const,
    message,
    metadata: {
      kind: 'survey_b',
      version: SURVEY_B_VERSION,
      moment: ctx.moment,
      cycle: ctx.cycle,
      assessment_id: ctx.assessmentId,
      overall_band: ctx.overallBand,
      band_mix: ctx.bandMix,
      top3: ctx.top3,
      answers,
      recruit_ok: recruitOk,
      page_url: ctx.pageUrl.slice(0, 500),
      // Contact only when the recruit box is ticked (Stacy). Otherwise no email leaves the app.
      email: recruitOk ? ctx.email : null,
    },
  }
}
