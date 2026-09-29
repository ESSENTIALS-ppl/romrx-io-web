// ROMRx, Investor Access Request
// Persists to Supabase `investor_requests` and emails investors@romrx.io via Resend.
//
// Required env vars (set in Netlify dashboard):
//   SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
//   RESEND_API_KEY

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

  const { name, email, firm, stage, notes } = payload;
  if (!name || !email) {
    return { statusCode: 400, body: 'name and email required' };
  }

  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY,
  } = process.env;

  const record = {
    name,
    email,
    firm: firm || null,
    stage: stage || null,
    notes: notes || null,
    source: 'romrx.io/investors',
    created_at: new Date().toISOString(),
  };

  // 1) Persist to Supabase
  if (SUPABASE_URL && SB_SERVER_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/investor_requests`, {
        method: 'POST',
        headers: {
          ...sbServerHeaders(SB_SERVER_KEY),
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(record),
      });
    } catch (err) {
      console.error('Supabase persist failed:', err);
    }
  }

  // 2) Notify investors@romrx.io
  if (RESEND_API_KEY) {
    try {
      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'ROMRx <no-reply@romrx.io>',
          to: ['investors@romrx.io'],
          reply_to: email,
          subject: `Investor request, ${name}${firm ? ` (${firm})` : ''}`,
          text: [
            `Name:  ${name}`,
            `Email: ${email}`,
            `Firm:  ${firm || '(not provided)'}`,
            `Stage: ${stage || '(not provided)'}`,
            '',
            'Notes:',
            notes || '(none)',
            '',
            '- romrx.io/investors',
          ].join('\n'),
        }),
      });
    } catch (err) {
      console.error('Resend send failed:', err);
    }
  }

  return {
    statusCode: 200,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ok: true }),
  };
};
