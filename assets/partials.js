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
   Keys: pl, mma, mil, fr, cali, hyb, yoga, bjj, bb (bjj and bb are the live-beta packs; same flag and button). All words (names,
   descriptions, grid sub lines) are in RX_PACK_COPY below, not here.
   +Yoga has a link only (no sign-up, no waitlist); its grid row keeps its Protocol line. */
const RX_PACK_SITES = {
  pl:   { url: 'https://romrxpowerlifting.com', live: true },
  mma:  { url: 'https://romrxmma.com', live: true },
  mil:  { url: 'https://romrxmilitary.com', live: true },
  fr:   { url: 'https://romrxfirstresponder.com', live: true },
  cali: { url: 'https://romrxcalisthenics.com', live: true },
  hyb:  { url: 'https://romrxhybrid.com', live: true },
  yoga: { url: 'https://romrxyoga.com', live: true },
  bjj:  { url: 'https://romrxbjj.com', live: true },
  bb:   { url: 'https://romrxbodybuilding.com', live: true },
};
window.RX_PACK_SITES = RX_PACK_SITES;

/* ALL pack card copy lives here, ONE place (Jim, Stacy, Kai, Grant: Oct 4 2026).
   To swap copy (for example Kai's audience-voice descriptions) edit this object only.
   Used by the /universe cards (universe.html builds them from here) and the shared
   footer grid (RX_UNIVERSE below).
     packs.<key>   name (the "+Pack" accent), beta (true = green beta chip, false = COMING SOON),
                   proto (optional Protocol line on the card; the grid row shows it when there
                   is no sub), sub (grid-row second line), desc (card description).
     order         card and grid order (Kai's).
     betaStatus    green chip text on beta packs (shown in capitals). Never "launching".
     priceLine     the single price line on all 9 pack cards.
     footnote      the single footnote under the pack grid.
     disclaimer    educational / not medical advice line (/universe only).
     affil         not-affiliated lines (Stacy's cleared wording, via Kai): shown once under
                   the grid on /universe and once under the shared footer grid elsewhere.
   No dates, "billing begins" or "cancel anytime" on any pack card. Em dash free.
   The Base card on /universe stays in universe.html (it carries Base's own pricing text).
   Link behavior is separate: RX_PACK_SITES.<key>.live above. */
const RX_PACK_COPY = {
  buttonLabel: 'Visit the website',   // every pack card button, all 9 packs
  comingStatus: 'COMING SOON',
  betaStatus: 'Beta testing starting January 2027',
  priceLine: '$149 a year, stacks on Base',
  footnote: 'Pack prices are planned for 2027 and may change before launch. Packs need a Base account and a card on file, renew yearly until you cancel, and end if you cancel Base. For adults 18 and older. Full terms are shown at checkout.',
  disclaimer: 'ROMRx shares educational information about range of motion. It is not medical advice and does not diagnose, treat or cure any condition.',
  affil: [
    'ROMRx is not affiliated with or endorsed by the U.S. Department of Defense (also called the Department of War), any branch of the military or any government agency. No endorsement is intended or implied.',
    'ROMRx is not affiliated with or endorsed by any fire, police or EMS department, sports league or federation, or event organizer.',
  ],
  order: ['bjj', 'bb', 'pl', 'mma', 'mil', 'fr', 'cali', 'hyb', 'yoga'],
  packs: {
    bjj: { name: 'BJJ', beta: true, proto: 'Position Readiness Protocol™', desc: 'See which BJJ positions and techniques your results line up with. Green (train), Yellow (modify), Red (skip today). Adapt your rolls to your current ROM. For athletes, coaches, and academies.' },
    bb: { name: 'BodyBuilding', beta: true, proto: 'Exercise Readiness Protocol™', desc: 'See which lifts and accessory exercises your results line up with. Green (load it), Yellow (modify), Red (skip). Program your hypertrophy work around real ROM data. For athletes, trainers, and gyms.' },
    pl: { name: 'Powerlifting', beta: false, sub: 'Squat, bench press and deadlift', desc: 'The Base ROM, applied to the squat, bench press and deadlift.' },
    mma: { name: 'MMA', beta: false, sub: 'Takedown, ground and striking', desc: 'The Base ROM, applied to takedown, ground and striking movements.' },
    mil: { name: 'Military', beta: false, sub: 'Fitness test and advanced training', desc: 'Train for your fitness test. Train for the next level.' },
    fr: { name: 'FirstResponder', beta: false, sub: 'Lifts, carries, drags and climbs', desc: 'The Base ROM, applied to lifts, carries, drags and climbs on the job.' },
    cali: { name: 'Calisthenics', beta: false, sub: 'Handstand, squat and straddle', desc: 'The Base ROM, applied to handstand, squat and straddle movements.' },
    hyb: { name: 'Hybrid', beta: false, sub: 'Lift, carry, run and row', desc: 'A hybrid training pack. The Base ROM, applied to lift, carry, run and row movements.' },
    yoga: { name: 'Yoga', beta: true, proto: 'Pose Readiness Protocol™', desc: 'Asana readiness by ROM. Modify or advance poses based on your own Base numbers. For practitioners, instructors, and studios.' },
  },
};
window.RX_PACK_COPY = RX_PACK_COPY;

/* Universe headline (Jim via CoS 2026-09-29): pages with
   <body data-rx-universe="headline"> (/science only) swap the small
   "Part of the ROMRx Universe" eyebrow for a full headline, "All of this leads
   to the ROMRx Universe", with the same grid shown prominently under it. Every
   other page keeps the footer eyebrow. Rows are identical either way. */
const RX_UNIVERSE = ({ here, headline = false }) => {
  const rows = RX_PACK_COPY.order.map(k => {
    const p = RX_PACK_COPY.packs[k];
    const site = RX_PACK_SITES[k];
    return {
      key: k,
      name: 'ROMRx<span class="rx-plus">+' + p.name + '</span>',
      proto: p.sub || p.proto,
      status: p.beta ? 'live' : 'coming',
      beta: p.beta,
      href: (site && site.live) ? site.url : null,
    };
  });
  const html = rows.map(r => {
    const isHere = here === r.key;
    const cls = isHere ? 'rx-uni-row here' : 'rx-uni-row';
    const statusLabel = isHere ? 'YOU ARE HERE' : (r.beta ? RX_PACK_COPY.betaStatus.toUpperCase() : RX_PACK_COPY.comingStatus);
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
        ${RX_PACK_COPY.affil.map(t => `<p class="rx-fine rx-center rx-uni-foot">${t}</p>`).join('')}
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
