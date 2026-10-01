import { describe, it, expect, beforeEach } from 'vitest'
import { isStripeTestRequested, withStripeTestFlag } from './stripeTestMode'

class MemStorage {
  m = new Map<string, string>()
  getItem(k: string) { return this.m.get(k) ?? null }
  setItem(k: string, v: string) { this.m.set(k, v) }
  removeItem(k: string) { this.m.delete(k) }
}

describe('stripeTestMode', () => {
  beforeEach(() => {
    ;(globalThis as any).window = { sessionStorage: new MemStorage(), location: { search: '' } }
  })
  it('is off by default and leaves bodies untouched', () => {
    expect(isStripeTestRequested('')).toBe(false)
    expect(withStripeTestFlag({ mode: 'base' }, '')).toEqual({ mode: 'base' })
  })
  it('?stripe_test=1 turns it on for the tab, ?stripe_test=0 turns it off', () => {
    expect(withStripeTestFlag({ action: 'cancel' }, '?stripe_test=1')).toEqual({ action: 'cancel', stripe_test_mode: true })
    expect(isStripeTestRequested('')).toBe(true)
    expect(isStripeTestRequested('?stripe_test=0')).toBe(false)
    expect(isStripeTestRequested('')).toBe(false)
  })
  it('ignores other values', () => {
    expect(isStripeTestRequested('?stripe_test=true')).toBe(false)
  })
  it('latches from the landing URL alone, so a later page without the param still sends the flag', () => {
    // App start: only the URL is read, no request is built yet.
    expect(isStripeTestRequested('?stripe_test=1')).toBe(true)
    // Later Settings load, no query string: the flag is still on for cancel_status / cancel.
    expect(withStripeTestFlag({ action: 'cancel' }, '')).toEqual({ action: 'cancel', stripe_test_mode: true })
  })
  it('never adds the flag for a tab that did not ask for it', () => {
    expect(withStripeTestFlag({ action: 'cancel', target: 'base' }, '')).toEqual({ action: 'cancel', target: 'base' })
  })
})
