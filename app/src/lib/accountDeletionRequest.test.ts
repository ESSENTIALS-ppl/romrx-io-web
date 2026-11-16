import { describe, it, expect, vi } from 'vitest'
import {
  requestAccountDeletion, deletionErrorCopy, DELETION_SUCCESS_COPY, DELETION_BUTTON_LABEL, deletionSiteForHost,
} from './accountDeletionRequest'

describe('requestAccountDeletion', () => {
  it('calls the edge function with the site and returns the Resend id on success', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { ok: true, resend_id: 'abc-123' }, error: null })
    const r = await requestAccountDeletion(invoke, 'romrx.io')
    expect(invoke).toHaveBeenCalledWith('request-account-deletion', { body: { site: 'romrx.io' } })
    expect(r).toEqual({ ok: true, resendId: 'abc-123', alreadyOpen: false })
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
    expect(DELETION_BUTTON_LABEL).toBe('Delete my account')
    for (const s of [DELETION_SUCCESS_COPY, deletionErrorCopy('failed'), deletionErrorCopy('rate_limited')]) {
      expect(s).not.toMatch(/[\u2014\u2013]/)
    }
  })

  it('P1-23: already_open is passed through; bodybuilding site accepted; site from host', async () => {
    const invoke = vi.fn().mockResolvedValue({ data: { ok: true, resend_id: 'r1', already_open: true }, error: null })
    expect(await requestAccountDeletion(invoke, 'romrxbodybuilding.com')).toEqual({ ok: true, resendId: 'r1', alreadyOpen: true })
    expect(invoke).toHaveBeenCalledWith('request-account-deletion', { body: { site: 'romrxbodybuilding.com' } })
    expect(deletionSiteForHost('romrx.io')).toBe('romrx.io')
    expect(deletionSiteForHost('www.romrxbjj.com')).toBe('romrxbjj.com')
    expect(deletionSiteForHost('romrxbodybuilding.com')).toBe('romrxbodybuilding.com')
    expect(deletionSiteForHost('localhost')).toBe('romrx.io')
    expect(deletionErrorCopy('failed')).toBe("We couldn't send your request. Please try again, or email privacy@romrx.io.")
  })
})
