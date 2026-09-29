import { describe, it, expect } from 'vitest'
import { BASE_UNAVAILABLE_MESSAGE, checkoutErrorMessage } from './checkoutErrors'

describe('checkoutErrorMessage', () => {
  it('maps base_checkout_unavailable to the friendly message', () => {
    expect(checkoutErrorMessage({ error: 'base_checkout_unavailable', message: 'x' }, 'fb')).toBe(BASE_UNAVAILABLE_MESSAGE)
    expect(BASE_UNAVAILABLE_MESSAGE).toBe('Base sign-up is temporarily unavailable. Please check back soon.')
    expect(BASE_UNAVAILABLE_MESSAGE).not.toMatch(/\u2014/)
  })
  it('passes other errors through and falls back', () => {
    expect(checkoutErrorMessage({ error: 'stripe_error', message: 'Could not load plan price' }, 'fb')).toBe('Could not load plan price')
    expect(checkoutErrorMessage({ error: 'invalid_token' }, 'fb')).toBe('invalid_token')
    expect(checkoutErrorMessage({}, 'fb')).toBe('fb')
    expect(checkoutErrorMessage(null, 'fb')).toBe('fb')
  })
})
