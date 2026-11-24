# ROMBot reads ROMood check-ins: /legal 7A line and v3 push notes (Wed Oct 28 09:14 EDT 2026)
STATUS: Stacy's line is now IN legal.html on branch feat/rombot-romood-20261028 (io), local only. NOT deployed, NOT pushed. Stacy's note says "Research and draft only. Not ship approval", so shipping still needs her go.
Draft doc full path: /workspace/rombot-romood-20261028/io/docs/ROMBOT-ROMOOD-V3-LEGAL-7A-DRAFT-20261028.md

## Where it is
legal.html, section "7A. Consumer health data" (h3 at line 128). Mood check-ins paragraph at line 130, the ROMBot line at line 131 (its own paragraph), then the deletion paragraph at 132 and the crisis paragraph at 133.

## Line (Stacy, STACY-7A-ROMBOT-20261028.md, Oct 28 09:12 EDT; replaces her earlier "not used to train AI models" draft)
If you turn it on, ROMBot reads your ROMood check-ins to answer your questions. To do this, they are sent to our AI provider, OpenAI. OpenAI does not use them to train its models and may keep them for up to 30 days to check for abuse.

Stacy's notes: if Zero Data Retention is later approved for the ROMRx org, the last clause can drop. Do not say "only to answer you". Results email accepting v2 or v3 is OK (v2 text named the email; ROMBot reads v3 only). Rewording the banned word in internal SQL text is fine.

## Diff against 19b965a (Terms and Privacy deployed in 2d3d7ef) so nothing rolls back
- This branch's Terms came from 19b965a (commit 2d3d7ef copied it in; 19b965a itself is not a git ancestor of the branch). Later commits d523ad3 (Card T3A: 3A readiness bands sentence, Last updated October 20, 2026), 5b007ed (Terms s3 crisis rule) and the ROMood 7A paragraphs sit on top of it.
- `git diff 19b965a -- legal.html` now shows only: Last updated Oct 19 to Oct 20; the Terms s3 crisis sentence added; the 3A readiness bands sentence; and the four ROMood 7A paragraphs (mood check-ins, the new ROMBot line, deletion, crisis). Every other line of 19b965a, including the restored Notion sentence, the GA removal and Privacy s1 "described in section 5", is unchanged.
- The only edit made in this follow-up is the one added paragraph. The diff against the pre-edit branch file is +1 line.
- Not changed by Avery: the date "Last updated October 20, 2026" and TERMS_VERSION. Stacy to decide whether this addition needs a new date or re-acceptance.

## Provider facts checked from OpenAI's public docs (developers.openai.com/api/docs/guides/your-data, read Oct 28)
- Training: API data is not used to train or improve OpenAI models unless the customer opts in. Public terms only. The ROMRx account agreement and any opt-in setting were not checked.
- Retention: abuse monitoring logs are kept up to 30 days by default. Zero Data Retention or Modified Abuse Monitoring needs OpenAI approval and the ROMRx org status was not checked. This matches Stacy's "may keep them for up to 30 days to check for abuse".
- ai-chat sends the check-in numbers (no free text) to OpenAI chat completions with store:false.

## Stacy's ship fixes (STACY-ROMBOT-SHIP-20261028.md, Oct 28 09:20 EDT), applied
- legal.html line 130 now reads "... in the app and in your results email, and, if you turn it on, so ROMBot can answer your questions about them. If you don't turn on saving ..." Line 131 stays verbatim.
- legal.html line 29: "Last updated November 1, 2026" (was October 20). TERMS_VERSION stays 2026-10-19 (the v3 mood tick is the consent, no re-accept).
- Combined tick without the provider sentence: OK (Stacy). Counsel to confirm. Results email on v2 or v3: OK.
- v2 ai-chat: MOOD_PROVIDER_REPLY and MOOD_SEPARATE_LINE changed to Stacy's text (see the report).
- The "still stale" item about line 130 is closed.

## Cap error detail (migration 7, not applied)
supabase/migrations/20261028110000_romood_cap_detail_wording.sql re-creates romood_enforce_daily_cap() with the detail "Mood check-ins are capped at 4 per day (America/New_York)." Nothing else changed. The revert is a no-op. A read-only check found the function already exists in the prod project, although the header of 20261027000000 says NOT APPLIED, so confirm prod state before applying.

## Push notes (migration 6)
- supabase/migrations/20261028100000_romood_consent_v3_rombot.sql replaces the v2 restrictive insert policy with a v3 one. Apply it in the same release as the app build that writes v3. Do NOT apply before migrations 1 to 5.
- Revert: supabase/reverts/20261028100000_romood_consent_v3_rombot.revert.sql. Runs first, before the 5, 4, 3, 2, 1 order in reverts/README.md.
- Order for release: migration 6, then the app build, then ai-chat (v2 repo branch feat/rombot-romood-20261028), then submit-assessment. ai-chat reads mood only for v3 rows.
- Every existing v2 user sees saving OFF in Settings and the unticked v3 text in Quick ROMood check, and must tick again. Until then ROMBot answers with the consent-off line and their saved v2 check-ins still show in My Body.
