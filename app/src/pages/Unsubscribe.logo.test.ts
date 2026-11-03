import { existsSync, readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

// The unsubscribe card logo must point at a file the site really serves. /romrx-logo.png never existed in the repo (404 on live).
// The site root is the repo root (netlify publish "."), so /assets/x is <repo>/assets/x.
describe('Unsubscribe logo path', () => {
  const src = readFileSync(join(resolve(__dirname), 'Unsubscribe.tsx'), 'utf8')
  const m = src.match(/<img\s+src="([^"]+)"/)
  it('does not use the missing /romrx-logo.png', () => {
    expect(src).not.toMatch(/romrx-logo\.png/)
  })
  it('uses a root path that exists in the repo (site root = repo root)', () => {
    expect(m).not.toBeNull()
    const url = m![1]
    expect(url.startsWith('/assets/')).toBe(true)
    expect(existsSync(resolve(__dirname, '..', '..', '..', url.slice(1)))).toBe(true)
  })
})
