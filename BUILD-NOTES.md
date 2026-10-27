# ROMood daily build notes (Mon Oct 26 2026, ET). LOCAL ONLY: no push, no deploy, no migration applied, no DB of any kind used.

## Branches and commits
Frontend: /workspace/romood-daily, branch feat/romood-daily, off cf8c333 (feat/romood-20261026 not moved, still on HOLD)
- ecffd26 fix(assessment): setPhase('mood') type. cf8c333 FAILS `tsc -b` (the npm run build typecheck) at AssessmentMeasureScreen.tsx:229, a bug from 02a7c1d. The Netlify build of cf8c333 would fail.
- b2c367b migration 20261027000000_romood_daily_cap.sql + revert (not applied)
- ee40b98 quick check-in, consent version, copy, legal 7A, tests
- (docs commit on top: BUILD-NOTES, COPY-NEEDED, RESEND-NOTES, tests.txt)

Backend: /workspace/romood-daily-backend (git worktree of /workspace/romrxbjj-v2, ESSENTIALS-ppl/romrxbjj-v2), branch feat/romood-daily-email off origin/main 3043f41
- 7bc1bd0 PRP email mood block in submit-assessment
- Source location: supabase/functions/submit-assessment/ in romrxbjj-v2. origin/main 3043f41 index.ts and all 4 _shared imports are byte-identical to live v38 (live ezbr, updated Oct 26 5:51 PM EDT). Nothing was deployed.

## Files
Frontend: app/src/lib/romood.ts, romoodCopy.ts, pages/QuickMood.tsx (new), App.tsx (route /dashboard/mood in ProtectedRoute), pages/MyBody.tsx (button), pages/AssessmentMeasureScreen.tsx, legal.html, supabase/migrations/20261027000000_romood_daily_cap.sql (new), supabase/reverts/20261027000000_romood_daily_cap.revert.sql (new), supabase/reverts/README.md, tests: lib/romoodDaily.test.tsx (new), lib/romood.test.tsx, components/CrisisLine.test.tsx.
Backend: submit-assessment/index.ts, mood_block.ts (new), mood_block.test.ts (new).

## What it does
- Saving stays OFF by default. The saving path is active only when VITE_ROMOOD_SAVE=on. Tests cover flag on and off.
- /dashboard/mood: the dial plus the word picker, no step counter, same canSave gate, crisis line, Back to My Body. If the current consent (v2-email-20261026) is already on file, the screen skips the tick box.
- Re-consent: mood_settings.consent_version is written on opt-in. Only users who ticked the new text get mood in the email.
- Daily cap: BEFORE INSERT trigger mood_entries_daily_cap allows 4 per America/New_York day per user (advisory lock) and raises SQLSTATE RM429 'romood_daily_cap'. The UI shows capReached.
- Email: averages and count only (energy, pleasantness), with Stacy's text verbatim. No words or single entries, and nothing in the subject, preview, tags, URLs or events. Send-time gate: ROMOOD_EMAIL_MOOD=on (new secret, default off), saving_on, a valid opted_in_at tick, and consent_version = v2-email-20261026. Any error drops the block and the email sends as before. Sent through Resend (index.ts fetch to api.resend.com/emails), from "Jim Scott <jim@romrx.io>" for Base.
- Window: entries since the later of the previous assessment and opted_in_at.

## Migration and revert
- Run order to apply: after the 3 existing ROMood migrations. Revert order: 4 (20261027000000_romood_daily_cap.revert.sql), then 3, 2, 1. The revert deletes 'quick' rows.

## Tests (tests.txt)
vitest 998 passed, 4 skipped (58 files), with the flag off and with VITE_ROMOOD_SAVE=on. tsc -p tsconfig.app.json 0, tsc -b 0. deno check 0; deno test 6 passed.
Note: plain `tsc` at the root checks nothing (references only). Use `tsc -b`.

## Open items / Jim's calls
- Reminders were NOT built. No mood push notifications, by design.
- No RLS or cap trigger test against real Postgres (no test DB was allowed). Before apply, test the trigger on a branch DB, including the America/New_York midnight boundary and concurrent inserts.
- The ROMOOD_EMAIL_MOOD secret has to be set at deploy, and submit-assessment needs a deploy. Jim's call.
- Confirm the email window choice (previous assessment vs. a fixed number of days).
- The lead email (submit-lead-assessment) is not changed.
- Data retention period is still Jim's call. Counsel should confirm Resend as a processor. Check open/click tracking on the romrx.io domain (RESEND-NOTES.md).
- The 5 quick-screen strings: DONE, Stacy-final 8:45 PM.
- The cf8c333 tsc -b failure: the fix ecffd26 is only on this branch.

- Email mood stays OFF (ROMOOD_EMAIL_MOOD unset) until tracking is confirmed off for romrx.io in Resend (Stacy 8:44 PM).
- Quick-screen copy is now Stacy-final (8:45 PM); no STACY-COPY-PENDING markers remain in app/src.
- legal.html:131 deletion line now ends "our email provider keeps a copy of sent emails for up to 30 days." (8:57 PM ET, replaces "may keep ... for a limited time"). This is Stacy's final line (Addendum 2, 8:58 PM ET, /workspace/beta-launch/proof-20261020/stacy-romood-daily-email-7a-20261026.md); verified word for word.
- Cap trigger now also sets created_at := now() and ignores any client value (Vera fix), so a backdated or future created_at cannot dodge the cap. Still open: deleting your own check-ins frees a slot (by design). Test in romoodDaily.test.tsx (cap migration test); revert file notes it.
- Mood email: '1 time' for count 1, 'N times' otherwise (backend fbd65a0).
- Supabase secret names for cqzvqzwwevnflinxgnpp could NOT be listed (no supabase CLI or token on the box, MCP has no secrets tool). ROMOOD_EMAIL_MOOD is unverified; Jim to run `supabase secrets list --project-ref cqzvqzwwevnflinxgnpp`. See /workspace/romood-push-candidate/supabase-secrets-names.txt.
- String sources: STRING-SOURCES.md.
