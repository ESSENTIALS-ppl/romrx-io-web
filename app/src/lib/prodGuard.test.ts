import { describe, it, expect } from 'vitest'
import { guardSupabaseUrl, BLOCKED_SUPABASE_URL } from '../../prodGuard'

const PROD = 'https://cqzvqzwwevnflinxgnpp.supabase.co'
describe('preview prod guard', () => {
  it('keeps prod URL only for CONTEXT=production', () => {
    expect(guardSupabaseUrl(PROD, 'production')).toEqual({ url: PROD, blocked: false })
  })
  for (const c of ['deploy-preview', 'branch-deploy', 'dev', '', undefined]) {
    it(`blocks prod URL for CONTEXT=${String(c)}`, () => {
      expect(guardSupabaseUrl(PROD, c)).toEqual({ url: BLOCKED_SUPABASE_URL, blocked: true })
    })
  }
  it('leaves non-prod URLs alone', () => {
    expect(guardSupabaseUrl('http://127.0.0.1:54321', 'dev').blocked).toBe(false)
  })
})
