-- My Coach: explicitly consented, account-owned QA lifecycle metadata.
-- No transcript, audio, user words, medical information or client profile fields.
-- Do not apply before the protected source PR is reviewed/merged.
begin;
create table if not exists app_private.my_coach_qa_sessions (
  account_id uuid not null references app.accounts(id) on delete cascade,
  session_id uuid not null,
  persona_id text not null check (persona_id in ('mira','max','sofia','alex','merlin','harry','lea','noah','iris','ray')),
  method_id text not null check (method_id in ('grow','tgrow','woop','oskar','solution_focused','appreciative_inquiry')),
  locale text not null check (locale in ('en','ru','es')),
  algorithm_version text not null check (algorithm_version ~ '^[A-Za-z][A-Za-z0-9._-]{1,79}$'),
  consent_version text not null check (consent_version='hh-my-coach-qa-consent-v1'),
  consented_at timestamptz not null default now(),
  status text not null default 'in_progress'
    check (status in ('in_progress','summary_opened','client_stopped','technical_reported')),
  status_at timestamptz,
  evidence jsonb check (evidence is null or
    (jsonb_typeof(evidence)='array' and jsonb_array_length(evidence)=6)),
  evidence_observed_at timestamptz,
  verified_turn_observed boolean not null default false,
  updated_at timestamptz not null default now(),
  primary key(account_id,session_id),
  check ((status='in_progress' and status_at is null) or
    (status<>'in_progress' and status_at is not null))
);
create index if not exists my_coach_qa_sessions_cohort_idx on app_private.my_coach_qa_sessions
  (consented_at desc,persona_id,locale);
revoke all on app_private.my_coach_qa_sessions from public,anon,authenticated,hh_app_inbox,hh_crm_backend;
grant select,insert,update,delete on app_private.my_coach_qa_sessions to hh_app_backend;
alter table app_private.my_coach_qa_sessions enable row level security;
alter table app_private.my_coach_qa_sessions force row level security;
create policy my_coach_qa_owner_select on app_private.my_coach_qa_sessions
 for select to hh_app_backend using (
   (account_id=(select auth.uid()) and (select app_private.account_active()))
   or current_setting('hh.my_coach_qa_admin',true)='owner_verified'
 );
create policy my_coach_qa_owner_insert on app_private.my_coach_qa_sessions
 for insert to hh_app_backend with check (
   account_id=(select auth.uid()) and (select app_private.account_active())
 );
create policy my_coach_qa_owner_update on app_private.my_coach_qa_sessions
 for update to hh_app_backend using (
   account_id=(select auth.uid()) and (select app_private.account_active())
 ) with check (
   account_id=(select auth.uid()) and (select app_private.account_active())
 );
create policy my_coach_qa_owner_delete on app_private.my_coach_qa_sessions
 for delete to hh_app_backend using (
   account_id=(select auth.uid()) and (select app_private.account_active())
 );
comment on table app_private.my_coach_qa_sessions is
 'Explicit-consent metadata only. No automated outcome verification; in_progress is not abandonment; summary_opened is not proven coaching success. User erasure cascades with account.';
commit;
