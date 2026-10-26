# ROMood privacy runbook (privacy@ export and delete) - DRAFT, NOT LIVE

Scope: privacy@romrx.io requests that touch ROMood. Tables: `public.mood_entries`, `public.mood_settings`.
Nothing here has been run. Migrations are not applied. Whoever runs exports must confirm this
checklist (Stacy fix 4).

## Owners and flow (Stacy pass 97101d6)
1. Intake: Stacy receives the request at privacy@romrx.io, checks the requester's identity, and drafts the response.
2. Approve: Jim approves the action.
3. Execute: Avery runs the SQL below.
4. Verify: Reid verifies the result (export complete, or 0 rows left for a delete).
5. Confirm: Stacy confirms to the requester within 30 days of the request (stricter than RCW 19.373.040's 45 days; matches /legal Section 4). For an email mood-only delete, the confirmation says the mood_settings row (opt-in and off times) is kept with the account.

## Export (access request)
Add both tables to the export checklist, keyed by the user's auth id:

```sql
select created_at, energy, pleasantness, word, quadrant, context, opted_in_at
  from public.mood_entries where user_id = :uid order by created_at;
select saving_on, opted_in_at, turned_off_at, updated_at
  from public.mood_settings where user_id = :uid;
```

## Delete (mood only, account kept)
User can do this in Settings > ROMood check-ins > Delete my mood check-ins. By email:

```sql
delete from public.mood_entries where user_id = :uid;
update public.mood_settings set saving_on = false, turned_off_at = now() where user_id = :uid;
```

## Delete (whole account)
Both tables cascade from `auth.users` (on delete cascade). Confirm 0 rows in each after deletion.

## Notes
- Skip events are not sent at all (Q11, Grant Oct 26: live RLS rejects no-id rows), so there is nothing to export.
- Mood is consumer health data under Washington MHMDA (RCW 19.373): access and deletion rights apply (Stacy pass).
- Retention: see the Retention section below (Stacy ruling Oct 26). No auto-delete job exists.

## Retention (Stacy ruling Oct 26, Jim's call)
- Config: `ROMOOD_PLACEHOLDERS.retention` (app) and `public.romood_purge_expired(mode)` (migration 20261026233000, not applied, not scheduled).
- A `until_delete` (default, Stacy recommended), B `12_months`, C `rolling_12_weeks`. User delete always overrides.
- Mood-to-Dailee linking is OFF (`daileeLinkEnabled: false`) until the new opt-in text and /legal 7A text are live.

## After any restore

After any database restore, re-run every mood check-in and account deletion made since that backup was taken, then confirm with Reid that those rows are gone. (Stacy rule, Oct 26, 2026.)
