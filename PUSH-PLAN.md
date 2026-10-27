# ROMood daily: push plan for the PAIR (LOCAL ONLY until Jim types the go line)
Written Mon Oct 26 2026, about 8:50 PM ET. Replaces the cf8c333 plan, which is WITHDRAWN (cf8c333 fails `tsc -b`; see the banner on /workspace/romood-push-candidate/PUSH-PLAN.md).

## The pair
- Frontend: repo ESSENTIALS-ppl/romrx-io-web, branch **feat/romood-daily** (worktree /workspace/romood-daily), based on cf8c333 (base 88079f5, live site tree). Code head **c8412bb**; docs-only commits sit above it, so the branch tip is whatever `git rev-parse --short HEAD` prints in Step 0 (the report names it).
- Backend: repo ESSENTIALS-ppl/romrxbjj-v2, branch **feat/romood-daily-email**, head **b382db9** (fbd65a0 plus a comment-only credit fix; fbd65a0 was 7bc1bd0 plus the '1 time' fix), based on origin/main 3043f41 (byte-identical to live submit-assessment v38). Worktree /workspace/romood-daily-backend.
- Frontend commits: ecffd26 (tsc fix), b2c367b (migration 4 + revert), ee40b98 (quick check-in, consent version, 7A, deletion lines), the copy-swap c8412bb, and docs. Plus everything from the ROMood history in cf8c333's ancestry.

## Step 0 (required right before any push; ABORT on any failure and tell Grant)
1. `cd /workspace/romood-daily && git status --short` must be empty; `git rev-parse --short HEAD` must match the report; `git -C /workspace/romood-daily-backend rev-parse --short HEAD` must print the backend head named in the report (exactly b382db9, expect 7 deno tests).
2. `cd /workspace/romood-daily/app && npx vitest run` (expect 58 files, 1021 passed, 4 skipped) and again with `VITE_ROMOOD_SAVE=on`.
3. `npm run build` (runs `tsc -b && vite build`, local dist only; expect exit 0).
4. deno: `cd /tmp/dchk && ~/.deno/bin/deno check --node-modules-dir=auto /workspace/romood-daily-backend/supabase/functions/submit-assessment/index.ts` and `deno test --node-modules-dir=auto --allow-read .../mood_block.test.ts` (expect 7 passed).
   Note: a PLAIN `deno check index.ts` fails with the npm:openai type error because the backend repo root has a package.json, which puts Deno 2.x in manual node_modules mode. It is the same on v38 (3043f41) and on the new tip, and it is not a code error. Local `deno bundle` of submit-assessment succeeds with `--node-modules-dir=auto`, or with the root package.json removed from a temp copy. Supabase's deploy bundler does not type-check and does not read that package.json (v38 is live from the same imports).
5. Secret check, before any function deploy: `supabase secrets list --project-ref cqzvqzwwevnflinxgnpp` (names only, never values). ROMOOD_EMAIL_MOOD must be ABSENT; if it is listed, ABORT. Jim runs it (no CLI or token on the box); evidence file /workspace/romood-push-candidate/supabase-secrets-names.txt.
6. Last run is in /workspace/romood-daily/tests.txt.

## Gates (all must be green before the go)
Stacy PASS (copy, 7A, email block, consent text); Quinn sign-off (she covered 04c0a73 only, so she must recheck the nav fix and the new quick screen); Vera VERIFIED on this plan and both heads; Netlify credit check; Grant told; **Jim: Resend plan check and tracking check** (RESEND-NOTES.md: confirm open and click tracking are OFF for romrx.io, and which plan, since Free is 100 emails a day).

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
Not tested against real Postgres (no test DB was allowed). Apply 4 and 5 first on a branch DB if Jim wants, and check: an insert without v2 consent is rejected (migration 5), the 5th insert in a New York day fails with RM429, a new New York day resets, and concurrent inserts.

## Order of operations (only after Jim's typed go)
1. Gates green. Step 0 passes. Credits checked; Grant told.
2. Push frontend feat/romood-daily to origin (new branch, no rewrite of history). Push backend feat/romood-daily-email to romrxbjj-v2 (new branch only; do not merge or touch main yet).
3. Apply migrations 1, 2, 3, 4, 5 in order, from /workspace/romood-daily/supabase/migrations (the frontend repo, not the backend repo).
4. Deploy ONLY the submit-assessment function, from the backend branch feat/romood-daily-email (b382db9): `supabase functions deploy submit-assessment --project-ref cqzvqzwwevnflinxgnpp`. Never a bulk deploy (no `deploy` without a name, no --all). NEVER deploy or create create-checkout-session or stripe-webhook. With ROMOOD_EMAIL_MOOD unset the email is byte-for-byte the v38 email (the block returns an empty string); confirm by one test submission only if Jim approves.
5. **ROMOOD_EMAIL_MOOD secret stays UNSET** (absence confirmed in Step 0 item 5) until Jim confirms tracking is off for romrx.io in Resend (Stacy 8:44 PM). Setting it to "on" later is a separate go.
6. Netlify draft deploy from the pushed frontend branch (no --prod). Reid checks the draft: the flow (Step 1 to 11 of 11, "Assessment step 2" eyebrow on ROMood), crisis line, /legal 7A new paragraph and deletion line, My Body "Quick ROMood check" button, /dashboard/mood (protected, redirects when signed out), cap and not-saved messages, and that saving is off.
7. Merge both branches to main, then publish that same Netlify draft to production. Merge the backend only after the function check passes.
8. Reid live check. Report deploy id, function version and credits to Grant and Jim.

## VITE_ROMOOD_SAVE decision (Jim)
Not in netlify.toml and not set in any Netlify context, so saving ships OFF (on only when exactly "on", romood.ts:49). With it off, the quick screen works but shows "Saving check-ins isn't turned on yet, so this one won't be saved." Turning it on is a separate go: set VITE_ROMOOD_SAVE=on in Netlify for production and redeploy. Do that only after migrations 1 to 5 are applied and the 7A text is live. Jim decides when.

## Rollback
1. Netlify: restore production deploy **6adfccf02c316661a280ebd2**.
2. Function: redeploy v38 (origin/main 3043f41 of romrxbjj-v2, `supabase functions deploy submit-assessment` from that commit). It is byte-identical to the live v38 source.
3. Supabase: run the reverts by hand in order 5, 4, 3, 2, 1.
4. Git: `git revert -m 1 <merge>` on main for each repo, no force push.
5. If the ROMOOD_EMAIL_MOOD secret was ever set, unset it first.

## What does NOT ship / open items
- Reminders and mood push notifications: not built, by design.
- submit-lead-assessment (lead email) is unchanged: no mood block.
- Retention (until delete, 12 months or rolling 12 weeks) and the purge cron: Jim's call; no cron is created by this plan.
- Counsel to confirm Resend as a processor.
- Settings.tsx is also touched by the held stage/batch-1021-io (152824d); a test merge was clean before the daily changes, so recheck.

## The line Jim types in Avery's chat
Avery, push ROMood daily: run migrations 1 to 5, deploy only submit-assessment from feat/romood-daily-email, Netlify draft, keep ROMOOD_EMAIL_MOOD unset and VITE_ROMOOD_SAVE off.
