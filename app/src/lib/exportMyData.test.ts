import { describe, it, expect } from 'vitest'
import { requestMyDataExport, exportErrorCopy, EXPORT_ERROR_COPY, EXPORT_REAUTH_COPY } from './exportMyData'

const now = () => new Date('2026-11-02T12:00:00Z')
const good = { export_version: 2, complete: true, data: { profile: [] }, tables: { profile: { rows: 1, truncated: false }, workouts: { rows: 0, truncated: false } } }
const call = (res: { data: unknown; error: unknown }) => requestMyDataExport(async () => res, now)

describe('requestMyDataExport', () => {
  it('returns the file only for version 2, complete:true and clean tables', async () => {
    const r = await call({ data: good, error: null })
    expect(r.ok).toBe(true)
    if (r.ok) { expect(r.filename).toBe('romrx-my-data-2026-11-02.json'); expect(JSON.parse(r.json).export_version).toBe(2) }
  })
  it('never offers a partial export: cap truncation, a failed table, missing complete', async () => {
    const trunc = { ...good, complete: false, tables: { ...good.tables, workout_sets: { rows: 5000, truncated: true } } }
    expect(await call({ data: trunc, error: null })).toEqual({ ok: false, reason: 'incomplete' })
    expect(await call({ data: { ...good, tables: { ...good.tables, workout_sets: { rows: 5000, truncated: true } } }, error: null })).toEqual({ ok: false, reason: 'incomplete' })
    expect(await call({ data: { ...good, complete: false, tables: { ...good.tables, workouts: { error: true } } }, error: null })).toEqual({ ok: false, reason: 'incomplete' })
    expect(await call({ data: { ...good, complete: undefined }, error: null })).toEqual({ ok: false, reason: 'incomplete' })
    expect(await call({ data: { ...good, tables: undefined }, error: null })).toEqual({ ok: false, reason: 'incomplete' })
  })
  it('fails on an error, a missing body or the old version', async () => {
    expect((await call({ data: null, error: { status: 503 } })).ok).toBe(false)
    expect((await call({ data: null, error: null })).ok).toBe(false)
    expect(await call({ data: { ...good, export_version: 1 }, error: null })).toEqual({ ok: false, reason: 'failed' })
  })
  it('tells a stale sign-in apart from other errors', async () => {
    expect(await call({ data: null, error: { context: { json: async () => ({ error: 'reauth_required' }) } } })).toEqual({ ok: false, reason: 'reauth' })
    expect(await call({ data: null, error: { context: { json: async () => ({ error: 'rate_limited' }) } } })).toEqual({ ok: false, reason: 'failed' })
    expect(await call({ data: null, error: { context: { json: async () => { throw new Error('x') } } } })).toEqual({ ok: false, reason: 'failed' })
  })
  it('fails when invoke throws', async () => {
    expect((await requestMyDataExport(async () => { throw new Error('x') }, now)).ok).toBe(false)
  })
  it('error copy per reason', () => {
    expect(exportErrorCopy('incomplete')).toBe(EXPORT_ERROR_COPY)
    expect(exportErrorCopy('failed')).toBe(EXPORT_ERROR_COPY)
    expect(exportErrorCopy('reauth')).toBe(EXPORT_REAUTH_COPY)
  })
})
