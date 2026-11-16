// @vitest-environment jsdom
/** Words and screens for assessment progress saving (Stacy ruling Oct 28 2026) and the Resume and leave sheet renders. */
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('./track', () => ({ track: () => {}, trackPageView: () => {} }))

import * as copy from './assessmentDraftCopy'
import { AssessmentPhases } from '../pages/AssessmentPhases'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let host: HTMLDivElement
let root: Root
beforeEach(() => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host) })
afterEach(() => { act(() => root.unmount()); host.remove() })
const noop = () => {}
const base = { stepIdx: 0, values: {}, email: '', fullName: '', loading: false, error: '', setPhase: noop, setStepIdx: noop, setEmail: noop, setFullName: noop, handleChange: noop, handleNext: noop, handleLeadSubmit: noop }

describe('copy', () => {
  it('resume line and leave text are exactly the cleared words', () => {
    expect(copy.RESUME_RETENTION).toBe('Your answers are saved for 48 hours after your last step.')
    expect(copy.LEAVE_SAVED).toBe('Your progress is saved. You can pick up where you left off, on this or any device, for the next 48 hours.')
    expect(copy.LEAVE_UNSAVED_LAST).toBe('Your last step is not saved yet. Stay a moment, or it will be kept on this device only.')
    expect(copy.SAVE_STATUS_FAILED).toBe('Not saved yet. We will keep trying.')
  })
  it('no em dashes, en dashes, or the banned word', () => {
    for (const v of Object.values(copy)) {
      const t = typeof v === 'function' ? (v as (a: number, b: number) => string)(3, 9) : String(v)
      expect(t).not.toMatch(/[\u2014\u2013]/)
      expect(t.toLowerCase()).not.toContain('limit' + 'ed')
    }
  })
})

describe('Resume screen', () => {
  const resume = (armed = false, calls: string[] = []) => ({ done: 6, total: 9, startOverArmed: armed, onResume: () => calls.push('resume'), onStartOver: () => calls.push('over') })
  it('shows the progress line, the retention line and two buttons', () => {
    act(() => root.render(createElement(AssessmentPhases, { ...base, phase: 'resume', resume: resume() } as never)))
    const t = host.textContent ?? ''
    expect(t).toContain('You finished 6 of 9 steps.')
    expect(t).toContain(copy.RESUME_RETENTION)
    expect(host.querySelector('[data-resume-go]')).not.toBeNull()
    expect(host.querySelector('[data-resume-start-over]')!.textContent).toBe(copy.START_OVER_BUTTON)
  })
  it('Start over asks once: the second look shows the confirm words; buttons call back', () => {
    const calls: string[] = []
    act(() => root.render(createElement(AssessmentPhases, { ...base, phase: 'resume', resume: resume(true, calls) } as never)))
    expect(host.querySelector('[data-resume-start-over]')!.textContent).toBe(copy.START_OVER_CONFIRM)
    act(() => { (host.querySelector('[data-resume-go]') as HTMLButtonElement).click() })
    act(() => { (host.querySelector('[data-resume-start-over]') as HTMLButtonElement).click() })
    expect(calls).toEqual(['resume', 'over'])
  })
  it('mood is not mentioned and the mood screen is not rendered by Resume', () => {
    act(() => root.render(createElement(AssessmentPhases, { ...base, phase: 'resume', resume: resume() } as never)))
    expect((host.textContent ?? '').toLowerCase()).not.toContain('mood')
  })
})

describe('Leave sheet and save status over the measure screen', () => {
  const sheet = (kind: 'saved' | 'unsaved-last' | 'signed-out', open = true) => ({ open, kind, onStay: noop, onLeave: noop })
  it('closed: no sheet', () => {
    act(() => root.render(createElement(AssessmentPhases, { ...base, phase: 'measure', leave: sheet('saved', false) } as never)))
    expect(host.querySelector('[data-leave-sheet]')).toBeNull()
  })
  it('open shows the right text for each kind, with Stay and Leave', () => {
    const txt = { saved: copy.LEAVE_SAVED, 'unsaved-last': copy.LEAVE_UNSAVED_LAST, 'signed-out': copy.LEAVE_SIGNED_OUT } as const
    for (const k of Object.keys(txt) as (keyof typeof txt)[]) {
      act(() => root.render(createElement(AssessmentPhases, { ...base, phase: 'measure', leave: sheet(k) } as never)))
      expect(host.querySelector('[data-leave-text]')!.textContent).toBe(txt[k])
      expect(host.querySelector('[data-leave-stay]')!.textContent).toBe('Stay')
      expect(host.querySelector('[data-leave-leave]')!.textContent).toBe('Leave')
    }
  })
  it('the save line shows Saved or the failure words, and is absent for signed-out (undefined) and idle', () => {
    for (const [st, want] of [['saved', 'Saved'], ['failed', copy.SAVE_STATUS_FAILED]] as const) {
      act(() => root.render(createElement(AssessmentPhases, { ...base, phase: 'measure', saveStatus: st } as never)))
      expect(host.querySelector('[data-save-status]')!.textContent).toBe(want)
    }
    for (const st of [undefined, 'idle'] as const) {
      act(() => root.render(createElement(AssessmentPhases, { ...base, phase: 'measure', saveStatus: st } as never)))
      expect(host.querySelector('[data-save-status]')).toBeNull()
    }
  })
  it('Skip tells the page the step was skipped; Next sends no argument', () => {
    const calls: unknown[][] = []
    act(() => root.render(createElement(AssessmentPhases, { ...base, phase: 'measure', handleNext: (...a: unknown[]) => calls.push(a) } as never)))
    const btns = [...host.querySelectorAll('button')]
    act(() => { btns.find(b => /Skip/.test(b.textContent ?? ''))!.click() })
    act(() => { btns.find(b => /Next/.test(b.textContent ?? ''))!.click() })
    expect(calls).toEqual([[{ skipped: true }], []])
  })
})
