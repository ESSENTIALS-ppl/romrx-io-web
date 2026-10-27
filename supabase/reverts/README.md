# ROMood revert SQL (manual only)
Not migrations. The Supabase CLI only applies supabase/migrations/*.sql, so nothing here runs automatically.
Numbers are the migration order (the order PUSH-PLAN.md applies them). Revert in the opposite order: **4, 3, 2, 1**.

| Migration | Revert file | Revert runs |
|---|---|---|
| 1. 20261026220000_romood_mood_entries.sql | 20261026220000_romood_mood_entries.revert.sql | 4th (last) |
| 2. 20261026230000_romood_mood_settings.sql | 20261026230000_romood_mood_settings.revert.sql | 3rd |
| 3. 20261026233000_romood_retention.sql | 20261026233000_romood_retention.revert.sql | 2nd |
| 4. 20261027000000_romood_daily_cap.sql | 20261027000000_romood_daily_cap.revert.sql | 1st |

Notes: revert 4 deletes 'quick' check-ins. Reverts 1 and 2 drop their tables, which also removes the policies, grants and (for settings) the updated_at trigger; revert 2 then drops the trigger function.
