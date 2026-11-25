-- Reiki Practitioner: voluntary learner testimonials, 2026-10-18.
-- Personal course journals remain private. Only an explicit student-approved
-- excerpt can enter the owner moderation queue. Public delivery requires
-- a separate manual approval; student edits/withdrawal revoke it immediately.
begin;

create table if not exists app_private.reiki_course_public_reviews (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  slide_id text not null check (slide_id in ('flight-04','tan-04','kun-04','ygg-04')),
  locale text not null check (locale in ('en','ru')),
  body_ciphertext text not null,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  revision integer not null default 0 check (revision >= 0),
  consented_at timestamptz not null default now(),
  approved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(account_id,slide_id)
);
create index if not exists reiki_public_reviews_status_idx
  on app_private.reiki_course_public_reviews(status,approved_at desc,created_at desc);

alter table app_private.reiki_course_public_reviews enable row level security;
alter table app_private.reiki_course_public_reviews force row level security;
revoke all on app_private.reiki_course_public_reviews from public,anon,authenticated;
do $roles$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on app_private.reiki_course_public_reviews from service_role';
  end if;
end $roles$;

grant select,insert,delete on app_private.reiki_course_public_reviews to hh_app_backend;
create policy reiki_review_student_read on app_private.reiki_course_public_reviews
  for select to hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy reiki_review_student_insert on app_private.reiki_course_public_reviews
  for insert to hh_app_backend
  with check (account_id=(select auth.uid()) and (select app_private.account_active()));
create policy reiki_review_student_delete on app_private.reiki_course_public_reviews
  for delete to hh_app_backend
  using (account_id=(select auth.uid()) and (select app_private.account_active()));

-- Inbox role is ONLY activated inside requireAdminRequest() protected routes
-- or the reviewed public projection query which selects status='approved'.
grant select on app_private.reiki_course_public_reviews to hh_app_inbox;
grant update(status,revision,approved_at,updated_at)
  on app_private.reiki_course_public_reviews to hh_app_inbox;
create policy reiki_review_owner_read on app_private.reiki_course_public_reviews
  for select to hh_app_inbox
  using (current_setting('hh.practitioner_id',true) =
    '246aa1a3-a371-5a83-9f4b-cd23ff027a76');
create policy reiki_review_owner_update on app_private.reiki_course_public_reviews
  for update to hh_app_inbox
  using (current_setting('hh.practitioner_id',true) =
    '246aa1a3-a371-5a83-9f4b-cd23ff027a76')
  with check (current_setting('hh.practitioner_id',true) =
    '246aa1a3-a371-5a83-9f4b-cd23ff027a76');

commit;
