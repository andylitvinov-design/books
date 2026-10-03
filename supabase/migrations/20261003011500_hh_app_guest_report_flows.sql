-- Holistic House R1 Revision 5: server-backed guest tests, report grants and explicit save intents.
-- Additive only. Existing Account and legacy Client/KV identities remain separate.
begin;

create table app_private.guest_sessions(
  id uuid primary key default gen_random_uuid(),
  secret_hash text not null unique check(secret_hash ~ '^[a-f0-9]{64}$'),
  policy_version text not null check(char_length(policy_version) between 1 and 100),
  adult boolean not null check(adult),
  necessary boolean not null check(necessary),
  ui_locale text not null check(ui_locale in('en','ru')),
  timezone text not null check(char_length(timezone) between 1 and 100),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check(expires_at > created_at)
);

create table app_private.guest_runs(
  id uuid primary key default gen_random_uuid(),
  guest_session_id uuid not null references app_private.guest_sessions(id) on delete cascade,
  assessment_version_id uuid not null references app.assessment_versions(id),
  status text not null default 'draft' check(status in('draft','in_progress','submitted','completed','failed','discarded')),
  revision integer not null default 0 check(revision>=0),
  submitted_revision integer,
  progress integer not null default 0 check(progress>=0),
  answers jsonb not null default '{}'::jsonb check(jsonb_typeof(answers)='object'),
  context_ciphertext text,
  operation_id uuid not null,
  last_operation_id uuid,
  last_operation_hash text,
  timezone text not null,
  started_at timestamptz not null default now(),
  measurement_at timestamptz,
  submitted_at timestamptz,
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  unique(id,guest_session_id),
  unique(id,assessment_version_id,guest_session_id),
  unique(guest_session_id,assessment_version_id,operation_id)
);
create unique index guest_runs_one_active_draft
  on app_private.guest_runs(guest_session_id,assessment_version_id)
  where status in('draft','in_progress');
create index guest_runs_session_time
  on app_private.guest_runs(guest_session_id,started_at desc);

create table app_private.guest_results(
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null unique,
  guest_session_id uuid not null references app_private.guest_sessions(id) on delete cascade,
  source_version_id uuid not null references app.assessment_versions(id),
  scoring_version text not null,
  result_version text not null,
  dimensions jsonb not null check(jsonb_typeof(dimensions)='array'),
  measurement_at timestamptz not null,
  provenance jsonb not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  unique(id,guest_session_id),
  foreign key(run_id,source_version_id,guest_session_id)
    references app_private.guest_runs(id,assessment_version_id,guest_session_id) on delete cascade
);
create index guest_results_session_time
  on app_private.guest_results(guest_session_id,measurement_at desc);

create table app_private.report_grants(
  id uuid primary key default gen_random_uuid(),
  selector text not null unique check(selector ~ '^[A-Za-z0-9_-]{22}$'),
  secret_hash text not null check(secret_hash ~ '^[a-f0-9]{64}$'),
  source_assessment_id uuid not null,
  source_client_id uuid not null,
  source_revision integer not null check(source_revision > 0),
  source_hash text not null check(source_hash ~ '^sha256:[a-f0-9]{64}$'),
  locale text not null check(locale in('en','ru')),
  save_allowed boolean not null default false,
  status text not null default 'active' check(status in('active','revoked','withdrawn')),
  access_version integer not null default 1 check(access_version > 0),
  expires_at timestamptz not null,
  bound_account_id uuid references app.accounts(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index report_grants_source on app_private.report_grants(source_assessment_id,source_revision);
create index report_grants_expiry on app_private.report_grants(expires_at) where status='active';

create table app_private.report_viewer_sessions(
  id uuid primary key default gen_random_uuid(),
  grant_id uuid not null references app_private.report_grants(id) on delete cascade,
  secret_hash text not null unique check(secret_hash ~ '^[a-f0-9]{64}$'),
  access_version integer not null check(access_version > 0),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  revoked_at timestamptz,
  check(expires_at > created_at)
);
create index report_viewer_grant on app_private.report_viewer_sessions(grant_id,expires_at);

create table app_private.save_intents(
  id uuid primary key default gen_random_uuid(),
  browser_secret_hash text not null check(browser_secret_hash ~ '^[a-f0-9]{64}$'),
  source_kind text not null check(source_kind in('guest_result','delivered_report')),
  source_id uuid not null,
  source_revision integer not null default 1 check(source_revision > 0),
  source_guest_session_id uuid references app_private.guest_sessions(id) on delete cascade,
  source_report_grant_id uuid references app_private.report_grants(id),
  status text not null default 'pending' check(status in('pending','committed','cancelled')),
  operation_id uuid not null,
  operation_hash text not null,
  target_account_id uuid references app.accounts(id),
  resource_id uuid,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  committed_at timestamptz,
  unique(operation_id),
  check(expires_at > created_at),
  check(
    (source_kind='guest_result' and source_guest_session_id is not null and source_report_grant_id is null)
    or
    (source_kind='delivered_report' and source_guest_session_id is null and source_report_grant_id is not null)
  )
);
create index save_intents_expiry on app_private.save_intents(expires_at) where status='pending';

create table app.saved_reports(
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  grant_id uuid not null unique references app_private.report_grants(id),
  source_assessment_id uuid not null,
  source_revision integer not null check(source_revision > 0),
  occurred_on date not null,
  saved_at timestamptz not null default now(),
  removed_at timestamptz,
  unique(account_id,source_assessment_id,source_revision)
);

alter table app.saved_reports enable row level security;
revoke all on app.saved_reports from public,anon,authenticated;
grant select on app.saved_reports to authenticated,hh_app_backend;
grant insert,update(removed_at) on app.saved_reports to hh_app_backend;
create policy own_saved_reports_read on app.saved_reports
  for select to authenticated,hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_saved_reports_insert on app.saved_reports
  for insert to hh_app_backend
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_saved_reports_update on app.saved_reports
  for update to hh_app_backend
  using(account_id=(select auth.uid()) and (select app_private.account_active()))
  with check(account_id=(select auth.uid()) and (select app_private.account_active()));

revoke all on app_private.guest_sessions,app_private.guest_runs,app_private.guest_results,
  app_private.report_grants,app_private.report_viewer_sessions,app_private.save_intents
  from public,anon,authenticated,hh_app_inbox;
grant select,insert,update,delete on app_private.guest_sessions,app_private.guest_runs,
  app_private.guest_results,app_private.report_grants,app_private.report_viewer_sessions,
  app_private.save_intents to hh_app_backend;

create function app_private.immutable_guest_result() returns trigger
language plpgsql set search_path='' as $$
begin raise exception 'IMMUTABLE_GUEST_RESULT'; end $$;
create trigger immutable_guest_result
  before update on app_private.guest_results
  for each row execute function app_private.immutable_guest_result();
revoke all on function app_private.immutable_guest_result() from public,anon,authenticated,hh_app_inbox;

-- Allow the narrow server guest-import finalizer to create a submitted canonical run
-- without colliding with an existing same-instrument draft. Ordinary inserts stay draft-only.
create or replace function app_private.validate_run() returns trigger language plpgsql set search_path='' as $$
declare def app.assessment_versions; pair record; question jsonb; v numeric; low numeric; high numeric;
begin
 select * into strict def from app.assessment_versions where id=new.assessment_version_id;
 if new.progress>jsonb_array_length(def.questions) then raise exception 'INVALID_PROGRESS'; end if;
 if new.timezone not in(select name from pg_timezone_names) then raise exception 'INVALID_TIMEZONE'; end if;
 for pair in select * from jsonb_each(new.answers) loop
  select q into question from jsonb_array_elements(def.questions) q where q->>'id'=pair.key;
  if question is null or jsonb_typeof(pair.value)<>'number' then raise exception 'INVALID_ANSWER'; end if;
  v:=pair.value::text::numeric;
  low:=coalesce((question->>'min')::numeric,(def.answer_schema->>'minimum')::numeric);
  high:=coalesce((question->>'max')::numeric,(def.answer_schema->>'maximum')::numeric);
  if v<>trunc(v) or v<low or v>high then raise exception 'INVALID_ANSWER'; end if;
 end loop;
 if new.status in('submitted','completed','failed')
   and (select count(*) from jsonb_object_keys(new.answers))<>jsonb_array_length(def.questions)
 then raise exception 'REQUIRED_ANSWER'; end if;
 if tg_op='UPDATE' then
  if row(new.id,new.account_id,new.assessment_version_id,new.started_at,new.timezone,new.operation_id)
     is distinct from row(old.id,old.account_id,old.assessment_version_id,old.started_at,old.timezone,old.operation_id)
  then raise exception 'IMMUTABLE_IDENTITY'; end if;
  if old.status in('completed','discarded') then raise exception 'IMMUTABLE_RUN'; end if;
  if new.revision<>old.revision+1 then raise exception 'STALE_REVISION'; end if;
  if old.status in('submitted','failed')
     and row(new.answers,new.context_ciphertext,new.submitted_revision,new.submitted_at,new.measurement_at)
         is distinct from row(old.answers,old.context_ciphertext,old.submitted_revision,old.submitted_at,old.measurement_at)
  then raise exception 'IMMUTABLE_ANSWERS'; end if;
  if not(
    (old.status in('draft','in_progress') and new.status in('in_progress','submitted','discarded'))
    or (old.status in('submitted','failed') and new.status in('completed','failed'))
  ) then raise exception 'INVALID_TRANSITION'; end if;
  if new.status='submitted'
     and (new.submitted_revision is distinct from old.revision or new.submitted_at is null or new.measurement_at is null)
  then raise exception 'INVALID_SUBMISSION'; end if;
 else
  if current_setting('hh.guest_import',true)='1' then
   if new.status<>'submitted' or new.revision<>1 or new.submitted_revision<>0
      or new.submitted_at is null or new.measurement_at is null
   then raise exception 'INVALID_GUEST_IMPORT_RUN'; end if;
  elsif new.status<>'draft' or new.revision<>0 then
   raise exception 'INVALID_NEW_RUN';
  end if;
 end if;
 return new;
end $$;
revoke all on function app_private.validate_run() from public,anon,authenticated,hh_app_inbox;
grant execute on function app_private.validate_run() to hh_app_backend;

commit;
