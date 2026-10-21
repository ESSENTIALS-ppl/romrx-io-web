// @vitest-environment jsdom
/** Step video slots (Oct 21 2026): /videos/<step id>.mp4 + poster, hidden when the file is missing. */
import { afterEach, describe, expect, it } from 'vitest'
import { act, createElement } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { StepVideo } from '../components/StepVideo'
import { SCREEN_VIDEO_IDS, stepVideo, VIDEO_STEP_IDS } from './stepVideo'
import { STEPS } from '../pages/assessmentSteps'
import { STEPS_PART1 } from '../pages/assessmentSteps1'
import { STEPS_PART2 } from '../pages/assessmentSteps2'

;(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true
let root: Root, host: HTMLDivElement
const mount = (id: string) => { host = document.createElement('div'); document.body.appendChild(host); root = createRoot(host); act(() => { root.render(createElement(StepVideo, { stepId: id, title: 'T' })) }) }
afterEach(() => { act(() => root?.unmount()); host?.remove() })

describe('step video slots', () => {
  it('every slot id is a real step id', () => {
    const ids = new Set([...STEPS, ...STEPS_PART1, ...STEPS_PART2].map(s => s.id))
    for (const id of VIDEO_STEP_IDS) if (!(SCREEN_VIDEO_IDS as readonly string[]).includes(id)) expect(ids.has(id), id).toBe(true)
  })
  it('paths are /videos/<step id>.mp4 and .jpg; unknown ids have no slot', () => {
    expect(stepVideo('hip_er')).toEqual({ src: '/videos/hip_er.mp4', poster: '/videos/hip_er.jpg' })
    expect(stepVideo('cervical_flex_ext')!.src).toBe('/videos/cervical_flex_ext.mp4')
    expect(stepVideo('lumbar')).toBeNull()
  })
  it('hidden until the poster loads, then a 1:1 square video with controls, no autoplay, preload none', () => {
    mount('shoulder_er')
    expect(host.querySelector('video')).toBeNull()
    expect(host.querySelector('[data-step-video]')!.className).toBe('hidden')
    act(() => { host.querySelector('[data-step-video-probe]')!.dispatchEvent(new Event('load')) })
    const v = host.querySelector('video')!
    expect(v.getAttribute('src')).toBe('/videos/shoulder_er.mp4')
    expect(v.getAttribute('poster')).toBe('/videos/shoulder_er.jpg')
    expect(v.hasAttribute('controls')).toBe(true)
    expect(v.hasAttribute('autoplay')).toBe(false)
    expect(v.getAttribute('preload')).toBe('none')
    expect(v.className).toContain('aspect-square')
    expect(v.className).not.toContain('aspect-[4/5]')
  })
  it('missing file: poster error removes the slot entirely', () => {
    mount('hip_ir')
    act(() => { host.querySelector('[data-step-video-probe]')!.dispatchEvent(new Event('error')) })
    expect(host.querySelector('[data-step-video]')).toBeNull()
  })
  it('video error after the poster loaded also removes the slot', () => {
    mount('hip_abd')
    act(() => { host.querySelector('[data-step-video-probe]')!.dispatchEvent(new Event('load')) })
    act(() => { host.querySelector('video')!.dispatchEvent(new Event('error')) })
    expect(host.querySelector('[data-step-video]')).toBeNull()
  })
  it('intro and outro have slots at /videos/intro.mp4 and /videos/outro.mp4', () => {
    expect(stepVideo('intro')).toEqual({ src: '/videos/intro.mp4', poster: '/videos/intro.jpg' })
    expect(stepVideo('outro')).toEqual({ src: '/videos/outro.mp4', poster: '/videos/outro.jpg' })
  })
  it('changing step remounts the slot: a step with no file stays hidden after a step whose video showed', () => {
    mount('hip_er')
    act(() => { host.querySelector('[data-step-video-probe]')!.dispatchEvent(new Event('load')) })
    expect(host.querySelector('video')).not.toBeNull()
    act(() => { root.render(createElement(StepVideo, { key: 'hip_flex', stepId: 'hip_flex', title: 'T' })) })
    expect(host.querySelector('video')).toBeNull()
    expect(host.querySelector('[data-step-video]')!.className).toBe('hidden')
  })
  it('a step with no slot renders nothing', () => {
    mount('lumbar')
    expect(host.innerHTML).toBe('')
  })
})
