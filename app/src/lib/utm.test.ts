import { describe, it, expect, beforeEach } from 'vitest'
import { captureUtmFromUrl, getSignupAttribution, UTM_STORAGE_KEY, UTM_FIRST_TOUCH_KEY } from './utm'

function memStorage() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v) },
    removeItem: (k: string) => { m.delete(k) },
    clear: () => m.clear(),
  }
}

describe('utm last touch wins (Reid utm1, Oct 19)', () => {
  beforeEach(() => {
    ;(globalThis as unknown as { localStorage: ReturnType<typeof memStorage> }).localStorage = memStorage()
  })

  it('new URL params overwrite old stored ones; first touch kept separately', () => {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify({ utm_source: 'owned', utm_medium: 'site', utm_campaign: 'ROMRx_Base_Beta_2026' }))
    captureUtmFromUrl('?utm_source=email&utm_medium=invite_email&utm_campaign=beta_20261019&utm_content=invite_v5', '/')
    const { meta, signup_source } = getSignupAttribution('')
    expect(meta.utm_campaign).toBe('beta_20261019')
    expect(meta.utm_source).toBe('email')
    expect(meta.utm_content).toBe('invite_v5')
    expect(signup_source).toBe('email')
    expect(JSON.parse(localStorage.getItem(UTM_FIRST_TOUCH_KEY)!).utm_campaign).toBe('ROMRx_Base_Beta_2026')
  })

  it('no URL params keeps the stored ones', () => {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify({ utm_source: 'owned', utm_campaign: 'x' }))
    captureUtmFromUrl('', '/')
    expect(getSignupAttribution('').meta.utm_source).toBe('owned')
  })

  it('stale stored utm_content/term do not leak into a new touch', () => {
    localStorage.setItem(UTM_STORAGE_KEY, JSON.stringify({ utm_source: 'owned', utm_content: 'nav_cta', utm_term: 'old' }))
    captureUtmFromUrl('?utm_source=email&utm_campaign=beta_20261019', '/')
    const { meta } = getSignupAttribution('')
    expect(meta.utm_content).toBeUndefined()
    expect(meta.utm_term).toBeUndefined()
  })
})
