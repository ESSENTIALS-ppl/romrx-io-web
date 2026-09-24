-- Step 2: remove the ads_consent_* columns from public.users (now in
-- public.user_ads_consent) so coaches / school admins cannot read them.
drop trigger if exists guard_ads_consent_columns on public.users;
drop function if exists public.guard_ads_consent_columns();
alter table public.users
  drop column if exists ads_consent_state,
  drop column if exists ads_consent_updated_at,
  drop column if exists ads_consent_declined_at;
