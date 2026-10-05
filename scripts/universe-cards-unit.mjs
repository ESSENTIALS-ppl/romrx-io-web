// /universe card lines (UNIVERSE-CARDS-FINAL-V3 recommended lines, Jim GO 2026-10-05). Plain node.
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import vm from 'node:vm';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = readFileSync(join(root, 'assets/partials.js'), 'utf8');
const m = src.match(/const RX_PACK_COPY = (\{[\s\S]*?\n\});/);
const C = vm.runInNewContext('(' + m[1] + ')');
const sites = vm.runInNewContext('(' + src.match(/const RX_PACK_SITES = (\{[\s\S]*?\n\});/)[1] + ')');
let fails = 0;
const ok = (c, msg) => { if (c) console.log('ok   ' + msg); else { fails++; console.error('FAIL ' + msg); } };

// BB button back on romrxbodybuilding.com once bb-web #37 is live (Grant, Oct 5 2026).
const FINAL = {
  yoga: 'To deepen your practice, find poses by focus. See how each one sits with what you measured.',
  bjj: 'Mat time is what you want. Your numbers, mapped to 130+ techniques across five position groups.',
  bb: 'Growing muscle is the goal. Start with a range-of-motion measurement you take yourself, at home.',
  pl: 'Lifters chase depth, lockouts and a bigger total. Where does your range sit on the squat, bench press and deadlift?',
  mma: 'Want to get sharper standing and on the ground? What you measure on your phone gets set beside takedown, ground and striking movements.',
  fr: 'On the job, you want strong lifts, carries, drags and climbs. Measure at home so each of those has a number beside it.',
  mil: 'The run, the ruck, the lift: what you train for. Five movements, one mobility assessment: run, ruck, lift, carry and crawl.',
  cali: 'Handstand, hang or squat, you are earning the next skill. Each one sits next to a measurement you took yourself.',
  hyb: 'One week, run days and lift days. Run, row, lift, carry and squat all read from one mobility assessment.',
};
for (const [k, line] of Object.entries(FINAL)) {
  const d = C.packs[k] && C.packs[k].desc;
  ok(d === line, k + ': card line is the final V3 line');
  ok(!/\bbase\b/i.test(d || ''), k + ': no word "base"');
  ok(!/[\u2013\u2014]/.test(d || ''), k + ': no em or en dash');
  ok(!/generator|mesocycle/i.test(d || ''), k + ': no generator or mesocycle (BB alt on HOLD)');
  ok(sites[k] && /^https:\/\/romrx[a-z]+\.com$/.test(sites[k].url) && sites[k].live, k + ': pack site url is https apex, live');
}
ok(sites.bb.url === 'https://romrxbodybuilding.com' && sites.bb.live, 'bb: button goes to romrxbodybuilding.com');
ok(Object.keys(C.packs).length === 9 && C.order.length === 9, '9 packs, 9 in order');
ok(new Set(Object.values(FINAL).map((l) => l.split(' ')[0])).size === 9, 'all 9 lines open differently');
ok((C.footnote.match(/18 and older/g) || []).length === 1, 'one "18 and older" in the footnote');
const uni = readFileSync(join(root, 'universe.html'), 'utf8');
ok(!/Readiness Profile/.test(uni), '/universe says Protocol, never Profile');
for (const f of ['bjj.html', 'bodybuilding.html']) {
  ok(readFileSync(join(root, f), 'utf8').includes('<span class="rx-beta">Beta · Sport pack starting January 2027</span>'), f + ': Stacy beta badge kept');
}
if (fails) { console.error(`\n${fails} failed`); process.exit(1); }
console.log('\nuniverse-cards: all passed');
