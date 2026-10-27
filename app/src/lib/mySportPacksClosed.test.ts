import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const src = readFileSync(resolve(__dirname, '../pages/MySport.tsx'), 'utf8')

describe('My Sport: packs closed during beta (Oct 12 batch)', () => {
  it('never starts a sport-pack checkout', () => {
    expect(src).not.toMatch(/mode:\s*'unlock'/)
    expect(src).not.toMatch(/startSportCheckout/)
    expect(src).not.toMatch(/SPORT_PRICE_IDS/)
  })
  it('shows the Stacy-cleared lines (R8/R9)', () => {
    expect(src).toContain('Coming {PACK_LAUNCH_DATE}')
    expect(src).not.toContain('January 2027')
    expect(src).toContain('{PACKS_CLOSED_MESSAGE}')
    expect(src).toContain('ROMBot, and sport packs when they open in {PACK_LAUNCH_DATE}. {PACK_EMAIL_LINE}')
    expect(src).not.toMatch(/at checkout after beta/)
    expect(src).not.toMatch(/>\s*Add \{/)
  })
  it('keeps holders working: Your sports list + Open app SSO unchanged', () => {
    expect(src).toContain('title="Your sports"')
    expect(src).toContain('openSportApp(e.sport)')
    expect(src).toContain('type=sso')
  })
})
