# ROMood daily: push plan for the PAIR (LOCAL ONLY until Jim types the go line)
Written Mon Oct 26 2026, about 8:50 PM ET. Replaces the cf8c333 plan, which is WITHDRAWN (cf8c333 fails `tsc -b`; see the banner on /workspace/romood-push-candidate/PUSH-PLAN.md).

## The pair
- Frontend: repo ESSENTIALS-ppl/romrx-io-web, branch **feat/romood-daily** (worktree /workspace/romood-daily), based on cf8c333 (base 88079f5, live site tree). Code head **3d08ba7** (b830fa6 and the commit above it are docs and plan-text tests only). Pair under review: **b830fa6/5af19bf**; the deployed frontend commit is the docs commit on top of b830fa6 named in /workspace/romood-reports/JIM-LINE.txt.
- Backend: repo ESSENTIALS-ppl/romrxbjj-v2, branch **feat/romood-daily-email**, head **5af19bf** (b382db9 plus Stacy's crisis footer fix in mood_block.ts; b382db9 was fbd65a0 plus a comment-only credit fix), based on origin/main 3043f41 (byte-identical to live submit-assessment v38). Worktree /workspace/romood-daily-backend.
- Frontend: the commit deployed is the commit that carries THIS doc change, made on top of b830fa6 (parent chain b830fa6, 3d08ba7). It is code-identical to 3d08ba7 (only PUSH-PLAN.md and plan-text tests change). Its sha is the one named in /workspace/romood-reports/JIM-LINE.txt.
- Frontend commits: ecffd26 (tsc fix), b2c367b (migration 4 + revert), ee40b98 (quick check-in, consent version, 7A, deletion lines), the copy-swap c8412bb, migration 5 + revert (Vera GAP A), 3d08ba7 (MoodSettings v2 consent gate, Vera GAP B), and docs (b830fa6 and this commit). Plus everything from the ROMood history in cf8c333's ancestry.

## Step 0 (required right before any push; ABORT on any failure and tell Grant)
1. `cd /workspace/romood-daily && git status --short` must be empty; `git rev-parse --short HEAD` must match the report; `git -C /workspace/romood-daily-backend rev-parse --short HEAD` must print the backend head named in the report (exactly 5af19bf, expect 7 deno tests); the frontend HEAD must be the commit named in /workspace/romood-reports/JIM-LINE.txt, whose parent is b830fa6.
2. `cd /workspace/romood-daily/app && npx vitest run` (expect 58 files, 1023 passed, 4 skipped) and again with `VITE_ROMOOD_SAVE=on`.
3. `npm run build` (runs `tsc -b && vite build`, local dist only; expect exit 0).
4. deno: `cd /tmp/dchk && ~/.deno/bin/deno check --node-modules-dir=auto /workspace/romood-daily-backend/supabase/functions/submit-assessment/index.ts` and `deno test --node-modules-dir=auto --allow-read .../mood_block.test.ts` (expect 7 passed).
   Note: a PLAIN `deno check index.ts` fails with the npm:openai type error because the backend repo root has a package.json, which puts Deno 2.x in manual node_modules mode. It is the same on v38 (3043f41) and on the new tip, and it is not a code error. Local `deno bundle` of submit-assessment succeeds with `--node-modules-dir=auto`, or with the root package.json removed from a temp copy. Supabase's deploy bundler does not type-check and does not read that package.json (v38 is live from the same imports).
5. Secret check, before any function deploy: `supabase secrets list --project-ref cqzvqzwwevnflinxgnpp` (names only, never values). ROMOOD_EMAIL_MOOD must be ABSENT; if it is listed, ABORT. Jim runs it (no CLI or token on the box); evidence file /workspace/romood-reports/SUPABASE-SECRETS-NAMES-PREPUSH-20261027-0725.txt (ROMOOD_* present: 0). This is also the backup of the current switch state: names and state only, never values. Before step 5 below, also record the Netlify production env state of VITE_ROMOOD_SAVE (present or absent, never its value).
6. Last run is in /workspace/romood-daily/tests.txt.

## Gates (all must be green before the go)
- Stacy: PASS. /workspace/beta-launch/proof-20261020/stacy-romood-live-gate-20261027.md items 1 to 4 (footer word for word in mood_block.ts:42, save-on PASS with conditions, email-on PASS) cover migrations 1-4; migration 5 is covered by her OK in the 7:42:09 AM addendum (same file, line 17, OK text on line 18), with server-side consent stamping recommended before public launch, not a blocker.
- Quinn: PASS on 5ad2c1c/b382db9 (/workspace/beta-launch/proof-20261020/quinn-signoff-romood-5ad2c1c-b382db9.md). Quinn needs no re-sign, per Grant's decision: the later commits are logic (migration 5 and a settings gate) plus the footer, and the only new user copy is the footer, which is Stacy's legal text word for word. Vera checked the later commits for copy.
- Vera: VERIFIED b830fa6/5af19bf (/workspace/vera-verdicts/vera-romood-final-b830fa6-5af19bf-20261027.md) and d9bbb11/5af19bf (/workspace/vera-verdicts/vera-romood-final-d9bbb11-5af19bf-20261027.md); this commit applies her d9bbb11 plan fixes and needs her re-verify.
- Netlify: Jim confirms the Netlify credit balance as part of his packaged yes. Last readings: about 15 credits per publish.
- Resend: Rechecked by Grant via read-only API at 08:02 EDT on Oct 27, 2026, re-run 08:07 EDT: open and click tracking OFF on romrx.io, romrxbjj.com and romrxbodybuilding.com (/workspace/romood-reports/RESEND-TRACKING-RECHECK-20261027-0802.txt). Monthly limit 50,000 with no daily cap (RESEND-READONLY-20261026.md L6, L7).

## Approved decisions
- Mood window in the email: since the later of the user's previous assessment or their opt-in tick time. Confirmed in code: mood_block.ts moodWindowStart() (line 29) returns the later of the two; buildMoodBlockForUser (line 59) uses it, bounded above by the current assessment time.
- Resend retention: 30 days on the plan tiers (public docs); no shorter self-serve setting. 7A says "up to 30 days" (legal.html:131, changed 8:57 PM ET).

## Migrations, in order. SOURCE: the migration and revert SQL files come from the FRONTEND repo, /workspace/romood-daily (branch feat/romood-daily, supabase/migrations and supabase/reverts), NOT from the backend repo (/workspace/romood-daily-backend, which holds only the submit-assessment function and has no ROMood migrations). Run them before the site and before the function (Supabase project cqzvqzwwevnflinxgnpp, Free plan, no PITR: take a schema dump first, no exports of mood rows)
1. 20261026220000_romood_mood_entries.sql (also strips authenticated's default ACL grants, incl. TRUNCATE, then grants select, insert, delete). Revert: supabase/reverts/20261026220000_romood_mood_entries.revert.sql
2. 20261026230000_romood_mood_settings.sql (also strips authenticated's default grants, incl. TRUNCATE, then grants select, insert, update; adds a BEFORE UPDATE updated_at trigger with a search_path-pinned function). Revert: supabase/reverts/20261026230000_romood_mood_settings.revert.sql
3. 20261026233000_romood_retention.sql. Revert: supabase/reverts/20261026233000_romood_retention.revert.sql
4. 20261027000000_romood_daily_cap.sql (daily cap trigger RM429 that also stamps created_at := now(), 'quick' context, mood_settings.consent_version). Revert: supabase/reverts/20261027000000_romood_daily_cap.revert.sql
5. 20261027010000_romood_insert_requires_v2_consent.sql (a RESTRICTIVE INSERT policy on mood_entries: authenticated users can only insert when their mood_settings row has consent_version = 'v2-email-20261026' and opted_in_at not null; service role is unaffected; closes Vera GAP A). Revert: supabase/reverts/20261027010000_romood_insert_requires_v2_consent.revert.sql
Revert order: **5, 4, 3, 2, 1**, by hand. They sit outside supabase/migrations, so the CLI never picks them up. Revert 5 must run first (it reads the column revert 4 drops). Revert 4 deletes 'quick' rows.
Tested on a local schema-only copy of prod (romrx_schemacopy): /workspace/romood-reports/ROMOOD-SCHEMACOPY-RETEST-3d08ba7-20261027.md, 147/147 PASS (main 70, race test, addendum 15, migration 5 cases 61), reverts 5 to 1 leave 0 diff. Real prod behavior is confirmed only after apply.

## Order of operations (only after Jim's typed go; STOP and report on any failure)
1. Step 0 gates. Step 0 passes. Jim confirms the Netlify credit balance as part of his packaged yes. Push frontend feat/romood-daily and backend feat/romood-daily-email to GitHub as new branches only (no history rewrite, no merge to main yet). Revert: delete the two remote branches.
2. Apply migrations 1, 2, 3, 4, 5 in order, from /workspace/romood-daily/supabase/migrations (the frontend repo, not the backend repo).
3. Deploy ONLY the submit-assessment function, from the backend branch feat/romood-daily-email at exactly 5af19bf: `supabase functions deploy submit-assessment --project-ref cqzvqzwwevnflinxgnpp`. Never a bulk deploy (no `deploy` without a name, no --all). NEVER deploy or create create-checkout-session or stripe-webhook. ROMOOD_EMAIL_MOOD is still unset here, so the email is the v38 email (the block returns an empty string).
4. TRUNCATE grants fix: apply /workspace/romood-reports/PROD-TRUNCATE-GRANTS-FIX-20261027.sql. Revert: /workspace/romood-reports/PROD-TRUNCATE-GRANTS-REVERT-20261027.sql. Expect the authenticated TRUNCATE count on public tables to be 0 afterwards (44 before).
5. Netlify: set VITE_ROMOOD_SAVE=on in the production build env (backed up first, state only). Then a draft deploy (no --prod) of the new frontend sha. Builds are stopped on the site (stop_builds true), so the draft is built by the CLI (`netlify deploy --build`, which reads the site env); confirm VITE_ROMOOD_SAVE=on is in that build before Reid looks. Reid checks the draft: the flow (Step 1 to 11 of 11, "Assessment step 2" eyebrow on ROMood), crisis line, /legal 7A new paragraph and deletion line, My Body "Quick ROMood check" button, /dashboard/mood (protected), cap message, the v2 re-tick prompt for old opt-ins, and that saving is ON. Reid's check is VIEW ONLY: screens, copy, legal, the crisis line and the settings state. He saves NO mood, and no prod accounts are created. Cleanup: none. Then publish that same draft to production. Revert: unset VITE_ROMOOD_SAVE and redeploy, or restore the previous production deploy. After publish, Jim runs the real save test himself, on his own account.
6. Set the Supabase secret ROMOOD_EMAIL_MOOD=on (after publish). Revert: `supabase secrets unset ROMOOD_EMAIL_MOOD --project-ref cqzvqzwwevnflinxgnpp`.
7. Merge both branches to main (backend only after the function check passes). Not a prod build: neither repo auto-deploys from main (romrx.io Netlify site incomparable-pastelito-849104 maps to ESSENTIALS-ppl/romrx-io-web, branch main, stop_builds true; romrxbjj-v2 has no Netlify site, no .github/workflows and no branching setting in supabase/config.toml). It runs after publish. Revert: `git revert -m 1 <merge>`, no force push.
8. LAST, after every CLI command: Avery runs `DROP ROLE cli_login_postgres;` through the Supabase MCP execute_sql (as the postgres role), then verifies `select count(*) from pg_roles where rolname='cli_login_postgres'` returns 0. No CLI after that (the CLI would recreate the role). If the DROP fails with permission denied (likely, since postgres is not a superuser and holds no ADMIN OPTION on the role), that is EXPECTED: stop and report, and try no workaround. The role is harmless: it owns nothing, has no sessions and its password is expired. No undo. Then report the live commit, Netlify deploy id, migration list, function version, TRUNCATE count, role drop result and credits to Grant and Jim.

## VITE_ROMOOD_SAVE (Jim, 7:26 AM bundled ask: ON)
Not in netlify.toml; on only when exactly "on" (romood.ts:49). It is set in step 5, after migrations 1 to 5 and the function are live and before the draft builds, so saving takes effect only with the publish.

## Rollback
1. FIRST, turn both switches off, in this order: `supabase secrets unset ROMOOD_EMAIL_MOOD --project-ref cqzvqzwwevnflinxgnpp`, then unset VITE_ROMOOD_SAVE in Netlify and redeploy, or restore the previous production deploy **6adfccf02c316661a280ebd2**. Keep the tables and the mood rows: no drop, no delete.
2. Function: redeploy v38 (origin/main 3043f41 of romrxbjj-v2, `supabase functions deploy submit-assessment` from that commit). It is byte-identical to the live v38 source.
3. TRUNCATE fix: PROD-TRUNCATE-GRANTS-REVERT-20261027.sql (re-opens the old exposure; only if the fix itself breaks something).
4. Git: `git revert -m 1 <merge>` on main for each repo, no force push; delete the pushed feature branches only if asked.
5. Reverting migrations (by hand, order 5, 4, 3, 2, 1; revert 4 deletes 'quick' rows, reverts 1 and 2 drop the mood tables) is a SEPARATE step that needs Jim's own typed OK in Avery's chat.
6. The dropped role is not restored (the CLI recreates it when needed).

## What does NOT ship / open items
- Reminders and mood push notifications: not built, by design.
- submit-lead-assessment (lead email) is unchanged: no mood block.
- Retention (until delete, 12 months or rolling 12 weeks) and the purge cron: Jim's call; no cron is created by this plan.
- Counsel to confirm Resend as a processor.
- Settings.tsx is also touched by the held stage/batch-1021-io (152824d); a test merge was clean before the daily changes, so recheck.

## The line Jim types in Avery's chat
See /workspace/romood-reports/JIM-LINE.txt (kept outside this file and outside the repo, because it quotes this file's sha256 and the commit sha that carries this file).
