-- ============================================================================================
-- PROPOSED for the Sunday Oct 11 batch. NOT APPLIED. Do not run before Jim's go.
-- Terms acceptance record at romrx.io signup + one-time re-accept + age_bucket/gender save.
-- Stacy ruling Oct 5 2026 9:25 PM ET (correction 9:30 PM); Grant: gate = no CURRENT-version row.
--
-- What it does:
--  1. consents: adds consent_text_version and source. ip_address stays unused (no IP recorded).
--  2. public.current_terms_version() = '2026-10-03' (must equal TERMS_VERSION in
--     app/src/lib/termsConsent.ts and the /legal "Effective" date).
--  3. Trigger on auth.users (AFTER INSERT, after on_auth_user_created so the athletes row exists):
--     when signUp metadata carries terms_accepted=true it inserts the consents row in the SAME
--     transaction. Bad or stale values raise, so the signup fails instead of completing without a
--     record. Signups that do not send terms_accepted (romrxbjj.com / romrxbodybuilding.com apps,
--     admin-created users) are untouched: those paths must be checked before they record anything.
--  4. public.record_terms_reaccept(...): SECURITY DEFINER RPC for the re-accept screen; records
--     for auth.uid() only, server timestamp, current version only.
--  5. handle_consent_signed: no longer moves athletes.onboarding_status backwards on a re-accept
--     (only pending_consent -> consent_signed). terms/waiver timestamps unchanged in behavior.
--  6. Age group fix (server side, works without any Netlify publish): copy age_bucket and gender
--     from signUp metadata into public.users at account creation.
--  NO backfill of consents or athletes.terms_accepted_at for past users (Stacy).
-- Cost: a DB migration uses no Netlify credits.
-- ============================================================================================

begin;

-- 1. columns --------------------------------------------------------------------------------
alter table public.consents
  add column if not exists consent_text_version text,
  add column if not exists source text;

comment on column public.consents.consent_text_version is 'Id of the exact checkbox wording shown, e.g. signup-checkbox-2026-10-05';
comment on column public.consents.source is 'Where acceptance happened: romrx.io/app/signup or romrx.io/app/reaccept';
comment on column public.consents.signed_at is 'Server timestamp of acceptance (accepted_at). Always now() for new rows.';

-- 2. version constants ----------------------------------------------------------------------
create or replace function public.current_terms_version()
returns text language sql immutable set search_path = pg_catalog, pg_temp as $$ select '2026-10-03'::text $$;

create or replace function public.allowed_consent_text_version(p text)
returns boolean language sql immutable set search_path = pg_catalog, pg_temp as $$
  select p in ('signup-checkbox-2026-10-05')
$$;

-- 3. signup trigger -------------------------------------------------------------------------
create or replace function public.record_signup_terms_consent()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_terms text := m->>'terms_version';
  v_text text := m->>'consent_text_version';
  v_source text := m->>'consent_source';
begin
  if coalesce(m->>'terms_accepted', '') <> 'true' then
    return new;  -- path did not show our checkbox: record nothing
  end if;
  if v_terms is distinct from public.current_terms_version() then
    raise exception 'terms record: version % is not current', coalesce(v_terms, 'null') using errcode = '22023';
  end if;
  if not public.allowed_consent_text_version(v_text) then
    raise exception 'terms record: unknown consent_text_version' using errcode = '22023';
  end if;
  if v_source is distinct from 'romrx.io/app/signup' then
    raise exception 'terms record: unknown source' using errcode = '22023';
  end if;

  insert into public.consents (
    user_id, terms_version, medical_waiver_version, signed_name,
    ip_address, user_agent, signed_at, consent_text_version, source
  ) values (
    new.id, v_terms, v_terms,
    coalesce(nullif(trim(m->>'full_name'), ''), split_part(new.email, '@', 1), 'unknown'),
    null, left(nullif(m->>'consent_user_agent', ''), 512), now(), v_text, v_source
  );
  return new;
end;
$$;

revoke all on function public.record_signup_terms_consent() from public, anon, authenticated;

drop trigger if exists zy_record_signup_terms_consent on auth.users;
-- Name sorts after on_auth_user_created (creates public.users + athletes) and before zz_pe_*.
create trigger zy_record_signup_terms_consent
  after insert on auth.users
  for each row execute function public.record_signup_terms_consent();

-- 4. re-accept RPC --------------------------------------------------------------------------
create or replace function public.record_terms_reaccept(
  p_terms_version text,
  p_consent_text_version text,
  p_source text,
  p_user_agent text
)
returns timestamptz
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_uid uuid := auth.uid();
  v_name text;
  v_at timestamptz := now();
begin
  if v_uid is null then
    raise exception 'not signed in' using errcode = '42501';
  end if;
  if p_terms_version is distinct from public.current_terms_version() then
    raise exception 'terms record: version is not current' using errcode = '22023';
  end if;
  if not public.allowed_consent_text_version(p_consent_text_version) then
    raise exception 'terms record: unknown consent_text_version' using errcode = '22023';
  end if;
  if p_source is distinct from 'romrx.io/app/reaccept' then
    raise exception 'terms record: unknown source' using errcode = '22023';
  end if;
  -- Idempotent: one current-version row is enough.
  if exists (select 1 from public.consents where user_id = v_uid and terms_version = p_terms_version) then
    select max(signed_at) into v_at from public.consents where user_id = v_uid and terms_version = p_terms_version;
    return v_at;
  end if;
  select coalesce(nullif(trim(u.full_name), ''), split_part(u.email, '@', 1), 'unknown')
    into v_name from public.users u where u.id = v_uid;
  insert into public.consents (
    user_id, terms_version, medical_waiver_version, signed_name,
    ip_address, user_agent, signed_at, consent_text_version, source
  ) values (
    v_uid, p_terms_version, p_terms_version, coalesce(v_name, 'unknown'),
    null, left(nullif(p_user_agent, ''), 512), v_at, p_consent_text_version, p_source
  );
  return v_at;
end;
$$;

revoke all on function public.record_terms_reaccept(text, text, text, text) from public, anon;
grant execute on function public.record_terms_reaccept(text, text, text, text) to authenticated;

-- 5. do not move onboarding_status backwards on a re-accept ----------------------------------
create or replace function public.handle_consent_signed()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  update public.athletes
  set
    terms_accepted_at          = new.signed_at,
    medical_waiver_accepted_at = case when new.medical_waiver_version is not null
                                      then new.signed_at else medical_waiver_accepted_at end,
    onboarding_status          = case when onboarding_status = 'pending_consent'
                                      then 'consent_signed' else onboarding_status end,
    updated_at                 = now()
  where user_id = new.user_id;
  return new;
end;
$$;

-- 6. age_bucket + gender from signUp metadata (the client update 403'd on signup_source) ------
create or replace function public.copy_signup_demographics()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  m jsonb := coalesce(new.raw_user_meta_data, '{}'::jsonb);
  v_age text := nullif(m->>'age_bucket', '');
  v_gender text := nullif(m->>'gender', '');
begin
  if v_age is not null and v_age not in ('18-29', '30-44', '45-59', '60+') then v_age := null; end if;
  if v_gender is not null and v_gender not in ('male', 'female', 'other', 'prefer_not_to_say') then v_gender := null; end if;
  if v_age is null and v_gender is null then return new; end if;
  update public.users
     set age_bucket = coalesce(age_bucket, v_age),
         gender     = coalesce(gender, v_gender)
   where id = new.id;
  return new;
end;
$$;

revoke all on function public.copy_signup_demographics() from public, anon, authenticated;

drop trigger if exists zx_copy_signup_demographics on auth.users;
create trigger zx_copy_signup_demographics
  after insert on auth.users
  for each row execute function public.copy_signup_demographics();

commit;

-- Rollback (if needed):
--   drop trigger if exists zy_record_signup_terms_consent on auth.users;
--   drop trigger if exists zx_copy_signup_demographics on auth.users;
--   drop function if exists public.record_signup_terms_consent(), public.copy_signup_demographics(),
--     public.record_terms_reaccept(text, text, text, text), public.allowed_consent_text_version(text),
--     public.current_terms_version();
--   (consent_text_version/source columns can stay; handle_consent_signed: restore prior body.)
