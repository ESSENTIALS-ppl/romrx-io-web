import { describe, it, expect, vi } from 'vitest'
import {
  requestAccountDeletion, deletionErrorCopy, DELETION_SUCCESS_COPY, DELETION_BUTTON_LABEL,
} from './accountDeletionRequest'

describe('requestAccountDeletion', () => {
  it('calls the edge function with the site and returns the Resend id on success', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { ok: true, resend_id: 'abc-123' }, error: null })
    const r = await requestAccountDeletion(invoke, 'romrx.io')
    expect(invoke).toHaveBeenCalledWith('request-account-deletion', { body: { site: 'romrx.io' } })
    expect(r).toEqual({ ok: true, resendId: 'abc-123' })
  })

  it('fails (no success copy) when the email failed', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: { context: { status: 502 } } })
    expect(await requestAccountDeletion(invoke, 'romrxbjj.com')).toEqual({ ok: false, reason: 'failed' })
  })

  it('fails when ok but no Resend id', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { ok: true }, error: null })
    expect(await requestAccountDeletion(invoke, 'romrx.io')).toEqual({ ok: false, reason: 'failed' })
  })

  it('maps 429 to rate_limited', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: null, error: { context: { status: 429 } } })
    expect(await requestAccountDeletion(invoke, 'romrx.io')).toEqual({ ok: false, reason: 'rate_limited' })
  })

  it('fails on a thrown network error', async () => {
    const invoke = vi.fn().mockRejectedValue(new Error('network'))
    expect(await requestAccountDeletion(invoke, 'romrx.io')).toEqual({ ok: false, reason: 'failed' })
  })

  it('uses the exact approved copy with no em dashes', () => {
    expect(DELETION_SUCCESS_COPY).toBe('We got your request. We will confirm by email and complete it within 30 days.')
    expect(DELETION_BUTTON_LABEL).toBe('Request account deletion')
    for (const s of [DELETION_SUCCESS_COPY, deletionErrorCopy('failed'), deletionErrorCopy('rate_limited')]) {
      expect(s).not.toMatch(/[\u2014\u2013]/)
    }
  })
})
