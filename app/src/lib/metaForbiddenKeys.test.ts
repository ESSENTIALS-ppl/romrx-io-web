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

  it('blocks every ROMood field name (Stacy Oct 26)', () => {
    const keys = ['energy', 'Energy', 'energy_score', 'pleasantness', 'pleasantness_score', 'word', 'mood_word', 'Word',
      'quadrant', 'opted_in', 'opted_in_at', 'optedInAt', 'saving_on', 'savingOn', 'turned_off_at', 'turnedOffAt',
      'mood_entries', 'mood_settings']
    for (const k of keys) expect(META_FORBIDDEN_KEYS.test(k)).toBe(true)
    const props: Record<string, unknown> = { content_name: 'signup', n: 1 }
    for (const k of keys) props[k] = k === 'energy' ? 50 : 'x'
    expect(stripForbidden(props)).toEqual({ content_name: 'signup', n: 1 })
  })
})
