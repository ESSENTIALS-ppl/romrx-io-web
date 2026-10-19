-- DRAFT (not applied). Terms bump for Stacy's final Beta/Billing text (sections 2 and 6), Oct 19 2026.
-- Everyone without a consents row for 2026-10-19 hits the re-accept gate on next sign-in.
create or replace function public.current_terms_version()
returns text language sql immutable set search_path = pg_catalog, pg_temp as $$ select '2026-10-19'::text $$;
