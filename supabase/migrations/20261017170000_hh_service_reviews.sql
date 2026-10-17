-- Holistic House: one member review per marketplace service.
-- Reviews are public only when published; accounts and moderation history are private.
create table if not exists app.service_reviews (
  id uuid primary key default gen_random_uuid(),
  service_id uuid not null references app.service_offerings(id) on delete cascade,
  reviewer_account_id uuid not null references app.accounts(id) on delete cascade,
  display_name text not null check (char_length(display_name) between 2 and 60),
  rating smallint not null check (rating between 1 and 5),
  body text not null check (char_length(body) between 20 and 1200),
  status text not null default 'published' check (status in ('published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(service_id,reviewer_account_id)
);
create index if not exists service_reviews_public_idx
  on app.service_reviews(service_id,created_at desc,id desc) where status='published';
alter table app.service_reviews enable row level security;
alter table app.service_reviews force row level security;
revoke all on app.service_reviews from public,anon,authenticated,hh_app_inbox;
do $reviews_roles$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on app.service_reviews from service_role';
  end if;
end $reviews_roles$;
grant select,insert,delete on app.service_reviews to hh_app_backend;
grant update(display_name,rating,body,updated_at) on app.service_reviews to hh_app_backend;

create policy service_reviews_read on app.service_reviews for select to hh_app_backend
  using (status='published' or
    (reviewer_account_id=(select auth.uid()) and (select app_private.account_active())));
create policy service_reviews_create on app.service_reviews for insert to hh_app_backend
  with check (
    reviewer_account_id=(select auth.uid()) and (select app_private.account_active())
    and exists (
      select 1 from app.service_offerings s
        join app.practitioners p on p.id=s.practitioner_id
      where s.id=service_id and s.active
        and s.status in ('published','submitted','changes_requested')
        and s.localized_copy<>'{}'::jsonb
        and p.active and p.status in ('approved','submitted','changes_requested')
        and p.public_profile<>'{}'::jsonb
        and p.trusted_auth_user_id is distinct from (select auth.uid())
    )
  );
create policy service_reviews_edit on app.service_reviews for update to hh_app_backend
  using (status='published' and reviewer_account_id=(select auth.uid())
    and (select app_private.account_active()))
  with check (status='published' and reviewer_account_id=(select auth.uid())
    and (select app_private.account_active()));
create policy service_reviews_remove on app.service_reviews for delete to hh_app_backend
  using (status='published' and reviewer_account_id=(select auth.uid())
    and (select app_private.account_active()));
-- Moderators can change status to hidden only through privileged SQL.
-- The runtime role has no UPDATE(status) privilege and cannot unhide a moderated review.
