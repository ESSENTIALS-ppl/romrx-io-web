# ROMood revert SQL (manual only)
Not migrations. The Supabase CLI only applies supabase/migrations/*.sql, so nothing here runs automatically.
Run order: 4 (20261027000000_romood_daily_cap.revert.sql), then 3, 2, 1.
1. 20261026233000_romood_retention.revert.sql
2. 20261026230000_romood_mood_settings.revert.sql
3. 20261026220000_romood_mood_entries.revert.sql
