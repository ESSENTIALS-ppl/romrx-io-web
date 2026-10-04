// Header "Universe" link must be visible on phone widths too (Jim 2026-10-04).
// Plain node, no dependencies. Run: node scripts/header-universe-unit.mjs  (npm run test:header)
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (p) => readFileSync(join(root, p), 'utf8');
let fails = 0;
const ok = (cond, msg) => { if (cond) { console.log('ok   ' + msg); } else { fails++; console.error('FAIL ' + msg); } };

const partials = read('assets/partials.js');
const css = read('assets/design-tokens.css');

function constBody(name) {
  const m = partials.match(new RegExp('const ' + name + ' = `([\\s\\S]*?)`;'));
  return m ? m[1] : '';
}
// Every header markup must carry a Universe anchor that survives the phone rule
// `.rx-nav-links a:not(.mobile-hide-ok) { display: none }` and sits before Log in.
function checkHeader(label, html) {
  const a = html.match(/<a [^>]*href="\/universe"[^>]*>\s*Universe\s*<\/a>/);
  ok(!!a, label + ': has a Universe link');
  if (!a) return;
  ok(/class="[^"]*\bmobile-hide-ok\b[^"]*"/.test(a[0]), label + ': Universe link has mobile-hide-ok (not hidden on phones)');
  ok(/class="[^"]*\bnav-universe\b[^"]*"/.test(a[0]), label + ': Universe link has nav-universe (tap-target styling)');
  const login = html.indexOf('/app/login');
  ok(html.indexOf(a[0]) < login, label + ': Universe comes before Log in');
  ok(!/—|–/.test(html), label + ': no em or en dash');
}
checkHeader('RX_NAV (shared header)', constBody('RX_NAV'));
checkHeader('RX_NAV_MINIMAL (/legal)', constBody('RX_NAV_MINIMAL'));

// Every page: shared slot + partials.js, or an inline header with the same link.
const pages = readdirSync(root).filter((f) => f.endsWith('.html'));
const articles = readdirSync(join(root, 'articles')).filter((f) => f.endsWith('.html')).map((f) => 'articles/' + f);
let inline = 0;
for (const p of [...pages, ...articles]) {
  const h = read(p);
  const hasSlot = /data-rx-slot="nav"/.test(h);
  const hasPartials = /\/assets\/partials\.js/.test(h);
  if (hasSlot) {
    ok(hasPartials, p + ': shared nav slot loads partials.js');
  } else if (/<nav class="rx-nav/.test(h)) {
    inline++;
    checkHeader(p + ' (inline header)', h.slice(h.indexOf('<nav class="rx-nav'), h.indexOf('</nav>')));
  } else {
    ok(false, p + ': has neither a shared nav slot nor an inline header');
  }
}
ok(inline === 1, 'exactly one inline header (index.html); found ' + inline);
ok(pages.length >= 13 && articles.length >= 21, `scanned ${pages.length} pages + ${articles.length} articles`);

// Phone CSS: wrap into two rows, 44px buttons, no fixed widths that could overflow.
const phone = [...css.matchAll(/@media \(max-width: 768px\) \{([\s\S]*?)\n\}/g)].map((m) => m[1]).find((b) => b.includes('.rx-nav-links')) || '';
ok(/\.rx-nav-links a:not\(\.mobile-hide-ok\)\s*\{\s*display:\s*none/.test(phone), 'phone CSS still hides the other nav links');
ok(/\.rx-nav-inner\s*\{\s*flex-wrap:\s*wrap/.test(phone), 'phone CSS lets the header wrap to two rows');
ok(/a\.nav-universe[\s\S]*?min-height:\s*44px/.test(phone), 'phone CSS: Universe tap target is at least 44px tall');
ok(/\.rx-nav-inner > \.rx-nav-links\s*\{[^}]*flex:\s*1 0 100%[^}]*min-width:\s*0/.test(phone), 'phone CSS: links row is full width and can shrink (no sideways scroll)');
ok(!/a\.nav-universe[^{]*\{[^}]*\bwidth:\s*\d+px/.test(phone), 'phone CSS: no fixed pixel width on the Universe button');

if (fails) { console.error(`\n${fails} failed`); process.exit(1); }
console.log('\nheader-universe: all passed');
