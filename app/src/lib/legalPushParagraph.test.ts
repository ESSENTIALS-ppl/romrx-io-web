// P1-14 r10: the Privacy section 1 push paragraph is Stacy's section B text, byte-exact
// (STACY-P1-14-PUSH-AND-P1-31-TITLES-20261116-2029.md, sha256 219378b5...). Placement (Grant, Nov 17, option a):
// its own unlabelled <p> directly after the "Reminders:" paragraph.
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(__dirname, '..', '..', '..')
const legal = readFileSync(join(ROOT, 'legal.html'), 'utf8')
const PARA = "If you turn on notifications, we save the push address your browser gives us so we can send your reminders. The reminder goes to your device through your browser's push service, such as Google, Apple or Mozilla. Reminders do not include your scores or health details. You can turn them off anytime in Settings or in your browser, and we delete the push address when you delete your account."

describe('P1-14 push paragraph in legal.html (Privacy section 1)', () => {
  it('appears exactly once, as its own unlabelled paragraph', () => {
    expect(legal.split(PARA).length - 1).toBe(1)
    expect(legal).toContain(`<p>${PARA}</p>`)
  })
  it('sits directly after the Reminders paragraph, inside section 1, before ROMBot chats', () => {
    const lines = legal.split('\n')
    const i = lines.findIndex(l => l.includes(PARA))
    expect(lines[i - 1].trim().startsWith('<p><strong>Reminders:</strong>')).toBe(true)
    expect(lines[i - 1].trim().endsWith('</p>')).toBe(true)
    expect(lines[i + 1].trim().startsWith('<p><strong>ROMBot chats:</strong>')).toBe(true)
    const s1 = legal.indexOf('1. What we collect</h3>'); const s2 = legal.indexOf('2. How we use it</h3>')
    expect(legal.indexOf(PARA)).toBeGreaterThan(s1)
    expect(legal.indexOf(PARA)).toBeLessThan(s2)
  })
  it('has no dashes', () => {
    expect(PARA).not.toMatch(/[\u2013\u2014]/)
    expect(PARA).not.toContain(' - ')
    expect(legal.split('\n').find(l => l.includes(PARA))).not.toMatch(/[\u2013\u2014]/)
  })
})
