import { describe, it, expect } from 'vitest'
import { signupSportRedirectTarget } from './signupRedirect'

describe('signupSportRedirectTarget', () => {
  it('known sport with no query adds add=', () => {
    expect(signupSportRedirectTarget('bjj', '')).toBe('/signup?add=bjj')
  })
  it('keeps utm_* and fbclid and adds add=', () => {
    const to = signupSportRedirectTarget('bjj', '?utm_source=test&fbclid=abc123')
    const u = new URL(to, 'https://romrx.io/app')
    expect(u.pathname).toBe('/signup')
    expect(u.searchParams.get('utm_source')).toBe('test')
    expect(u.searchParams.get('fbclid')).toBe('abc123')
    expect(u.searchParams.get('add')).toBe('bjj')
  })
  it('lowercases the sport and overrides an incoming add', () => {
    const u = new URL(signupSportRedirectTarget('BodyBuilding', '?add=evil&utm_campaign=x'), 'https://romrx.io')
    expect(u.searchParams.getAll('add')).toEqual(['bodybuilding'])
    expect(u.searchParams.get('utm_campaign')).toBe('x')
  })
  it('unknown sport keeps params, no add', () => {
    expect(signupSportRedirectTarget('chess', '?utm_source=a&fbclid=b')).toBe('/signup?utm_source=a&fbclid=b')
    expect(signupSportRedirectTarget('chess', '?add=bjj')).toBe('/signup')
    expect(signupSportRedirectTarget(undefined, '')).toBe('/signup')
  })
  it('preserves encoded values and hash', () => {
    const to = signupSportRedirectTarget('bjj', '?utm_content=a%20b%26c', '#x')
    expect(to.endsWith('#x')).toBe(true)
    expect(new URL(to, 'https://romrx.io').searchParams.get('utm_content')).toBe('a b&c')
  })
})
