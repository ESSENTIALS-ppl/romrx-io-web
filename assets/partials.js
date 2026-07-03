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
      <a href="/investors" data-nav="investors">Investors</a>
      <a href="/partners" data-nav="partners">Partners</a>
    </div>
    <a href="/assessment" class="rx-cta primary mobile-hide-ok">Start Free Assessment →</a>
  </div>
</nav>
`;

const RX_UNIVERSE = ({ here }) => {
  const rows = [
    { key: 'romrx',      name: 'ROMRx',              proto: 'Free assessment + ROM Readiness Protocol™',   status: 'here',   href: '/' },
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
    <div>© 2026 ROMRx LLC · Greenwood, Indiana</div>
    <div>
      <a href="/legal">Terms &amp; Privacy</a> ·
      <a href="mailto:investors@romrx.io">Investors</a> ·
      <a href="mailto:partners@romrx.io">Partners</a>
    </div>
  </div>
  <div class="rx-trademarks">
    ROMRx™, ROMRx+BJJ™, ROMRx+BodyBuilding™, ROM Readiness Protocol™, Position Readiness Protocol™,
    Exercise Readiness Protocol™, ROMBot™, The 6-Week Reassessment Cycle™, Top 3 Priority Joints™
    are trademarks of ROMRx LLC. All rights reserved. Beta software, content, features, and pricing subject to change.
  </div>
</footer>
`;

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
    const map = { '/universe': 'universe', '/dashboard': 'dashboard', '/platform': 'dashboard', '/science': 'science', '/investors': 'investors', '/partners': 'partners' };
    const activeKey = map[path];
    if (activeKey) {
      const el = document.querySelector(`[data-nav="${activeKey}"]`);
      if (el) el.classList.add('active');
    }
  }
  if (uniSlot) uniSlot.outerHTML = RX_UNIVERSE({ here });
  if (legalSlot) legalSlot.outerHTML = RX_LEGAL;
});
