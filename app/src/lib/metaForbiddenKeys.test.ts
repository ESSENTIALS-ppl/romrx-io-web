import { describe, expect, it } from 'vitest'
import { META_FORBIDDEN_KEYS, stripForbidden } from './metaAttribution'

describe('Meta forbidden property keys', () => {
  it('blocks mood keys (ROMood) in any case', () => {
    for (const k of ['mood', 'Mood', 'mood_score', 'daily_mood', 'romood_entry']) expect(META_FORBIDDEN_KEYS.test(k)).toBe(true)
  })
  it('still blocks the older health-adjacent keys', () => {
    for (const k of ['rom', 'score', 'protocol', 'joint', 'health', 'assessment', 'tier', 'soreness', 'injury', 'fuel', 'weight', 'height']) expect(META_FORBIDDEN_KEYS.test(k)).toBe(true)
  })
  it('stripForbidden drops mood and keeps safe primitives only', () => {
    expect(stripForbidden({ mood: 'low', mood_score: 3, content_name: 'signup', n: 1, o: { a: 1 } })).toEqual({ content_name: 'signup', n: 1 })
  })
})
