// P1-18 (Base engagement, L1031): "How did that feel?" after a finished session, plus a short optional survey.
// OFF by default. SHOW_SESSION_FEEDBACK stays false until Avery's public.session_feedback table is live
// (spec: process/evidence/JULES-P1-18-SESSION-FEEDBACK-SPEC-20261116.md). While it is false the prompt never
// renders, never reads and never writes, so shipping this before the migration changes nothing for users.
// Words: Stacy CLEARED 1 to 19 as written (STACY-P1-18-WORDS-20261116-1908.md, sha256 97e2d251, reviewing
// JULES-P1-18-PROPOSED-WORDS-20261116.md 801b1a05). noteHelp is her recommended addition, verbatim (Grant's call).
// Every new customer-facing string lives in P1_18_WORDS; reused strings are marked with their source.

export const SHOW_SESSION_FEEDBACK = false

export const P1_18_WORDS = {
  title: 'How did that feel?',
  feelEasy: 'Easy',
  feelRight: 'About right',
  feelHard: 'Hard',
  more: 'Tell us more (optional)',
  qClear: 'Were the moves clear?',
  aYes: 'Yes',
  aSomewhat: 'Somewhat',
  aNo: 'No',
  qLength: 'How was the length?',
  aTooShort: 'Too short',
  aLengthRight: 'About right',
  aTooLong: 'Too long',
  noteLabel: 'Anything else?',
  noteHelp: 'If a move hurts, stop it and check with a doctor or physical therapist.', // Stacy 1908 recommended line, under the note box
  send: 'Send feedback', // existing: FeedbackWidget.tsx
  sending: 'Sending...', // existing: FeedbackWidget.tsx
  notNow: 'Not now', // existing: reminderCopy.ts, quickCheck.ts, addToHomeScreen.ts
  thanks: 'Thanks. We got it.', // existing: FeedbackWidget.tsx
  error: 'Something went wrong. Please try again.', // existing generic line
} as const

export type Feel = 'easy' | 'about_right' | 'hard'
export type Clear = 'yes' | 'somewhat' | 'no'
export type LengthFit = 'too_short' | 'about_right' | 'too_long'

export const FEELS: readonly Feel[] = ['easy', 'about_right', 'hard']
export const CLEARS: readonly Clear[] = ['yes', 'somewhat', 'no']
export const LENGTH_FITS: readonly LengthFit[] = ['too_short', 'about_right', 'too_long']
export const NOTE_MAX = 500

export const FEEL_LABEL: Record<Feel, string> = { easy: P1_18_WORDS.feelEasy, about_right: P1_18_WORDS.feelRight, hard: P1_18_WORDS.feelHard }
export const CLEAR_LABEL: Record<Clear, string> = { yes: P1_18_WORDS.aYes, somewhat: P1_18_WORDS.aSomewhat, no: P1_18_WORDS.aNo }
export const LENGTH_LABEL: Record<LengthFit, string> = { too_short: P1_18_WORDS.aTooShort, about_right: P1_18_WORDS.aLengthRight, too_long: P1_18_WORDS.aTooLong }

export const SESSION_FEEDBACK_TABLE = 'session_feedback'

/** One row of public.session_feedback, exactly the spec's client-written columns (id and created_at are server defaults). */
export interface SessionFeedbackRow {
  user_id: string
  session_id: string
  session_date: string
  feel: Feel
  clear: Clear | null
  length_fit: LengthFit | null
  note: string | null
  sport: 'base'
  source: 'web'
}

export interface SurveyAnswers { clear?: Clear | null; length_fit?: LengthFit | null; note?: string | null }

export function buildFeedbackRow(userId: string, sessionId: string, sessionDate: string, feel: Feel, survey: SurveyAnswers = {}): SessionFeedbackRow {
  const note = (survey.note ?? '').trim().slice(0, NOTE_MAX)
  return {
    user_id: userId,
    session_id: sessionId,
    session_date: sessionDate,
    feel,
    clear: survey.clear ?? null,
    length_fit: survey.length_fit ?? null,
    note: note ? note : null,
    sport: 'base',
    source: 'web',
  }
}

/** Once per session: answered or skipped is remembered per user per local session day (one protocol_sessions row per day). */
export function feelDoneKey(userId: string, sessionDate: string): string {
  return `romrx_session_feel_${userId}_${sessionDate}`
}

export function readFeelDone(userId: string, sessionDate: string): boolean {
  try { return !!localStorage.getItem(feelDoneKey(userId, sessionDate)) } catch { return false }
}

export function markFeelDone(userId: string, sessionDate: string, how: 'sent' | 'skipped'): void {
  try { localStorage.setItem(feelDoneKey(userId, sessionDate), how) } catch { /* ignore */ }
}

/** 23505 = this session already has a row (unique per session): treat as sent, never show an error. */
export function isAlreadySent(error: { code?: string } | null | undefined): boolean {
  return !!error && error.code === '23505'
}
