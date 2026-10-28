-- One member, one 1–5 star vote per public video, talisman or service.
-- The existing service_reviews remains the narrative review ledger; its stars
-- are mirrored to this canonical aggregate by the application.
create table if not exists app.catalog_star_ratings (
  kind text not null check (kind in ('video','talisman','service')),
  item_key text not null check (char_length(item_key) between 1 and 120 and item_key ~ '^[A-Za-z0-9:_-]+$'),
  account_id uuid not null references app.accounts(id) on delete cascade,
  stars smallint not null check (stars between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key(kind,item_key,account_id)
);
create index if not exists catalog_star_ratings_aggregate_idx on app.catalog_star_ratings(kind,item_key);
alter table app.catalog_star_ratings enable row level security;
alter table app.catalog_star_ratings force row level security;
revoke all on app.catalog_star_ratings from public, anon, authenticated, hh_app_inbox;
do $roles$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on app.catalog_star_ratings from service_role';
  end if;
end $roles$;
grant select,insert,delete on app.catalog_star_ratings to hh_app_backend;
grant update(stars,updated_at) on app.catalog_star_ratings to hh_app_backend;
create policy catalog_stars_read on app.catalog_star_ratings for select to hh_app_backend using (true);
create policy catalog_stars_insert on app.catalog_star_ratings for insert to hh_app_backend
  with check (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy catalog_stars_update on app.catalog_star_ratings for update to hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.account_active()))
  with check (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy catalog_stars_delete on app.catalog_star_ratings for delete to hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.account_active()));
-- Preserve historical ratings with no fabricated votes.
insert into app.catalog_star_ratings(kind,item_key,account_id,stars)
  select 'service',service_id::text,reviewer_account_id,rating
  from app.service_reviews where status='published'
  on conflict (kind,item_key,account_id) do nothing;
