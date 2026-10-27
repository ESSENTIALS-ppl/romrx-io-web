-- MANUAL REVERT for 20261027010000_romood_insert_requires_v2_consent.sql. Not auto-run. Run FIRST of all
-- (order 5, 4, 3, 2, 1: consent policy, cap, retention, settings, entries). It must run before revert 4,
-- because the policy reads mood_settings.consent_version and revert 4 drops that column.
-- Only removes the restrictive insert policy; the permissive mood_entries_insert_own policy stays.
drop policy if exists mood_entries_insert_requires_v2_consent on public.mood_entries;
