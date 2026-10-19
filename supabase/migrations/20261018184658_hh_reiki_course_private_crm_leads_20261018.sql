-- Holistic House · Reiki Practitioner opt-in CRM funnel, 18 Oct 2026
-- Private, AES-GCM encrypted content. Two independent leads per learner:
-- start (lead 1) and explicit personal-initiation application (lead 2).
-- No marketing consent, external mail, or access to unrelated client records.
begin;

create table if not exists app_private.reiki_course_leads (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  stage text not null check (stage in ('start','application')),
  status text not null default 'new' check (status in ('new','contacted','closed')),
  course_status text not null default 'active' check (course_status in ('active','completed')),
  slide_id text not null default 'welcome-01'
    check (slide_id ~ '^[a-z][a-z0-9-]{1,48}$'),
  payload_ciphertext text not null,
  revision integer not null default 0 check (revision >= 0),
  consented_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id,stage)
);
create index if not exists reiki_course_leads_stage_time_idx
  on app_private.reiki_course_leads(stage,created_at desc);
create index if not exists reiki_course_leads_account_time_idx
  on app_private.reiki_course_leads(account_id,updated_at desc);

alter table app_private.reiki_course_leads enable row level security;
alter table app_private.reiki_course_leads force row level security;
revoke all on app_private.reiki_course_leads from public,anon,authenticated;
do $revoke_service$ begin
  if exists(select 1 from pg_roles where rolname='service_role') then
    execute 'revoke all on app_private.reiki_course_leads from service_role';
  end if;
end $revoke_service$;

-- Student backend: own opted-in leads only, with a live authenticated account.
grant select,insert,delete on app_private.reiki_course_leads to hh_app_backend;
grant update(payload_ciphertext,course_status,slide_id,revision,updated_at)
  on app_private.reiki_course_leads to hh_app_backend;
create policy reiki_course_student_read on app_private.reiki_course_leads
  for select to hh_app_backend
  using (account_id = (select auth.uid()) and (select app_private.account_active()));
create policy reiki_course_student_insert on app_private.reiki_course_leads
  for insert to hh_app_backend
  with check (account_id = (select auth.uid()) and (select app_private.account_active()));
create policy reiki_course_student_update on app_private.reiki_course_leads
  for update to hh_app_backend
  using (account_id = (select auth.uid()) and (select app_private.account_active()))
  with check (account_id = (select auth.uid()) and (select app_private.account_active()));
create policy reiki_course_student_delete on app_private.reiki_course_leads
  for delete to hh_app_backend
  using (account_id = (select auth.uid()) and (select app_private.account_active()));

-- Admin PIN proof is checked by the private /admin route before creating an
-- inbox transaction with this exact practitioner_id. No anon or CRM marketing role.
grant select on app_private.reiki_course_leads to hh_app_inbox;
grant update(status,revision,updated_at) on app_private.reiki_course_leads to hh_app_inbox;
create policy reiki_course_owner_read on app_private.reiki_course_leads
  for select to hh_app_inbox
  using (current_setting('hh.practitioner_id',true) =
    '246aa1a3-a371-5a83-9f4b-cd23ff027a76');
create policy reiki_course_owner_update on app_private.reiki_course_leads
  for update to hh_app_inbox
  using (current_setting('hh.practitioner_id',true) =
    '246aa1a3-a371-5a83-9f4b-cd23ff027a76')
  with check (current_setting('hh.practitioner_id',true) =
    '246aa1a3-a371-5a83-9f4b-cd23ff027a76');

commit;
