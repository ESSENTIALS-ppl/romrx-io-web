/** Assessment video files (Oct 21 2026): every slot has a file and poster except hip_flex (reshoot Oct 22, slot stays hidden). */
import { describe, expect, it } from 'vitest'
import { existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { VIDEO_STEP_IDS } from './stepVideo'

const dir = resolve(__dirname, '../../../videos')
const PENDING = ['hip_flex']

describe('assessment video files', () => {
  for (const id of VIDEO_STEP_IDS) {
    if (PENDING.includes(id)) {
      it(`${id} has no file yet, so its slot stays hidden`, () => {
        expect(existsSync(`${dir}/${id}.mp4`)).toBe(false)
        expect(existsSync(`${dir}/${id}.jpg`)).toBe(false)
      })
    } else {
      it(`${id} has an mp4 under 8 MB and a poster`, () => {
        expect(existsSync(`${dir}/${id}.mp4`)).toBe(true)
        expect(statSync(`${dir}/${id}.mp4`).size).toBeLessThan(8 * 1024 * 1024)
        expect(existsSync(`${dir}/${id}.jpg`)).toBe(true)
      })
    }
  }
  it('no lumbar video', () => { expect(existsSync(`${dir}/lumbar.mp4`)).toBe(false) })
})
