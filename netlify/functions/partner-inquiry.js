// ROMRx, Partner Inquiry
// Persists to Supabase `partner_inquiries` (service role). Jim is emailed by the
// database: an AFTER INSERT trigger on partner_inquiries calls the Supabase edge
// function notify-inbound-lead (romrx.io's Netlify env has no RESEND_API_KEY, so
// the email step that used to live here never ran).
//
// 2026-09-29: returns 502 unless the row is actually stored, so the page shows
// the "please email us" fallback instead of a false "Thanks".
//
// Stored fields (the live /partners form, #100): name, email, org, website,
// product_category, offer_type, notes, source, created_at. track/athletes are
// legacy columns from the old 3-track form; stored only if a caller still sends them.
//
// 2026-09-29 fix: website, product_category and offer_type were dropped (saved as
// null) because this function still read the old track/athletes names.
//
// Required env vars (Netlify): SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY

const LIMITS = { name: 200, email: 320, org: 200, website: 500, product_category: 100, offer_type: 100, track: 100, athletes: 100, notes: 5000 };
const EMAIL_RE = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

const clean = (v, max) => {
  if (v === undefined || v === null) return null;
  const s = String(v).trim();
  return s ? s.slice(0, max) : null;
};

const reply = (statusCode, body) => ({
  statusCode,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return { statusCode: 400, body: 'Invalid JSON' };
  }

  const name = clean(payload.name, LIMITS.name);
  const email = clean(payload.email, LIMITS.email);
  const org = clean(payload.org, LIMITS.org);
  if (!name || !email || !org) {
    return { statusCode: 400, body: 'name, email, and org required' };
  }
  if (!EMAIL_RE.test(email)) {
    return { statusCode: 400, body: 'valid email required' };
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('partner-inquiry: Supabase env missing; submission not stored');
    return reply(503, { ok: false });
  }

  const record = {
    name,
    email,
    org,
    website: clean(payload.website, LIMITS.website),
    product_category: clean(payload.product_category, LIMITS.product_category),
    offer_type: clean(payload.offer_type, LIMITS.offer_type),
    track: clean(payload.track, LIMITS.track),
    athletes: clean(payload.athletes, LIMITS.athletes),
    notes: clean(payload.notes, LIMITS.notes),
    source: 'romrx.io/partners',
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/partner_inquiries`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      console.error(`partner-inquiry: Supabase insert failed, HTTP ${res.status}`);
      return reply(502, { ok: false });
    }
  } catch (err) {
    console.error('partner-inquiry: Supabase insert threw:', String(err && err.message || err));
    return reply(502, { ok: false });
  }

  return reply(200, { ok: true });
};
