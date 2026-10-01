-- Which notice the visitor actually saw (Legal 2026-09-24): the client's banner
-- region decision ('us' opt-out notice or 'eu_uk' opt-in notice). Nullable for
-- rows written before this column. region_country / region_state stay server geo.
alter table public.consent_events
  add column if not exists banner_region text null
    check (banner_region is null or banner_region in ('us', 'eu_uk'));
comment on column public.consent_events.banner_region is
  'Client banner/notice region the visitor saw (us | eu_uk). Settings and GPC rows carry the region the UI used. Null for rows before 2026-09-24 follow-up.';
