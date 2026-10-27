-- MANUAL REVERT for 20261027000000_romood_daily_cap.sql. Not auto-run. Run FIRST (before the
-- 3 older ROMood reverts, which run 3, 2, 1). Rows with context 'quick' are deleted so the old
-- context check can be restored. Dropping the function also removes its created_at := now() stamp (the
-- column default now() stays, so ordinary inserts behave as before the cap); consent_version is dropped (older opt-ins are unaffected).
drop trigger if exists mood_entries_daily_cap on public.mood_entries;
drop function if exists public.romood_enforce_daily_cap();
delete from public.mood_entries where context = 'quick';
alter table public.mood_entries drop constraint if exists mood_entries_context_check;
alter table public.mood_entries add constraint mood_entries_context_check check (context in ('onboarding'));
alter table public.mood_settings drop column if exists consent_version;
