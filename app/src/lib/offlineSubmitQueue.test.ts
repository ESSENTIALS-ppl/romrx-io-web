import { describe, expect, it, vi } from 'vitest'
import {
  PENDING_MESSAGE, flushSubmitQueue, isNetworkFailure, memoryQueueStore, postSubmitAssessment,
} from './offlineSubmitQueue'

const URL_ = 'https://example.supabase.co/functions/v1/submit-assessment'
const body = { hip_er_l: 40 }

describe('P1-26 offline submit queue', () => {
  it('success path does not queue', async () => {
    const store = memoryQueueStore()
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    const r = await postSubmitAssessment({
      url: URL_, accessToken: 't', apikey: 'k', body, fetchImpl, store, flagOn: true,
    })
    expect(r.ok).toBe(true)
    expect(r.queued).toBe(false)
    expect(await store.getAll()).toHaveLength(0)
  })

  it('HTTP errors are not queued', async () => {
    const store = memoryQueueStore()
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: false, error: 'x' }), { status: 500 }))
    const r = await postSubmitAssessment({
      url: URL_, accessToken: 't', apikey: 'k', body, fetchImpl, store, flagOn: true,
    })
    expect(r.ok).toBe(false)
    expect(r.queued).toBe(false)
    expect(r.error).toBe('x')
    expect(await store.getAll()).toHaveLength(0)
  })

  it('network failure queues only when the flag is on, and does not store a bearer', async () => {
    const store = memoryQueueStore()
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    const off = await postSubmitAssessment({
      url: URL_, accessToken: 'secret-token', apikey: 'k', body, fetchImpl, store, flagOn: false,
    })
    expect(off.queued).toBe(false)
    expect(await store.getAll()).toHaveLength(0)

    const on = await postSubmitAssessment({
      url: URL_, accessToken: 'secret-token', apikey: 'k', body, fetchImpl, store, flagOn: true, online: false,
    })
    expect(on.queued).toBe(true)
    expect(on.error).toBe(PENDING_MESSAGE)
    const rows = await store.getAll()
    expect(rows).toHaveLength(1)
    expect(rows[0].url).toBe(URL_)
    expect(rows[0].body).toBe(JSON.stringify(body))
    expect(JSON.stringify(rows[0])).not.toContain('secret-token')
  })

  it('flush replays with a fresh token and drops a sent item', async () => {
    const store = memoryQueueStore([{ id: '1', url: URL_, body: JSON.stringify(body), createdAt: 1 }])
    const fetchImpl = vi.fn(async (_url, init) => {
      expect((init as RequestInit).headers).toMatchObject({ Authorization: 'Bearer fresh' })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })
    const r = await flushSubmitQueue({
      getAccessToken: async () => 'fresh', apikey: 'k', fetchImpl, store, flagOn: true,
    })
    expect(r).toEqual({ sent: 1, remaining: 0 })
    expect(await store.getAll()).toHaveLength(0)
  })

  it('flush is a no-op when the flag is off, and leaves the queue in place', async () => {
    const store = memoryQueueStore([{ id: '1', url: URL_, body: '{}', createdAt: 1 }])
    const fetchImpl = vi.fn()
    const r = await flushSubmitQueue({
      getAccessToken: async () => 'fresh', apikey: 'k', fetchImpl, store, flagOn: false,
    })
    expect(r).toEqual({ sent: 0, remaining: 0 })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(await store.getAll()).toHaveLength(1)
  })

  it('isNetworkFailure detects offline and fetch errors', () => {
    expect(isNetworkFailure(new TypeError('Failed to fetch'), true)).toBe(true)
    expect(isNetworkFailure(new Error('boom'), true)).toBe(false)
    expect(isNetworkFailure(new Error('boom'), false)).toBe(true)
  })
})
