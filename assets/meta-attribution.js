/**
 * Marketing-page Meta Pixel adapter (Privacy B / CoS 2026-09-22).
 *
 * HARD OFF: META_ATTRIBUTION_ENABLED === false. Do not load fbevents.js,
 * call fbq, or POST CAPI while false. Empty PIXEL_ID also keeps measurement off.
 *
 * Enable later (Jim IDs via Grant ONLY — never invent):
 *  1) Set Netlify env VITE_META_PIXEL_ID (SPA) + META_PIXEL_ID + META_CAPI_TOKEN (function)
 *  2) Flip META_ATTRIBUTION_ENABLED to true HERE and in app/src/lib/metaAttribution.ts
 *     and netlify/functions/meta-capi.js (same release)
 *  3) Optionally set window.__ROMRX_META_PIXEL_ID before this script (empty = off)
 *  4) Ship HOLD 1B Pixel-ON banner copy only after measurement is live
 *  5) Reid Field PASS — then parent may ask Jim for spend (not this file)
 *
 * Consent: Reject / Don't Sell / GPC → denied → no Pixel/CAPI.
 * Shared storage key with assets/consent.js: romrx.consent.v1
 */
(function () {
  'use strict';

  // HARD OFF until Field PASS + real credentials via Grant.
  var META_ATTRIBUTION_ENABLED = true;

  // Public Pixel ID (Jim via Grant 2026-09-24). Inert while the hard flag is false.
  var DEFAULT_PIXEL_ID = '2284396799046573';

  var CONSENT_KEY = 'romrx.consent.v1';
  var SAFE_QUERY = {
    utm_source: 1, utm_medium: 1, utm_campaign: 1, utm_content: 1, utm_term: 1, fbclid: 1, sport: 1, ref: 1, add: 1
  };
  // Approved scope (Jim 2026-09-24): public signup pages ONLY. Marketing pages
  // (/, /legal, /beta, ...) never load fbevents or POST CAPI, even with consent.
  // Keep in sync with app/src/lib/metaAttribution.ts + netlify/functions/meta-capi.js.
  var SAFE_PATHS = [/^\/app\/signup\/?$/, /^\/app\/signup\/[a-z0-9-]+\/?$/i];

  function safePath() {
    try {
      var p = window.location.pathname || '/';
      for (var i = 0; i < SAFE_PATHS.length; i++) {
        if (SAFE_PATHS[i].test(p)) return true;
      }
    } catch (e) { /* ignore */ }
    return false;
  }

  // Any query key outside the allowlist (email, name, lead, token...) blocks Meta on this page.
  function safeLocation() {
    try {
      var q = (window.location.search || '').replace(/^\?/, '');
      if (!q) return true;
      var parts = q.split('&');
      for (var i = 0; i < parts.length; i++) {
        if (!parts[i]) continue;
        var key = decodeURIComponent(parts[i].split('=')[0] || '').toLowerCase();
        if (!SAFE_QUERY[key]) return false;
      }
      return true;
    } catch (e) {
      return false;
    }
  }
  var CAPI_ENDPOINT = '/api/attribution/meta';

  function pixelId() {
    try {
      if (typeof window.__ROMRX_META_PIXEL_ID === 'string' && window.__ROMRX_META_PIXEL_ID.trim()) {
        return window.__ROMRX_META_PIXEL_ID.trim();
      }
    } catch (e) { /* ignore */ }
    return DEFAULT_PIXEL_ID;
  }

  function readConsentState() {
    try {
      if (navigator.globalPrivacyControl === true) return 'denied';
    } catch (e) { /* ignore */ }
    try {
      var raw = localStorage.getItem(CONSENT_KEY);
      if (!raw) return 'unknown';
      var parsed = JSON.parse(raw);
      return (parsed && parsed.state) || 'unknown';
    } catch (e) {
      return 'unknown';
    }
  }

  function canSend() {
    return (
      META_ATTRIBUTION_ENABLED === true &&
      readConsentState() === 'granted' &&
      !!pixelId() &&
      safePath() &&
      safeLocation()
    );
  }

  var pixelReady = false;

  function ensurePixelLoaded() {
    if (!canSend()) return false;
    if (pixelReady && typeof window.fbq === 'function') return true;
    if (document.querySelector('script[data-rx-meta-pixel]')) {
      pixelReady = typeof window.fbq === 'function';
      return pixelReady;
    }
    var id = pixelId();
    // fbevents already running (revoked earlier, now re-granted) -> grant the live instance.
    var alreadyRunning = typeof window.fbq === 'function' && typeof window.fbq.callMethod === 'function';
    /* Meta stub pattern */
    if (!window.fbq) {
      var n = function () {
        n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments);
      };
      if (!window._fbq) window._fbq = n;
      n.push = n;
      n.loaded = true;
      n.version = '2.0';
      n.queue = [];
      window.fbq = n;
    }
    // Only reached after consent === 'granted'. NO pre-load consent revoke:
    // fbevents pauses its queue on a queued revoke and never runs the later
    // grant (live self-check FAIL 2026-09-24).
    if (alreadyRunning) window.fbq('consent', 'grant');
    window.fbq('set', 'autoConfig', false, id);
    window.fbq('init', id);
    var s = document.createElement('script');
    s.async = true;
    s.src = 'https://connect.facebook.net/en_US/fbevents.js';
    s.setAttribute('data-rx-meta-pixel', '1');
    document.head.appendChild(s);
    pixelReady = true;
    return true;
  }

  function newEventId() {
    try {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) { /* ignore */ }
    return 'm-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  // Meta browser/click IDs (fbp/fbc) for CAPI matching, Meta's documented format:
  //   fbp = fb.<idx>.<creationTimeMs>.<random>[.<appendix>]
  //   fbc = fb.<idx>.<creationTimeMs>.<fbclid>[.<appendix>]
  // Read ONLY after canSend() (flag + granted + no GPC + signup allowlist).
  // fbclid is never sent as a URL; event_source_url stays origin + path.
  // Keep in sync with app/src/lib/metaAttribution.ts + netlify/functions/meta-capi.js.
  var FBP_RE = /^fb\.[0-2]\.\d{13}\.\d{1,24}(?:\.[A-Za-z0-9_-]{2,8})?$/;
  var FBC_RE = /^fb\.[0-2]\.\d{13}\.[A-Za-z0-9_-]{1,400}(?:\.[A-Za-z0-9_-]{2,8})?$/;
  var FBCLID_RE = /^[A-Za-z0-9_-]{1,400}$/;
  function validFbp(v) { return typeof v === 'string' && v.length <= 128 && FBP_RE.test(v); }
  function validFbc(v) { return typeof v === 'string' && v.length <= 500 && FBC_RE.test(v); }
  function readCookie(name) {
    try {
      var parts = (document.cookie || '').split(';');
      for (var i = 0; i < parts.length; i++) {
        var j = parts[i].indexOf('=');
        if (j < 0) continue;
        if (parts[i].slice(0, j).trim() === name) return decodeURIComponent(parts[i].slice(j + 1).trim());
      }
    } catch (e) { /* ignore */ }
    return undefined;
  }
  function queryParam(name) {
    try {
      var q = (window.location.search || '').replace(/^\?/, '').split('&');
      for (var i = 0; i < q.length; i++) {
        var kv = q[i].split('=');
        if (decodeURIComponent(kv[0] || '') === name) return decodeURIComponent((kv[1] || '').replace(/\+/g, ' '));
      }
    } catch (e) { /* ignore */ }
    return null;
  }
  function browserIds() {
    var out = {};
    var fbp = readCookie('_fbp');
    if (validFbp(fbp)) out.fbp = fbp;
    var cookieFbc = readCookie('_fbc');
    var fbclid = queryParam('fbclid');
    if (fbclid && FBCLID_RE.test(fbclid)) {
      var matches = validFbc(cookieFbc) &&
        (cookieFbc.slice(-(fbclid.length + 1)) === '.' + fbclid || cookieFbc.indexOf('.' + fbclid + '.') >= 0);
      var fbc = matches ? cookieFbc : 'fb.1.' + Date.now() + '.' + fbclid;
      if (validFbc(fbc)) out.fbc = fbc;
    } else if (validFbc(cookieFbc)) {
      out.fbc = cookieFbc;
    }
    return out;
  }

  // First event after Allow: fbevents sets _fbp shortly after it loads; wait briefly.
  function sendCapi(eventName, eventId, waitedMs) {
    if (!canSend()) return;
    var ids = browserIds();
    waitedMs = waitedMs || 0;
    if (!ids.fbp && waitedMs < 1500) {
      setTimeout(function () { sendCapi(eventName, eventId, waitedMs + 150); }, 150);
      return;
    }
    try {
      var body = {
        event_name: eventName,
        event_id: eventId,
        event_time: Math.floor(Date.now() / 1000),
        action_source: 'website',
        event_source_url: ((window.location.origin || 'https://romrx.io') + (window.location.pathname || '/')).slice(0, 500),
        consent_version: '2026-09-21-privacy-b',
        consent_state: 'granted',
        properties: {},
      };
      if (ids.fbp) body.fbp = ids.fbp;
      if (ids.fbc) body.fbc = ids.fbc;
      fetch(CAPI_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        keepalive: true,
      }).catch(function () { /* Meta outage must not block */ });
    } catch (e) { /* ignore */ }
  }

  function track(eventName) {
    if (eventName !== 'PageView' && eventName !== 'Lead' && eventName !== 'CompleteRegistration') return null;
    if (!canSend()) return null;
    if (!ensurePixelLoaded()) return null;
    var eventId = newEventId();
    try {
      window.fbq('track', eventName, {}, { eventID: eventId });
    } catch (e) { /* ignore */ }
    sendCapi(eventName, eventId);
    return eventId;
  }

  function revoke() {
    pixelReady = false;
    try {
      var f = window.fbq;
      if (typeof f === 'function') {
        // Live fbevents: revoke. Stub not loaded yet: drop queued calls (a queued revoke stalls fbevents).
        if (typeof f.callMethod === 'function') f('consent', 'revoke');
        else if (f.queue && f.queue.length) f.queue.length = 0;
      }
    } catch (e) { /* ignore */ }
    var s = document.querySelector('script[data-rx-meta-pixel]');
    if (s) s.remove();
  }

  function onConsent(detail) {
    var state = (detail && detail.state) || readConsentState();
    if (state === 'granted') {
      track('PageView');
    } else {
      revoke();
    }
  }

  window.romrxMeta = {
    track: track,
    revoke: revoke,
    canSend: canSend,
    enabled: function () { return META_ATTRIBUTION_ENABLED === true; },
    pixelIdConfigured: function () { return !!pixelId(); },
  };

  window.addEventListener('romrx:consent', function (ev) {
    onConsent(ev && ev.detail);
  });

  // If consent already granted on load, attempt PageView (no-op while hard-off / empty ID).
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () {
      if (readConsentState() === 'granted') track('PageView');
    });
  } else if (readConsentState() === 'granted') {
    track('PageView');
  }
})();
