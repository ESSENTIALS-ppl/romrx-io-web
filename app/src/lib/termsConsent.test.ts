/**
 * Terms acceptance record (Stacy ruling Oct 5 2026, correction 9:30 PM; Grant: current version only).
 */
import { readFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  MEDICAL_WAIVER_VERSION, REACCEPT_CONSENT_SOURCE, SIGNUP_CONSENT_SOURCE, SIGNUP_CONSENT_TEXT_VERSION,
  TERMS_VERSION, clipUserAgent, isReacceptGateEnabled, reacceptGateSkipsPath, signupConsentMetadata,
} from './termsConsent'

const SRC = resolve(__dirname, '..')
const ROOT = resolve(__dirname, '..', '..', '..')
const read = (p: string) => readFileSync(p, 'utf8')
const signup = read(join(SRC, 'pages/Signup.tsx'))
const gate = read(join(SRC, 'components/TermsReacceptGate.tsx'))
const app = read(join(SRC, 'App.tsx'))
const migration = read(join(ROOT, 'supabase/migrations/20261011000000_signup_terms_consent_record.sql'))
const flat = (s: string) => s.replace(/\{' '\}/g, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const CHECKBOX = 'I have read and agree to the ROMRx LLC Terms of Service, Privacy Policy & Refund Policy , a company-wide agreement with ROMRx LLC and its products.'

function memStorage() {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v) } }
}

describe('versions (Stacy)', () => {
  it('terms and waiver are 2026-10-03, matching the /legal Effective date', () => {
    expect(TERMS_VERSION).toBe('2026-10-03')
    expect(MEDICAL_WAIVER_VERSION).toBe('2026-10-03')
    expect(read(join(ROOT, 'legal.html'))).toContain('Effective October 3, 2026')
    expect(SIGNUP_CONSENT_TEXT_VERSION).toBe('signup-checkbox-2026-10-05')
    expect(SIGNUP_CONSENT_SOURCE).toBe('romrx.io/app/signup')
    expect(REACCEPT_CONSENT_SOURCE).toBe('romrx.io/app/reaccept')
  })

  it('the SQL constants match the app constants', () => {
    expect(migration).toContain(`select '${TERMS_VERSION}'::text`)
    expect(migration).toContain(`select p in ('${SIGNUP_CONSENT_TEXT_VERSION}', 'bb-coach-signup-checkbox-2026-10-05')`)
    expect(migration).toContain(`('${SIGNUP_CONSENT_SOURCE}', '${SIGNUP_CONSENT_TEXT_VERSION}')`)
    expect(migration).toContain("('romrxbodybuilding.com/coach-signup', 'bb-coach-signup-checkbox-2026-10-05')")
    expect(migration).toContain("select p_source in ('romrx.io/app/reaccept', 'romrxbjj.com/app/reaccept', 'romrxbodybuilding.com/app/reaccept')")
    // no BJJ signup source: romrxbjj.com never creates accounts with a checkbox
    expect(migration).not.toContain("'romrxbjj.com/app/signup'")
    expect(migration).toContain(`'${SIGNUP_CONSENT_SOURCE}'`)
    expect(migration).toContain(`'${REACCEPT_CONSENT_SOURCE}'`)
  })
})

describe('signup sends the record in signUp metadata', () => {
  it('only when the box is checked', () => {
    expect(signupConsentMetadata(false, 'UA')).toEqual({})
    expect(signupConsentMetadata(true, 'Mozilla/5.0')).toEqual({
      terms_accepted: true,
      terms_version: '2026-10-03',
      consent_text_version: 'signup-checkbox-2026-10-05',
      consent_source: 'romrx.io/app/signup',
      consent_user_agent: 'Mozilla/5.0',
    })
  })

  it('never sends an IP and clips the user agent', () => {
    const meta = signupConsentMetadata(true, 'x'.repeat(2000)) as Record<string, unknown>
    expect(Object.keys(meta).some(k => /ip/i.test(k))).toBe(false)
    expect((meta.consent_user_agent as string).length).toBe(512)
    expect(clipUserAgent(undefined)).toBe('')
  })

  it('Signup.tsx spreads the metadata into signUp options.data', () => {
    expect(signup).toContain('...signupConsentMetadata(agreedToTerms, navigator.userAgent),')
    const data = signup.slice(signup.indexOf('supabase.auth.signUp('), signup.indexOf('emailRedirectTo'))
    expect(data).toContain('signupConsentMetadata')
    // no separate client insert into consents
    expect(signup).not.toMatch(/from\('consents'\)/)
  })
})

describe('age_bucket save fix', () => {
  it('post-signup update sends only age_bucket and gender (signup_source/utm are server-set)', () => {
    const upd = signup.slice(signup.indexOf(".from('users').update({"), signup.indexOf(".eq('id', data.user.id)"))
    expect(upd).toContain('age_bucket: ageBucket')
    expect(upd).toContain('gender: gender || null')
    expect(upd).not.toMatch(/signup_source|utm|utmPatch/)
  })
})

describe('re-accept gate', () => {
  it('is OFF by default and on romrx.io, even with the query param', () => {
    expect(isReacceptGateEnabled(undefined, 'romrx.io', '', memStorage())).toBe(false)
    expect(isReacceptGateEnabled('', 'romrx.io', '?reaccept_gate=1', memStorage())).toBe(false)
    expect(isReacceptGateEnabled(undefined, 'www.romrx.io', '?reaccept_gate=1', memStorage())).toBe(false)
    expect(isReacceptGateEnabled('on', 'romrx.io', '', memStorage())).toBe(true)
  })

  it('preview hosts can latch it on for review with ?reaccept_gate=1', () => {
    const s = memStorage()
    expect(isReacceptGateEnabled(undefined, 'consent-fix--x.netlify.app', '', s)).toBe(false)
    expect(isReacceptGateEnabled(undefined, 'consent-fix--x.netlify.app', '?reaccept_gate=1', s)).toBe(true)
    expect(isReacceptGateEnabled(undefined, 'consent-fix--x.netlify.app', '', s)).toBe(true)
  })

  it('skips signed-out and auth routes', () => {
    for (const p of ['/login', '/signup', '/signup/', '/auth/callback', '/auth/confirm', '/unsubscribe']) expect(reacceptGateSkipsPath(p)).toBe(true)
    for (const p of ['/dashboard/my-body', '/onboarding/results', '/onboarding/assessment', '/']) expect(reacceptGateSkipsPath(p)).toBe(false)
  })

  it('uses Stacy copy exactly: top line, the same checkbox text, /legal link, Continue', () => {
    expect(gate).toContain('Please confirm your agreement to continue.')
    expect(flat(gate)).toContain(CHECKBOX)
    expect(flat(signup)).toContain(CHECKBOX)
    expect(gate).toMatch(/<a href="https:\/\/romrx\.io\/legal"[^>]*>\s*Terms of Service, Privacy Policy & Refund Policy\s*<\/a>/)
    expect(gate).toMatch(/\n\s*Continue\n/)
    for (const word of ['issue', 'problem', 'error on our', 'sorry', 'missed', 'again because']) {
      expect(flat(gate).toLowerCase()).not.toContain(word === 'issue' ? ' issue' : word)
    }
  })

  it('box starts unchecked and only the person can check it', () => {
    expect(gate).toContain('const [agreed, setAgreed] = useState(false)')
    expect((gate.match(/setAgreed\(/g) ?? []).length).toBe(1)
    expect(gate).toContain('onChange={e => setAgreed(e.target.checked)}')
    expect(gate).not.toMatch(/defaultChecked|setAgreed\(true\)/)
    expect(gate).toContain('disabled={!agreed || saving}')
  })

  it('checks the CURRENT version and records through the server RPC', () => {
    expect(gate).toContain(".eq('terms_version', TERMS_VERSION)")
    expect(gate).toContain("supabase.rpc('record_terms_reaccept'")
    expect(app).toContain('<TermsReacceptGate />')
  })
})

describe('migration (proposed, not applied)', () => {
  it('writes the row in the auth.users insert, after the profile trigger, and fails the signup on bad values', () => {
    expect(migration).toMatch(/create trigger zy_record_signup_terms_consent\s+after insert on auth\.users/)
    expect('zy_record_signup_terms_consent' > 'on_auth_user_created').toBe(true)
    expect(migration).toContain("if coalesce(m->>'terms_accepted', '') <> 'true' then")
    expect(migration).toMatch(/raise exception 'terms record: version % is not current'/)
  })

  it('records no IP, sets the waiver version to the terms version, and does not backfill', () => {
    expect(migration).toMatch(/new\.id, v_terms, v_terms,/)
    expect(migration).toMatch(/null, left\(nullif\(m->>'consent_user_agent', ''\), 512\), now\(\)/)
    const code = migration.split('\n').filter(l => !l.trim().startsWith('--')).join('\n')
    expect(code).not.toMatch(/insert into public\.consents[\s\S]*select[\s\S]*from auth\.users/i)
    expect(code).not.toMatch(/update public\.athletes\s+set\s+terms_accepted_at\s*=\s*(now|'20)/i)
  })

  it('copies age_bucket and gender server-side', () => {
    expect(migration).toMatch(/create trigger zx_copy_signup_demographics\s+after insert on auth\.users/)
  })
})

describe('magic link never creates an account (no checkbox shown there)', () => {
  it('Login.tsx sends shouldCreateUser: false and explains a missing account', () => {
    const login = read(join(SRC, 'pages/Login.tsx'))
    expect(login).toContain('shouldCreateUser: false')
    expect(login).toContain("\"We couldn't find an account for that email.\"")
  })
})
