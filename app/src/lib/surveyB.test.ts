import { describe, expect, it } from 'vitest'
import {
  SURVEY_B_COPY as C,
  cycleCard,
  allSurveyBStrings,
  buildSurveyFeedbackRow,
  surveyBEligibility,
  type EligibilityInput,
} from './surveyB'

const H = 60 * 60 * 1000
const now = Date.UTC(2026, 9, 25, 15)
const base = (over: Partial<EligibilityInput> = {}): EligibilityInput => ({
  enabled: true,
  assessments: [{ id: 'a2', assessed_at: new Date(now - 2 * H).toISOString() }],
  now,
  otherPromptThisSession: false,
  serverLastCompleteAt: null,
  local: { done: false, laterCount: 0, laterThisSession: false, quietUntil: null, lastComplete: null },
  ...over,
})

describe('survey card B copy (Stacy edits Oct 19)', () => {
  const all = allSurveyBStrings()
  it('no banned words, no em dash, no NPS, no coach, no loop promise', () => {
    for (const s of all) {
      expect(s).not.toMatch(/\u2014|\u2013/)
      expect(s).not.toMatch(/\b(normal|safe\w*|cleared|protect\w*|coach\w*|injur\w*|pain\w*|medical clearance|recommend|0-10|0 to 10|you asked|we built|we will mark)\b/i)
      expect(s).not.toMatch(/\b(colour|favour|behaviour|optimis|organis|programme)\w*/i)
    }
  })
  it('exact Stacy lines (ticket, 7:24 + 7:27 PM ET)', () => {
    expect(C.first.title).toBe('Quick question')
    expect(C.first.questions.map(q => q.prompt)).toEqual(['How easy was this assessment?', 'Were your results clear?', 'Will you check again in a few weeks?'])
    expect(C.first.after).toBe('Thanks. Your answers help us decide what to work on.')
    expect(C.reassess.title).toBe('Help shape ROMRx')
    expect(C.error).toBe("Couldn't send your answers. Please try again.")
    expect(C.reassess.smallPrint).toBe("Please don't include health details. We read every answer.")
    expect(C.cycles.header).toBe('Help shape ROMRx')
    expect(C.cycles.noHealth).toBe("Please don't include health details.")
    expect(C.cycles.byCycle[4].q2SmallPrint).toMatch(/^If you tap Yes, we may email you/)
  })
  it('no "improve" anywhere', () => { for (const s of allSurveyBStrings()) expect(s).not.toMatch(/improve/i) })
  it('cycle cards 2 to 4 only', () => {
    expect(cycleCard(1)).toBeNull(); expect(cycleCard(5)).toBeNull()
    expect(cycleCard(3)?.q1.prompt).toBe('How useful are your results so far?')
  })
})

describe('eligibility', () => {
  it('flag off -> never', () => expect(surveyBEligibility(base({ enabled: false })).show).toBe(false))
  it('never assessed -> never', () => expect(surveyBEligibility(base({ assessments: [] })).show).toBe(false))
  it('first assessment -> first set; second -> reassess set', () => {
    expect(surveyBEligibility(base())).toMatchObject({ show: true, moment: 'first', cycle: 1 })
    const two = [{ id: 'a2', assessed_at: new Date(now - H).toISOString() }, { id: 'a1', assessed_at: '2026-09-01T00:00:00Z' }]
    expect(surveyBEligibility(base({ assessments: two }))).toMatchObject({ show: true, moment: 'reassess', cycle: 2, assessmentId: 'a2' })
  })
  it('not right after an assessment (older than 72h) -> no', () => {
    expect(surveyBEligibility(base({ assessments: [{ id: 'a', assessed_at: new Date(now - 73 * H).toISOString() }] })).show).toBe(false)
  })
  it('another prompt this session -> no', () => expect(surveyBEligibility(base({ otherPromptThisSession: true })).show).toBe(false))
  it('done, asked later this session, twice later, quiet, 30-day cap -> no', () => {
    const l = base().local
    expect(surveyBEligibility(base({ local: { ...l, done: true } })).show).toBe(false)
    expect(surveyBEligibility(base({ local: { ...l, laterThisSession: true } })).show).toBe(false)
    expect(surveyBEligibility(base({ local: { ...l, laterCount: 2 } })).show).toBe(false)
    expect(surveyBEligibility(base({ local: { ...l, quietUntil: now + H } })).show).toBe(false)
    expect(surveyBEligibility(base({ serverLastCompleteAt: now - 29 * 24 * H })).show).toBe(false)
    expect(surveyBEligibility(base({ serverLastCompleteAt: now - 31 * 24 * H })).show).toBe(true)
  })
})

describe('client_feedback row', () => {
  const ctx = {
    userId: 'u1', email: 'a@x.com', moment: 'reassess' as const, cycle: 2, assessmentId: 'a2', overallBand: 2 as const,
    bandMix: { needs_focus: 2, building: 3, steady: 4 }, top3: ['hip_ir', 'ankle_df'], pageUrl: '/dashboard/my-body',
  }
  it('no email unless the recruit box is ticked', () => {
    expect(buildSurveyFeedbackRow(ctx, { q1: 'Yes, close enough' }).metadata.email).toBeNull()
    expect(buildSurveyFeedbackRow(ctx, { q1: 'Yes, close enough', recruit_ok: true }).metadata.email).toBe('a@x.com')
  })
  it('fits the client_feedback checks and carries tags', () => {
    const r = buildSurveyFeedbackRow(ctx, { q1: 'No, it felt off', q2: 'Something else', q2_other: 'x'.repeat(500), q4: 'y'.repeat(900) })
    expect(r.category).toBe('survey')
    expect(r.sport).toBe('base')
    expect(r.message.length).toBeGreaterThanOrEqual(5)
    expect(r.message.length).toBeLessThanOrEqual(1000)
    expect(r.metadata.answers.q2_other?.length).toBe(200)
    expect(r.metadata.answers.q4?.length).toBe(280)
    expect(r.metadata).toMatchObject({ kind: 'survey_b', moment: 'reassess', cycle: 2, band_mix: ctx.bandMix, top3: ctx.top3, recruit_ok: false })
    expect(buildSurveyFeedbackRow(ctx, {}).message).toMatch(/\(skipped\)/)
  })
})
