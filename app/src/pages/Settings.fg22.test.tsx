// @vitest-environment jsdom
// FG-22: SHOW_GENDER_HEIGHT_WEIGHT = false (compiled constant in Settings.tsx, same style as FG-04's
// SHOW_REMINDER_TOGGLES / SHOW_NOTIFICATIONS). Renders the real Settings page with its data hooks mocked.
// Proves: Gender, Height and Weight do not render; Full name, Age group and Save profile still do;
// Save profile still writes the hydrated gender/height/weight values and the other profile fields.
// The source test is the production-build guard: it FAILS if SHOW_GENDER_HEIGHT_WEIGHT is true.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { act } from 'react'
import { createRoot, type Root } from 'react-dom/client'
import { MemoryRouter } from 'react-router-dom'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const calls: string[] = []
const userUpdates: Record<string, unknown>[] = []

function chain(): unknown {
  const result = { data: [], error: null, count: 0 }
  const fn = (..._a: unknown[]) => proxy
  const proxy: unknown = new Proxy(fn, {
    get(_t, prop) {
      if (prop === 'then') return (res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) => Promise.resolve(result).then(res, rej)
      return proxy
    },
    apply() { return proxy },
  })
  return proxy
}

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (t: string) => {
      calls.push(`from:${t}`)
      if (t === 'users') {
        return {
          update: (payload: Record<string, unknown>) => ({
            eq: async () => {
              userUpdates.push(payload)
              return { data: null, error: null }
            },
          }),
          select: () => chain(),
        }
      }
      return chain()
    },
    rpc: (n: string) => { calls.push(`rpc:${n}`); return chain() },
    functions: { invoke: async (n: string) => { calls.push(`invoke:${n}`); return { data: null, error: null } } },
    auth: { getSession: async () => ({ data: { session: null } }), onAuthStateChange: () => ({ data: { subscription: { unsubscribe() {} } } }), signOut: async () => ({}) },
  },
}))
vi.mock('../hooks/useAuth', () => ({
  useAuth: () => ({ user: { id: 'u1' }, session: { access_token: 'user-access-token', user: { id: 'u1' } }, loading: false, signOut: vi.fn() }),
}))
vi.mock('../hooks/useProfile', () => ({
  useProfile: () => ({
    profile: {
      id: 'u1',
      full_name: 'Test User',
      email: 'test@example.com',
      gender: 'female',
      age_bucket: '30-44',
      height_bucket: '5_4_5_7',
      weight_bucket: '150_179',
    },
    loading: false,
  }),
}))
vi.mock('../lib/hipFlexCutover', () => ({ useHipFlexCutover: () => null, loadHipScoredIds: async () => new Set() }))
vi.mock('../components/FeedbackWidget', () => ({ FeedbackWidget: () => null }))
vi.mock('../components/AdsMeasurementSettings', () => ({ AdsMeasurementSettings: () => null }))
vi.mock('../components/MoodSettings', () => ({ MoodSettings: () => null }))
vi.mock('../components/CrisisLine', () => ({ CrisisHelp: () => null }))

import { Settings } from './Settings'

let host: HTMLDivElement
let root: Root

beforeEach(() => {
  calls.length = 0
  userUpdates.length = 0
  host = document.createElement('div')
  document.body.appendChild(host)
  root = createRoot(host)
})
afterEach(() => { act(() => root.unmount()); host.remove() })

async function settle() { for (let i = 0; i < 5; i++) await act(async () => { await new Promise(r => setTimeout(r, 0)) }) }
async function renderSettings() {
  await act(async () => { root.render(<MemoryRouter><Settings /></MemoryRouter>) })
  await settle()
}

function labelText(label: string): string | undefined {
  const el = Array.from(host.querySelectorAll('label, p')).find(n => (n.textContent ?? '').trim().startsWith(label))
  return el?.textContent ?? undefined
}


describe('FG-22 SHOW_GENDER_HEIGHT_WEIGHT = false', () => {
  it('flag off: Gender, Height and Weight do not render; Full name, Age group and Save profile still do', async () => {
    await renderSettings()
    expect(host.querySelector('[data-testid="your-data-export"]')).not.toBeNull() // control: the page rendered
    expect(host.textContent).toContain('Full name')
    expect(host.textContent).toContain('Age group')
    expect(host.textContent).toContain('18 to 29')
    expect(host.textContent).toContain('Save profile')
    expect(host.textContent).toContain('Email')
    expect(host.textContent).toContain('Subscription')
    expect(labelText('Gender')).toBeUndefined()
    expect(host.textContent).not.toContain('Prefer not to say')
    expect(host.textContent).not.toMatch(/\bMale\b/)
    expect(labelText('Height')).toBeUndefined()
    expect(host.textContent).not.toContain("Under 5'0\"")
    expect(labelText('Weight')).toBeUndefined()
    expect(host.textContent).not.toContain('Under 120 lb')
  })

  it('flag off: Save profile still works and writes hydrated gender, height and weight plus the other profile fields', async () => {
    await renderSettings()
    const nameInput = Array.from(host.querySelectorAll('input[type="text"]')).find(el => {
      const lab = el.parentElement?.querySelector('label')
      return (lab?.textContent ?? '').includes('Full name')
    }) as HTMLInputElement
    expect(nameInput).toBeTruthy()
    expect(nameInput.value).toBe('Test User')
    const age = Array.from(host.querySelectorAll('select')).find(el => {
      const lab = el.parentElement?.querySelector('label')
      return (lab?.textContent ?? '').includes('Age group')
    }) as HTMLSelectElement
    expect(age).toBeTruthy()
    expect(age.value).toBe('30-44')
    const save = Array.from(host.querySelectorAll('button')).find(b => (b.textContent ?? '').includes('Save profile')) as HTMLButtonElement
    expect(save).toBeTruthy()
    await act(async () => { save.click() })
    await settle()
    expect(userUpdates).toHaveLength(1)
    expect(userUpdates[0]).toEqual({
      full_name: 'Test User',
      gender: 'female',
      age_bucket: '30-44',
      height_bucket: '5_4_5_7',
      weight_bucket: '150_179',
    })
    expect(host.textContent).toContain('Saved')
  })

  it('production-build guard: FAILS if SHOW_GENDER_HEIGHT_WEIGHT is true in source; fields stay gated; data model is kept', () => {
    const src = readFileSync(join(__dirname, 'Settings.tsx'), 'utf8')
    expect(src).not.toMatch(/^const SHOW_GENDER_HEIGHT_WEIGHT = true/m)
    expect(src).toMatch(/^const SHOW_GENDER_HEIGHT_WEIGHT = false$/m)
    expect(src).toContain('{SHOW_GENDER_HEIGHT_WEIGHT && (')
    // Gender, Height and Weight UI sits behind the flag; Age group and Full name do not.
    const genderGate = src.indexOf('{SHOW_GENDER_HEIGHT_WEIGHT && (')
    const heightGate = src.indexOf('{SHOW_GENDER_HEIGHT_WEIGHT && (', genderGate + 1)
    expect(genderGate).toBeGreaterThan(0)
    expect(heightGate).toBeGreaterThan(genderGate)
    expect(src.indexOf('>Gender ')).toBeGreaterThan(genderGate)
    expect(src.indexOf('>Height<')).toBeGreaterThan(heightGate)
    expect(src.indexOf('>Weight<')).toBeGreaterThan(heightGate)
    const ageLabel = src.indexOf('>Age group<')
    const nameLabel = src.indexOf('>Full name<')
    expect(nameLabel).toBeGreaterThan(0)
    expect(nameLabel).toBeLessThan(genderGate)
    expect(ageLabel).toBeGreaterThan(genderGate)
    expect(ageLabel).toBeLessThan(heightGate)
    // Data model and save path are kept (FG-04 did not delete saved values).
    expect(src).toContain('const GENDERS = [')
    expect(src).toContain('const HEIGHT_BUCKETS = [')
    expect(src).toContain('const WEIGHT_BUCKETS = [')
    expect(src).toContain('userUpdate.gender = gender || null')
    expect(src).toContain('userUpdate.height_bucket = heightBucket')
    expect(src).toContain('userUpdate.weight_bucket = weightBucket')
    expect(src).toContain('if (ext?.gender) setGender(ext.gender)')
    expect(src).toContain('if (ext?.height_bucket) setHeightBucket(ext.height_bucket)')
    expect(src).toContain('if (ext?.weight_bucket) setWeightBucket(ext.weight_bucket)')
  })
})
