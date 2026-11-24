-- ============================================================================================
-- PROPOSED. NOT APPLIED. Run after 20261027000000_romood_daily_cap.sql (it replaces that function in place).
-- Revert: supabase/reverts/20261028110000_romood_cap_detail_wording.revert.sql (no-op by design)
--
-- Oct 28 2026: reword the RM429 error DETAIL only (internal SQL text, never shown to users; the app shows its own
-- capReached line). The function body, the cap of 4 per America/New_York day, the SQLSTATE RM429, the message
-- 'romood_daily_cap', the advisory lock, the created_at stamp and the trigger are all unchanged.
-- Stacy OK'd rewording (STACY-7A-ROMBOT-20261028.md).
-- Note: a read-only check on Oct 28 found romood_enforce_daily_cap already exists in the prod project, although the
-- header of 20261027000000 says NOT APPLIED. Whoever applies this should confirm the prod state first.
-- ============================================================================================

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
  -- Ignore any created_at the client sends (backdated or future). The row is stamped with server time,
  -- so the day count below, the cap, and the email window cannot be skipped by faking a time.
  new.created_at := now();
  day_start := (date_trunc('day', now() at time zone 'America/New_York')) at time zone 'America/New_York';
  select count(*) into n
    from public.mood_entries
   where user_id = new.user_id
     and created_at >= day_start
     and created_at < day_start + interval '1 day';
  if n >= 4 then
    raise exception using errcode = 'RM429', message = 'romood_daily_cap',
      detail = 'Mood check-ins are capped at 4 per day (America/New_York).';
  end if;
  return new;
end;
$$;

revoke all on function public.romood_enforce_daily_cap() from public, anon, authenticated;
