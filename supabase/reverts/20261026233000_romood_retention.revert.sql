-- Revert 20261026233000_romood_retention.sql. Manual use only, run FIRST (order 3, 2, 1).
-- Not in supabase/migrations, so `supabase db push` / migration up never runs it.
drop function if exists public.romood_purge_expired(text);
