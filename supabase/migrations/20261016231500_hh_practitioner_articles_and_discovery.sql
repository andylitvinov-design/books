-- Additive publication metadata; master/customer privacy and billing unchanged.
alter table app.service_offerings
  add column if not exists discovery_metadata jsonb not null default '{}'::jsonb;
create index if not exists service_discovery_metadata_gin
  on app.service_offerings using gin(discovery_metadata jsonb_path_ops)
  where active and localized_copy<>'{}'::jsonb;

create table if not exists app.practitioner_articles (
  id uuid primary key default gen_random_uuid(),
  practitioner_id uuid not null references app.practitioners(id) on delete restrict,
  slug text not null unique,
  status text not null default 'draft' check(status in ('draft','submitted','changes_requested','published','suspended','archived')),
  draft jsonb not null default '{}'::jsonb,
  published jsonb not null default '{}'::jsonb,
  revision integer not null default 0 check(revision >= 0),
  review_note text,
  submitted_at timestamptz,
  reviewed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists practitioner_articles_owner_idx on app.practitioner_articles(practitioner_id,updated_at desc);
create index if not exists practitioner_articles_public_idx on app.practitioner_articles(status,published_at desc)
  where published <> '{}'::jsonb;

alter table app.practitioner_articles enable row level security;
revoke all on app.practitioner_articles from public,anon,authenticated;
grant select,insert,update on app.practitioner_articles to hh_app_backend;
drop policy if exists practitioner_articles_read on app.practitioner_articles;
create policy practitioner_articles_read on app.practitioner_articles for select to hh_app_backend
using (
  ((status in ('published','submitted','changes_requested') and published <> '{}'::jsonb)
    and exists(select 1 from app.practitioners p where p.id=practitioner_id and p.active
      and p.public_profile<>'{}'::jsonb and p.status in('approved','submitted','changes_requested')))
  or exists(select 1 from app.practitioners p where p.id=practitioner_id
    and p.trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active()))
  or (select current_setting('hh.moderator',true))='1'
);
drop policy if exists practitioner_articles_insert on app.practitioner_articles;
create policy practitioner_articles_insert on app.practitioner_articles for insert to hh_app_backend
with check(exists(select 1 from app.practitioners p where p.id=practitioner_id
  and p.trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active())));
drop policy if exists practitioner_articles_update on app.practitioner_articles;
create policy practitioner_articles_update on app.practitioner_articles for update to hh_app_backend
using (
  exists(select 1 from app.practitioners p where p.id=practitioner_id
    and p.trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active()))
  or (select current_setting('hh.moderator',true))='1'
)
with check (
  exists(select 1 from app.practitioners p where p.id=practitioner_id
    and p.trusted_auth_user_id=(select auth.uid()) and (select app_private.account_active()))
  or (select current_setting('hh.moderator',true))='1'
);
