-- SUPERSEDED by 20261124210022 (live 2026-11-24). DO NOT APPLY.
-- MANUAL REVERT for 20261028100000_romood_consent_v3_rombot.sql. Not auto-run. Runs FIRST of all
-- (order 6, 5, 4, 3, 2, 1). Puts back the v2 insert policy. Run it only together with reverting the app to the v2 opt-in
-- text, otherwise new check-ins saved under v3 would be rejected.
drop policy if exists mood_entries_insert_requires_v3_consent on public.mood_entries;
drop policy if exists mood_entries_insert_requires_v2_consent on public.mood_entries;
create policy mood_entries_insert_requires_v2_consent on public.mood_entries
  as restrictive
  for insert to authenticated
  with check (
    exists (
      select 1 from public.mood_settings s
       where s.user_id = mood_entries.user_id
         and s.consent_version = 'v2-email-20261026'
         and s.opted_in_at is not null
    )
  );
