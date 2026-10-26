-- ============================================================================================
-- PROPOSED. NOT APPLIED. Run only after 20261026220000_romood_mood_entries.sql, Stacy's check,
-- Vera's verify, and Jim's go. (Stacy pass at 8c61152, fixes 2 and 6.)
--
--  * mood_settings: one row per user holding the saving choice, so saving can be turned OFF later.
--  * opted_in_at is the REAL tick time sent by the app. No default, no now() fallback.
--  * mood_entries inserts are only allowed while the user's saving_on = true (DB-enforced withdrawal).
--  * mood_entries.opted_in_at may not be later than the row (no back-filled or future tick times).
--  * Both tables cascade-delete with the account. Export and delete: docs/romood-privacy-runbook.md.
--  * Retention: Jim locked "at least two assessment cycles" (Oct 26). No TTL job here; Stacy wording pending.
-- Rollback: see 20261026230000_romood_mood_settings.revert.sql.txt
-- ============================================================================================

create table if not exists public.mood_settings (
  user_id        uuid primary key references auth.users (id) on delete cascade,
  saving_on      boolean not null default false,
  opted_in_at    timestamptz,
  turned_off_at  timestamptz,
  updated_at     timestamptz not null default now(),
  constraint mood_settings_on_needs_tick check (saving_on = false or opted_in_at is not null)
);

alter table public.mood_settings enable row level security;

drop policy if exists mood_settings_select_own on public.mood_settings;
create policy mood_settings_select_own on public.mood_settings
  for select to authenticated using ((select auth.uid()) = user_id);
drop policy if exists mood_settings_insert_own on public.mood_settings;
create policy mood_settings_insert_own on public.mood_settings
  for insert to authenticated with check ((select auth.uid()) = user_id);
drop policy if exists mood_settings_update_own on public.mood_settings;
create policy mood_settings_update_own on public.mood_settings
  for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

revoke all on public.mood_settings from anon;
grant select, insert, update on public.mood_settings to authenticated;

-- Real tick time on entries: cannot be after the row was written (small clock skew allowed).
alter table public.mood_entries drop constraint if exists mood_entries_tick_not_future;
alter table public.mood_entries add constraint mood_entries_tick_not_future
  check (opted_in_at <= created_at + interval '5 minutes');

-- Withdrawal is enforced in the DB: insert only while saving is on.
drop policy if exists mood_entries_insert_own on public.mood_entries;
create policy mood_entries_insert_own on public.mood_entries
  for insert to authenticated with check (
    (select auth.uid()) = user_id
    and exists (select 1 from public.mood_settings s where s.user_id = mood_entries.user_id and s.saving_on = true)
  );

comment on table public.mood_settings is 'ROMood saving choice per user. Opt-in time is the real tick time from the app. Never sent to Meta.';
