# ROMood revert SQL (manual only)
Not migrations. The Supabase CLI only applies supabase/migrations/*.sql, so nothing here runs automatically.
Numbers are the migration order (the order PUSH-PLAN.md applies them). Revert in the opposite order: **5, 4, 3, 2, 1**.

| Migration | Revert file | Revert runs |
|---|---|---|
| 1. 20261026220000_romood_mood_entries.sql | 20261026220000_romood_mood_entries.revert.sql | 5th (last) |
| 2. 20261026230000_romood_mood_settings.sql | 20261026230000_romood_mood_settings.revert.sql | 4th |
| 3. 20261026233000_romood_retention.sql | 20261026233000_romood_retention.revert.sql | 3rd |
| 4. 20261027000000_romood_daily_cap.sql | 20261027000000_romood_daily_cap.revert.sql | 2nd |
| 5. 20261027010000_romood_insert_requires_v2_consent.sql | 20261027010000_romood_insert_requires_v2_consent.revert.sql | 1st |

Notes: revert 5 drops the restrictive consent policy and must run before revert 4, which drops the consent_version column that policy reads. Revert 4 deletes 'quick' check-ins. Reverts 1 and 2 drop their tables, which also removes the policies, grants and (for settings) the updated_at trigger; revert 2 then drops the trigger function.
