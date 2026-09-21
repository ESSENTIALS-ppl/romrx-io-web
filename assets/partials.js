/* romrx.utm first-touch capture — shared key with app/src/lib/utm.ts
   Runs on marketing pages (/beta, homepage, etc.) so UTMs survive CTA → /app/signup. */
(function captureRomrxUtm() {
  try {
    var KEY = 'romrx.utm';
    var keys = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'gclid', 'fbclid'];
    var sp = new URLSearchParams(window.location.search);
    var found = {};
    var any = false;
    for (var i = 0; i < keys.length; i++) {
      var v = (sp.get(keys[i]) || '').trim();
      if (v) { found[keys[i]] = v; any = true; }
    }
    if (!any) return;
    if (localStorage.getItem(KEY)) return; // first-touch only
    found.captured_at = new Date().toISOString();
    found.landing_path = window.location.pathname + window.location.search;
    localStorage.setItem(KEY, JSON.stringify(found));
  } catch (e) { /* ignore private mode */ }
})();

/* ROMRx corporate, shared partials injected client-side.
   Each page marks slots with data-rx-slot="nav|universe|legal".
   This keeps partials DRY without a build step. */

const RX_NAV = `
<nav class="rx-nav">
  <div class="rx-nav-inner">
    <a href="/" class="rx-wordmark">ROMRx</a>
    <div class="rx-nav-links">
      <a href="/universe" data-nav="universe">Universe</a>
      <a href="/dashboard" data-nav="dashboard">Dashboard</a>
      <a href="/science" data-nav="science">Science</a>
      <a href="/articles" data-nav="articles">Articles</a>
      <a href="/investors" data-nav="investors">Investors</a>
      <a href="/partners" data-nav="partners">Partners</a>
      <!-- Log in: lets returning users skip the assessment funnel and go straight to their Base account login.
           Mirrors the "Sign In" header link on the sibling sites romrxbjj.com and romrxbodybuilding.com,
           which each point to their own /login route. The ROMRx Base app is served at /app/ (see netlify.toml
           redirects and app/vite.config.ts base + App.tsx basename="/app"), so its login route is /app/login. -->
      <a href="/app/login" class="nav-login mobile-hide-ok">Log in</a>
    </div>
    <a href="/app/signup" class="rx-cta primary mobile-hide-ok">Start Free Assessment →</a>
  </div>
</nav>
`;

const RX_UNIVERSE = ({ here }) => {
  const rows = [
    { key: 'bjj',        name: 'ROMRx<span class="rx-plus">+BJJ</span>',              proto: 'Position Readiness Protocol™',                status: 'live',   href: 'https://romrxbjj.com' },
    { key: 'bb',         name: 'ROMRx<span class="rx-plus">+BodyBuilding</span>',     proto: 'Exercise Readiness Protocol™',                status: 'live',   href: 'https://romrxbodybuilding.com' },
    { key: 'pl',         name: 'ROMRx<span class="rx-plus">+Powerlifting</span>',     proto: 'Lift Readiness Protocol™',                    status: 'coming', href: null },
    { key: 'mma',        name: 'ROMRx<span class="rx-plus">+MMA</span>',              proto: 'Training Readiness Profile™',                 status: 'coming', href: null },
    { key: 'yoga',       name: 'ROMRx<span class="rx-plus">+Yoga</span>',             proto: 'Pose Readiness Protocol™',                    status: 'coming', href: null },
    { key: 'fr',         name: 'ROMRx<span class="rx-plus">+FirstResponder</span>',   proto: 'Task Readiness Protocol™',                    status: 'coming', href: null },
  ];
  const html = rows.map(r => {
    const isHere = here === r.key;
    const cls = isHere ? 'rx-uni-row here' : 'rx-uni-row';
    const statusLabel = isHere ? 'YOU ARE HERE' : (r.status === 'live' ? 'LIVE' : 'COMING');
    const statusCls = isHere ? 'here' : r.status;
    const inner = `
      <div>
        <div class="rx-uni-name">${r.name}</div>
        <div class="rx-uni-proto">${r.proto}</div>
      </div>
      <span class="rx-uni-status ${statusCls}">${statusLabel}</span>
    `;
    return r.href && !isHere
      ? `<a href="${r.href}" class="${cls}">${inner}</a>`
      : `<div class="${cls}">${inner}</div>`;
  }).join('');
  return `
    <section class="rx-universe-footer">
      <div class="rx-container">
        <p class="rx-eyebrow">Part of the ROMRx Universe</p>
        <div class="rx-universe-grid">${html}</div>
        <p class="rx-uni-tag">One ROM assessment. Every sport your body plays.</p>
      </div>
    </section>
  `;
};

const RX_LEGAL = `
<footer class="rx-legal">
  <div class="rx-legal-inner">
    <div>© 2026 ROMRx LLC · Dublin, Ohio</div>
    <div>
      <a href="/articles">Articles</a> ·
      <a href="/faq">FAQ</a> ·
      <a href="/legal#privacy">Terms, Privacy &amp; Refund</a> ·
      <a href="mailto:investors@romrx.io">Investors</a> ·
      <a href="mailto:partners@romrx.io">Partners</a>
    </div>
  </div>
  <div class="rx-legal-inner" style="padding-top:0;padding-bottom:8px;">
    <a href="/legal#do-not-sell" class="rx-dns-link" data-rx-dns="1">Do Not Sell or Share My Personal Information</a>
  </div>
  <div class="rx-trademarks">
    ROMRx™ and related marks are trademarks of ROMRx LLC. All rights reserved.
  </div>
</footer>
`;

function ensureConsentScript() {
  if (document.querySelector('script[data-rx-consent-js]')) return;
  const s = document.createElement('script');
  s.src = '/assets/consent.js';
  s.defer = true;
  s.setAttribute('data-rx-consent-js', '1');
  document.head.appendChild(s);
}

// Inject on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const here = document.body.dataset.rxHere || 'romrx';
  const navSlot = document.querySelector('[data-rx-slot="nav"]');
  const uniSlot = document.querySelector('[data-rx-slot="universe"]');
  const legalSlot = document.querySelector('[data-rx-slot="legal"]');

  if (navSlot) {
    navSlot.outerHTML = RX_NAV;
    // Mark active nav link
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    const map = { '/universe': 'universe', '/dashboard': 'dashboard', '/platform': 'dashboard', '/science': 'science', '/articles': 'articles', '/investors': 'investors', '/partners': 'partners' };
    const activeKey = path.startsWith('/articles') ? 'articles' : map[path];
    if (activeKey) {
      const el = document.querySelector(`[data-nav="${activeKey}"]`);
      if (el) el.classList.add('active');
    }
  }
  if (uniSlot) uniSlot.outerHTML = RX_UNIVERSE({ here });
  if (legalSlot) legalSlot.outerHTML = RX_LEGAL;
  ensureConsentScript();
});
