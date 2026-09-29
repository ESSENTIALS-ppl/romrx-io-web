import { describe, it, expect, vi } from 'vitest'
import { fetchCancelStatus, openCancelFlow, CANCEL_BUTTON_LABEL, CANCEL_BASE_CASCADE_NOTE } from './cancelSubscription'

describe('cancelSubscription', () => {
  it('uses Legal exact labels with no em dashes', () => {
    expect(CANCEL_BUTTON_LABEL).toBe('Cancel subscription')
    expect(CANCEL_BASE_CASCADE_NOTE).toBe('Cancelling Base also cancels any sport packs.')
    expect(/[\u2014\u2013]/.test(CANCEL_BUTTON_LABEL + CANCEL_BASE_CASCADE_NOTE)).toBe(false)
  })

  it('asks the server for status without sending any subscription id', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { cancelable: true, kind: 'base' }, error: null })
    await expect(fetchCancelStatus(invoke)).resolves.toEqual({ cancelable: true, kind: 'base' })
    expect(invoke).toHaveBeenCalledWith('create-portal-session', { body: { action: 'cancel_status' } })
  })

  it('hides the button on any error', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: { context: { status: 401 } } })
    await expect(fetchCancelStatus(invoke)).resolves.toEqual({ cancelable: false, kind: null })
    const throws = vi.fn().mockRejectedValue(new Error('net'))
    await expect(fetchCancelStatus(throws)).resolves.toEqual({ cancelable: false, kind: null })
  })

  it('only follows Stripe billing portal URLs', async () => {
    const good = vi.fn().mockResolvedValue({ data: { url: 'https://billing.stripe.com/p/session/test_123' }, error: null })
    await expect(openCancelFlow(good)).resolves.toEqual({ ok: true, url: 'https://billing.stripe.com/p/session/test_123' })
    expect(good).toHaveBeenCalledWith('create-portal-session', { body: { action: 'cancel' } })
    const bad = vi.fn().mockResolvedValue({ data: { url: 'https://evil.example/x' }, error: null })
    await expect(openCancelFlow(bad)).resolves.toEqual({ ok: false })
  })
})
