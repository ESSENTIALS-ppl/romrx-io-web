import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  FLAG_NAME, MEDIA_CACHE, MEDIA_CACHE_CAP, SHELL_CACHE, cacheKind, isOurCache,
  isUserApiPath, offlineCacheOn, shouldBypass,
} from './offlineCachePolicy'

const sw = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '../../public/sw.js'), 'utf8')

describe('P1-26 flag', () => {
  it('defaults off and only the exact string on enables it', () => {
    expect(offlineCacheOn({})).toBe(false)
    expect(offlineCacheOn({ [FLAG_NAME]: undefined })).toBe(false)
    expect(offlineCacheOn({ [FLAG_NAME]: '' })).toBe(false)
    expect(offlineCacheOn({ [FLAG_NAME]: 'true' })).toBe(false)
    expect(offlineCacheOn({ [FLAG_NAME]: '1' })).toBe(false)
    expect(offlineCacheOn({ [FLAG_NAME]: 'ON' })).toBe(false)
    expect(offlineCacheOn({ [FLAG_NAME]: 'on' })).toBe(true)
  })
})

describe('P1-26 cache policy', () => {
  const origin = 'https://romrx.io'
  const base = { method: 'GET', hasAuthorization: false, origin }

  it('never intercepts auth or API user data', () => {
    expect(shouldBypass({ method: 'GET', url: 'https://cqzvqzwwevnflinxgnpp.supabase.co/rest/v1/assessments', hasAuthorization: false })).toBe(true)
    expect(shouldBypass({ method: 'GET', url: 'https://cqzvqzwwevnflinxgnpp.supabase.co/auth/v1/user', hasAuthorization: true })).toBe(true)
    expect(shouldBypass({ method: 'POST', url: `${origin}/app/`, hasAuthorization: false })).toBe(true)
    expect(shouldBypass({ method: 'GET', url: `${origin}/app/`, hasAuthorization: true })).toBe(true)
    expect(shouldBypass({ method: 'GET', url: 'https://example.supabase.co/functions/v1/submit-assessment', hasAuthorization: false })).toBe(true)
    expect(isUserApiPath('/functions/v1/submit-assessment')).toBe(true)
    expect(isUserApiPath('/auth/v1/token')).toBe(true)
    expect(cacheKind({ ...base, url: `${origin}/app/` })).toBe('shell-html')
    expect(cacheKind({ ...base, url: 'https://example.supabase.co/rest/v1/x' })).toBe(null)
  })

  it('caches the app shell and same-origin videos only', () => {
    expect(cacheKind({ ...base, url: `${origin}/app/` })).toBe('shell-html')
    expect(cacheKind({ ...base, url: `${origin}/app/index.html` })).toBe('shell-html')
    expect(cacheKind({ ...base, url: `${origin}/app/assets/index-abc.js` })).toBe('shell-asset')
    expect(cacheKind({ ...base, url: `${origin}/videos/hip_er.mp4` })).toBe('media')
    expect(cacheKind({ ...base, url: `${origin}/videos/hip_er.jpg` })).toBe('media')
    expect(cacheKind({ ...base, url: `${origin}/legal.html` })).toBe(null)
    expect(cacheKind({ ...base, url: 'https://fonts.googleapis.com/css2?family=Inter' })).toBe(null)
  })

  it('pins cache names and the cap', () => {
    expect(SHELL_CACHE).toBe('romrx-p1-26-shell-v1')
    expect(MEDIA_CACHE).toBe('romrx-p1-26-media-v1')
    expect(MEDIA_CACHE_CAP).toBe(24)
    expect(isOurCache('romrx-p1-26-shell-v1')).toBe(true)
    expect(isOurCache('other')).toBe(false)
  })

  it('keeps public/sw.js in sync with the deny and allow rules', () => {
    expect(sw).toContain("request.headers.has('Authorization')")
    expect(sw).toContain('supabase.co')
    expect(sw).toContain('/videos/')
    expect(sw).toContain("request.method !== 'GET'")
    expect(sw).toContain(SHELL_CACHE)
    expect(sw).toContain(MEDIA_CACHE)
    expect(sw).toMatch(/functions\|storage\|realtime/)
  })
})
