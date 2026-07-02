// ROMRx — Partner Inquiry
// Persists to Supabase `partner_inquiries` and emails partners@romrx.io via Resend.

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

  const { name, email, org, track, athletes, notes } = payload;
  if (!name || !email || !org) {
    return { statusCode: 400, body: 'name, email, and org required' };
  }

  const {
    SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY,
    RESEND_API_KEY,
  } = process.env;

  const record = {
    name,
    email,
    org,
    track: track || null,
    athletes: athletes || null,
    notes: notes || null,
    source: 'romrx.io/partners',
    created_at: new Date().toISOString(),
  };

  if (SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY) {
    try {
      await fetch(`${SUPABASE_URL}/rest/v1/partner_inquiries`, {
        method: 'POST',
        headers: {
          apikey: SUPABASE_SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify(record),
      });
    } catch (err) {
      console.error('Supabase persist failed:', err);
    }
  }

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
          to: ['partners@romrx.io'],
          reply_to: email,
          subject: `Partner inquiry — ${org} (${track || 'unspecified'})`,
          text: [
            `Name:     ${name}`,
            `Email:    ${email}`,
            `Org:      ${org}`,
            `Track:    ${track || '(not provided)'}`,
            `Athletes: ${athletes || '(not provided)'}`,
            '',
            'Notes:',
            notes || '(none)',
            '',
            '— romrx.io/partners',
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
