/**
 * Jim 2026-09-29: app minimum age 18+. Guards the age pickers and the
 * server-side migration against an under-18 option coming back.
 */
import { readFileSync, readdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { AGE_BUCKETS, isAllowedAgeBucket } from './ageBuckets'

const SRC = resolve(__dirname, '..')
const ROOT = resolve(__dirname, '..', '..', '..')
const read = (p: string) => readFileSync(p, 'utf8')

describe('age buckets are adults only', () => {
  it('has no under-18 option', () => {
    expect(AGE_BUCKETS.map(b => b.v)).toEqual(['18-29', '30-44', '45-59', '60+'])
    for (const b of AGE_BUCKETS) expect(b.l).not.toMatch(/\b(1[0-7]|[0-9])\b(?! and over)/)
  })

  it('rejects the retired 13-17 bucket and junk', () => {
    expect(isAllowedAgeBucket('13-17')).toBe(false)
    expect(isAllowedAgeBucket('')).toBe(false)
    expect(isAllowedAgeBucket(null)).toBe(false)
    expect(isAllowedAgeBucket('18-29')).toBe(true)
  })

  it('every picker uses the shared list and none defines its own', () => {
    for (const f of ['pages/Signup.tsx', 'pages/CompleteProfile.tsx', 'pages/Settings.tsx']) {
      const s = read(join(SRC, f))
      expect(s, f).toMatch(/from '\.\.\/lib\/ageBuckets'/)
      expect(s, f).not.toMatch(/const AGE_BUCKETS\s*=/)
    }
  })

  it('no app source offers 13-17 / "13 to 17"', () => {
    const walk = (d: string): string[] => readdirSync(d, { withFileTypes: true }).flatMap(e =>
      e.isDirectory() ? walk(join(d, e.name)) : /\.(tsx?|jsx?)$/.test(e.name) && !/\.test\./.test(e.name) ? [join(d, e.name)] : [])
    for (const f of walk(SRC)) {
      const s = read(f).replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')
      if (f.endsWith('ageBuckets.ts')) continue
      expect(s, f).not.toMatch(/13 to 17|'13-17'/)
    }
  })

  it('Signup keeps the age group required and adds no new 18+ copy', () => {
    const s = read(join(SRC, 'pages/Signup.tsx'))
    expect(s).toMatch(/Age group is required\./)
    expect(s).not.toMatch(/18 or older|18\+/)
  })

  it('AuthConfirm only copies an allowed bucket from signup metadata', () => {
    expect(read(join(SRC, 'pages/AuthConfirm.tsx'))).toMatch(/isAllowedAgeBucket\(meta\.age_bucket\)/)
  })

  it('migration enforces new writes only (trigger, no revalidation)', () => {
    const m = read(join(ROOT, 'supabase/migrations/20260929041729_age_18_plus.sql'))
    expect(m).toMatch(/before insert or update of age_bucket on public\.users/)
    expect(m).toMatch(/before insert on auth\.users/)
    expect(m).toMatch(/is distinct from old\.age_bucket/)
    expect(m).not.toMatch(/validate constraint/i)
  })
})
