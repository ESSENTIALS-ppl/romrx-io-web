import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { SKIP_QUICK_OR, skipQuick, isFullAssessment, pickFullAssessments } from './assessmentReads'

const src = (f: string) => readFileSync(join(process.cwd(), 'src', f), 'utf8')

describe('P1-06b skip quick-check rows', () => {
  it('filter string is the null-safe IS DISTINCT FROM quick', () => {
    expect(SKIP_QUICK_OR).toBe('check_kind.is.null,check_kind.neq.quick')
  })
  it('skipQuick adds exactly that .or() and returns the same builder', () => {
    const calls: string[] = []
    const q = { or(f: string) { calls.push(f); return q } }
    expect(skipQuick(q)).toBe(q)
    expect(calls).toEqual(['check_kind.is.null,check_kind.neq.quick'])
  })
  it('skipQuick on a real supabase-js builder puts the or filter in the URL', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    const c = createClient('http://localhost:1', 'k')
    const b = skipQuick(c.from('assessments').select('*').eq('user_id', 'u')) as unknown as { url: URL }
    expect(decodeURIComponent(b.url.search)).toContain('or=(check_kind.is.null,check_kind.neq.quick)')
  })
  it('isFullAssessment is null-safe', () => {
    expect(isFullAssessment({})).toBe(true)
    expect(isFullAssessment({ check_kind: null })).toBe(true)
    expect(isFullAssessment({ check_kind: 'full' })).toBe(true)
    expect(isFullAssessment({ check_kind: 'quick' })).toBe(false)
    expect(isFullAssessment(null)).toBe(false)
  })
  it('pickFullAssessments drops quick rows and moves latest to the newest full row', () => {
    const q = { id: 'q', check_kind: 'quick' }, a = { id: 'a' }, b = { id: 'b', check_kind: 'full' }
    expect(pickFullAssessments(q, [q, b, a])).toEqual({ latest: b, history: [b, a] })
    expect(pickFullAssessments(a, [a])).toEqual({ latest: a, history: [a] })
    expect(pickFullAssessments(q, [q])).toEqual({ latest: q, history: [] })
    expect(pickFullAssessments(null, [])).toEqual({ latest: null, history: [] })
  })
  it('every direct assessments read in the app uses skipQuick', () => {
    for (const f of ['pages/Settings.tsx', 'pages/ResultsPreview.tsx', 'pages/MyProtocol.tsx', 'lib/postAuthDest.ts', 'lib/assessmentDraftStore.ts']) {
      const s = src(f)
      const reads = s.split(".from('assessments')").length - 1
      expect(reads, f).toBeGreaterThan(0)
      expect(s.split(/skipQuick\((?:supabase|\(await db\(\)\))/).length - 1, f).toBe(reads)
    }
    expect(src('hooks/useProfile.ts')).toContain('pickFullAssessments(result.assessment, result.assessments ?? [])')
  })
})
