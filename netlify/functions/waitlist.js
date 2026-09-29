// ROMRx, Sport Pack / Assessment Waitlist
// Persists to Supabase `sport_pack_waitlist`. Silent success on duplicate emails.

// Supabase server key: prefer the new secret key (sb_secret_..., env SUPABASE_SECRET_KEY),
// fall back to the legacy service_role JWT. sb_ keys go on `apikey` only (Bearer is rejected);
// legacy JWTs need both headers. (sec 2026-09-29, prep for disabling legacy keys)
const SB_SERVER_KEY = (process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const sbServerHeaders = (k) => (k.startsWith('sb_') ? { apikey: k } : { apikey: k, Authorization: `Bearer ${k}` });

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

  const { email, sport, sport_interest, notes } = payload;
  if (!email) {
    return { statusCode: 400, body: 'email required' };
  }

  const { SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY } = process.env;

  const record = {
    email,
    sport: sport || 'base',
    sport_interest: sport_interest || null,
    notes: notes || null,
    source: 'romrx.io',
    created_at: new Date().toISOString(),
  };

  if (SUPABASE_URL && SB_SERVER_KEY) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/sport_pack_waitlist`, {
        method: 'POST',
        headers: {
          ...sbServerHeaders(SB_SERVER_KEY),
          'Content-Type': 'application/json',
          Prefer: 'return=minimal,resolution=merge-duplicates',
        },
        body: JSON.stringify(record),
      });
      // 409 (conflict) is fine, user already on list
      if (!res.ok && res.status !== 409) {
        console.error('Supabase waitlist non-ok:', res.status);
      }
    } catch (err) {
      console.error('Supabase persist failed:', err);
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
