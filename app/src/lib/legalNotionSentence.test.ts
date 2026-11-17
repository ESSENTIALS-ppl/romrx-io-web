// P1-25: the Privacy section 4 Notion sentence is Stacy's exact edit
// (STACY-P1-25-NOTION-TRASH-AND-DELETION-TEMPLATE-20261116-2120.md, sha256 b3197db6...). The rest of v4 is unchanged.
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(__dirname, '..', '..', '..')
const legal = readFileSync(join(ROOT, 'legal.html'), 'utf8')
const NEW = 'If we copied your feedback into our Notion workspace, we delete that copy too, and Notion permanently erases it within 30 days.'
const OLD = 'If we copied your feedback into our Notion workspace, we delete that copy too.'

describe('P1-25 Notion sentence in legal.html', () => {
  it('has Stacy b3197db6 new sentence exactly once and the old v4 sentence nowhere', () => {
    expect(legal.split(NEW).length - 1).toBe(1)
    expect(legal.includes(OLD)).toBe(false)
  })
  it('the sentence sits between the deletion line and the 90-day line, with no dashes', () => {
    const i = legal.indexOf(NEW)
    expect(legal.slice(i - 120, i)).toContain('your feedback and your app activity records. ')
    expect(legal.slice(i + NEW.length, i + NEW.length + 40)).toMatch(/^ A few remaining records/)
    expect(NEW).not.toMatch(/[\u2013\u2014]/)
  })
})
