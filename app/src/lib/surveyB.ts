/**
 * SURVEY CARD B (Jim approved by voice Oct 19 2026 2:52 PM ET, relayed by Grant). Sunday Oct 25 batch.
 * Split shell, one card per moment (Stacy copy PASS Oct 19 7:24 PM ET):
 *   first    = after first results: 3-tap card
 *   reassess = after each reassessment: co-builder card (one sentence + optional tap)
 * No NPS or 0 to 10 scale. No "you asked, we built it" promise. No recruit box (not in Stacy's PASS).
 * Ships together with the Privacy "Survey answers" line in legal.html on ONE Jim tap.
 *
 * Build-time flag: VITE_SURVEY_CARD_B=on turns it ON. Anything else (unset) = OFF. PRODUCTION DEFAULT IS OFF.
 * Needs migration 20261025xxxxxx_client_feedback_survey_category (adds category 'survey') BEFORE the flag is on.
 *
 * Every user-facing string lives in SURVEY_B_COPY below.
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

/**
 * Copy: Stacy PASS Oct 19 7:24 PM ET + 7:27 PM ET edits (Quinn cycles 2 to 4), ticket SURVEY-CARD-B-TICKET-20261019.md "Stacy copy clear".
 * Use EXACTLY. Any change goes back to Stacy. The only string not in her PASS is `error` (marked PLACEHOLDER).
 */
export const SURVEY_B_COPY = {
  first: {
    title: 'Quick question',
    questions: [
      { id: 'q1', prompt: 'How easy was this assessment?', options: ['Easy', 'Okay', 'Hard'] },
      { id: 'q2', prompt: 'Were your results clear?', options: ['Yes', 'Mostly', 'No'] },
      { id: 'q3', prompt: 'Will you check again in a few weeks?', options: ['Yes', 'Maybe', 'No'] },
    ] as SurveyQuestion[],
    skip: 'Skip',
    after: 'Thanks. Your answers help us decide what to work on.',
  },
  reassess: {
    title: 'Help us build ROMRx',
    body: "You've been using ROMRx for a while. What should we make better?",
    placeholder: 'Tell us in a sentence or two.',
    tap: { id: 'q1', prompt: 'What would you use most?', options: ['Clearer results', 'More exercises', 'Progress tracking', SOMETHING_ELSE] } as SurveyQuestion,
    smallPrint: "Please don't include health details. We read every answer.",
    send: 'Send',
    skip: 'Skip',
    after: 'Thanks. We read every answer.',
  },
  /** Quinn cycles 2 to 4 (Stacy PASS 7:27 PM ET with 2 edits). Cycle 5+ uses `reassess`. */
  cycles: {
    header: 'Help shape ROMRx',
    sub: 'Two quick taps. Skip anytime.',
    send: 'Send',
    skip: 'Skip',
    footer: 'Thanks. Your answers help us decide what to work on.',
    noHealth: "Please don't include health details.",
    byCycle: {
      2: {
        q1: { id: 'q1', prompt: 'How easy was this check-in to film?', options: ['Easy', 'Okay', 'Hard'] },
        q2: { id: 'q2', prompt: 'Which part felt least clear?', options: ['Camera setup', 'Instructions', 'My results', 'Nothing'] },
        text: 'Anything else to tell us?',
      },
      3: {
        q1: { id: 'q1', prompt: 'How useful are your results so far?', options: ['Very', 'Somewhat', 'Not yet'] },
        q2: { id: 'q2', prompt: 'What would you like ROMRx to show next?', options: ['More exercises', 'Progress over time', 'Sport positions', 'Something else'] },
        text: 'Tell us more (optional)',
      },
      4: {
        q1: { id: 'q1', prompt: 'How often do you plan to check in?', options: ['Weekly', 'Every few weeks', 'Not sure'] },
        q2: { id: 'q2', prompt: 'Would you join a short feedback chat with the team?', options: ['Yes', 'Maybe later', 'No thanks'] },
        text: 'One thing we should change?',
        q2SmallPrint: 'If you tap Yes, we may email you at your account address to set up a time. Saying yes is optional and you can change your mind anytime.',
      },
    } as Record<2 | 3 | 4, { q1: SurveyQuestion; q2: SurveyQuestion; text: string; q2SmallPrint?: string }>,
  },
  /** PLACEHOLDER: not in Stacy's PASS. Needs Stacy before the flag flip. */
  error: '[PLACEHOLDER: send error line, needs Stacy] Could not send. Try again.',
} as const

/** Every user-facing string (for tests). */
export function allSurveyBStrings(): string[] {
  const f = SURVEY_B_COPY.first, r = SURVEY_B_COPY.reassess
  const out: string[] = [f.title, f.skip, f.after, r.title, r.body, r.placeholder, r.tap.prompt, r.smallPrint, r.send, r.skip, r.after]
  const cy = SURVEY_B_COPY.cycles
  out.push(cy.header, cy.sub, cy.send, cy.skip, cy.footer, cy.noHealth)
  for (const k of [2, 3, 4] as const) { const v = cy.byCycle[k]; out.push(v.text, v.q1.prompt, v.q2.prompt, ...(v.q1.options ?? []), ...(v.q2.options ?? [])); if (v.q2SmallPrint) out.push(v.q2SmallPrint) }
  for (const q of [...f.questions, r.tap]) { out.push(q.prompt); for (const o of q.options ?? []) out.push(o) }
  return out
}

/** Question labels per moment, for the internal feedback row. */
export function cycleCard(cycle: number) {
  return cycle >= 2 && cycle <= 4 ? SURVEY_B_COPY.cycles.byCycle[cycle as 2 | 3 | 4] : null
}

export function surveyLabels(moment: SurveyMoment, cycle = 1): Record<string, string> {
  const cc = moment === 'reassess' ? cycleCard(cycle) : null
  if (cc) return { q1: cc.q1.prompt, q2: cc.q2.prompt, q4: cc.text }
  if (moment === 'first') return Object.fromEntries(SURVEY_B_COPY.first.questions.map(q => [q.id, q.prompt]))
  return { q1: SURVEY_B_COPY.reassess.tap.prompt, q4: SURVEY_B_COPY.reassess.body }
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
  const labels = surveyLabels(ctx.moment, ctx.cycle)
  const label = (id: string) => labels[id] ?? id
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
