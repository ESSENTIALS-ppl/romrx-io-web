import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// Grant 11:29 Oct 20 2026: beta title names the price. Page title and og:title must match exactly.
const TITLE = 'ROMRx Beta · Free through Dec 31, 2026, then $60 a year'
const html = readFileSync(join(__dirname, '../../../beta.html'), 'utf8')

describe('beta page title', () => {
  it('title and og:title carry the price line, no em dash', () => {
    expect(html).toContain(`<title>${TITLE}</title>`)
    expect(html).toContain(`<meta property="og:title" content="${TITLE}">`)
    expect(html).not.toContain('Free through December 31, 2026</title>')
    expect(TITLE).not.toMatch(/\u2014/)
  })
})
