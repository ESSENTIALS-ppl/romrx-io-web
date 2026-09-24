-- Current ads-consent choice moves off public.users into a self-read-only table
-- (follow-up to 20260924230000_consent_events). public.users has "coach reads
-- athletes" and "school admin reads school users" SELECT policies plus a
-- table-level SELECT grant, so any column on users is readable by coaches and
-- school admins. A column revoke would break existing self `select('*')` reads
-- (romrx-bjj-v2-web useProfile), so the choice lives in its own table instead.
-- Step 1 (this file): create + copy. Step 2 (20260924231500): drop old columns
-- after the app/function that read them are deployed.

create table if not exists public.user_ads_consent (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  state       text not null check (state in ('granted', 'denied', 'revoked')),
  updated_at  timestamptz not null default now(),
  declined_at timestamptz null
);

alter table public.user_ads_consent enable row level security;
revoke all on table public.user_ads_consent from anon, authenticated;
grant select on table public.user_ads_consent to authenticated;

drop policy if exists "user_ads_consent: self read" on public.user_ads_consent;
create policy "user_ads_consent: self read" on public.user_ads_consent
  for select to authenticated using (user_id = (select auth.uid()));
-- No insert/update/delete policies or grants: written only by the consent-log
-- function with the service role. Deleted with the account (cascade).

comment on table public.user_ads_consent is
  'Current ads-measurement choice per signed-in user (Legal 2026-09-24). Self read only; coaches and school admins cannot read. Written only by netlify/functions/consent-log.js (service role). History lives in consent_events.';

insert into public.user_ads_consent (user_id, state, updated_at, declined_at)
select id, ads_consent_state, coalesce(ads_consent_updated_at, now()), ads_consent_declined_at
from public.users
where ads_consent_state is not null
on conflict (user_id) do nothing;
