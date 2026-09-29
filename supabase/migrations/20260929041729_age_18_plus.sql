-- Jim 2026-09-29: app minimum age is 18+.
-- Enforce for NEW writes only. Existing rows are not touched or revalidated
-- (at apply time: 0 real users and 1 test fixture held '13-17').
-- The existing users_age_bucket_check still lists '13-17' so that fixture row
-- stays valid; tighten it after fixture cleanup (see follow-up in PR).

-- 1) public.users: reject setting age_bucket to an under-18 bucket (insert, or
--    update that changes the value). Updates to other columns are unaffected.
create or replace function public.reject_under_18_age_bucket()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.age_bucket = any (array['13-17'])
     and (tg_op = 'INSERT' or new.age_bucket is distinct from old.age_bucket) then
    raise exception 'ROMRx is for adults 18 and older (age_bucket %)', new.age_bucket
      using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists aab_users_age_18_plus on public.users;
create trigger aab_users_age_18_plus
  before insert or update of age_bucket on public.users
  for each row execute function public.reject_under_18_age_bucket();

-- 2) auth.users: refuse a signup whose metadata carries an under-18 bucket
--    (Signup sends age_bucket in signUp options.data).
create or replace function public.reject_under_18_signup()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if coalesce(new.raw_user_meta_data->>'age_bucket', '') = any (array['13-17']) then
    raise exception 'ROMRx is for adults 18 and older' using errcode = '23514';
  end if;
  return new;
end;
$$;

drop trigger if exists aaa_auth_users_age_18_plus on auth.users;
create trigger aaa_auth_users_age_18_plus
  before insert on auth.users
  for each row execute function public.reject_under_18_signup();

-- Trigger-returning functions are not callable via PostgREST RPC; no grants changed.
