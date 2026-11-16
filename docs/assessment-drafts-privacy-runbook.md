# Assessment drafts: access, export and delete (Stacy ruling Oct 28 2026) - NOT LIVE UNTIL SHIPPED

Table `public.assessment_drafts` holds one row per member while an assessment is in progress. Stacy's ruling:
drafts get the same access, deletion and export handling as results. Nothing here has been run. The migrations
(v2 repo, branch fix/assessment-progress-20261028, files 20261029100000 to 20261029100200) are not applied until the Sunday deploy.

This is a separate file on purpose (docs/romood-privacy-runbook.md belongs to the ROMBot ROMood branch). Use both
checklists on any privacy@ request.

## What a draft holds
`user_id`, `step_values` (up to 18 joint angles, numbers 0 to 360 or null), `completed_steps` (step ids), `step_idx`,
`client_saved_at`, `created_at`, `updated_at`, `expires_at`. It never holds mood, name, email or notes.
A draft lives 48 hours after the last saved step and never more than 7 days from `created_at`. It is deleted on submit.

## Same owners and flow as results
Use the flow in docs/romood-privacy-runbook.md (log, run, Reid verifies, Stacy confirms within 30 days).

## Export (access request)
Add this to the export checklist next to the assessment results, keyed by the member's auth id:

```sql
select created_at, updated_at, expires_at, step_idx, completed_steps, step_values
  from public.assessment_drafts where user_id = :uid;
```
Usually 0 rows (a draft exists only mid-assessment). Say so in the reply.

## Delete (assessment results or whole account)
```sql
delete from public.assessment_drafts where user_id = :uid;
```
Account deletion: the table cascades from `auth.users` (on delete cascade). Confirm 0 rows after deletion. Account deletion
stays staff-run (the in-app request only emails privacy@; see app/src/lib/accountDeletionRequest.ts and
supabase/functions/request-account-deletion in the v2 repo).

Also tell the member that a copy of their progress may sit in this browser's local storage under keys starting
`romrx.assessment_draft.v1.`; signing out, submitting, Start over and 48 hours all remove it.

## Purge and backups
The hourly job `purge_assessment_drafts_48h` (cron '17 * * * *') deletes expired rows. Policy: the purge must reach backups.
The project is on the Supabase Free plan (no daily backups, no PITR), so there are none to purge. If the plan ever moves to Pro or
higher, this must be settled with Stacy before the move, and the after-restore rule in docs/romood-privacy-runbook.md applies to
this table too: after any restore, re-run every deletion made since that backup, then confirm with Reid that those rows are gone.
Make no exports or dumps of draft rows. If one is ever made, erase it in the same pass as any later deletion.

## Legal page
legal.html carries Stacy's sentence in the "Assessment and progress data" paragraph. On the ship day, update the page's "Last updated"
date (it is hard-coded; the ROMBot branch sets Nov 1 2026, so if both ship together there is nothing more to change). TERMS_VERSION does not change.
