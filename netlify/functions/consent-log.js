/**
 * Consent log (Legal: Stacy memo 2026-09-24; Grant GO).
 * POST /api/consent -> append one row to public.consent_events.
 *
 * - Server-side inserts only, with SUPABASE_SERVICE_ROLE_KEY after validation.
 *   The table has RLS on, no client policies, and no anon/authenticated grants.
 * - anon_id: the browser sends its random UUID; we store only
 *   HMAC-SHA256(CONSENT_ANON_HMAC_KEY, uuid). No _fbp/_fbc, no fingerprinting.
 * - user_id: ONLY from a JWT verified via ${SUPABASE_URL}/auth/v1/user. Never from the body.
 * - Region: country + state from the Netlify geo header only. IP is never read or stored.
 *   No user agent, no email.
 * - page_path: path only; query and hash are stripped.
 * - The log is compliance-only: never analytics, never ads, never forwarded to
 *   Meta or anyone else. This function talks to Supabase and nothing else.
 * - Signed-in writes also upsert public.user_ads_consent (current choice).
 */
'use strict';

const crypto = require('crypto');

const MAX_BODY_BYTES = 2048;
const TIMEOUT_MS = 3000;

const ALLOWED_ORIGINS = new Set([
  'https://romrx.io',
  'https://www.romrx.io',
  'http://localhost:5173',
  'http://localhost:8888',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8888',
]);
const SITE_BY_HOST = {
  'romrx.io': 'romrx.io',
  'www.romrx.io': 'romrx.io',
  'romrxbjj.com': 'romrxbjj.com',
  'www.romrxbjj.com': 'romrxbjj.com',
  'romrxbodybuilding.com': 'romrxbodybuilding.com',
  'www.romrxbodybuilding.com': 'romrxbodybuilding.com',
};

const STATES = new Set(['granted', 'denied', 'revoked']);
const BANNER_REGIONS = new Set(['us', 'eu_uk']);
// 'email' rows are entered by staff for emailed requests, not via this endpoint.
const METHODS = new Set(['banner', 'footer', 'settings', 'gpc']);
const ANON_RE = /^[A-Za-z0-9-]{16,64}$/;
const VERSION_RE = /^[A-Za-z0-9._-]{1,64}$/;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function cors(origin) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://romrx.io';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Cache-Control': 'no-store',
    Vary: 'Origin',
  };
}

function reply(statusCode, origin, body) {
  const headers = cors(origin);
  if (body === undefined) return { statusCode, headers, body: '' };
  return { statusCode, headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) };
}

function header(headers, name) {
  const h = headers || {};
  const lower = name.toLowerCase();
  for (const k of Object.keys(h)) if (k.toLowerCase() === lower) return String(h[k] == null ? '' : h[k]);
  return '';
}

/** Path only: drop scheme/host, query and hash; cap at 512; must start with '/'. */
function sanitizePagePath(raw) {
  if (typeof raw !== 'string') return '/';
  let p = raw.trim();
  try {
    if (/^[a-z][a-z0-9+.-]*:\/\//i.test(p)) p = new URL(p).pathname;
  } catch { return '/'; }
  p = p.split('#')[0].split('?')[0];
  // eslint-disable-next-line no-control-regex
  p = p.replace(/[\u0000-\u001f\u007f\s]/g, '');
  if (!p.startsWith('/')) p = '/' + p;
  p = p.replace(/\/{2,}/g, '/');
  return p.slice(0, 512) || '/';
}

/** Country (ISO 3166-1 alpha-2) and state/subdivision code from Netlify geo headers only. */
function regionFromHeaders(headers) {
  let country = null;
  let state = null;
  const geo = header(headers, 'x-nf-geo');
  if (geo) {
    try {
      const parsed = JSON.parse(Buffer.from(geo, 'base64').toString('utf8'));
      const c = String((parsed && parsed.country && parsed.country.code) || '').toUpperCase();
      const s = String((parsed && parsed.subdivision && parsed.subdivision.code) || '').toUpperCase();
      if (/^[A-Z]{2}$/.test(c)) country = c;
      if (country && /^[A-Z0-9]{1,3}$/.test(s)) state = s;
    } catch { /* ignore */ }
  }
  if (!country) {
    const direct = header(headers, 'x-country').trim().toUpperCase();
    if (/^[A-Z]{2}$/.test(direct)) country = direct;
  }
  return { region_country: country, region_state: state };
}

function hashAnonId(key, anonId) {
  return crypto.createHmac('sha256', key).update(anonId, 'utf8').digest('hex');
}

function siteFrom(headers) {
  const origin = header(headers, 'origin');
  let host = '';
  try { host = origin ? new URL(origin).hostname : ''; } catch { host = ''; }
  if (!host) host = header(headers, 'host').split(':')[0];
  return SITE_BY_HOST[host.toLowerCase()] || 'romrx.io';
}

/**
 * Whitelist + validate the client body. Returns { ok, row } or { ok:false, error }.
 * Unknown fields are ignored. user_id is never read from the body.
 */
function validateBody(body, headers) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return { ok: false, error: 'invalid_body' };
  const anonId = typeof body.anon_id === 'string' ? body.anon_id.trim() : '';
  if (!ANON_RE.test(anonId)) return { ok: false, error: 'invalid_anon_id' };
  let state = body.state;
  if (!STATES.has(state)) return { ok: false, error: 'invalid_state' };
  const method = body.method;
  if (!METHODS.has(method)) return { ok: false, error: 'invalid_method' };
  const policyVersion = body.policy_version;
  if (typeof policyVersion !== 'string' || !VERSION_RE.test(policyVersion)) return { ok: false, error: 'invalid_policy_version' };
  const bannerVersion = body.banner_version;
  if (typeof bannerVersion !== 'string' || !VERSION_RE.test(bannerVersion)) return { ok: false, error: 'invalid_banner_version' };

  const gpcPresent = body.gpc_present === true || header(headers, 'sec-gpc').trim() === '1';
  if (method === 'gpc' && !gpcPresent) return { ok: false, error: 'gpc_method_without_signal' };
  // GPC always wins over Accept: a grant with the signal present is stored as denied.
  if (gpcPresent && state === 'granted') state = 'denied';
  const conflict = method === 'gpc' && body.conflict_with_prior_accept === true;

  return {
    ok: true,
    anonId,
    row: {
      state,
      method,
      gpc_present: gpcPresent,
      conflict_with_prior_accept: conflict,
      honored: true,
      action_taken: state === 'granted' ? 'meta_pixel_capi_on' : 'meta_pixel_capi_off',
      honored_at: new Date().toISOString(),
      denial_reason: null,
      policy_version: policyVersion,
      banner_version: bannerVersion,
      // Client's notice region (what the visitor saw). Whitelisted; anything else -> null
      // so a consent record is never lost. Geo columns below stay server-derived.
      banner_region: BANNER_REGIONS.has(body.banner_region) ? body.banner_region : null,
      site: siteFrom(headers),
      schema_version: 1,
      page_path: sanitizePagePath(body.page_path),
      ...regionFromHeaders(headers),
    },
  };
}

async function fetchWithTimeout(url, opts) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

/** Verify a Supabase user JWT. Returns the user id or null. */
async function verifyUser(supabaseUrl, anonKey, authHeader) {
  const m = /^Bearer\s+([A-Za-z0-9._-]{20,4096})$/.exec(String(authHeader || '').trim());
  if (!m || !anonKey) return null;
  try {
    const res = await fetchWithTimeout(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: anonKey, Authorization: `Bearer ${m[1]}` },
    });
    if (!res.ok) return null;
    const u = await res.json();
    return u && typeof u.id === 'string' && UUID_RE.test(u.id) ? u.id : null;
  } catch {
    return null;
  }
}

exports.handler = async (event) => {
  const headers = event.headers || {};
  const origin = header(headers, 'origin');

  if (event.httpMethod === 'OPTIONS') return reply(204, origin);
  if (event.httpMethod !== 'POST') return reply(405, origin, { ok: false, error: 'method_not_allowed' });
  if (origin && !ALLOWED_ORIGINS.has(origin)) return reply(403, origin, { ok: false, error: 'origin_not_allowed' });
  const ctype = header(headers, 'content-type').toLowerCase();
  if (ctype && !ctype.startsWith('application/json') && !ctype.startsWith('text/plain')) {
    return reply(415, origin, { ok: false, error: 'unsupported_media_type' });
  }

  const raw = event.isBase64Encoded ? Buffer.from(event.body || '', 'base64').toString('utf8') : (event.body || '');
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) return reply(413, origin, { ok: false, error: 'body_too_large' });
  let body;
  try { body = JSON.parse(raw || '{}'); } catch { return reply(400, origin, { ok: false, error: 'invalid_json' }); }

  const v = validateBody(body, headers);
  if (!v.ok) return reply(400, origin, { ok: false, error: v.error });

  const supabaseUrl = (process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '').trim().replace(/\/+$/, '');
  const serviceKey = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
  const anonKey = (process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || '').trim();
  const hmacKey = (process.env.CONSENT_ANON_HMAC_KEY || '').trim();
  if (!supabaseUrl || !serviceKey || hmacKey.length < 32) {
    console.error('consent-log missing_config');
    return reply(503, origin, { ok: false, error: 'missing_config' });
  }

  const userId = await verifyUser(supabaseUrl, anonKey, header(headers, 'authorization'));
  const row = { ...v.row, anon_id_hash: hashAnonId(hmacKey, v.anonId), user_id: userId };
  const svc = { apikey: serviceKey, Authorization: `Bearer ${serviceKey}`, 'Content-Type': 'application/json' };

  try {
    const res = await fetchWithTimeout(`${supabaseUrl}/rest/v1/consent_events`, {
      method: 'POST',
      headers: { ...svc, Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    });
    if (!res.ok) {
      // Never log the body, anon id, or user id.
      console.error('consent-log insert_status', res.status);
      return reply(502, origin, { ok: false, error: 'insert_failed' });
    }
  } catch (err) {
    console.error('consent-log insert_failed', err && err.name);
    return reply(502, origin, { ok: false, error: 'insert_failed' });
  }

  if (userId) {
    const now = new Date().toISOString();
    const current = { user_id: userId, state: row.state, updated_at: now };
    if (row.state !== 'granted') current.declined_at = now;
    try {
      // Upsert the current choice (server-only table; coaches cannot read it).
      const res = await fetchWithTimeout(`${supabaseUrl}/rest/v1/user_ads_consent?on_conflict=user_id`, {
        method: 'POST',
        headers: { ...svc, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify(current),
      });
      if (!res.ok) console.error('consent-log profile_status', res.status);
    } catch (err) {
      console.error('consent-log profile_failed', err && err.name);
    }
  }

  return reply(204, origin);
};

exports._test = { sanitizePagePath, regionFromHeaders, hashAnonId, validateBody, verifyUser, siteFrom, MAX_BODY_BYTES };
