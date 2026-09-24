/* ROMRx consent + DNS/S (Privacy B). Marketing pages.
   Shares storage key with app/src/lib/consent.ts.
   Hard rule: never loads Meta tags; Meta adapter lives in the app and is separately hard-gated. */
(function () {
  var STORAGE_KEY = 'romrx.consent.v1';
  var POLICY_VERSION = '2026-09-21-privacy-b';
  var PRIVACY_URL = 'https://romrx.io/legal#privacy';

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
    var rec = {
      state: state,
      policy_version: POLICY_VERSION,
      updated_at: new Date().toISOString(),
      region: detectRegion(),
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rec));
    } catch (e) {}
    try {
      window.dispatchEvent(new CustomEvent('romrx:consent', { detail: rec }));
    } catch (e2) {}
    return rec;
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
      : 'We use essential cookies so ROMRx works. On signup pages, we also use Meta Pixel cookies and limited event data to measure our ads. We do not sell your personal information, but California law may call this a "sale" or "share." Reject turns ads measurement off for this browser. Essential cookies still work either way.';

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
        writeRecord('granted');
        hideBanner();
      });
      el.querySelector('[data-rx-consent="deny"]').addEventListener('click', function () {
        writeRecord('denied');
        hideBanner();
        optOutConfirm();
      });
    } else {
      // US: Accept | Reject | Privacy Policy, equal weight (11 CCR 7004). Footer DNS link carries CCPA 1798.135.
      el.innerHTML =
        '<p class="rx-consent-title" id="rx-consent-title"></p>' +
        '<p class="rx-consent-body" id="rx-consent-body"></p>' +
        '<div class="rx-consent-actions">' +
        '<button type="button" class="rx-consent-btn rx-consent-btn-equal" data-rx-consent="grant"></button>' +
        '<button type="button" class="rx-consent-btn rx-consent-btn-equal" data-rx-consent="reject"></button>' +
        '<a class="rx-consent-btn rx-consent-btn-equal rx-consent-btn-link" href="' + PRIVACY_URL + '">Privacy Policy</a>' +
        '</div>';
      el.querySelector('#rx-consent-title').textContent = title;
      el.querySelector('#rx-consent-body').textContent = body;
      el.querySelector('[data-rx-consent="grant"]').textContent = 'Accept';
      el.querySelector('[data-rx-consent="reject"]').textContent = 'Reject';
      el.querySelector('[data-rx-consent="grant"]').addEventListener('click', function () {
        writeRecord('granted'); // GPC still forces denied inside writeRecord
        hideBanner();
      });
      function usOptOut() {
        writeRecord('denied');
        hideBanner();
        optOutConfirm();
      }
      el.querySelector('[data-rx-consent="reject"]').addEventListener('click', usOptOut);
    }

    document.body.appendChild(el);
  }

  function applyDnsOptOut(fromGpc) {
    writeRecord('denied');
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
      var existing = readRecord();
      if (!existing || existing.state === 'granted' || existing.state === 'unknown') {
        writeRecord('denied');
      }
      hideBanner();
      maybeHandleHash();
      return;
    }

    var rec = readRecord();
    var region = detectRegion();
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
