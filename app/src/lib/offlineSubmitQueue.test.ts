// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import {
  PENDING_MESSAGE, flushSubmitQueue, isNetworkFailure, memoryQueueStore, postSubmitAssessment, clearSubmitQueue, userIdFromToken, takeSubmitFailedNotice, SUBMIT_FAILED_KEY_PREFIX,
} from './offlineSubmitQueue'

// Fake Supabase-style access tokens (header.payload.sig); only the payload sub is read.
const jwt = (sub: string) => `h.${Buffer.from(JSON.stringify({ sub })).toString('base64url')}.s`
const TOK_A = jwt('user-a'), TOK_B = jwt('user-b')

const URL_ = 'https://example.supabase.co/functions/v1/submit-assessment'
const body = { hip_er_l: 40 }

describe('P1-26 offline submit queue', () => {
  it('PENDING_MESSAGE is Stacy b98b8370 item 1, exact', () => {
    expect(PENDING_MESSAGE).toBe("You appear to be offline. Your assessment is saved on this device and will send when you're back online with ROMRx open. Stay signed in until it sends.")
  })
  it('legal.html carries Stacy b98b8370 item 3 in the Assessment and progress data paragraph', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const html = readFileSync(resolve(process.cwd(), '..', 'legal.html'), 'utf8')
    expect(html).toContain('48 hours after your last saved step. If you submit an assessment while you are offline, we hold it in your browser on that device until it sends. It is removed from the device once it sends, or when you sign out.</p>')
  })
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
    const store = memoryQueueStore([{ id: '1', url: URL_, body: JSON.stringify(body), createdAt: 1, userId: 'user-a' }])
    const fetchImpl = vi.fn(async (_url, init) => {
      expect((init as RequestInit).headers).toMatchObject({ Authorization: `Bearer ${TOK_A}` })
      return new Response(JSON.stringify({ ok: true }), { status: 200 })
    })
    const r = await flushSubmitQueue({
      getAccessToken: async () => TOK_A, apikey: 'k', fetchImpl, store, flagOn: true,
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

  it('R2: an item stores the enqueuing user (from the token, or the explicit userId), never the token', async () => {
    const store = memoryQueueStore()
    const fetchImpl = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    await postSubmitAssessment({ url: URL_, accessToken: TOK_A, apikey: 'k', body, fetchImpl, store, flagOn: true, online: false })
    await postSubmitAssessment({ url: URL_, accessToken: 'opaque', apikey: 'k', body, fetchImpl, store, flagOn: true, online: false, userId: 'user-c' })
    const rows = await store.getAll()
    expect(rows.map(r => r.userId)).toEqual(['user-a', 'user-c'])
    expect(JSON.stringify(rows)).not.toContain(TOK_A)
    expect(userIdFromToken(TOK_B)).toBe('user-b')
    expect(userIdFromToken('garbage')).toBeNull()
  })

  it('R2: user A enqueues, user B signs in: nothing of A is ever submitted for B, and A\'s item stays in place', async () => {
    const store = memoryQueueStore()
    const down = vi.fn(async () => { throw new TypeError('Failed to fetch') })
    await postSubmitAssessment({ url: URL_, accessToken: TOK_A, apikey: 'k', body, fetchImpl: down, store, flagOn: true, online: false })
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    const r = await flushSubmitQueue({ getAccessToken: async () => TOK_B, getUserId: async () => 'user-b', apikey: 'k', fetchImpl, store, flagOn: true })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(r).toEqual({ sent: 0, remaining: 1 })
    expect((await store.getAll())[0].userId).toBe('user-a')
    // Without getUserId the token's own user is used: still B, still nothing sent.
    await flushSubmitQueue({ getAccessToken: async () => TOK_B, apikey: 'k', fetchImpl, store, flagOn: true })
    expect(fetchImpl).not.toHaveBeenCalled()
  })

  it('R2: items with no owner are never replayed', async () => {
    const store = memoryQueueStore([{ id: 'x', url: URL_, body: '{}', createdAt: 1 }])
    const fetchImpl = vi.fn()
    await flushSubmitQueue({ getAccessToken: async () => TOK_A, apikey: 'k', fetchImpl, store, flagOn: true })
    expect(fetchImpl).not.toHaveBeenCalled()
    expect(await store.getAll()).toHaveLength(1)
  })

  it('R2: the same user flushes normally, and only their own items', async () => {
    const store = memoryQueueStore([
      { id: '1', url: URL_, body: '{"a":1}', createdAt: 1, userId: 'user-a' },
      { id: '2', url: URL_, body: '{"b":1}', createdAt: 2, userId: 'user-b' },
    ])
    const fetchImpl = vi.fn(async () => new Response(JSON.stringify({ ok: true }), { status: 200 }))
    const r = await flushSubmitQueue({ getAccessToken: async () => TOK_A, apikey: 'k', fetchImpl, store, flagOn: true })
    expect(fetchImpl).toHaveBeenCalledTimes(1)
    expect((fetchImpl.mock.calls[0] as unknown[])[1]).toMatchObject({ body: '{"a":1}' })
    expect(r).toEqual({ sent: 1, remaining: 1 })
    expect((await store.getAll()).map(i => i.userId)).toEqual(['user-b'])
  })

  it('R2: sign-out clears the queue (all items), or only one user\'s items when given', async () => {
    const store = memoryQueueStore([
      { id: '1', url: URL_, body: '{}', createdAt: 1, userId: 'user-a' },
      { id: '2', url: URL_, body: '{}', createdAt: 2, userId: 'user-b' },
      { id: '3', url: URL_, body: '{}', createdAt: 3, userId: 'user-a' },
    ])
    expect(await clearSubmitQueue({ store, userId: 'user-a' })).toBe(2)
    expect((await store.getAll()).map(i => i.id)).toEqual(['2'])
    expect(await clearSubmitQueue({ store })).toBe(1)
    expect(await store.getAll()).toHaveLength(0)
  })

  it('R2: the app sign-out path (useAuth signOut and the SIGNED_OUT event) calls clearSubmitQueue', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const src = readFileSync(resolve(process.cwd(), 'src/hooks/useAuth.ts'), 'utf8')
    expect(src).toContain("import { clearSubmitQueue } from '../lib/offlineSubmitQueue'")
    expect(src).toMatch(/const clearDraftMirrors = \(\) => \{[^\n]*void clearSubmitQueue\(\) \}/)
    expect(src).toContain("if (event === 'SIGNED_OUT') clearDraftMirrors()")
    expect(src).toContain('const signOut = () => { clearDraftMirrors(); return supabase.auth.signOut() }')
  })

  it('a refused queued submit (4xx, not 401/429) is dropped and leaves a one-time notice for that user only', async () => {
    const store = memoryQueueStore([
      { id: '1', url: URL_, body: '{}', createdAt: 1, userId: 'user-a' },
      { id: '2', url: URL_, body: '{}', createdAt: 2, userId: 'user-a' },
    ])
    const fetchImpl = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: false, error: 'bad' }), { status: 400 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ ok: true }), { status: 200 }))
    const r = await flushSubmitQueue({ getAccessToken: async () => TOK_A, apikey: 'k', fetchImpl, store, flagOn: true })
    expect(r).toEqual({ sent: 1, remaining: 0 })
    expect(localStorage.getItem(SUBMIT_FAILED_KEY_PREFIX + 'user-a')).toBe('1')
    expect(takeSubmitFailedNotice('user-b')).toBe(false)
    expect(takeSubmitFailedNotice('user-a')).toBe(true)
    expect(takeSubmitFailedNotice('user-a')).toBe(false)
  })
  it('401 / 429 / 5xx keep the item and leave no notice', async () => {
    for (const status of [401, 429, 503]) {
      localStorage.clear()
      const store = memoryQueueStore([{ id: '1', url: URL_, body: '{}', createdAt: 1, userId: 'user-a' }])
      const fetchImpl = vi.fn(async () => new Response('{}', { status }))
      await flushSubmitQueue({ getAccessToken: async () => TOK_A, apikey: 'k', fetchImpl, store, flagOn: true })
      expect(await store.getAll()).toHaveLength(1)
      expect(takeSubmitFailedNotice('user-a')).toBe(false)
    }
  })
  it('Assessment shows the existing failure line from the notice (no new string)', async () => {
    const { readFileSync } = await import('node:fs')
    const { resolve } = await import('node:path')
    const src = readFileSync(resolve(process.cwd(), 'src/pages/Assessment.tsx'), 'utf8')
    expect(src).toContain("useEffect(() => { if (userId && takeSubmitFailedNotice(userId)) setError('Submission failed. Please try again.') }, [userId])")
    expect(src.split("'Submission failed. Please try again.'").length - 1).toBeGreaterThanOrEqual(3)
  })
})
