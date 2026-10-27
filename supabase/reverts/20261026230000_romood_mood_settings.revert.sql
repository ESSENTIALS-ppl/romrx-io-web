-- Revert 20261026230000_romood_mood_settings.sql (NOT APPLIED; for reference)
-- Manual use only, run 4th (order 5, 4, 3, 2, 1: consent policy, cap, retention, settings, entries). Policies, grants (including the authenticated REVOKE/GRANT hardening) and the updated_at trigger go with the table; the trigger function is dropped last. Copy of supabase/migrations/20261026230000_romood_mood_settings.revert.sql.txt.
drop policy if exists mood_entries_insert_own on public.mood_entries;
create policy mood_entries_insert_own on public.mood_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);
alter table public.mood_entries drop constraint if exists mood_entries_tick_not_future;
drop table if exists public.mood_settings;
-- Table drop removes the trigger, grants and policies; then drop the trigger function it used.
drop function if exists public.romood_touch_updated_at();
