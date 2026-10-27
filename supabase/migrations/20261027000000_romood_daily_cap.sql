-- ============================================================================================
-- PROPOSED. NOT APPLIED. Run only after 20261026220000, 20261026230000 and 20261026233000,
-- Stacy's check, Vera's verify, and Jim's go. Revert: supabase/reverts/20261027000000_romood_daily_cap.revert.sql
--
--  * Daily cap: a BEFORE INSERT trigger rejects the 5th mood_entries row per user per America/New_York
--    calendar day. Error: SQLSTATE 'RM429', message 'romood_daily_cap'. The app shows a friendly message.
--  * A per-user transaction advisory lock makes concurrent inserts count correctly.
--  * context now allows 'quick' (check-in from My Body at /dashboard/mood) as well as 'onboarding'.
--  * mood_settings.consent_version: which opt-in text the user ticked. Only 'v2-email-20261026'
--    (Stacy's Oct 26 8:36 PM text naming the results email) allows mood in the PRP email. Older
--    opt-ins stay NULL and get no mood in the email until they tick the new text.
-- ============================================================================================

alter table public.mood_entries drop constraint if exists mood_entries_context_check;
alter table public.mood_entries add constraint mood_entries_context_check
  check (context in ('onboarding', 'quick'));

alter table public.mood_settings add column if not exists consent_version text;


create or replace function public.romood_enforce_daily_cap()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  day_start timestamptz;
  n integer;
begin
  perform pg_advisory_xact_lock(hashtextextended('romood_daily_cap:' || new.user_id::text, 0));
  day_start := (date_trunc('day', now() at time zone 'America/New_York')) at time zone 'America/New_York';
  select count(*) into n
    from public.mood_entries
   where user_id = new.user_id
     and created_at >= day_start
     and created_at < day_start + interval '1 day';
  if n >= 4 then
    raise exception using errcode = 'RM429', message = 'romood_daily_cap',
      detail = 'Mood check-ins are limited to 4 per day (America/New_York).';
  end if;
  return new;
end;
$$;

revoke all on function public.romood_enforce_daily_cap() from public, anon, authenticated;

drop trigger if exists mood_entries_daily_cap on public.mood_entries;
create trigger mood_entries_daily_cap
  before insert on public.mood_entries
  for each row execute function public.romood_enforce_daily_cap();
