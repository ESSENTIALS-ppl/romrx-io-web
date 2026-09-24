-- consent_events: append-only ads-measurement consent log (Legal: Stacy memo 2026-09-24).
-- Server-side inserts only (Netlify function netlify/functions/consent-log.js, service role).
-- No client policies. Compliance use only: never analytics, ads, or Meta.
-- No email, IP, user agent, ad IDs (_fbp/_fbc), ROM, injury or assessment data.

create table if not exists public.consent_events (
  id                          bigint generated always as identity primary key,
  created_at                  timestamptz not null default now(),
  anon_id_hash                text not null check (anon_id_hash ~ '^[0-9a-f]{64}$'),
  user_id                     uuid null references auth.users (id) on delete set null,
  state                       text not null check (state in ('granted', 'denied', 'revoked')),
  method                      text not null check (method in ('banner', 'footer', 'settings', 'gpc', 'email')),
  gpc_present                 boolean not null default false,
  conflict_with_prior_accept  boolean not null default false,
  honored                     boolean not null default true,
  action_taken                text not null check (action_taken in ('meta_pixel_capi_off', 'meta_pixel_capi_on', 'none')),
  honored_at                  timestamptz null default now(),
  denial_reason               text null check (denial_reason is null or length(denial_reason) <= 200),
  policy_version              text not null check (policy_version ~ '^[A-Za-z0-9._-]{1,64}$'),
  banner_version              text not null check (banner_version ~ '^[A-Za-z0-9._-]{1,64}$'),
  site                        text not null default 'romrx.io' check (site in ('romrx.io', 'romrxbjj.com', 'romrxbodybuilding.com')),
  schema_version              integer not null default 1,
  region_country              char(2) null check (region_country is null or region_country ~ '^[A-Z]{2}$'),
  region_state                text null check (region_state is null or region_state ~ '^[A-Z0-9]{1,3}$'),
  page_path                   text not null check (page_path ~ '^/' and page_path !~ '[?#]' and length(page_path) <= 512),
  request_ticket_id           text null check (request_ticket_id is null or request_ticket_id ~ '^[A-Za-z0-9._-]{1,64}$')
);

create index if not exists consent_events_user_id_idx on public.consent_events (user_id);
create index if not exists consent_events_anon_id_hash_idx on public.consent_events (anon_id_hash);
create index if not exists consent_events_created_at_idx on public.consent_events (created_at);

alter table public.consent_events enable row level security;
-- No policies on purpose: anon/authenticated cannot read or write. Service role only.
revoke all on table public.consent_events from anon, authenticated;
revoke all on sequence public.consent_events_id_seq from anon, authenticated;

comment on table public.consent_events is
  'Ads-measurement consent log. Retention: 24 months per Legal (Stacy memo 2026-09-24); pg_cron job consent-events-retention-daily deletes older rows. Server-side inserts only (service role). Compliance use only: never analytics, ads, or Meta. user_id set null on account deletion; rows kept until roll-off.';

-- Retention: delete rows older than 24 months, daily at 04:17 UTC.
select cron.schedule(
  'consent-events-retention-daily',
  '17 4 * * *',
  $$delete from public.consent_events where created_at < now() - interval '24 months'$$
);

-- Current choice on the per-user profile (public.users). Written only by the
-- service role (consent-log function); users can read their own row.
alter table public.users
  add column if not exists ads_consent_state text null
    check (ads_consent_state is null or ads_consent_state in ('granted', 'denied', 'revoked')),
  add column if not exists ads_consent_updated_at timestamptz null,
  add column if not exists ads_consent_declined_at timestamptz null;

-- Clients may update other columns on their own users row; keep ads_consent_*
-- server-owned so the profile always matches the log.
create or replace function public.guard_ads_consent_columns()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if coalesce(auth.role(), '') = 'service_role'
     or current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if tg_op = 'INSERT' then
    new.ads_consent_state := null;
    new.ads_consent_updated_at := null;
    new.ads_consent_declined_at := null;
  else
    new.ads_consent_state := old.ads_consent_state;
    new.ads_consent_updated_at := old.ads_consent_updated_at;
    new.ads_consent_declined_at := old.ads_consent_declined_at;
  end if;
  return new;
end;
$$;

drop trigger if exists guard_ads_consent_columns on public.users;
create trigger guard_ads_consent_columns
  before insert or update on public.users
  for each row execute function public.guard_ads_consent_columns();
