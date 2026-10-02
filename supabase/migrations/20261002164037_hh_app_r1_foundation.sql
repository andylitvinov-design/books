-- Holistic House R1: additive, unapplied foundation hardened before first use.
-- Never apply during Next build; existing encrypted Client/KV is untouched.
begin;
create schema if not exists app;
create schema if not exists app_private;
revoke all on schema app,app_private from public,anon,authenticated;
do $$ begin
 if not exists(select 1 from pg_roles where rolname='hh_app_backend') then create role hh_app_backend nologin nobypassrls; end if;
 if not exists(select 1 from pg_roles where rolname='hh_app_inbox') then create role hh_app_inbox nologin nobypassrls; end if;
end $$;
-- Provision the dedicated LOGIN separately. No production password is guessed.
grant usage on schema app,app_private to authenticated,hh_app_backend,hh_app_inbox;
grant usage on schema auth to hh_app_backend;
grant execute on function auth.uid(),auth.jwt() to hh_app_backend;
alter default privileges in schema app revoke all on tables from public,anon,authenticated;
alter default privileges in schema app_private revoke all on functions from public;
create table app.accounts(
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null default '' check(char_length(display_name)<=120),
 ui_locale text not null default 'en' check(ui_locale in('en','ru')),
 timezone text not null default 'UTC' check(char_length(timezone) between 1 and 100),
 goal text check(goal in('explore','body','relationships','resource','business')),
 onboarding_state text not null default 'new' check(onboarding_state in('new','active','deletion_requested')),
 status text not null default 'active' check(status in('active','blocked','deleting')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table app.consent_events(
 id uuid primary key default gen_random_uuid(),account_id uuid not null references app.accounts(id) on delete cascade,
 purpose text not null check(purpose in('necessary_app_processing','adult_attestation','marketing','practitioner_sharing')),
 policy_version text not null check(char_length(policy_version) between 1 and 100),resource_id uuid,
 accepted boolean not null,created_at timestamptz not null default now()
);
create table app.assessment_versions(
 id uuid primary key,definition_key text not null,definition_version text not null,
 instrument_locale text not null check(instrument_locale in('en','ru')),translation_version text not null,
 definition jsonb not null,questions jsonb not null check(jsonb_typeof(questions)='array'),answer_schema jsonb not null,
 scoring_key text not null,scoring_version text not null,result_schema jsonb not null,timeframe text not null,source_metadata jsonb not null,
 content_hash text not null check(content_hash ~ '^sha256:[a-f0-9]{64}$'),status text not null default 'published' check(status in('published','retired')),
 published_at timestamptz not null default now(),unique(definition_key,definition_version,instrument_locale,translation_version),unique(content_hash)
);
create table app.assessment_runs(
 id uuid primary key default gen_random_uuid(),account_id uuid not null references app.accounts(id) on delete cascade,
 assessment_version_id uuid not null references app.assessment_versions(id),
 status text not null default 'draft' check(status in('draft','in_progress','submitted','completed','failed','discarded')),
 revision integer not null default 0 check(revision>=0),submitted_revision integer,progress integer not null default 0 check(progress>=0),
 answers jsonb not null default '{}'::jsonb check(jsonb_typeof(answers)='object'),context_ciphertext text,
 operation_id uuid not null,last_operation_id uuid,last_operation_hash text,timezone text not null,
 started_at timestamptz not null default now(),measurement_at timestamptz,submitted_at timestamptz,completed_at timestamptz,updated_at timestamptz not null default now(),
 unique(id,account_id),unique(id,assessment_version_id,account_id),unique(account_id,assessment_version_id,operation_id)
);
create unique index assessment_runs_one_active_draft on app.assessment_runs(account_id,assessment_version_id) where status in('draft','in_progress');
create index assessment_runs_account_time on app.assessment_runs(account_id,started_at desc);
create table app.assessment_results(
 id uuid primary key default gen_random_uuid(),run_id uuid not null unique,account_id uuid not null references app.accounts(id) on delete cascade,
 source_version_id uuid not null references app.assessment_versions(id),scoring_version text not null,result_version text not null,
 dimensions jsonb not null check(jsonb_typeof(dimensions)='array'),measurement_at timestamptz not null,provenance jsonb not null,created_at timestamptz not null default now(),
 unique(id,account_id),foreign key(run_id,source_version_id,account_id) references app.assessment_runs(id,assessment_version_id,account_id) on delete cascade
);
create index assessment_results_account_time on app.assessment_results(account_id,measurement_at desc);
create table app.profile_snapshots(
 id uuid primary key default gen_random_uuid(),account_id uuid not null references app.accounts(id) on delete cascade,
 generating_result_id uuid not null unique,dimensions jsonb not null check(jsonb_typeof(dimensions)='array'),created_at timestamptz not null default now(),
 foreign key(generating_result_id,account_id) references app.assessment_results(id,account_id) on delete cascade
);
create table app.context_events(
 id uuid primary key default gen_random_uuid(),account_id uuid not null references app.accounts(id) on delete cascade,
 occurred_at timestamptz not null,timezone text not null,label_ciphertext text not null,note_ciphertext text,
 revision integer not null default 0 check(revision>=0),created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
create table app.practitioners(id uuid primary key,trusted_auth_user_id uuid unique references auth.users(id),public_profile jsonb not null,active boolean not null default true,created_at timestamptz not null default now());
create table app.service_offerings(
 id uuid primary key,practitioner_id uuid not null references app.practitioners(id),
 category text not null check(category in('psychosomatic_constellation_exploration','homeopathy_consultation','business_situation_constellation')),
 localized_copy jsonb not null,active boolean not null default true,confirmed_price numeric(10,2) check(confirmed_price>=0),currency text,duration_minutes integer check(duration_minutes>0),
 created_at timestamptz not null default now(),unique(id,practitioner_id),check((confirmed_price is null and currency is null) or (confirmed_price is not null and currency ~ '^[A-Z]{3}$'))
);
create table app.consultation_requests(
 id uuid primary key default gen_random_uuid(),account_id uuid not null references app.accounts(id) on delete cascade,
 service_offering_id uuid not null,recipient_practitioner_id uuid not null,status text not null default 'requested' check(status in('requested','contacted','closed','cancelled')),
 message_ciphertext text,contact_ciphertext text not null,shared_excerpt_ciphertext text,revision integer not null default 0 check(revision>=0),operation_id uuid not null,operation_hash text not null,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),unique(account_id,operation_id),
 foreign key(service_offering_id,recipient_practitioner_id) references app.service_offerings(id,practitioner_id)
);
create index consultation_requests_inbox on app.consultation_requests(recipient_practitioner_id,created_at desc);
create table app_private.rate_limits(bucket text primary key,attempts integer not null,expires_at timestamptz not null);
create table app_private.deletion_jobs(id uuid primary key default gen_random_uuid(),account_id uuid not null unique,status text not null default 'requested' check(status in('requested','failed','done')),created_at timestamptz not null default now(),updated_at timestamptz not null default now());
-- Narrow boolean helpers avoid recursive RLS. No arbitrary data/SQL definer API.
create function app_private.session_active() returns boolean language sql stable security definer set search_path='' as $$
 select case when coalesce(auth.jwt()->>'session_id','') ~ '^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$' and coalesce(auth.jwt()->>'exp','') ~ '^[0-9]{1,12}$'
 then auth.uid() is not null and (auth.jwt()->>'exp')::bigint>extract(epoch from now()) and exists(select 1 from auth.sessions s where s.id=(auth.jwt()->>'session_id')::uuid and s.user_id=auth.uid()) else false end
$$;
create function app_private.account_active() returns boolean language sql stable security definer set search_path='' as $$ select app_private.session_active() and exists(select 1 from app.accounts a where a.id=auth.uid() and a.status='active') $$;
revoke all on function app_private.session_active(),app_private.account_active() from public,anon;
grant execute on function app_private.session_active(),app_private.account_active() to authenticated,hh_app_backend;
create function app_private.consume_rate(p_bucket text,p_limit integer,p_seconds integer) returns boolean language plpgsql security definer set search_path='' as $$
declare n integer;
begin
 if p_bucket !~ '^[a-f0-9]{64}$' or p_limit not between 1 and 1000 or p_seconds not between 1 and 86400 then raise exception 'INVALID_RATE_INPUT'; end if;
 insert into app_private.rate_limits(bucket,attempts,expires_at) values(p_bucket,1,now()+make_interval(secs=>p_seconds))
 on conflict(bucket) do update set attempts=case when app_private.rate_limits.expires_at<=now() then 1 else app_private.rate_limits.attempts+1 end,expires_at=case when app_private.rate_limits.expires_at<=now() then now()+make_interval(secs=>p_seconds) else app_private.rate_limits.expires_at end returning attempts into n;
 delete from app_private.rate_limits where bucket in(select bucket from app_private.rate_limits where expires_at<now() limit 100);
 return n<=p_limit;
end $$;
revoke all on function app_private.consume_rate(text,integer,integer) from public,anon,authenticated;
grant execute on function app_private.consume_rate(text,integer,integer) to hh_app_backend,hh_app_inbox;
alter table app.accounts enable row level security;
alter table app.consent_events enable row level security;
alter table app.assessment_versions enable row level security;
alter table app.assessment_runs enable row level security;
alter table app.assessment_results enable row level security;
alter table app.profile_snapshots enable row level security;
alter table app.context_events enable row level security;
alter table app.practitioners enable row level security;
alter table app.service_offerings enable row level security;
alter table app.consultation_requests enable row level security;
alter table app_private.rate_limits enable row level security;
alter table app_private.deletion_jobs enable row level security;
revoke all on app.accounts,app.consent_events,app.assessment_versions,app.assessment_runs,app.assessment_results,app.profile_snapshots,app.context_events,app.practitioners,app.service_offerings,app.consultation_requests from public,anon,authenticated;
revoke all on app_private.rate_limits,app_private.deletion_jobs from public,anon,authenticated,hh_app_backend,hh_app_inbox;
grant select on app.accounts to authenticated,hh_app_backend;
grant update(display_name,ui_locale,timezone,goal) on app.accounts to authenticated;
grant insert,update,delete on app.accounts to hh_app_backend;
create policy account_read on app.accounts for select to authenticated,hh_app_backend using(id=(select auth.uid()) and (select app_private.session_active()));
create policy account_safe_edit on app.accounts for update to authenticated using(id=(select auth.uid()) and status='active' and (select app_private.session_active())) with check(id=(select auth.uid()) and status='active');
create policy account_create_server on app.accounts for insert to hh_app_backend with check(id=(select auth.uid()) and status='active' and (select app_private.session_active()));
create policy account_lifecycle_server on app.accounts for update to hh_app_backend using(id=(select auth.uid()) and (select app_private.session_active())) with check(id=(select auth.uid()));
create policy account_delete_server on app.accounts for delete to hh_app_backend using(id=(select auth.uid()) and status='deleting' and (select app_private.session_active()));
grant select on app.consent_events,app.assessment_runs,app.assessment_results,app.profile_snapshots,app.context_events,app.consultation_requests to authenticated,hh_app_backend;
grant insert on app.consent_events,app.assessment_results,app.profile_snapshots to hh_app_backend;
grant insert,update on app.assessment_runs,app.consultation_requests to hh_app_backend;
grant insert,update,delete on app.context_events to hh_app_backend;
revoke insert,update,delete on app.assessment_results,app.profile_snapshots from anon,authenticated;
create policy own_consent_events_read on app.consent_events for select to authenticated,hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_consent_events_create on app.consent_events for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_assessment_runs_read on app.assessment_runs for select to authenticated,hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_assessment_runs_create on app.assessment_runs for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_assessment_results_read on app.assessment_results for select to authenticated,hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_assessment_results_create on app.assessment_results for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_profile_snapshots_read on app.profile_snapshots for select to authenticated,hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_profile_snapshots_create on app.profile_snapshots for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_context_events_read on app.context_events for select to authenticated,hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_context_events_create on app.context_events for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_consultation_requests_read on app.consultation_requests for select to authenticated,hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_consultation_requests_create on app.consultation_requests for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_assessment_runs_edit on app.assessment_runs for update to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active())) with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_context_events_edit on app.context_events for update to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active())) with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_consultation_requests_edit on app.consultation_requests for update to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active())) with check(account_id=(select auth.uid()) and (select app_private.account_active()));
create policy own_context_delete on app.context_events for delete to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.account_active()));
grant select on app.assessment_versions,app.practitioners,app.service_offerings to authenticated,hh_app_backend;
create policy definitions_read on app.assessment_versions for select to authenticated,hh_app_backend using(status='published' or exists(select 1 from app.assessment_runs r where r.assessment_version_id=app.assessment_versions.id and r.account_id=(select auth.uid())));
create policy practitioners_read on app.practitioners for select to authenticated,hh_app_backend using(active);
create policy services_read on app.service_offerings for select to authenticated,hh_app_backend using(active);
grant select on app.consultation_requests,app.practitioners,app.service_offerings to hh_app_inbox;
grant update(status,revision,updated_at) on app.consultation_requests to hh_app_inbox;
create policy inbox_requests_read on app.consultation_requests for select to hh_app_inbox using(recipient_practitioner_id::text=current_setting('hh.practitioner_id',true));
create policy inbox_requests_update on app.consultation_requests for update to hh_app_inbox using(recipient_practitioner_id::text=current_setting('hh.practitioner_id',true) and status in('requested','contacted')) with check(recipient_practitioner_id::text=current_setting('hh.practitioner_id',true) and status in('contacted','closed'));
create policy inbox_practitioner_read on app.practitioners for select to hh_app_inbox using(id::text=current_setting('hh.practitioner_id',true) and active);
create policy inbox_services_read on app.service_offerings for select to hh_app_inbox using(practitioner_id::text=current_setting('hh.practitioner_id',true));
-- Inbox has no grants on user accounts, raw answers, results or snapshots.
grant select,insert on app_private.deletion_jobs to hh_app_backend;
create policy own_deletion_job_read on app_private.deletion_jobs for select to hh_app_backend using(account_id=(select auth.uid()) and (select app_private.session_active()));
create policy own_deletion_job_create on app_private.deletion_jobs for insert to hh_app_backend with check(account_id=(select auth.uid()) and (select app_private.session_active()));
create function app_private.immutable_version() returns trigger language plpgsql set search_path='' as $$ begin if(to_jsonb(new)-'status') is distinct from(to_jsonb(old)-'status') then raise exception 'IMMUTABLE_VERSION'; end if; return new; end $$;
create trigger immutable_version before update on app.assessment_versions for each row execute function app_private.immutable_version();
create function app_private.immutable_result() returns trigger language plpgsql set search_path='' as $$ begin raise exception 'IMMUTABLE_RESULT'; end $$;
create trigger immutable_result before update on app.assessment_results for each row execute function app_private.immutable_result();
create trigger immutable_snapshot before update on app.profile_snapshots for each row execute function app_private.immutable_result();
create function app_private.validate_run() returns trigger language plpgsql set search_path='' as $$
declare def app.assessment_versions; pair record; question jsonb; v numeric; low numeric; high numeric;
begin
 select * into strict def from app.assessment_versions where id=new.assessment_version_id;
 if new.progress>jsonb_array_length(def.questions) then raise exception 'INVALID_PROGRESS'; end if;
 if new.timezone not in(select name from pg_timezone_names) then raise exception 'INVALID_TIMEZONE'; end if;
 for pair in select * from jsonb_each(new.answers) loop
  select q into question from jsonb_array_elements(def.questions) q where q->>'id'=pair.key;
  if question is null or jsonb_typeof(pair.value)<>'number' then raise exception 'INVALID_ANSWER'; end if;
  v:=pair.value::text::numeric;low:=coalesce((question->>'min')::numeric,(def.answer_schema->>'minimum')::numeric);high:=coalesce((question->>'max')::numeric,(def.answer_schema->>'maximum')::numeric);
  if v<>trunc(v) or v<low or v>high then raise exception 'INVALID_ANSWER'; end if;
 end loop;
 if new.status in('submitted','completed','failed') and (select count(*) from jsonb_object_keys(new.answers))<>jsonb_array_length(def.questions) then raise exception 'REQUIRED_ANSWER'; end if;
 if tg_op='UPDATE' then
  if row(new.id,new.account_id,new.assessment_version_id,new.started_at,new.timezone,new.operation_id) is distinct from row(old.id,old.account_id,old.assessment_version_id,old.started_at,old.timezone,old.operation_id) then raise exception 'IMMUTABLE_IDENTITY'; end if;
  if old.status in('completed','discarded') then raise exception 'IMMUTABLE_RUN'; end if;
  if new.revision<>old.revision+1 then raise exception 'STALE_REVISION'; end if;
  if old.status in('submitted','failed') and row(new.answers,new.context_ciphertext,new.submitted_revision,new.submitted_at,new.measurement_at) is distinct from row(old.answers,old.context_ciphertext,old.submitted_revision,old.submitted_at,old.measurement_at) then raise exception 'IMMUTABLE_ANSWERS'; end if;
  if not((old.status in('draft','in_progress') and new.status in('in_progress','submitted','discarded')) or (old.status in('submitted','failed') and new.status in('completed','failed'))) then raise exception 'INVALID_TRANSITION'; end if;
  if new.status='submitted' and (new.submitted_revision is distinct from old.revision or new.submitted_at is null or new.measurement_at is null) then raise exception 'INVALID_SUBMISSION'; end if;
 elsif new.status<>'draft' or new.revision<>0 then raise exception 'INVALID_NEW_RUN'; end if;
 return new;
end $$;
create trigger validate_run before insert or update on app.assessment_runs for each row execute function app_private.validate_run();
create function app_private.validate_result_source() returns trigger language plpgsql set search_path='' as $$
declare def app.assessment_versions; run app.assessment_runs;
begin
 select * into strict def from app.assessment_versions where id=new.source_version_id;
 select * into strict run from app.assessment_runs where id=new.run_id and account_id=new.account_id;
 if run.status not in('submitted','failed') or run.assessment_version_id<>def.id or new.measurement_at<>run.measurement_at then raise exception 'INVALID_RESULT_SOURCE'; end if;
 if new.provenance->>'definitionId' is distinct from def.id::text or new.provenance->>'contentHash' is distinct from def.content_hash
 or new.provenance->>'definitionKey' is distinct from def.definition_key or new.provenance->>'definitionVersion' is distinct from def.definition_version
 or new.provenance->>'instrumentLocale' is distinct from def.instrument_locale or new.provenance->>'translationVersion' is distinct from def.translation_version
 or new.provenance->>'scoringKey' is distinct from def.scoring_key or new.provenance->>'scoringVersion' is distinct from def.scoring_version
 or new.provenance->>'timeframe' is distinct from def.timeframe or new.provenance->>'resultVersion' is distinct from def.result_schema->>'version'
 or new.scoring_version is distinct from def.scoring_version or new.result_version is distinct from def.result_schema->>'version' then raise exception 'INVALID_PROVENANCE'; end if;
 return new;
end $$;
create trigger validate_result_source before insert on app.assessment_results for each row execute function app_private.validate_result_source();
create function app_private.validate_snapshot() returns trigger language plpgsql set search_path='' as $$
declare d jsonb; r app.assessment_results; keys text[]:='{}'; source_dimension jsonb;
begin
 for d in select * from jsonb_array_elements(new.dimensions) loop
  if d->>'key' is null or d->>'key'=any(keys) then raise exception 'DUPLICATE_DIMENSION'; end if;
  keys:=array_append(keys,d->>'key');
  select * into strict r from app.assessment_results where id=(d->>'sourceResultId')::uuid and account_id=new.account_id;
  select x into strict source_dimension from jsonb_array_elements(r.dimensions) x where x->>'key'=d->>'key';
  if(d-array['sourceResultId','sourceDefinitionId','measurementAt','instrumentLocale','remeasured'])<>source_dimension
   or(d->>'sourceDefinitionId')::uuid is distinct from r.source_version_id or(d->>'measurementAt')::timestamptz is distinct from r.measurement_at
   or(d->>'instrumentLocale') is distinct from(r.provenance->>'instrumentLocale') or(d->>'remeasured')::boolean is distinct from(r.id=new.generating_result_id) then raise exception 'INVALID_SNAPSHOT_SOURCE'; end if;
 end loop;return new;
end $$;
create trigger validate_snapshot before insert on app.profile_snapshots for each row execute function app_private.validate_snapshot();
create function app_private.validate_request_change() returns trigger language plpgsql set search_path='' as $$
begin
 if row(new.id,new.account_id,new.service_offering_id,new.recipient_practitioner_id,new.operation_id,new.operation_hash,new.created_at,new.message_ciphertext,new.contact_ciphertext) is distinct from row(old.id,old.account_id,old.service_offering_id,old.recipient_practitioner_id,old.operation_id,old.operation_hash,old.created_at,old.message_ciphertext,old.contact_ciphertext) then raise exception 'IMMUTABLE_REQUEST'; end if;
 if new.revision<>old.revision+1 then raise exception 'STALE_REVISION'; end if;
 if current_user='hh_app_inbox' then
  if old.status not in('requested','contacted') or new.status not in('contacted','closed') or new.shared_excerpt_ciphertext is distinct from old.shared_excerpt_ciphertext then raise exception 'INVALID_TRANSITION'; end if;
 else
  if new.status<>old.status and not(old.status in('requested','contacted') and new.status='cancelled') then raise exception 'INVALID_TRANSITION'; end if;
  if new.shared_excerpt_ciphertext is distinct from old.shared_excerpt_ciphertext and new.shared_excerpt_ciphertext is not null then raise exception 'IMMUTABLE_SHARED_CONTENT'; end if;
 end if;return new;
end $$;
create trigger validate_request_change before update on app.consultation_requests for each row execute function app_private.validate_request_change();
revoke all on function app_private.immutable_version(),app_private.immutable_result(),app_private.validate_run(),app_private.validate_result_source(),app_private.validate_snapshot(),app_private.validate_request_change() from public,anon,authenticated;
-- Seed using scripts/app-seed.mjs after migration, never during site build.
commit;
