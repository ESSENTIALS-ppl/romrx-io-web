#!/usr/bin/env node
/* Cache-bust non-hashed /assets JS + CSS (Field 2026-09-27).
 *
 * Why: /assets/* was once served `public,max-age=31536000,immutable`, and these
 * files are not content-hashed. A browser holding an immutable copy never
 * refetches that URL, so returning visitors kept the pre-#79 cookie banner.
 * The only fix for those browsers is a NEW URL.
 *
 * What: at Netlify build time, rewrite every reference to a non-hashed
 * /assets/*.js or /assets/*.css (optionally already carrying ?v=...) to
 * /assets/<file>?v=<build id>, in:
 *   - every marketing HTML page (repo root + articles/, not app/),
 *   - assets/partials.js (loads consent.js + meta-attribution.js),
 *   - assets/consent.js (loads consent.css).
 * Build id = COMMIT_REF (Netlify), else `git rev-parse HEAD`, first 12 chars.
 * Fails the build if any bare reference survives, so the stamp cannot go stale.
 *
 * Usage: node scripts/stamp-asset-version.mjs [--check]
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = join(fileURLToPath(import.meta.url), '..', '..');
const SKIP_DIRS = new Set(['app', 'node_modules', '.git', 'netlify', 'supabase', 'docs', 'scripts', '.netlify']);

let ref = process.env.COMMIT_REF || '';
if (!ref) {
  try { ref = execSync('git rev-parse HEAD', { cwd: ROOT }).toString().trim(); } catch { ref = ''; }
}
if (!ref) ref = String(Date.now());
const V = ref.slice(0, 12);

// /assets/<path>.js|css, not /app/assets (hashed Vite bundles), with optional ?v=...
const REF_RE = /(?<![\w/])(\/assets\/[A-Za-z0-9_./-]+\.(?:js|css))(\?v=[A-Za-z0-9_-]*)?(?=["'`)\s])/g;

function htmlFiles(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) {
      if (dir === ROOT && SKIP_DIRS.has(name)) continue;
      if (name === 'node_modules' || name.startsWith('.')) continue;
      htmlFiles(p, out);
    } else if (name.endsWith('.html')) out.push(p);
  }
  return out;
}

const targets = [
  ...htmlFiles(ROOT),
  join(ROOT, 'assets', 'partials.js'),
  join(ROOT, 'assets', 'consent.js'),
];

const checkOnly = process.argv.includes('--check');
let changed = 0, refs = 0;
const bare = [];
for (const f of targets) {
  const src = readFileSync(f, 'utf8');
  const out = src.replace(REF_RE, (_m, path) => { refs++; return `${path}?v=${V}`; });
  if (!checkOnly && out !== src) { writeFileSync(f, out); changed++; }
  const final = checkOnly ? src : out;
  for (const m of final.matchAll(REF_RE)) {
    if (!checkOnly && m[2] !== `?v=${V}`) bare.push(`${relative(ROOT, f)}: ${m[0]}`);
    if (checkOnly && !m[2]) bare.push(`${relative(ROOT, f)}: ${m[0]}`);
  }
}

// consent.js must be loaded with the stamp (the returning-visitor bug).
if (!checkOnly) {
  const partials = readFileSync(join(ROOT, 'assets', 'partials.js'), 'utf8');
  if (!partials.includes(`/assets/consent.js?v=${V}`)) bare.push('assets/partials.js: consent.js not stamped');
}

if (bare.length) {
  console.error(`[stamp-asset-version] ${bare.length} unstamped /assets reference(s):\n  ` + bare.join('\n  '));
  process.exit(1);
}
console.log(`[stamp-asset-version] v=${V}: ${refs} reference(s) across ${targets.length} file(s), ${changed} file(s) rewritten${checkOnly ? ' (check only)' : ''}`);
