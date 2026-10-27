-- ============================================================================================
-- PROPOSED. NOT APPLIED. Run only after 20261026220000, 20261026230000, 20261026233000 and
-- 20261027000000 (it reads mood_settings.consent_version, added by the daily cap migration),
-- Stacy's check, Vera's verify, and Jim's go. Revert: supabase/reverts/20261027010000_romood_insert_requires_v2_consent.revert.sql
--
-- Closes Vera GAP A (5af19bf verdict, item 5): re-consent was enforced on the app screens and at the email
-- send, but not in the database, so a user with an older opt-in could still insert mood entries by calling
-- the API directly.
--
--  * A RESTRICTIVE INSERT policy on mood_entries for authenticated users. Restrictive policies are ANDed
--    with the permissive mood_entries_insert_own policy (own row, saving_on = true), so both must pass.
--    The insert is rejected unless the user's mood_settings row has consent_version = 'v2-email-20261026'
--    (Stacy's Oct 26 8:36 PM opt-in text, the same constant as ROMOOD_CONSENT_VERSION in the app) and a
--    non-null opted_in_at.
--  * Why a policy and not a trigger: it needs no function, so there is no SECURITY DEFINER code, no
--    search_path to pin and no execute grant to revoke. It sits next to the existing consent-style insert
--    policy, and the revert is one DROP POLICY.
--  * Service role is unaffected: it has BYPASSRLS in Supabase, so RLS policies do not apply to it.
--  * Order of operations: for an INSERT, BEFORE ROW triggers fire first, then RLS WITH CHECK. So the cap
--    trigger (mood_entries_daily_cap) runs first: it takes the per-user lock, stamps created_at := now() and
--    counts the day, and raises RM429 on the 5th row. This policy is checked after. A rejected insert rolls
--    back, so it never counts toward the cap. A user with no v2 consent who is at the cap sees RM429, not an
--    RLS error, which is harmless. Nothing here reads created_at.
--  * 'quick' and 'onboarding' rows are treated the same: the policy does not look at context. The app
--    writes mood_settings (consent_version v2, real tick time) BEFORE the entry in both flows, so a user who
--    ticks the v2 text passes.
--  * The mood_settings subquery runs as the user, who may read their own row (mood_settings_select_own).
-- ============================================================================================

drop policy if exists mood_entries_insert_requires_v2_consent on public.mood_entries;
create policy mood_entries_insert_requires_v2_consent on public.mood_entries
  as restrictive
  for insert to authenticated
  with check (
    exists (
      select 1 from public.mood_settings s
       where s.user_id = mood_entries.user_id
         and s.consent_version = 'v2-email-20261026'
         and s.opted_in_at is not null
    )
  );
