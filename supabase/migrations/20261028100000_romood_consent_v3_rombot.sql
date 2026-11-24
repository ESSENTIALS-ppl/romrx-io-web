-- SUPERSEDED by 20261124210022 (live 2026-11-24). DO NOT APPLY.
-- ============================================================================================
-- PROPOSED. NOT APPLIED to prod. Run only after 20261027010000_romood_insert_requires_v2_consent.sql, Stacy's check,
-- Vera's verify, and Jim's go. Revert: supabase/reverts/20261028100000_romood_consent_v3_rombot.revert.sql
--
-- Oct 28 2026 (Stacy, STACY-OPTIN-V3-ROMBOT-20261028.md): the single ROMood opt-in becomes v3 and now covers ROMBot (AI).
-- The app writes mood_settings.consent_version = 'v3-rombot-20261028' (ROMOOD_CONSENT_VERSION in romoodCopy.ts) when the
-- user ticks the new text. People on v2 see saving OFF and tick again.
--
--  * The restrictive insert policy from 20261027010000 required consent_version = 'v2-email-20261026'. The app now
--    writes v3, so that policy would reject every new check-in. It is replaced by one that requires v3 and a tick time.
--    v2 users who have not re-ticked cannot insert (the app shows them the new text first, so this only matters for
--    direct API calls).
--  * No new table, no new column, no function, no grant. mood_settings.consent_version is free text.
--  * ROMBot (ai-chat) reads mood rows only when this same row says saving_on = true with a valid tick time and
--    consent_version = 'v3-rombot-20261028'. No separate AI consent exists.
--  * Existing mood_entries rows are untouched.
-- ============================================================================================

drop policy if exists mood_entries_insert_requires_v2_consent on public.mood_entries;
drop policy if exists mood_entries_insert_requires_v3_consent on public.mood_entries;
create policy mood_entries_insert_requires_v3_consent on public.mood_entries
  as restrictive
  for insert to authenticated
  with check (
    exists (
      select 1 from public.mood_settings s
       where s.user_id = mood_entries.user_id
         and s.consent_version = 'v3-rombot-20261028'
         and s.opted_in_at is not null
    )
  );
