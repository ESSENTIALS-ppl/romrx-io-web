/**
 * /legal chrome cosmetics (2026-09-29): CSS/JS only, no legal copy.
 * - anchored headings (#privacy ...) clear the sticky header
 * - open consent banner reserves bottom padding on /legal (opt-in body attr), removed after a choice
 * - site header: wordmark / Log in / CTA keep a gap at 375px
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

const ROOT = resolve(__dirname, '..', '..', '..')
const read = (p: string) => readFileSync(join(ROOT, p), 'utf8')

describe('/legal chrome cosmetics', () => {
  it('legal anchors get scroll-margin-top below the sticky nav', () => {
    expect(read('assets/design-tokens.css')).toMatch(/\.rx-legal-doc \[id\] \{ scroll-margin-top: 104px; \}/)
  })
  it('banner bottom padding is site-wide (Field #99); consent.js keeps it in sync and clears it on hide', () => {
    expect(read('legal.html')).toMatch(/<body data-rx-here="romrx" data-rx-chrome="minimal" data-rx-banner-pad>/)
    const js = read('assets/consent.js')
    expect(js).toMatch(/function syncBannerPad\(\)/)
    expect(js).not.toMatch(/hasAttribute\('data-rx-banner-pad'\)/)
    expect(js).toMatch(/if \(!open \|\| !document\.body\) \{/)
    expect(js).toMatch(/document\.body\.appendChild\(el\);\n    watchBannerPad\(el\);/)
    expect(js).toMatch(/if \(b\) b\.setAttribute\('hidden', ''\);\n    syncBannerPad\(\);/)
    expect(read('assets/consent.css')).toMatch(/html\.rx-consent-open body \{\n  padding-bottom: var\(--rx-consent-pad, 0px\);/)
    expect(read('assets/consent.css')).not.toMatch(/body\[data-rx-banner-pad\]/)
  })
  it('legal.html text is unchanged apart from the body attribute (no copy edits here)', () => {
    const s = read('legal.html')
    expect(s).toMatch(/<h2 class="rx-h2" id="privacy">Privacy Policy<\/h2>/)
    expect(s).toMatch(/Effective September 29, 2026/)
  })
  it('header keeps a gap between wordmark, Log in and CTA on phones', () => {
    const css = read('assets/design-tokens.css')
    expect(css).toMatch(/justify-content: space-between;\n  gap: 16px;/)
    expect(css).toMatch(/@media \(max-width: 420px\) \{\n  \.rx-nav-inner \{ padding: 14px 16px; gap: 12px; \}/)
  })
})
