-- Revert 20261026220000_romood_mood_entries.sql. Manual use only, run LAST, 4th (order 4, 3, 2, 1: cap, retention, settings, entries).
-- Drops all saved mood check-ins. Policies, the index and the table grants (including the authenticated REVOKE/GRANT hardening) go with the table; nothing separate to undo.
drop table if exists public.mood_entries;
