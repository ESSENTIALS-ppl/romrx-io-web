// Supabase Edge Function: send-s1-welcome-email
//
// RECONCILE BEFORE DEPLOY. This file is the repo copy of the function that is already
// live in the shared Supabase project. The live version was not previously committed,
// so before running `supabase functions deploy send-s1-welcome-email`, pull the
// deployed source (Dashboard > Edge Functions, or `supabase functions download
// send-s1-welcome-email`) and diff it against this file so no unseen production logic
// is lost. This copy corrects two things and otherwise preserves the described behavior:
//   1. Every CUSTOMER welcome CTA now points at the canonical Base assessment onboarding
//      (https://romrx.io/app/onboarding/assessment). The old code built
//      `${b.domain}/onboarding/assessment`, so Base dropped the required /app basename
//      and the sport branches pointed customers at sport-site assessments.
//   2. The best-effort internal alert to jim@romrx.io now includes the user ID and the
//      captured signup source / sport intent when the signup metadata provides them.
//
// Invocation: a Database Webhook on INSERT into auth.users calls this once per new
// account, so there is exactly one welcome email and one alert per genuinely new user.
//
// Guarantees:
//   - Non-blocking: always returns 200. A Resend outage or a malformed row must never
//     block account creation or the webhook. Failures are logged, not thrown.
//   - Privacy: reads and sends ONLY signup routing metadata (name, email, source, sport
//     intent, user id, timestamp). No passwords, tokens, medical, or assessment data.
//
// Required function secrets (never hardcode these):
//   RESEND_API_KEY
//   NOTIFY_WEBHOOK_SECRET   shared secret the Database Webhook sends as x-notify-secret

const CUSTOMER_FROM = 'ROMRx <no-reply@romrx.io>'
const ALERT_TO = 'jim@romrx.io'
const ALERT_FROM = 'ROMRx <no-reply@romrx.io>'

// Canonical Base onboarding. Sport intent, when recognized, is carried as ?add=<sport>
// so the shared Base assessment can hand off to a sport app later. This is the ONLY
// place the customer CTA is built; no per-brand domain is used for it.
const BASE_ONBOARDING = 'https://romrx.io/app/onboarding/assessment'
const KNOWN_SPORTS = new Set(['bjj', 'bodybuilding'])

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

function onboardingUrl(sport: string | null): string {
  if (sport && KNOWN_SPORTS.has(sport)) {
    return `${BASE_ONBOARDING}?add=${encodeURIComponent(sport)}`
  }
  return BASE_ONBOARDING
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
  // Shared-secret guard so only the configured Database Webhook can invoke this.
  const expected = Deno.env.get('NOTIFY_WEBHOOK_SECRET')
  if (expected && req.headers.get('x-notify-secret') !== expected) {
    return new Response('forbidden', { status: 403 })
  }

  let payload: { record?: AuthUserRecord; type?: string } & Partial<AuthUserRecord>
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

  const resendKey = Deno.env.get('RESEND_API_KEY')
  if (!resendKey) {
    console.error('send-s1-welcome-email: RESEND_API_KEY not set; skipping sends')
    return new Response(JSON.stringify({ ok: false, reason: 'no RESEND_API_KEY' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  const ctaUrl = onboardingUrl(sport)

  // 1) Customer welcome email. CTA always -> canonical Base assessment onboarding.
  let customerError: string | null = null
  if (email) {
    const greeting = fullName ? `Hi ${fullName},` : 'Hi,'
    customerError = await sendEmail(resendKey, {
      from: CUSTOMER_FROM,
      to: [email],
      subject: 'Welcome to ROMRx - start your free ROM assessment',
      text: [
        greeting,
        '',
        'Your ROMRx account is ready. Your next step is your free Range of Motion',
        'assessment - it takes just a few minutes and sets up everything that follows.',
        '',
        `Start your assessment: ${ctaUrl}`,
        '',
        'See you inside,',
        'The ROMRx Team',
      ].join('\n'),
    })
  }

  // 2) Best-effort internal signup alert to jim@romrx.io. Never blocks; routing
  //    metadata only, no passwords/tokens/medical/assessment data.
  const alertError = await sendEmail(resendKey, {
    from: ALERT_FROM,
    to: [ALERT_TO],
    subject: `New ROMRx Base signup: ${fullName || email || userId}`,
    text: [
      'A new ROMRx Base account was created.',
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

  // Always 200: notification failures must not block signup or the webhook.
  return new Response(
    JSON.stringify({ ok: !customerError && !alertError, customerError, alertError }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  )
})
