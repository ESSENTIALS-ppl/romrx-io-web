-- ============================================================================================
-- PROPOSED. NOT APPLIED. Do not run before Stacy's privacy check, Vera's verify, and Jim's go.
-- ROMood mood entries (romood_spec.md rev 5, Section 3; Stacy locked mood-data requirements).
--
--  * Own table, separate from assessments. Nothing in scoring reads it (req 3).
--  * A row can only exist with opted_in = true and an opt-in timestamp (req 1, 2).
--  * RLS: a user can insert, read, and delete only their own rows. No update (req 4 = delete).
--  * Rows cascade-delete with the account.
--  * App writes stay OFF (VITE_ROMOOD_SAVE) until the /legal Privacy mood line is live (req 5).
-- Rollback: drop table if exists public.mood_entries; (grants go with the table)
-- ============================================================================================

create table if not exists public.mood_entries (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  energy        smallint not null check (energy between 0 and 100),
  pleasantness  smallint not null check (pleasantness between 0 and 100),
  word          text check (word is null or word in (
                  'Riled','Wired','Angry','Tense','Excited','Upbeat','Happy','Lively',
                  'Low','Flat','Drained','Bored','Calm','Content','Relaxed','Mellow')),
  quadrant      text not null check (quadrant in ('high_unpleasant','high_pleasant','low_unpleasant','low_pleasant')),
  context       text not null default 'onboarding' check (context in ('onboarding')),
  opted_in      boolean not null check (opted_in = true),
  opted_in_at   timestamptz not null
);

create index if not exists mood_entries_user_created_idx on public.mood_entries (user_id, created_at desc);

alter table public.mood_entries enable row level security;

drop policy if exists mood_entries_insert_own on public.mood_entries;
create policy mood_entries_insert_own on public.mood_entries
  for insert to authenticated with check ((select auth.uid()) = user_id);

drop policy if exists mood_entries_select_own on public.mood_entries;
create policy mood_entries_select_own on public.mood_entries
  for select to authenticated using ((select auth.uid()) = user_id);

drop policy if exists mood_entries_delete_own on public.mood_entries;
create policy mood_entries_delete_own on public.mood_entries
  for delete to authenticated using ((select auth.uid()) = user_id);

-- Grants: prod default ACLs auto-grant ALL on new public tables to authenticated, and a plain GRANT only
-- ADDS to those. So strip authenticated first, then grant exactly what the app needs. This matters most for
-- TRUNCATE, which ignores RLS. (Schema-copy finding, Oct 27 2026. No UPDATE: entries are immutable.)
revoke all on public.mood_entries from anon;
revoke all on public.mood_entries from authenticated;
grant select, insert, delete on public.mood_entries to authenticated;

comment on table public.mood_entries is 'ROMood self check-ins. Opt-in only. Separate from assessment scores; never used for scoring; never sent to Meta.';
