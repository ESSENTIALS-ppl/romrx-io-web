# ROMBot reads ROMood check-ins: /legal 7A draft and v3 push notes (Wed Oct 28 09:10 EDT 2026)
DRAFT ONLY. legal.html is NOT edited on this branch, so nothing renders live. Stacy approves before anything goes into legal.html.

## Where it goes
legal.html, section "7A. Consumer health data" (h3 at line 128), directly after the paragraph that starts "Mood check-ins: if you turn on saving" (line 130).

## Line (Stacy's wording, verbatim from her Oct 28 ruling)
If you turn it on, ROMBot reads your ROMood check-ins to answer your questions. They go to our AI provider only to answer you, and are not used to train AI models.

## Why 7A has to carry more than the opt-in does
The final opt-in text (Jim, Oct 28) is "Save my mood check-ins for the app, emails and ROMBot (AI). I can turn this off or delete them anytime. See the Privacy Policy." It no longer says an AI provider is involved beyond "ROMBot (AI)". So 7A is where the provider is disclosed. For Stacy: decide whether 7A should name the provider. ai-chat sends the check-in numbers to OpenAI (chat completions, store:false).

## Provider terms Avery could confirm from OpenAI's public docs (developers.openai.com/api/docs/guides/your-data, read Oct 28)
- Training: "data sent to the OpenAI API is not used to train or improve OpenAI models (unless you explicitly opt in to share data with us)". The chat completions row says Data used for training: No. Public terms only. The ROMRx account's own agreement and any opt-in setting were not checked (no account access).
- Retention: abuse monitoring logs are kept up to 30 days by default. Zero Data Retention or Modified Abuse Monitoring needs OpenAI approval. Whether the ROMRx org has either was not checked. ai-chat sets store:false, which only stops application state. So "only to answer you" is not strictly true while a 30 day abuse log exists.
- If Stacy wants the line to stay accurate, consider adding "Our provider may keep them for up to 30 days to prevent abuse." Avery has not edited her wording.

## Also stale once this ships
The existing sentence at legal.html:130 says check-ins are saved "so we can show you how your mood changes over time in the app and in your results email". With v3 it should also mention ROMBot. Stacy to word it.

## Push notes (migration 6)
- supabase/migrations/20261028100000_romood_consent_v3_rombot.sql replaces the v2 restrictive insert policy with a v3 one. Apply it in the same release as the app build that writes v3. Do NOT apply before migrations 1 to 5.
- Revert: supabase/reverts/20261028100000_romood_consent_v3_rombot.revert.sql. Runs first, before the 5, 4, 3, 2, 1 order in reverts/README.md.
- Order for release: migration 6, then the app build, then ai-chat (v2 repo branch feat/rombot-romood-20261028), then submit-assessment. ai-chat reads mood only for v3 rows.
- Every existing v2 user sees saving OFF in Settings and the unticked v3 text in Quick ROMood check, and must tick again. Until then ROMBot answers with the consent-off line and their saved v2 check-ins still show in My Body.
