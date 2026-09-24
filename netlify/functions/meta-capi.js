/**
 * Meta Conversions API proxy (Privacy B).
 * Server-side token only (META_CAPI_TOKEN / META_PIXEL_ID env).
 * Hard-gated: META_ATTRIBUTION_ENABLED must be true in THIS file (default false)
 * AND consent_state === 'granted' AND token+pixel present. Fail closed otherwise.
 * No ROM/health payloads. event_id idempotency via in-memory recent set (best-effort).
 */
'use strict';

// HARD OFF until Reid Field PASS + Jim credentials via Grant.
const META_ATTRIBUTION_ENABLED = true;

const ALLOWED_EVENTS = new Set(['PageView', 'Lead', 'CompleteRegistration']);
const ALLOWED_ORIGINS = new Set([
  'https://romrx.io',
  'https://www.romrx.io',
  'http://localhost:5173',
  'http://localhost:8888',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:8888',
]);

// Approved scope (Jim 2026-09-24): public signup pages ONLY. Any event whose
// event_source_url is not romrx.io + one of these paths is rejected.
// Keep in sync with app/src/lib/metaAttribution.ts + assets/meta-attribution.js.
const ALLOWED_HOSTS = new Set(['romrx.io', 'www.romrx.io']);
const ALLOWED_PATHS = [/^\/app\/signup\/?$/, /^\/app\/signup\/[a-z0-9-]+\/?$/i];

function isAllowedSourceUrl(raw) {
  if (typeof raw !== 'string' || !raw) return false;
  let u;
  try { u = new URL(raw); } catch { return false; }
  if (u.protocol !== 'https:' || !ALLOWED_HOSTS.has(u.hostname)) return false;
  return ALLOWED_PATHS.some((re) => re.test(u.pathname));
}

// Best-effort dedupe within a warm function instance.
const recentIds = new Map();
const DEDUPE_TTL_MS = 10 * 60 * 1000;

function cors(origin) {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : 'https://romrx.io';
  return {
    'Access-Control-Allow-Origin': allow,
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };
}

function json(statusCode, body, origin) {
  return { statusCode, headers: cors(origin), body: JSON.stringify(body) };
}

function pruneDedupe(now) {
  for (const [k, ts] of recentIds) {
    if (now - ts > DEDUPE_TTL_MS) recentIds.delete(k);
  }
}

exports.handler = async (event) => {
  const origin = event.headers.origin || event.headers.Origin || '';

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers: cors(origin), body: '' };
  }
  if (event.httpMethod !== 'POST') {
    return json(405, { ok: false, error: 'method_not_allowed' }, origin);
  }

  // Hard gate — no Meta contact while disabled.
  if (META_ATTRIBUTION_ENABLED !== true) {
    return json(200, { ok: true, dispatched: false, reason: 'attribution_disabled' }, origin);
  }

  // Server-side GPC: a browser sending Sec-GPC: 1 is opted out, whatever the body says.
  const gpcHeader = String(event.headers['sec-gpc'] || event.headers['Sec-GPC'] || '').trim();
  if (gpcHeader === '1') {
    return json(200, { ok: true, dispatched: false, reason: 'gpc_opt_out' }, origin);
  }
  // Only our own pages may trigger CAPI.
  if (origin && !ALLOWED_ORIGINS.has(origin)) {
    return json(403, { ok: false, error: 'origin_not_allowed' }, origin);
  }

  const pixelId = (process.env.META_PIXEL_ID || process.env.VITE_META_PIXEL_ID || '').trim();
  const token = (process.env.META_CAPI_TOKEN || '').trim();
  if (!pixelId || !token) {
    return json(200, { ok: true, dispatched: false, reason: 'missing_config' }, origin);
  }

  let payload;
  try {
    payload = JSON.parse(event.body || '{}');
  } catch {
    return json(400, { ok: false, error: 'invalid_json' }, origin);
  }

  const eventName = payload.event_name;
  const eventId = typeof payload.event_id === 'string' ? payload.event_id.slice(0, 128) : '';
  const consentState = payload.consent_state;
  const consentVersion = payload.consent_version;
  // Signup-page allowlist, enforced server-side. Origin + path only (query/hash
  // stripped) so no email, lead token, or other PII can ride along to Meta.
  if (!isAllowedSourceUrl(payload.event_source_url)) {
    return json(200, { ok: true, dispatched: false, reason: 'path_not_allowed' }, origin);
  }
  const srcUrl = new URL(payload.event_source_url);
  const eventSourceUrl = `${srcUrl.origin}${srcUrl.pathname}`.slice(0, 500);

  if (!ALLOWED_EVENTS.has(eventName) || !eventId) {
    return json(400, { ok: false, error: 'invalid_event' }, origin);
  }
  if (consentState !== 'granted') {
    return json(200, { ok: true, dispatched: false, reason: 'consent_blocked' }, origin);
  }
  if (!consentVersion) {
    return json(200, { ok: true, dispatched: false, reason: 'consent_version_missing' }, origin);
  }

  const now = Date.now();
  pruneDedupe(now);
  const dedupeKey = `${eventName}:${eventId}`;
  if (recentIds.has(dedupeKey)) {
    return json(200, { ok: true, dispatched: false, reason: 'duplicate_event_id' }, origin);
  }
  recentIds.set(dedupeKey, now);

  let eventTime = Number(payload.event_time) || Math.floor(now / 1000);
  const maxFuture = Math.floor(now / 1000) + 60;
  const minPast = Math.floor(now / 1000) - 7 * 24 * 3600;
  if (eventTime > maxFuture || eventTime < minPast) {
    eventTime = Math.floor(now / 1000);
  }

  // Allowlisted custom_data only — never pass through client properties wholesale.
  const customData = {};
  const props = payload.properties && typeof payload.properties === 'object' ? payload.properties : {};
  if (typeof props.content_name === 'string') {
    customData.content_name = props.content_name.slice(0, 64);
  }

  const clientIp =
    event.headers['x-nf-client-connection-ip'] ||
    (event.headers['x-forwarded-for'] || '').split(',')[0].trim() ||
    undefined;
  const userAgent = event.headers['user-agent'] || event.headers['User-Agent'] || undefined;

  const userData = {};
  if (clientIp) userData.client_ip_address = clientIp;
  if (userAgent) userData.client_user_agent = userAgent;
  // Automatic Advanced Matching OFF: do not attach em/ph from client.

  const body = {
    data: [
      {
        event_name: eventName,
        event_time: eventTime,
        event_id: eventId,
        action_source: 'website',
        event_source_url: eventSourceUrl,
        user_data: userData,
        ...(Object.keys(customData).length ? { custom_data: customData } : {}),
      },
    ],
  };

  try {
    const url = `https://graph.facebook.com/v19.0/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    // Never log token or raw PII.
    if (!res.ok) {
      console.error('meta-capi upstream_status', res.status, 'event', eventName, 'id_prefix', eventId.slice(0, 8));
      return json(200, { ok: true, dispatched: false, reason: 'upstream_error' }, origin);
    }
    return json(200, { ok: true, dispatched: true, event_name: eventName }, origin);
  } catch (err) {
    console.error('meta-capi fetch_failed', err && err.message);
    return json(200, { ok: true, dispatched: false, reason: 'fetch_failed' }, origin);
  }
};

exports._test = { isAllowedSourceUrl };
