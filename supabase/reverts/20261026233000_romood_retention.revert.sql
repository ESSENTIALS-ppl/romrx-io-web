-- Revert 20261026233000_romood_retention.sql. Manual use only, run 2nd, right after the cap revert (order 4, 3, 2, 1: cap, retention, settings, entries).
-- Not in supabase/migrations, so `supabase db push` / migration up never runs it.
drop function if exists public.romood_purge_expired(text);
