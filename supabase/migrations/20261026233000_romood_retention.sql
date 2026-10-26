-- ============================================================================================
-- PROPOSED. NOT APPLIED. Not scheduled. Retention purge for mood_entries (Stacy retention ruling,
-- stacy-romood-retention-20261026.md). Mode is Jim's call: 'until_delete' (A, default, purge does
-- nothing), '12_months' (B), 'rolling_12_weeks' (C). Must match ROMOOD_PLACEHOLDERS.retention.
-- User delete ALWAYS overrides retention: users can delete their rows at any time (RLS delete policy).
-- B or C need a scheduled job (pg_cron) added separately after Jim's go.
-- Rollback: drop function if exists public.romood_purge_expired(text);
-- ============================================================================================
create or replace function public.romood_purge_expired(mode text default 'until_delete')
returns integer language plpgsql security definer set search_path = public as $$
declare n integer := 0;
begin
  if mode = 'until_delete' then return 0;
  elsif mode = '12_months' then delete from public.mood_entries where created_at < now() - interval '12 months';
  elsif mode = 'rolling_12_weeks' then delete from public.mood_entries where created_at < now() - interval '12 weeks';
  else raise exception 'unknown retention mode %', mode;
  end if;
  get diagnostics n = row_count;
  return n;
end $$;
revoke all on function public.romood_purge_expired(text) from public, anon, authenticated;
