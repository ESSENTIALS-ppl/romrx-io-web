// Supabase Edge Function: send-s1-welcome-email  (matches live v13; verify_jwt=false)
//
// This is a conservative patch of the deployed v13 function, NOT a redesign. v13
// already: defines BRANDS for bjj / bodybuilding / general (brand-specific from
// address + alertTo), sends a customer welcome email via RESEND_API_KEY, then sends a
// best-effort non-blocking internal alert to the brand's alertTo (jim@romrx.io), and
// is invoked exactly once per new account by an AFTER INSERT trigger on auth.users.
// All of that behavior and the template copy are preserved.
//
// Required delta only:
//   1. Every brand's CUSTOMER CTA now points at canonical Base onboarding
//      (https://romrx.io/app/onboarding/assessment), appending only a recognized
//      ?add=bjj or ?add=bodybuilding. It NEVER points at a sport-domain
//      /onboarding/assessment.
//   2. The internal alert (still jim@romrx.io) now includes the auth user id
//      (record.id) and the captured source / sport intent when metadata has them.
//   3. Alert send stays best-effort and non-blocking; no credentials are committed.
//   4. Minimal payload validation + HTML escaping of user-controlled name/email.
//
// Secret (never hardcode): RESEND_API_KEY.

const BASE_ONBOARDING = 'https://romrx.io/app/onboarding/assessment'

type BrandKey = 'bjj' | 'bodybuilding' | 'general'

interface Brand {
  label: string
  from: string
  alertTo: string
  // Recognized sport intent carried to Base as ?add=<add>. null = generic Base.
  add: 'bjj' | 'bodybuilding' | null
}

const BRANDS: Record<BrandKey, Brand> = {
  bjj: {
    label: 'ROMRx+BJJ',
    from: 'ROMRx+BJJ <no-reply@romrx.io>',
    alertTo: 'jim@romrx.io',
    add: 'bjj',
  },
  bodybuilding: {
    label: 'ROMRx+BodyBuilding',
    from: 'ROMRx+BodyBuilding <no-reply@romrx.io>',
    alertTo: 'jim@romrx.io',
    add: 'bodybuilding',
  },
  general: {
    label: 'ROMRx',
    from: 'ROMRx <no-reply@romrx.io>',
    alertTo: 'jim@romrx.io',
    add: null,
  },
}

interface AuthUserRecord {
  id?: string
  email?: string | null
  created_at?: string | null
  raw_user_meta_data?: Record<string, unknown> | null
}

function str(v: unknown): string | null {
  if (typeof v !== 'string') return null
  const t = v.trim()
  return t === '' ? null : t
}

// Escape user-controlled values before interpolating into the HTML template.
function esc(v: string): string {
  return v
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function brandFor(sport: string | null): Brand {
  if (sport === 'bjj') return BRANDS.bjj
  if (sport === 'bodybuilding') return BRANDS.bodybuilding
  return BRANDS.general
}

// Canonical Base CTA. Only a recognized brand.add is appended; never a sport domain.
function ctaFor(brand: Brand): string {
  return brand.add ? `${BASE_ONBOARDING}?add=${encodeURIComponent(brand.add)}` : BASE_ONBOARDING
}

async function sendEmail(resendKey: string, body: Record<string, unknown>): Promise<string | null> {
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${resendKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    })
    if (!res.ok) return `resend ${res.status}: ${await res.text()}`
    return null
  } catch (e) {
    return e instanceof Error ? e.message : String(e)
  }
}

Deno.serve(async (req) => {
  // Minimal payload validation. Malformed input must not throw.
  let payload: { record?: AuthUserRecord } & Partial<AuthUserRecord>
  try {
    payload = await req.json()
  } catch {
    return new Response('bad request', { status: 400 })
  }

  const rec: AuthUserRecord = payload?.record ?? (payload as AuthUserRecord)
  const userId = str(rec?.id)
  const email = str(rec?.email)
  if (!userId) return new Response('no user id', { status: 200 })

  const meta = (rec.raw_user_meta_data ?? {}) as Record<string, unknown>
  const fullName = str(meta.full_name)
  const source = str(meta.signup_source) ?? 'romrx.io'
  const sportRaw = str(meta.add_sport)
  const sport = sportRaw ? sportRaw.toLowerCase() : null
  const signedUpAt = str(rec.created_at) ?? new Date().toISOString()

  const brand = brandFor(sport)
  const cta = ctaFor(brand)

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.error('send-s1-welcome-email: RESEND_API_KEY not set; skipping sends')
    return new Response(JSON.stringify({ ok: false, reason: 'no RESEND_API_KEY' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // 1) Customer welcome email. CTA always -> canonical Base assessment onboarding.
  let customerError: string | null = null
  if (email) {
    const htmlGreeting = fullName ? `Hi ${esc(fullName)},` : 'Hi,'
    const textGreeting = fullName ? `Hi ${fullName},` : 'Hi,'
    customerError = await sendEmail(resendKey, {
      from: brand.from,
      to: [email],
      subject: `Welcome to ${brand.label} - start your free ROM assessment`,
      html: [
        `<p>${htmlGreeting}</p>`,
        `<p>Your ${esc(brand.label)} account is ready. Your next step is your free Range of Motion assessment - it takes just a few minutes and sets up everything that follows.</p>`,
        `<p><a href="${cta}">Start your assessment</a></p>`,
        `<p>See you inside,<br/>The ROMRx Team</p>`,
      ].join('\n'),
      text: [
        textGreeting,
        '',
        `Your ${brand.label} account is ready. Your next step is your free Range of Motion`,
        'assessment - it takes just a few minutes and sets up everything that follows.',
        '',
        `Start your assessment: ${cta}`,
        '',
        'See you inside,',
        'The ROMRx Team',
      ].join('\n'),
    })
  }

  // 2) Best-effort internal signup alert to the brand's alertTo (jim@romrx.io). Sent
  //    AFTER the customer welcome and never blocks; routing metadata only, no
  //    passwords/tokens/medical/assessment data.
  const alertError = await sendEmail(resendKey, {
    from: brand.from,
    to: [brand.alertTo],
    subject: `New ${brand.label} signup: ${fullName || email || userId}`,
    text: [
      `A new ${brand.label} account was created.`,
      '',
      `Name:         ${fullName || '(not provided)'}`,
      `Email:        ${email || '(not provided)'}`,
      `Sport intent: ${sport || '(none)'}`,
      `Source:       ${source}`,
      `Signed up at: ${signedUpAt}`,
      `User ID:      ${userId}`,
    ].join('\n'),
  })

  if (customerError) console.error('send-s1-welcome-email customer send failed:', customerError)
  if (alertError) console.error('send-s1-welcome-email alert send failed:', alertError)

  // Always 200: notification failures must not block signup or the trigger.
  return new Response(
    JSON.stringify({ ok: !customerError && !alertError, customerError, alertError }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
