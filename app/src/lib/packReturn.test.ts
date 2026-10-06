import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  PACK_RETURN_URLS, packReturnKey, packReturnUrl, loginForPackAssessment,
  safeNextPath, stashPostAuthNext, takePostAuthNext,
} from './packReturn'

function memStore() {
  const m = new Map<string, string>()
  return {
    getItem: (k: string) => m.get(k) ?? null,
    setItem: (k: string, v: string) => { m.set(k, v) },
    removeItem: (k: string) => { m.delete(k) },
    m,
  }
}

describe('packReturnKey / packReturnUrl (return_to is a key, never a URL)', () => {
  it('accepts only bjj and bodybuilding', () => {
    expect(packReturnKey('?return_to=bjj')).toBe('bjj')
    expect(packReturnKey('?return_to=BodyBuilding')).toBe('bodybuilding')
    expect(packReturnKey('?return_to=yoga')).toBeNull()
    expect(packReturnKey('?return_to=https://evil.example/x')).toBeNull()
    expect(packReturnKey('?return_to=__proto__')).toBeNull()
    expect(packReturnKey('?return_to=toString')).toBeNull()
    expect(packReturnKey('')).toBeNull()
  })
  it('maps to the fixed pack dashboards', () => {
    expect(packReturnUrl('bjj')).toBe('https://romrxbjj.com/dashboard/my-body')
    expect(packReturnUrl('bodybuilding')).toBe('https://romrxbodybuilding.com/dashboard/my-game')
    expect(packReturnUrl(null)).toBeNull()
    for (const u of Object.values(PACK_RETURN_URLS)) expect(new URL(u).protocol).toBe('https:')
  })
  it('login path round-trips to the assessment with the same key', () => {
    const p = loginForPackAssessment('bjj')
    const u = new URL(p, 'https://romrx.io/app')
    expect(u.pathname).toBe('/login')
    const next = safeNextPath(u.searchParams.get('next'))
    expect(next).toBe('/onboarding/assessment?return_to=bjj')
    expect(packReturnKey(next!.split('?')[1])).toBe('bjj')
  })
})

describe('safeNextPath', () => {
  it('keeps in-app paths', () => {
    expect(safeNextPath('/onboarding/assessment?return_to=bjj')).toBe('/onboarding/assessment?return_to=bjj')
    expect(safeNextPath('/unlock/abc123')).toBe('/unlock/abc123')
    expect(safeNextPath('/app/onboarding/assessment')).toBe('/onboarding/assessment')
    expect(safeNextPath('/app')).toBe('/')
  })
  it('rejects anything that could leave the app', () => {
    for (const bad of ['https://evil.example', '//evil.example', '/\\evil.example', '/x\\y', 'javascript:alert(1)', '/javascript:alert(1)', 'evil', '', null, undefined]) {
      expect(safeNextPath(bad as string | null | undefined)).toBeNull()
    }
  })
})

describe('magic-link stash', () => {
  it('returns a fresh next once, then clears it', () => {
    const s = memStore()
    stashPostAuthNext('/onboarding/assessment?return_to=bodybuilding', 1000, s)
    expect(takePostAuthNext(2000, s)).toBe('/onboarding/assessment?return_to=bodybuilding')
    expect(takePostAuthNext(2001, s)).toBeNull()
  })
  it('expires after 30 minutes and ignores unsafe or broken values', () => {
    const s = memStore()
    stashPostAuthNext('/onboarding/assessment', 0, s)
    expect(takePostAuthNext(30 * 60 * 1000 + 1, s)).toBeNull()
    stashPostAuthNext('https://evil.example', 0, s)
    expect(s.m.size).toBe(0)
    s.setItem('romrx_post_auth_next', '{"next":"//evil.example","at":0}')
    expect(takePostAuthNext(1, s)).toBeNull()
    s.setItem('romrx_post_auth_next', 'not json')
    expect(takePostAuthNext(1, s)).toBeNull()
  })
  it('no storage is a no-op', () => {
    expect(() => stashPostAuthNext('/x', 0, null)).not.toThrow()
    expect(takePostAuthNext(0, null)).toBeNull()
  })
})

describe('wiring (source checks)', () => {
  const src = (p: string) => readFileSync(join(__dirname, '..', p), 'utf8')
  it('Login honors a safe next and stashes it for the magic link', () => {
    const s = src('pages/Login.tsx')
    expect(s).toContain("safeNextPath(new URLSearchParams(window.location.search).get('next'))")
    expect(s).toContain('resolvePostAuthDest(session.user?.id, nextPath)')
    expect(s).toContain('stashPostAuthNext(nextPath)')
    expect(s).toContain('Sign in to take your assessment. Use the same email and password you use on your sport site.')
  })
  it('Assessment: pack visitors sign in first and go back to the pack when done', () => {
    const s = src('pages/Assessment.tsx')
    expect(s).toContain('packReturnKey(window.location.search)')
    expect(s).toContain('navigate(loginForPackAssessment(returnKey), { replace: true })')
    expect(s).toContain('if (packUrl) window.location.assign(packUrl)')
    expect(s).toContain("else navigate('/onboarding/results', { replace: true })")
  })
  it('postAuthDest reads (and clears) the stash; explicit next still wins', () => {
    const s = src('lib/postAuthDest.ts')
    const take = s.indexOf('takePostAuthNext()')
    const explicit = s.indexOf("if (explicitNext && explicitNext.startsWith('/')) return explicitNext")
    expect(take).toBeGreaterThan(-1)
    expect(explicit).toBeGreaterThan(take)
  })
  it('new customer copy: no em dashes, no Profile', () => {
    const line = 'Sign in to take your assessment. Use the same email and password you use on your sport site.'
    expect(line).not.toMatch(/\u2014|Profile/)
  })
})
