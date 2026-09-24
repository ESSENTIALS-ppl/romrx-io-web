/* ROMRx consent + DNS/S (Privacy B). Marketing pages.
   Shares storage key with app/src/lib/consent.ts.
   Hard rule: never loads Meta tags; Meta adapter lives in the app and is separately hard-gated. */
(function () {
  var STORAGE_KEY = 'romrx.consent.v1';
  var POLICY_VERSION = '2026-09-21-privacy-b';
  var PRIVACY_URL = 'https://romrx.io/legal#privacy';
  // Consent log (Legal 2026-09-24). Same endpoint and anon_id key as the app
  // (app/src/lib/consentLog.ts). The server stores only an HMAC of anon_id.
  // Compliance only: never analytics, never Meta.
  var ANON_ID_KEY = 'romrx.anon_id';
  var LOG_ENDPOINT = '/api/consent';
  var BANNER_VERSION = 'site-banner-2026-09-24-us-optout';
  var GPC_NOTE = "Your browser's Global Privacy Control signal was honored. Ads measurement is off.";

  function anonId() {
    try {
      var v = localStorage.getItem(ANON_ID_KEY);
      if (v && /^[A-Za-z0-9-]{16,64}$/.test(v)) return v;
    } catch (e) {}
    var id = uuid();
    try { localStorage.setItem(ANON_ID_KEY, id); } catch (e2) {}
    return id;
  }

  function cleanPath(p) {
    p = String(p || '/').split('#')[0].split('?')[0].replace(/[\u0000-\u001f\u007f\s]/g, '');
    if (p.charAt(0) !== '/') p = '/' + p;
    return p.replace(/\/{2,}/g, '/').slice(0, 512) || '/';
  }

  // Signed-in app session (same origin) so the server can attach user_id after verifying it.
  function accessToken() {
    try {
      var raw = localStorage.getItem('romrx.hq.auth');
      if (!raw) return null;
      var s = JSON.parse(raw);
      var t = s && (s.access_token || (s.currentSession && s.currentSession.access_token));
      var exp = s && (s.expires_at || (s.currentSession && s.currentSession.expires_at));
      if (typeof t !== 'string' || !t) return null;
      if (exp && Number(exp) * 1000 < Date.now()) return null;
      return t;
    } catch (e) { return null; }
  }

  // Fire and forget; runs whether ads measurement is on or off.
  function logChoice(state, method, conflict) {
    try {
      if (typeof fetch !== 'function') return;
      var headers = { 'Content-Type': 'application/json' };
      var tok = accessToken();
      if (tok) headers.Authorization = 'Bearer ' + tok;
      fetch(LOG_ENDPOINT, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify({
          anon_id: anonId(),
          state: state,
          method: method,
          gpc_present: gpcEnabled(),
          conflict_with_prior_accept: method === 'gpc' && conflict === true,
          policy_version: POLICY_VERSION,
          banner_version: BANNER_VERSION,
          // Which notice the visitor saw (same region decision the banner uses).
          banner_region: detectRegion(),
          page_path: cleanPath(location.pathname),
        }),
        keepalive: true,
        credentials: 'same-origin',
      }).catch(function () {});
    } catch (e) {}
  }

  function showGpcNote() {
    try {
      if (document.getElementById('rx-gpc-note')) return;
      var link = document.querySelector('[data-rx-dns]');
      var el = document.createElement('p');
      el.id = 'rx-gpc-note';
      el.className = 'rx-gpc-note';
      el.setAttribute('role', 'status');
      el.textContent = GPC_NOTE;
      el.style.cssText = 'font-size:12px;line-height:1.4;opacity:.8;margin:6px 0 0;';
      if (link && link.parentNode) link.parentNode.insertBefore(el, link.nextSibling);
      else {
        el.style.cssText += 'position:fixed;left:12px;bottom:8px;z-index:9999;background:#fff;color:#334155;padding:4px 8px;border-radius:8px;border:1px solid #e2e8f0;';
        document.body.appendChild(el);
        setTimeout(function () { if (el.parentNode) el.parentNode.removeChild(el); }, 8000);
      }
    } catch (e) {}
  }

  function uuid() {
    try {
      if (crypto && crypto.randomUUID) return crypto.randomUUID();
    } catch (e) {}
    return 'c-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function readRecord() {
    try {
      var raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      var parsed = JSON.parse(raw);
      if (!parsed || typeof parsed.state !== 'string') return null;
      return parsed;
    } catch (e) {
      return null;
    }
  }

  function writeRecord(state) {
    // Stacy GPC Field-test C.3: banner OK must not override Global Privacy Control.
    if (gpcEnabled() && state === 'granted') state = 'denied';
    var now = new Date().toISOString();
    var rec = {
      state: state,
      policy_version: POLICY_VERSION,
      updated_at: now,
      region: detectRegion(),
    };
    // Decline date: no banner or opt-back-in prompt for 12 months (11 CCR 7026(k)).
    if (state === 'denied' || state === 'revoked') rec.declined_at = now;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
    } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent('romrx:consent', { detail: rec }));
    } catch (e2) {}
    return rec;
  }

  /** A user click: store it and log it. Decline after an Accept is a revoke. */
  function recordChoice(state, method) {
    var prev = readRecord();
    if (state === 'denied' && prev && prev.state === 'granted') state = 'revoked';
    var rec = writeRecord(state);
    logChoice(rec.state, method, false);
    return rec;
  }

  /** GPC: one 'denied' row only when the stored state changes. */
  function applyGpc() {
    if (!gpcEnabled()) return false;
    var existing = readRecord();
    if (existing && existing.state !== 'granted' && existing.state !== 'unknown') return false;
    var rec = writeRecord('denied');
    logChoice(rec.state, 'gpc', !!(existing && existing.state === 'granted'));
    return true;
  }

  function detectRegion() {
    try {
      var tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if (/^(Europe\/|Atlantic\/Reykjavik|Atlantic\/Faroe)/.test(tz)) return 'eu_uk';
      if (tz === 'Europe/London' || tz.indexOf('Europe/') === 0) return 'eu_uk';
      var lang = (navigator.languages && navigator.languages[0]) || navigator.language || '';
      if (/^(en-GB|en-IE|cy|gd|ga|fr|de|es|it|nl|pt|pl|sv|da|fi|nb|nn|cs|sk|hu|ro|bg|hr|sl|et|lv|lt|el|mt)/i.test(lang)) {
        return 'eu_uk';
      }
    } catch (e) {}
    return 'us';
  }

  function gpcEnabled() {
    try {
      return !!(navigator.globalPrivacyControl === true);
    } catch (e) {
      return false;
    }
  }

  function ensureAssets() {
    if (!document.querySelector('link[data-rx-consent-css]')) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = '/assets/consent.css';
      link.setAttribute('data-rx-consent-css', '1');
      document.head.appendChild(link);
    }
  }

  function showToast(msg) {
    var existing = document.getElementById('rx-consent-toast');
    if (existing) existing.remove();
    var el = document.createElement('div');
    el.id = 'rx-consent-toast';
    el.className = 'rx-consent-toast';
    el.setAttribute('role', 'status');
    el.textContent = msg;
    document.body.appendChild(el);
    setTimeout(function () {
      if (el.parentNode) el.parentNode.removeChild(el);
    }, 7000);
  }

  function optOutConfirm() {
    showToast(
      'Got it. We turned off Meta ads measurement for this browser, including Pixel and related Conversions API events. Essential cookies still work. Email privacy@romrx.io if you need help.'
    );
  }

  function hideBanner() {
    var b = document.getElementById('rx-consent-banner');
    if (b) b.setAttribute('hidden', '');
  }

  function renderBanner(mode) {
    ensureAssets();
    var existing = document.getElementById('rx-consent-banner');
    if (existing) existing.remove();

    var isEu = mode === 'eu_uk';
    var title = isEu ? 'Ads cookies' : 'Cookies and ads measurement';
    // US opt-out copy: Stacy exact text 2026-09-24, Jim GO. EU/UK unchanged.
    var body = isEu
      ? 'We use Meta Pixel cookies and limited event data to measure ads. This is optional. Essential cookies still work either way.'
      : 'We use essential cookies so ROMRx works. On signup pages, we also use Meta Pixel cookies and limited event data to measure our ads. We do not sell your personal information, but California law may call this a "sale" or "share." Decline turns ads measurement off for this browser. Essential cookies still work either way.';

    var el = document.createElement('div');
    el.id = 'rx-consent-banner';
    el.className = 'rx-consent-banner';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-labelledby', 'rx-consent-title');
    el.setAttribute('aria-describedby', 'rx-consent-body');

    if (isEu) {
      el.innerHTML =
        '<p class="rx-consent-title" id="rx-consent-title"></p>' +
        '<p class="rx-consent-body" id="rx-consent-body"></p>' +
        '<div class="rx-consent-actions">' +
        '<button type="button" class="rx-consent-btn rx-consent-btn-primary" data-rx-consent="grant"></button>' +
        '<button type="button" class="rx-consent-btn rx-consent-btn-secondary" data-rx-consent="deny"></button>' +
        '<a class="rx-consent-link" href="' + PRIVACY_URL + '">Privacy Policy</a>' +
        '</div>';
      el.querySelector('#rx-consent-title').textContent = title;
      el.querySelector('#rx-consent-body').textContent = body;
      el.querySelector('[data-rx-consent="grant"]').textContent = 'Allow ads cookies';
      el.querySelector('[data-rx-consent="deny"]').textContent = 'Reject ads cookies';
      el.querySelector('[data-rx-consent="grant"]').addEventListener('click', function () {
        recordChoice('granted', 'banner');
        hideBanner();
      });
      el.querySelector('[data-rx-consent="deny"]').addEventListener('click', function () {
        recordChoice('denied', 'banner');
        hideBanner();
        optOutConfirm();
      });
    } else {
      // US (Jim GO 5:47 PM ET): Decline | Privacy Policy | Accept, identical style (11 CCR 7004). Footer DNS link carries CCPA 1798.135.
      el.innerHTML =
        '<p class="rx-consent-title" id="rx-consent-title"></p>' +
        '<p class="rx-consent-body" id="rx-consent-body"></p>' +
        '<div class="rx-consent-actions">' +
        '<button type="button" class="rx-consent-btn rx-consent-btn-equal" data-rx-consent="reject"></button>' +
        '<a class="rx-consent-btn rx-consent-btn-equal rx-consent-btn-link" href="' + PRIVACY_URL + '">Privacy Policy</a>' +
        '<button type="button" class="rx-consent-btn rx-consent-btn-equal" data-rx-consent="grant"></button>' +
        '</div>';
      el.querySelector('#rx-consent-title').textContent = title;
      el.querySelector('#rx-consent-body').textContent = body;
      el.querySelector('[data-rx-consent="grant"]').textContent = 'Accept';
      el.querySelector('[data-rx-consent="reject"]').textContent = 'Decline';
      el.querySelector('[data-rx-consent="grant"]').addEventListener('click', function () {
        recordChoice('granted', 'banner'); // GPC still forces denied inside writeRecord
        hideBanner();
      });
      function usOptOut() {
        recordChoice('denied', 'banner');
        hideBanner();
        optOutConfirm();
      }
      el.querySelector('[data-rx-consent="reject"]').addEventListener('click', usOptOut);
    }

    document.body.appendChild(el);
  }

  function applyDnsOptOut(fromGpc) {
    recordChoice('denied', 'footer');
    hideBanner();
    if (!fromGpc) optOutConfirm();
  }

  function bindFooterDns() {
    document.addEventListener('click', function (e) {
      var t = e.target;
      if (!t || !t.closest) return;
      var a = t.closest('[data-rx-dns]');
      if (!a) return;
      e.preventDefault();
      applyDnsOptOut(false);
    });
  }

  function maybeHandleHash() {
    var hash = (location.hash || '').toLowerCase();
    if (hash === '#do-not-sell' || hash === '#dns' || hash === '#do-not-sell-or-share') {
      applyDnsOptOut(false);
    }
  }

  function boot() {
    ensureAssets();
    bindFooterDns();

    if (gpcEnabled()) {
      applyGpc();
      hideBanner();
      showGpcNote();
      maybeHandleHash();
      return;
    }

    var rec = readRecord();
    var region = detectRegion();
    // Only someone who has never chosen sees the banner. A decline suppresses it (12 months minimum).
    if (!rec || rec.state === 'unknown') {
      renderBanner(region);
    } else {
      hideBanner();
    }
    maybeHandleHash();
  }

  window.RomrxConsent = {
    get: readRecord,
    set: writeRecord,
    choose: recordChoice,
    deny: function () { applyDnsOptOut(false); },
    region: detectRegion,
    STORAGE_KEY: STORAGE_KEY,
    POLICY_VERSION: POLICY_VERSION,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }
})();
