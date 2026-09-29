import { describe, it, expect, vi, beforeEach } from 'vitest'
import {
  fetchCancelStatus, openCancelFlow, CANCEL_BUTTON_LABEL, CANCEL_BASE_CASCADE_NOTE, CANCELED_NOW, CANCELED_SCHEDULED,
  canceledMessage, formatCancelDate, statusLabel, EMPTY_CANCEL_STATUS,
} from './cancelSubscription'

beforeEach(() => {
  ;(globalThis as any).window = { sessionStorage: { getItem: () => null, setItem() {}, removeItem() {} }, location: { search: '' } }
})

describe('cancelSubscription', () => {
  it('uses Legal exact text, American spelling, no em dashes', () => {
    expect(CANCEL_BUTTON_LABEL).toBe('Cancel subscription')
    expect(CANCEL_BASE_CASCADE_NOTE).toBe('Canceling Base also cancels any sport packs.')
    expect(CANCELED_SCHEDULED('January 1, 2027')).toBe('Canceled. Your plan will not renew and you will not be charged on January 1, 2027.')
    expect(CANCELED_NOW).toBe('Canceled. You will not be charged.')
    const all = CANCEL_BUTTON_LABEL + CANCEL_BASE_CASCADE_NOTE + CANCELED_SCHEDULED('x') + CANCELED_NOW
    expect(/[\u2014\u2013]/.test(all)).toBe(false)
    expect(all.toLowerCase()).not.toContain('cancell')
  })

  it('asks the server for status without sending any subscription id, and parses per-subscription state', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: {
      cancelable: true, kind: 'sport',
      base: { state: 'canceling', date: '2027-01-01T05:00:00.000Z', cancelable: false },
      sports: [{ sport: 'bjj', state: 'active', date: null, own_subscription: true, cancelable: true }],
    }, error: null })
    const st = await fetchCancelStatus(invoke)
    expect(st.base).toEqual({ state: 'canceling', date: '2027-01-01T05:00:00.000Z', cancelable: false })
    expect(st.sports[0]).toEqual({ sport: 'bjj', state: 'active', date: null, own_subscription: true, cancelable: true })
    expect(invoke).toHaveBeenCalledWith('create-portal-session', { body: { action: 'cancel_status' } })
  })

  it('tolerates the older response shape (no base/sports)', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { cancelable: true, kind: 'base' }, error: null })
    await expect(fetchCancelStatus(invoke)).resolves.toEqual({ cancelable: true, kind: 'base', base: null, sports: [] })
  })

  it('hides the button on any error', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: { context: { status: 401 } } })
    await expect(fetchCancelStatus(invoke)).resolves.toEqual(EMPTY_CANCEL_STATUS)
    const throws = vi.fn().mockRejectedValue(new Error('net'))
    await expect(fetchCancelStatus(throws)).resolves.toEqual(EMPTY_CANCEL_STATUS)
  })

  it('only follows Stripe billing portal URLs, and passes an optional target', async () => {
    const good = vi.fn().mockResolvedValue({ data: { url: 'https://billing.stripe.com/p/session/test_123' }, error: null })
    await expect(openCancelFlow(good)).resolves.toEqual({ ok: true, url: 'https://billing.stripe.com/p/session/test_123' })
    expect(good).toHaveBeenCalledWith('create-portal-session', { body: { action: 'cancel' } })
    await openCancelFlow(good, 'bjj')
    expect(good).toHaveBeenLastCalledWith('create-portal-session', { body: { action: 'cancel', target: 'bjj' } })
    const bad = vi.fn().mockResolvedValue({ data: { url: 'https://evil.example/x' }, error: null })
    await expect(openCancelFlow(bad)).resolves.toEqual({ ok: false })
  })

  it('formats the date in Eastern time and picks the right canceled message', () => {
    expect(formatCancelDate('2027-01-01T05:00:00.000Z')).toBe('January 1, 2027')
    expect(canceledMessage('canceling', '2027-01-01T05:00:00.000Z')).toBe('Canceled. Your plan will not renew and you will not be charged on January 1, 2027.')
    expect(canceledMessage('canceled', null)).toBe('Canceled. You will not be charged.')
    expect(canceledMessage('active', null)).toBeNull()
  })

  it('never shows active for a canceled-but-not-ended subscription', () => {
    expect(statusLabel('active', 'canceling', false)).toBe('Canceled')
    expect(statusLabel('active', 'canceled', false)).toBe('Canceled')
    expect(statusLabel('active', null, true)).toBe('...')
    expect(statusLabel('active', 'active', false)).toBe('active')
    expect(statusLabel(null, null, false)).toBe('inactive')
  })
})
