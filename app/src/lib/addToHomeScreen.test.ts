import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { A2HS_TIP_COPY, a2hsPlatform, isStandalone, shouldShowA2hsTip } from './addToHomeScreen'

describe('P1-13 Add to Home Screen', () => {
  it('index.html links the manifest and iOS icon; manifest opens the Today card inside /app/', () => {
    const html = readFileSync(join(process.cwd(), 'index.html'), 'utf8')
    expect(html).toContain('<link rel="manifest" href="/assets/pwa/base.webmanifest" />')
    expect(html).toContain('href="/assets/pwa/apple-touch-icon-180.png"')
    const m = JSON.parse(readFileSync(join(process.cwd(), '..', 'assets', 'pwa', 'base.webmanifest'), 'utf8'))
    expect(m.start_url).toBe('/app/dashboard/my-protocol')
    expect(m.scope).toBe('/app/')
    expect(m.display).toBe('standalone')
    expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(['192x192', '512x512'])
  })
  it('platform and standalone detection', () => {
    expect(a2hsPlatform('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) Safari/604.1')).toBe('ios')
    expect(a2hsPlatform('Mozilla/5.0 (iPhone) CriOS/120')).toBe('other')
    expect(a2hsPlatform('Mozilla/5.0 (Linux; Android 14) Chrome/120')).toBe('android')
    expect(a2hsPlatform('Mozilla/5.0 (Windows NT 10.0)')).toBe('other')
    expect(isStandalone({ matchMedia: () => ({ matches: true }) })).toBe(true)
    expect(isStandalone({ navigator: { standalone: true } })).toBe(true)
    expect(isStandalone({ matchMedia: () => ({ matches: false }) })).toBe(false)
  })
  it('tip stays hidden until words are supplied (no placeholders in the bundle)', () => {
    expect(A2HS_TIP_COPY).toBeNull()
    expect(shouldShowA2hsTip(null, 'ios', false, false)).toBe(false)
    const c = { title: 't', body: 'b', iosSteps: 'i', androidButton: 'a', dismiss: 'd' }
    expect(shouldShowA2hsTip(c, 'ios', false, false)).toBe(true)
    expect(shouldShowA2hsTip(c, 'other', false, false)).toBe(false)
    expect(shouldShowA2hsTip(c, 'android', true, false)).toBe(false)
    expect(shouldShowA2hsTip(c, 'android', false, true)).toBe(false)
  })
})
