
-- Coaching durable session/report/Life Plan model.
-- Existing coaching catalog and active-session payload remain authoritative;
-- this migration adds normalized history and continuity without rewriting legacy rows.

create table if not exists app_private.coaching_session_records (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  scheme_key text not null references app_private.coaching_schemes(scheme_key) on update cascade on delete restrict,
  model_key text not null references app_private.coaching_models(model_key) on update cascade on delete restrict,
  status text not null default 'created'
    check (status in ('created','in_progress','paused','completed','abandoned','safety_handoff','deleted')),
  input_mode text not null default 'text'
    check (input_mode in ('text','voice','hybrid')),
  locale text not null default 'en' check (locale in ('en','ru','es')),
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 100),
  planned_duration_seconds integer not null default 1200 check (planned_duration_seconds between 60 and 14400),
  actual_duration_seconds integer check (actual_duration_seconds is null or actual_duration_seconds between 0 and 86400),
  current_phase text not null default 'intake'
    check (current_phase in ('intake','goal','reality','options','action','review','complete','paused','safety_handoff')),
  goal_ciphertext text,
  voice_profile_key text,
  prompt_version text not null,
  method_version text not null,
  persona_version text not null,
  model_gateway_version text,
  context_reuse_consent_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  idempotency_key uuid not null,
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (account_id, idempotency_key),
  unique (id, account_id),
  check ((status = 'completed' and completed_at is not null) or status <> 'completed')
);
comment on table app_private.coaching_session_records is
  'Durable metadata for one coaching session. Sensitive goal/content is application-encrypted; current resumable state remains in personal_coaching_sessions.';
comment on column app_private.coaching_session_records.voice_profile_key is
  'Opaque versioned voice profile reference; never store provider credentials or raw audio here.';

create table if not exists app_private.coaching_session_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  account_id uuid not null,
  sequence_no integer not null check (sequence_no > 0),
  turn_id uuid not null,
  speaker text not null check (speaker in ('client','coach','system')),
  content_kind text not null default 'text'
    check (content_kind in ('text','consented_transcript','structured_prompt','structured_response')),
  content_ciphertext text not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  input_mode text not null default 'text' check (input_mode in ('text','voice','hybrid','system')),
  locale text not null default 'en' check (locale in ('en','ru','es')),
  consent_event_id uuid,
  created_at timestamptz not null default now(),
  foreign key (session_id, account_id)
    references app_private.coaching_session_records(id, account_id) on delete cascade,
  unique (session_id, sequence_no),
  unique (session_id, turn_id)
);
comment on table app_private.coaching_session_messages is
  'Optional encrypted message archive. Voice transcripts are inserted only with explicit transcript-storage consent; raw audio is never stored by this table.';

create table if not exists app_private.coaching_session_events (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  account_id uuid not null,
  revision integer not null check (revision > 0),
  event_type text not null check (event_type in (
    'session_started','phase_changed','question_presented','answer_accepted','answer_skipped',
    'session_paused','session_resumed','session_completed','session_abandoned','safety_handoff',
    'report_created','report_confirmed','plan_action_accepted','consent_changed'
  )),
  actor_type text not null check (actor_type in ('client','coach','system','practitioner')),
  payload_ciphertext text,
  payload_hash text check (payload_hash is null or payload_hash ~ '^[a-f0-9]{64}$'),
  occurred_at timestamptz not null default now(),
  foreign key (session_id, account_id)
    references app_private.coaching_session_records(id, account_id) on delete cascade,
  unique (session_id, revision)
);
comment on table app_private.coaching_session_events is
  'Append-only encrypted event chronology; do not place message text, transcripts, names, or health details in unencrypted event fields.';

create table if not exists app_private.coaching_session_state_versions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  account_id uuid not null,
  revision integer not null check (revision > 0),
  state_schema_version text not null,
  phase text not null,
  active_step_key text,
  active_question_key text,
  state_ciphertext text not null,
  state_hash text not null check (state_hash ~ '^[a-f0-9]{64}$'),
  persisted_at timestamptz not null default now(),
  foreign key (session_id, account_id)
    references app_private.coaching_session_records(id, account_id) on delete cascade,
  unique (session_id, revision)
);
comment on table app_private.coaching_session_state_versions is
  'Immutable encrypted recovery snapshots. A new revision is written after each acknowledged turn or state transition.';

create table if not exists app_private.coaching_session_hypotheses (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  account_id uuid not null,
  hypothesis_ciphertext text not null,
  evidence_refs jsonb not null default '[]'::jsonb check (jsonb_typeof(evidence_refs) = 'array'),
  status text not null default 'tentative' check (status in ('tentative','client_confirmed','rejected','unresolved')),
  client_feedback_ciphertext text,
  created_at timestamptz not null default now(),
  reviewed_at timestamptz,
  foreign key (session_id, account_id)
    references app_private.coaching_session_records(id, account_id) on delete cascade
);
comment on table app_private.coaching_session_hypotheses is
  'Encrypted working hypotheses with evidence references and explicit client confirmation; never treated as diagnoses or facts by default.';

create table if not exists app_private.coaching_reports (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  account_id uuid not null,
  report_kind text not null default 'ai_coaching' check (report_kind in ('ai_coaching','human_specialist','consultation')),
  authorship text not null check (authorship in ('ai','human','joint')),
  practitioner_id uuid references app.practitioners(id) on delete set null,
  schema_version text not null,
  locale text not null check (locale in ('en','ru','es')),
  status text not null default 'draft' check (status in ('draft','ready_for_review','confirmed','published','archived','withdrawn')),
  report_ciphertext text not null,
  evidence_manifest_ciphertext text not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  current_revision integer not null default 1 check (current_revision > 0),
  generated_by text not null default 'deterministic' check (generated_by in ('deterministic','approved_model','human','hybrid')),
  confirmed_at timestamptz,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, account_id)
    references app_private.coaching_session_records(id, account_id) on delete cascade,
  unique (id, account_id),
  check (status <> 'confirmed' or confirmed_at is not null)
);
comment on table app_private.coaching_reports is
  'Canonical encrypted report snapshot. Report JSON contains the ten report sections and separates client-confirmed facts, coach observations, hypotheses and open questions.';

create table if not exists app_private.coaching_report_versions (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null,
  account_id uuid not null,
  revision integer not null check (revision > 0),
  report_ciphertext text not null,
  evidence_manifest_ciphertext text not null,
  content_hash text not null check (content_hash ~ '^[a-f0-9]{64}$'),
  change_reason text not null check (change_reason in ('generated','client_edit','client_confirmation','practitioner_edit','republished','withdrawn')),
  editor_kind text not null check (editor_kind in ('client','ai','practitioner','system')),
  actor_account_id uuid references app.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (report_id, account_id)
    references app_private.coaching_reports(id, account_id) on delete cascade,
  unique (report_id, revision)
);
comment on table app_private.coaching_report_versions is
  'Immutable report revision history. Never overwrite a previous report version.';

create table if not exists app_private.coaching_life_plans (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null unique references app.accounts(id) on delete cascade,
  plan_version integer not null default 1 check (plan_version > 0),
  status text not null default 'active' check (status in ('active','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (id, account_id)
);
comment on table app_private.coaching_life_plans is
  'One My Coaching Plan workspace per account; legacy development_goals remains intact and can be read by an application adapter during rollout.';

create table if not exists app_private.coaching_life_plan_areas (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  account_id uuid not null,
  area_key text not null check (area_key in (
    'body_health','emotional_wellbeing','relationships','career_business',
    'finance','personal_growth','lifestyle','meaning_purpose'
  )),
  current_state_ciphertext text,
  desired_state_ciphertext text,
  obstacles_ciphertext text,
  self_rating smallint check (self_rating is null or self_rating between 0 and 10),
  rating_source text check (rating_source is null or rating_source = 'client_self_report'),
  status text not null default 'active' check (status in ('active','paused','completed','not_started')),
  revision integer not null default 1 check (revision > 0),
  source_report_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (plan_id, account_id)
    references app_private.coaching_life_plans(id, account_id) on delete cascade,
  foreign key (source_report_id, account_id)
    references app_private.coaching_reports(id, account_id) on delete set null,
  unique (plan_id, area_key),
  unique (id, account_id)
);
comment on table app_private.coaching_life_plan_areas is
  'Eight optional Life Plan domains. Null ratings mean not measured; never synthesize scores for empty domains.';

create table if not exists app_private.coaching_goals (
  id uuid primary key default gen_random_uuid(),
  area_id uuid not null,
  account_id uuid not null,
  source_session_id uuid,
  source_report_id uuid,
  title_ciphertext text not null,
  desired_outcome_ciphertext text,
  status text not null default 'proposed' check (status in ('proposed','active','paused','completed','cancelled')),
  priority smallint check (priority is null or priority between 1 and 5),
  target_date date,
  review_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (area_id, account_id)
    references app_private.coaching_life_plan_areas(id, account_id) on delete cascade,
  foreign key (source_session_id, account_id)
    references app_private.coaching_session_records(id, account_id) on delete set null,
  foreign key (source_report_id, account_id)
    references app_private.coaching_reports(id, account_id) on delete set null,
  unique (account_id, idempotency_key),
  unique (id, account_id)
);
comment on table app_private.coaching_goals is
  'Goals are only persisted after client confirmation; titles and outcome text are application-encrypted.';

create table if not exists app_private.coaching_action_items (
  id uuid primary key default gen_random_uuid(),
  goal_id uuid not null,
  account_id uuid not null,
  source_session_id uuid,
  source_report_id uuid,
  source_action_key text,
  description_ciphertext text not null,
  timing_ciphertext text,
  trigger_ciphertext text,
  obstacle_ciphertext text,
  fallback_ciphertext text,
  feasibility_score smallint check (feasibility_score is null or feasibility_score between 0 and 10),
  status text not null default 'proposed'
    check (status in ('proposed','accepted','deferred','declined','active','completed','cancelled')),
  client_confirmed_at timestamptz,
  due_at timestamptz,
  completed_at timestamptz,
  revision integer not null default 1 check (revision > 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (goal_id, account_id)
    references app_private.coaching_goals(id, account_id) on delete cascade,
  foreign key (source_session_id, account_id)
    references app_private.coaching_session_records(id, account_id) on delete set null,
  foreign key (source_report_id, account_id)
    references app_private.coaching_reports(id, account_id) on delete set null,
  unique (source_report_id, source_action_key),
  check (status not in ('accepted','active','completed') or client_confirmed_at is not null),
  check (status <> 'completed' or completed_at is not null)
);
comment on table app_private.coaching_action_items is
  'Only client-confirmed actions may transition to accepted/active/completed; report imports are idempotent by source report/action key.';

create table if not exists app_private.coaching_followups (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  session_id uuid,
  report_id uuid,
  due_at timestamptz not null,
  timezone text not null default 'UTC' check (char_length(timezone) between 1 and 100),
  purpose_ciphertext text,
  status text not null default 'scheduled' check (status in ('scheduled','completed','skipped','cancelled')),
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, account_id)
    references app_private.coaching_session_records(id, account_id) on delete set null,
  foreign key (report_id, account_id)
    references app_private.coaching_reports(id, account_id) on delete set null
);

create table if not exists app_private.coaching_specialist_recommendations (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references app.accounts(id) on delete cascade,
  session_id uuid,
  report_id uuid,
  practitioner_id uuid not null references app.practitioners(id) on delete restrict,
  area_key text check (area_key is null or area_key in (
    'body_health','emotional_wellbeing','relationships','career_business',
    'finance','personal_growth','lifestyle','meaning_purpose'
  )),
  rationale_ciphertext text,
  context_packet_ciphertext text,
  consent_scope text not null default 'none' check (consent_scope in ('none','selected_report','selected_area','selected_actions','custom')),
  consented_at timestamptz,
  revoked_at timestamptz,
  status text not null default 'suggested' check (status in ('suggested','approved','declined','requested','revoked')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  foreign key (session_id, account_id)
    references app_private.coaching_session_records(id, account_id) on delete set null,
  foreign key (report_id, account_id)
    references app_private.coaching_reports(id, account_id) on delete set null,
  check (status not in ('approved','requested') or (consent_scope <> 'none' and consented_at is not null)),
  check (status <> 'revoked' or revoked_at is not null)
);
comment on table app_private.coaching_specialist_recommendations is
  'Suggestions never create bookings or CRM leads. Context sharing requires recipient- and scope-specific consent and can be revoked.';

create table if not exists app_private.coaching_life_plan_changes (
  id uuid primary key default gen_random_uuid(),
  plan_id uuid not null,
  account_id uuid not null,
  entity_kind text not null check (entity_kind in ('plan','area','goal','action')),
  entity_id uuid not null,
  from_revision integer,
  to_revision integer not null check (to_revision > 0),
  change_kind text not null check (change_kind in ('created','updated','status_changed','completed','archived','restored','deleted')),
  snapshot_ciphertext text not null,
  changed_by text not null check (changed_by in ('client','ai','practitioner','system')),
  actor_account_id uuid references app.accounts(id) on delete set null,
  created_at timestamptz not null default now(),
  foreign key (plan_id, account_id)
    references app_private.coaching_life_plans(id, account_id) on delete cascade
);
comment on table app_private.coaching_life_plan_changes is
  'Append-only encrypted audit/history for Life Plan edits; snapshot contents remain encrypted at application layer.';

create table if not exists app_private.coaching_session_consents (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null,
  account_id uuid not null,
  consent_type text not null check (consent_type in (
    'session_persistence','message_archive','voice_transcript_storage',
    'cross_session_context','report_storage','specialist_handoff','audio_storage'
  )),
  accepted boolean not null,
  policy_version text not null,
  purpose text not null,
  occurred_at timestamptz not null default now(),
  revoked_at timestamptz,
  foreign key (session_id, account_id)
    references app_private.coaching_session_records(id, account_id) on delete cascade
);
comment on table app_private.coaching_session_consents is
  'Versioned consent ledger. Absence of an affirmative consent row means storage/sharing is disabled.';

create index if not exists coaching_sessions_account_started_idx
  on app_private.coaching_session_records(account_id, started_at desc);
create index if not exists coaching_sessions_account_status_idx
  on app_private.coaching_session_records(account_id, status, updated_at desc);
create index if not exists coaching_messages_session_order_idx
  on app_private.coaching_session_messages(session_id, sequence_no);
create index if not exists coaching_events_session_time_idx
  on app_private.coaching_session_events(session_id, occurred_at);
create index if not exists coaching_state_session_revision_idx
  on app_private.coaching_session_state_versions(session_id, revision desc);
create index if not exists coaching_reports_account_time_idx
  on app_private.coaching_reports(account_id, created_at desc);
create index if not exists coaching_reports_session_idx
  on app_private.coaching_reports(session_id, created_at desc);
create index if not exists coaching_goals_account_status_idx
  on app_private.coaching_goals(account_id, status, target_date);
create index if not exists coaching_actions_account_status_due_idx
  on app_private.coaching_action_items(account_id, status, due_at);
create index if not exists coaching_followups_due_idx
  on app_private.coaching_followups(account_id, due_at) where status = 'scheduled';
create index if not exists coaching_specialist_recs_account_idx
  on app_private.coaching_specialist_recommendations(account_id, status, created_at desc);

create or replace function app_private.coaching_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = pg_catalog
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
revoke all on function app_private.coaching_set_updated_at() from public;
grant execute on function app_private.coaching_set_updated_at() to hh_app_backend;

do $$
declare t text;
begin
  foreach t in array array[
    'coaching_session_records','coaching_reports','coaching_life_plans',
    'coaching_life_plan_areas','coaching_goals','coaching_action_items',
    'coaching_followups','coaching_specialist_recommendations'
  ] loop
    execute format('drop trigger if exists %I on app_private.%I', t || '_updated_at', t);
    execute format('create trigger %I before update on app_private.%I for each row execute function app_private.coaching_set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- Private schema is backend-only; no anon/authenticated/Data API exposure.
grant usage on schema app_private to hh_app_backend;
grant select, insert, update, delete on
  app_private.coaching_session_records,
  app_private.coaching_session_messages,
  app_private.coaching_session_state_versions,
  app_private.coaching_session_hypotheses,
  app_private.coaching_reports,
  app_private.coaching_report_versions,
  app_private.coaching_life_plans,
  app_private.coaching_life_plan_areas,
  app_private.coaching_goals,
  app_private.coaching_action_items,
  app_private.coaching_followups,
  app_private.coaching_specialist_recommendations,
  app_private.coaching_session_consents
to hh_app_backend;
grant select, insert on
  app_private.coaching_session_events,
  app_private.coaching_life_plan_changes
to hh_app_backend;

alter table app_private.coaching_session_records enable row level security;
alter table app_private.coaching_session_messages enable row level security;
alter table app_private.coaching_session_events enable row level security;
alter table app_private.coaching_session_state_versions enable row level security;
alter table app_private.coaching_session_hypotheses enable row level security;
alter table app_private.coaching_reports enable row level security;
alter table app_private.coaching_report_versions enable row level security;
alter table app_private.coaching_life_plans enable row level security;
alter table app_private.coaching_life_plan_areas enable row level security;
alter table app_private.coaching_goals enable row level security;
alter table app_private.coaching_action_items enable row level security;
alter table app_private.coaching_followups enable row level security;
alter table app_private.coaching_specialist_recommendations enable row level security;
alter table app_private.coaching_life_plan_changes enable row level security;
alter table app_private.coaching_session_consents enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'coaching_session_records','coaching_session_messages','coaching_session_state_versions',
    'coaching_session_hypotheses','coaching_reports','coaching_report_versions',
    'coaching_life_plans','coaching_life_plan_areas','coaching_goals',
    'coaching_action_items','coaching_followups','coaching_specialist_recommendations',
    'coaching_session_consents'
  ] loop
    execute format('create policy %I on app_private.%I for select to hh_app_backend using (account_id = (select auth.uid()) and (select app_private.account_active()))', t || '_owner_select', t);
    execute format('create policy %I on app_private.%I for insert to hh_app_backend with check (account_id = (select auth.uid()) and (select app_private.account_active()))', t || '_owner_insert', t);
    execute format('create policy %I on app_private.%I for update to hh_app_backend using (account_id = (select auth.uid()) and (select app_private.account_active())) with check (account_id = (select auth.uid()) and (select app_private.account_active()))', t || '_owner_update', t);
    execute format('create policy %I on app_private.%I for delete to hh_app_backend using (account_id = (select auth.uid()) and (select app_private.account_active()))', t || '_owner_delete', t);
  end loop;

  foreach t in array array['coaching_session_events','coaching_life_plan_changes'] loop
    execute format('create policy %I on app_private.%I for select to hh_app_backend using (account_id = (select auth.uid()) and (select app_private.account_active()))', t || '_owner_select', t);
    execute format('create policy %I on app_private.%I for insert to hh_app_backend with check (account_id = (select auth.uid()) and (select app_private.account_active()))', t || '_owner_insert', t);
  end loop;
end $$;
