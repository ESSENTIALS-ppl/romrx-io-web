// P1-23: Settings "Your data" (export + delete) per Avery's client contract and Stacy's 2056 words.
import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { YOUR_DATA_COPY as YD, PLAN_LINE_INDEX, EXPORT_LINE_INDEX, dialogLines } from './yourDataCopy'

const page = readFileSync(join(process.cwd(), 'src', 'pages', 'Settings.tsx'), 'utf8')

describe('P1-23 Your data', () => {
  it('the cancel-first plan line is in the dialog body, before the confirm field and the send button', () => {
    expect(YD.dialogBody[PLAN_LINE_INDEX]).toBe("Your plan: to make sure you aren't charged again, cancel your plan in Subscription before you send this request. All sales are final.")
    const body = page.indexOf('data-testid="delete-dialog-body"')
    const confirm = page.indexOf('placeholder={YD.confirmPlaceholder}')
    const send = page.indexOf('{deleting ? YD.sending : YD.send}')
    expect(body).toBeGreaterThan(-1)
    expect(body).toBeLessThan(confirm)
    expect(confirm).toBeLessThan(send)
    expect(page).toMatch(/disabled=\{deleteText !== 'DELETE' \|\| deleting\}/)
  })
  it('dialog body has six lines in Stacy order', () => {
    expect(YD.dialogBody).toHaveLength(6)
    expect(YD.dialogBody[0].startsWith("We'll delete your account")).toBe(true)
    expect(YD.dialogBody[5]).toBe("Once it's done, it can't be undone.")
  })
  it('export is behind SHOW_EXPORT_MY_DATA, now ON (P1-23 unhide); delete and the email fallback are always shown', () => {
    expect(page).toMatch(/^const SHOW_EXPORT_MY_DATA = true/m)
    expect(page).toContain('const SHOW_DELETION_STATUS = false')
    expect(page).toMatch(/\{SHOW_EXPORT_MY_DATA && \(\s*<div className="mb-4" data-testid="your-data-export">/)
    expect(page).toContain('{YD.emailFallback}')
    expect(page).toContain('<SectionCard title={YD.title}>')
    expect(page).not.toContain('Danger zone')
  })
  it('already-open answer shows its own line; site comes from the host', () => {
    expect(page).toContain('deleteAlreadyOpen ? YD.alreadyOpen : DELETION_SUCCESS_COPY')
    expect(page).toContain('deletionSiteForHost(window.location.hostname)')
  })
  it('no dashes in any new line', () => {
    expect(JSON.stringify(YD)).not.toMatch(/[\u2013\u2014]/)
  })
})

describe('P1-23 v2: export-pointing lines hidden while export is hidden (Vera F1)', () => {
  it('dialog drops only the export line, keeps the plan line before the confirm field', () => {
    expect(YD.dialogBody[EXPORT_LINE_INDEX]).toBe('Want a copy first? Export your data before you send this request.')
    const off = dialogLines(false)
    expect(off.map(l => l.index)).toEqual([0, 1, 2, 3, 5])
    expect(off.some(l => l.line.includes('Export your data'))).toBe(false)
    expect(off.find(l => l.index === PLAN_LINE_INDEX)?.line).toBe(YD.dialogBody[PLAN_LINE_INDEX])
    expect(dialogLines(true)).toHaveLength(6)
  })
  it('Settings shows the intro only with export on and renders the dialog from dialogLines', () => {
    const src = readFileSync(join(process.cwd(), 'src', 'pages', 'Settings.tsx'), 'utf8')
    expect(src).toMatch(/^const SHOW_EXPORT_MY_DATA = true/m)
    expect(src).toContain('{SHOW_EXPORT_MY_DATA && <p className="text-sm text-slate-600 mb-3">{YD.intro}</p>}')
    expect(src).toContain('dialogLines(SHOW_EXPORT_MY_DATA).map(')
    expect(src).not.toContain('YD.dialogBody.map(')
  })
})

describe('P1-23 unhide: export on, server export off (503) is handled with the existing message', () => {
  it('the export block (data-testid your-data-export) and the button label render under the flag', () => {
    expect(page).toMatch(/\{SHOW_EXPORT_MY_DATA && \(\s*<div className="mb-4" data-testid="your-data-export">/)
    expect(page).toContain('{exportBusy ? YD.exportBusy : EXPORT_BUTTON_LABEL}')
    expect(page).toContain('{exportErr && <p className="text-xs text-red-700 mt-2">{exportErr}</p>}')
  })
  it('503 from export-my-data (export off): reason failed, existing EXPORT_ERROR_COPY, no throw', async () => {
    const { requestMyDataExport, exportErrorCopy, EXPORT_ERROR_COPY } = await import('./exportMyData')
    const ctx = { json: async () => ({ error: 'export_disabled' }), status: 503 }
    const r1 = await requestMyDataExport(async () => ({ data: null, error: { name: 'FunctionsHttpError', context: ctx } }))
    expect(r1).toEqual({ ok: false, reason: 'failed' })
    expect(exportErrorCopy('failed')).toBe(EXPORT_ERROR_COPY)
    const r2 = await requestMyDataExport(async () => ({ data: null, error: { context: { json: async () => { throw new Error('not json') } } } }))
    expect(r2).toEqual({ ok: false, reason: 'failed' })
    const r3 = await requestMyDataExport(async () => { throw new Error('network') })
    expect(r3).toEqual({ ok: false, reason: 'failed' })
  })
})
