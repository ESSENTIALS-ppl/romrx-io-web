-- Revert 20261026220000_romood_mood_entries.sql. Manual use only, run LAST (order 3, 2, 1).
-- Drops all saved mood check-ins. Policies and the index go with the table.
drop table if exists public.mood_entries;
