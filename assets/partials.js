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
      <!-- Investors / Partners: pages stay live; header links hidden (same pattern as RSS). -->
      <!-- Log in: lets returning users skip the assessment funnel and go straight to their Base account login.
           Mirrors the "Sign In" header link on the sibling sites romrxbjj.com and romrxbodybuilding.com,
           which each point to their own /login route. The ROMRx Base app is served at /app/ (see netlify.toml
           redirects and app/vite.config.ts base + App.tsx basename="/app"), so its login route is /app/login. -->
      <a href="/app/login" class="nav-login mobile-hide-ok">Log in</a>
    </div>
    <a href="/app/signup" class="rx-cta primary mobile-hide-ok">Start your assessment →</a>
  </div>
</nav>
`;

/* Minimal chrome (Jim via Grant 2026-09-27): pages with
   <body data-rx-chrome="minimal"> (/legal) get the SAME header the homepage
   renders (wordmark -> /, Log in, Start your assessment), no universe footer,
   and the legal footer without the Articles link. Nothing else on the site is
   reachable from the privacy page. */
const RX_NAV_MINIMAL = `
<nav class="rx-nav rx-home-nav">
  <div class="rx-nav-inner">
    <a href="/" class="rx-wordmark">ROMRx</a>
    <div class="rx-nav-links">
      <a href="/app/login" class="nav-login mobile-hide-ok">Log in</a>
    </div>
    <a href="/app/signup" class="rx-cta primary mobile-hide-ok">Start your assessment →</a>
  </div>
</nav>
`;

/* Pack-site links (Jim, Oct 4 2026; override at 1:11 PM). All seven coming packs
   (+Powerlifting, +MMA, +Military, +FirstResponder, +Calisthenics, +Hybrid, +Yoga)
   show a Coming soon card on /universe and a row in the footer grid, both reading
   COMING SOON. ONE flag per pack controls the link: RX_PACK_SITES.<key>.live.
     live:true   the card gets a "Visit the website" button to the pack domain and the
                 grid row links to the same domain. Still reads COMING SOON.
     live:false  card and row show COMING SOON with NO link.
   All seven are set to true in this PR because Jim wants the links on at launch. This
   PR must ship only after the pack sites are published and return HTTP 200 over HTTPS
   (Grant's go). If one site is not ready, set that pack's live to false before deploy.
   Keys: pl, mma, mil, fr, cali, hyb, yoga, bjj, bb (bjj and bb are the live-beta packs; same flag and button). Text is Kai's
   (pack-sites-20261004/UNIVERSE-CARDS-DROPIN.json): "sub" is the grid-row second
   line. The card one-liner lives in universe.html (same words as Kai's rows).
   +Yoga has a link only (no sign-up, no waitlist); its grid row keeps its Protocol line. */
const RX_PACK_SITES = {
  pl:   { url: 'https://romrxpowerlifting.com',   sub: 'Squat, bench press and deadlift',        live: true },
  mma:  { url: 'https://romrxmma.com',            sub: 'Takedown, ground and striking',          live: true },
  mil:  { url: 'https://romrxmilitary.com',       sub: 'Fitness test and advanced training',     live: true },
  fr:   { url: 'https://romrxfirstresponder.com', sub: 'Lifts, carries, drags and climbs',       live: true },
  cali: { url: 'https://romrxcalisthenics.com',   sub: 'Handstand, squat and straddle',          live: true },
  hyb:  { url: 'https://romrxhybrid.com',         sub: 'Lift, carry, run and row',               live: true },
  yoga: { url: 'https://romrxyoga.com',                                                          live: true },
  bjj:  { url: 'https://romrxbjj.com',            live: true },
  bb:   { url: 'https://romrxbodybuilding.com',  live: true },
};
window.RX_PACK_SITES = RX_PACK_SITES;

/* Pack card copy, ONE place (Jim and Stacy final, Oct 4 2026). Used by the /universe
   cards (universe.html fills them from here) and the footer grid below.
   betaStatus: green chip on +BJJ, +BodyBuilding and +Yoga (shown in capitals).
   Every other pack reads COMING SOON. Never use "launching" on a Coming soon card.
   priceLine: the single price line on all 9 pack cards.
   footnote: the single footnote under the pack grid (also the home page grid).
   No dates, "billing begins" or "cancel anytime" on any pack card. Em dash free. */
const RX_PACK_COPY = {
  buttonLabel: 'Visit the website',   // every pack card button, all 9 packs
  betaStatus: 'Beta testing starting January 2027',
  priceLine: '$149 a year, stacks on Base',
  footnote: 'Pack prices are planned for 2027 and may change before launch. Packs need a Base account and a card on file, renew yearly until you cancel, and end if you cancel Base. For adults 18 and older. Full terms are shown at checkout.',
};
window.RX_PACK_COPY = RX_PACK_COPY;

/* Universe headline (Jim via CoS 2026-09-29): pages with
   <body data-rx-universe="headline"> (/science only) swap the small
   "Part of the ROMRx Universe" eyebrow for a full headline, "All of this leads
   to the ROMRx Universe", with the same grid shown prominently under it. Every
   other page keeps the footer eyebrow. Rows are identical either way. */
const RX_UNIVERSE = ({ here, headline = false }) => {
  const rows = [
    { key: 'bjj',        name: 'ROMRx<span class="rx-plus">+BJJ</span>',              proto: 'Position Readiness Protocol™',                status: 'live',   beta: true, href: 'https://romrxbjj.com', site: 'bjj' },
    { key: 'bb',         name: 'ROMRx<span class="rx-plus">+BodyBuilding</span>',     proto: 'Exercise Readiness Protocol™',                status: 'live',   beta: true, href: 'https://romrxbodybuilding.com', site: 'bb' },
    { key: 'pl',         name: 'ROMRx<span class="rx-plus">+Powerlifting</span>',     proto: RX_PACK_SITES.pl.sub,   status: 'coming', href: null, site: 'pl' },
    { key: 'mma',        name: 'ROMRx<span class="rx-plus">+MMA</span>',              proto: RX_PACK_SITES.mma.sub,  status: 'coming', href: null, site: 'mma' },
    { key: 'mil',        name: 'ROMRx<span class="rx-plus">+Military</span>',         proto: RX_PACK_SITES.mil.sub,  status: 'coming', href: null, site: 'mil' },
    { key: 'fr',         name: 'ROMRx<span class="rx-plus">+FirstResponder</span>',   proto: RX_PACK_SITES.fr.sub,   status: 'coming', href: null, site: 'fr' },
    { key: 'cali',       name: 'ROMRx<span class="rx-plus">+Calisthenics</span>',     proto: RX_PACK_SITES.cali.sub, status: 'coming', href: null, site: 'cali' },
    { key: 'hyb',        name: 'ROMRx<span class="rx-plus">+Hybrid</span>',           proto: RX_PACK_SITES.hyb.sub,  status: 'coming', href: null, site: 'hyb' },
    { key: 'yoga',       name: 'ROMRx<span class="rx-plus">+Yoga</span>',             proto: 'Pose Readiness Protocol™',                    status: 'live',   beta: true, href: null, site: 'yoga' },
  ].map(r => (r.site && RX_PACK_SITES[r.site] && RX_PACK_SITES[r.site].live) ? Object.assign({}, r, { href: RX_PACK_SITES[r.site].url }) : r);
  const html = rows.map(r => {
    const isHere = here === r.key;
    const cls = isHere ? 'rx-uni-row here' : 'rx-uni-row';
    const statusLabel = isHere ? 'YOU ARE HERE' : (r.beta ? RX_PACK_COPY.betaStatus.toUpperCase() : 'COMING SOON');
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
    <section class="${headline ? 'rx-universe-footer rx-universe-featured' : 'rx-universe-footer'}">
      <div class="rx-container">
        ${headline
          ? '<h2 class="rx-h2 rx-uni-headline">All of this leads to the <span class="rx-grad">ROMRx Universe</span></h2>'
          : '<p class="rx-eyebrow">Part of the ROMRx Universe</p>'}
        <div class="rx-universe-grid">${html}</div>
        <p class="rx-fine rx-center rx-uni-foot">${RX_PACK_COPY.footnote}</p>
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
      <a href="/legal#privacy">Terms, Privacy &amp; Refund</a>
      <!-- FAQ / Investors / Partners / RSS: pages+mailto stay; footer links hidden. -->
    </div>
  </div>
  <div class="rx-legal-inner" style="padding-top:0;padding-bottom:8px;">
    <a href="/legal#do-not-sell" class="rx-dns-link" data-rx-dns="1">Don't Sell or Share My Personal Information</a>
    <p class="rx-dns-micro">We do not sell your personal information. This turns off limited uses that help us reach people who need ROMRx. California may call those a "sale" or "share."</p>
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

/** Meta Pixel/CAPI marketing stub — hard-gated OFF in assets/meta-attribution.js. */
function ensureMetaAttributionScript() {
  if (document.querySelector('script[data-rx-meta-js]')) return;
  const s = document.createElement('script');
  s.src = '/assets/meta-attribution.js';
  s.defer = true;
  s.setAttribute('data-rx-meta-js', '1');
  document.head.appendChild(s);
}

// Inject on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const here = document.body.dataset.rxHere || 'romrx';
  const navSlot = document.querySelector('[data-rx-slot="nav"]');
  const uniSlot = document.querySelector('[data-rx-slot="universe"]');
  const legalSlot = document.querySelector('[data-rx-slot="legal"]');
  const minimal = document.body.dataset.rxChrome === 'minimal';
  const uniHeadline = document.body.dataset.rxUniverse === 'headline';

  if (navSlot && minimal) {
    navSlot.outerHTML = RX_NAV_MINIMAL;
  } else if (navSlot) {
    navSlot.outerHTML = RX_NAV;
    // Mark active nav link
    const path = window.location.pathname.replace(/\/$/, '') || '/';
    const map = { '/universe': 'universe', '/dashboard': 'dashboard', '/platform': 'dashboard', '/science': 'science', '/articles': 'articles' };
    const activeKey = path.startsWith('/articles') ? 'articles' : map[path];
    if (activeKey) {
      const el = document.querySelector(`[data-nav="${activeKey}"]`);
      if (el) el.classList.add('active');
    }
  }
  if (uniSlot) uniSlot.outerHTML = minimal ? '' : RX_UNIVERSE({ here, headline: uniHeadline });
  if (legalSlot) legalSlot.outerHTML = minimal ? RX_LEGAL.replace('<a href="/articles">Articles</a> ·', '') : RX_LEGAL;
  ensureConsentScript();
  ensureMetaAttributionScript();
});
