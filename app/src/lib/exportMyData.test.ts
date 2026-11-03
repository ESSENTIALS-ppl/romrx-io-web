import { describe, it, expect } from 'vitest'
import { requestMyDataExport } from './exportMyData'

const now = () => new Date('2026-11-02T12:00:00Z')
describe('requestMyDataExport', () => {
  it('returns the file when the function answers export_version 1', async () => {
    const r = await requestMyDataExport(async () => ({ data: { export_version: 1, data: { assessments: [] } }, error: null }), now)
    expect(r.ok).toBe(true)
    if (r.ok) { expect(r.filename).toBe('romrx-my-data-2026-11-02.json'); expect(JSON.parse(r.json).export_version).toBe(1) }
  })
  it('fails on an error, a missing body or the wrong version', async () => {
    expect((await requestMyDataExport(async () => ({ data: null, error: { status: 503 } }), now)).ok).toBe(false)
    expect((await requestMyDataExport(async () => ({ data: null, error: null }), now)).ok).toBe(false)
    expect((await requestMyDataExport(async () => ({ data: { export_version: 2, data: {} }, error: null }), now)).ok).toBe(false)
  })
  it('fails when invoke throws', async () => {
    expect((await requestMyDataExport(async () => { throw new Error('x') }, now)).ok).toBe(false)
  })
})
