// P1-18b (Base engagement, L1031; Grant yes Nov 16): a short optional survey on the assessment results screen.
// OFF by default. SHOW_RESULTS_SURVEY stays false until Avery's public.assessment_feedback table is live
// (spec: process/evidence/JULES-P1-18B-ASSESSMENT-FEEDBACK-SPEC-20261116.md). While it is false the survey never
// renders, never reads and never writes.
// Words: NOT final for this screen. The questions reuse Stacy's cleared Survey card B "Card 1: first-assess 3-tap card"
// strings (beta-launch/SURVEY-CARD-B-TICKET-20261019.md, PASS Oct 19 7:24 PM ET, edit 7:27 PM ET) verbatim; proposed for a
// new pass in process/evidence/JULES-P1-18B-PROPOSED-WORDS-20261116.md. Every string lives in P1_18B_WORDS.
// Quick re-checks (check_kind = 'quick') never get the survey.
import { isFullAssessment } from './assessmentReads'

export const SHOW_RESULTS_SURVEY = true

export const P1_18B_WORDS = {
  title: 'Quick question', // Stacy Card 1 (Oct 19)
  qEase: 'How easy was this assessment?', // Stacy Card 1 Q1
  aEasy: 'Easy',
  aOkay: 'Okay',
  aHard: 'Hard',
  qClear: 'Were your results clear?', // Stacy Card 1 Q2
  aYes: 'Yes',
  aMostly: 'Mostly',
  aNo: 'No',
  qAgain: 'Will you check again in a few weeks?', // Stacy Card 1 Q3
  aAgainYes: 'Yes',
  aMaybe: 'Maybe',
  aAgainNo: 'No',
  skip: 'Skip', // Stacy Card 1
  thanks: 'Thanks. Your answers help us decide what to work on.', // Stacy Card 1 After (7:27 PM ET edit)
  error: 'Something went wrong. Please try again.', // existing generic line
} as const

export type Ease = 'easy' | 'okay' | 'hard'
export type ResultsClear = 'yes' | 'mostly' | 'no'
export type CheckAgain = 'yes' | 'maybe' | 'no'

export const EASES: readonly Ease[] = ['easy', 'okay', 'hard']
export const RESULTS_CLEARS: readonly ResultsClear[] = ['yes', 'mostly', 'no']
export const CHECK_AGAINS: readonly CheckAgain[] = ['yes', 'maybe', 'no']
export const EASE_LABEL: Record<Ease, string> = { easy: P1_18B_WORDS.aEasy, okay: P1_18B_WORDS.aOkay, hard: P1_18B_WORDS.aHard }
export const RESULTS_CLEAR_LABEL: Record<ResultsClear, string> = { yes: P1_18B_WORDS.aYes, mostly: P1_18B_WORDS.aMostly, no: P1_18B_WORDS.aNo }
export const CHECK_AGAIN_LABEL: Record<CheckAgain, string> = { yes: P1_18B_WORDS.aAgainYes, maybe: P1_18B_WORDS.aMaybe, no: P1_18B_WORDS.aAgainNo }

export const ASSESSMENT_FEEDBACK_TABLE = 'assessment_feedback'
export const RESULTS_SURVEY_VERSION = 'p1-18b-card1-2026-11-16'

/** One row of public.assessment_feedback, exactly the spec's client-written columns (id and created_at are server defaults). */
export interface AssessmentFeedbackRow {
  user_id: string
  assessment_id: string
  ease: Ease
  results_clear: ResultsClear
  check_again: CheckAgain
  survey_version: typeof RESULTS_SURVEY_VERSION
  sport: 'base'
  source: 'web'
}

export interface ResultsAnswers { ease: Ease | null; results_clear: ResultsClear | null; check_again: CheckAgain | null }

/** Card 1 is 3 taps and sends on the last one: complete only when all three are answered. */
export function answersComplete(a: ResultsAnswers): a is { ease: Ease; results_clear: ResultsClear; check_again: CheckAgain } {
  return !!a.ease && !!a.results_clear && !!a.check_again
}

export function buildAssessmentFeedbackRow(userId: string, assessmentId: string, a: { ease: Ease; results_clear: ResultsClear; check_again: CheckAgain }): AssessmentFeedbackRow {
  return {
    user_id: userId,
    assessment_id: assessmentId,
    ease: a.ease,
    results_clear: a.results_clear,
    check_again: a.check_again,
    survey_version: RESULTS_SURVEY_VERSION,
    sport: 'base',
    source: 'web',
  }
}

/** Only full assessments get the survey (null check_kind = full, as in assessmentReads). */
export function surveyEligible(assessment: { id?: unknown; check_kind?: unknown } | null | undefined): boolean {
  return !!assessment && typeof assessment.id === 'string' && isFullAssessment(assessment)
}

/** Once per assessment: answered or skipped is remembered per user per assessment id. */
export function surveyDoneKey(userId: string, assessmentId: string): string {
  return `romrx_results_survey_${userId}_${assessmentId}`
}
export function readSurveyDone(userId: string, assessmentId: string): boolean {
  try { return !!localStorage.getItem(surveyDoneKey(userId, assessmentId)) } catch { return false }
}
export function markSurveyDone(userId: string, assessmentId: string, how: 'sent' | 'skipped'): void {
  try { localStorage.setItem(surveyDoneKey(userId, assessmentId), how) } catch { /* ignore */ }
}
