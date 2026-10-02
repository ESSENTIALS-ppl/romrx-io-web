// ROMRx, Investor Access Request
// Persists to Supabase `investor_requests` (service role). Jim is emailed by the
// database, not by this function: an AFTER INSERT trigger on investor_requests
// calls the Supabase edge function notify-inbound-lead, which sends via the
// project's Resend key (romrx.io's Netlify env deliberately has no RESEND_API_KEY).
//
// 2026-09-29 fix: the table did not exist until migration
// 20260929050000_investor_requests_lead_notify, and this function ignored the
// PostgREST 404 and still returned 200, so every submission was silently lost.
// It now returns 502 unless the row is actually stored, so the page shows the
// "please email us" fallback instead of a false "Thanks".
//
// Stored fields (exactly): name, email, firm, stage, notes, source, created_at.
//
// Required env vars (Netlify): SUPABASE_URL, and SUPABASE_SECRET_KEY (preferred)
// or legacy SUPABASE_SERVICE_ROLE_KEY.

// Supabase server key: prefer the new secret key (sb_secret_..., env SUPABASE_SECRET_KEY),
// fall back to the legacy service_role JWT. sb_ keys go on `apikey` only (Bearer is rejected);
// legacy JWTs need both headers. (sec 2026-09-29, prep for disabling legacy keys)
const SB_SERVER_KEY = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const sbServerHeaders = (k) => (k.startsWith('sb_') ? { apikey: k } : { apikey: k, Authorization: `Bearer ${k}` });


const LIMITS = { name: 200, email: 320, firm: 200, stage: 50, notes: 5000 };
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
  if (!name || !email) {
    return { statusCode: 400, body: 'name and email required' };
  }
  if (!EMAIL_RE.test(email)) {
    return { statusCode: 400, body: 'valid email required' };
  }

  const { SUPABASE_URL } = process.env;
  if (!SUPABASE_URL || !SB_SERVER_KEY) {
    console.error('investor-request: Supabase env missing; submission not stored');
    return reply(503, { ok: false });
  }

  const record = {
    name,
    email,
    firm: clean(payload.firm, LIMITS.firm),
    stage: clean(payload.stage, LIMITS.stage),
    notes: clean(payload.notes, LIMITS.notes),
    source: 'romrx.io/investors',
  };

  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/investor_requests`, {
      method: 'POST',
      headers: {
        ...sbServerHeaders(SB_SERVER_KEY),
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify(record),
    });
    if (!res.ok) {
      // Log status only, never the submitter's details.
      console.error(`investor-request: Supabase insert failed, HTTP ${res.status}`);
      return reply(502, { ok: false });
    }
  } catch (err) {
    console.error('investor-request: Supabase insert threw:', String(err && err.message || err));
    return reply(502, { ok: false });
  }

  return reply(200, { ok: true });
};
