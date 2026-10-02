-- Holistic House App R1. Additive account-owned data only; legacy Cabinet/KV is untouched.
create schema if not exists app;

create table app.accounts (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  ui_locale text not null default 'en' check (ui_locale in ('en', 'ru')),
  timezone text not null default 'America/Toronto',
  onboarding_state text not null default 'new' check (onboarding_state in ('new', 'active', 'deletion_requested', 'deleted')),
  status text not null default 'active' check (status in ('active', 'blocked', 'deleting', 'deleted')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table app.consent_events (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references app.accounts(id) on delete cascade,
  purpose text not null check (purpose in ('necessary_app_processing', 'marketing', 'practitioner_sharing')),
  policy_version text not null, accepted boolean not null, created_at timestamptz not null default now()
);
create table app.assessment_versions (
  id uuid primary key default gen_random_uuid(), definition_key text not null, definition_version text not null,
  instrument_locale text not null, translation_version text not null, questions jsonb not null, answer_schema jsonb not null,
  scoring_key text not null, scoring_version text not null, result_schema jsonb not null, timeframe text not null,
  source_metadata jsonb not null, content_hash text not null, status text not null default 'published' check (status in ('published', 'retired')),
  published_at timestamptz not null default now(),
  unique (definition_key, definition_version, instrument_locale, translation_version), unique (content_hash)
);
create table app.assessment_runs (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references app.accounts(id) on delete cascade,
  assessment_version_id uuid not null references app.assessment_versions(id),
  status text not null default 'draft' check (status in ('draft', 'in_progress', 'submitted', 'completed', 'failed', 'discarded')),
  revision integer not null default 0 check (revision >= 0), progress jsonb not null default '{}'::jsonb, answers jsonb not null default '{}'::jsonb,
  operation_id uuid, started_at timestamptz not null default now(), measurement_at timestamptz, submitted_at timestamptz, completed_at timestamptz,
  timezone text not null, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (id, account_id), unique (account_id, assessment_version_id, operation_id)
);
create unique index assessment_runs_one_active_draft on app.assessment_runs (account_id, assessment_version_id) where status in ('draft', 'in_progress');
create table app.assessment_results (
  id uuid primary key default gen_random_uuid(), run_id uuid not null, account_id uuid not null references app.accounts(id) on delete cascade,
  source_version_id uuid not null references app.assessment_versions(id), scoring_version text not null, result_version text not null,
  dimensions jsonb not null, measurement_at timestamptz not null, provenance jsonb not null, created_at timestamptz not null default now(),
  unique (run_id), unique (id, account_id), foreign key (run_id, account_id) references app.assessment_runs(id, account_id)
);
create table app.profile_snapshots (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references app.accounts(id) on delete cascade,
  generating_result_id uuid not null, dimensions jsonb not null, created_at timestamptz not null default now(),
  unique (generating_result_id), foreign key (generating_result_id, account_id) references app.assessment_results(id, account_id)
);
create table app.context_events (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references app.accounts(id) on delete cascade,
  occurred_at timestamptz not null, timezone text not null, label text not null check (char_length(label) <= 200), note_ciphertext text,
  revision integer not null default 0 check (revision >= 0), created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table app.practitioners (
  id uuid primary key default gen_random_uuid(), trusted_auth_user_id uuid unique references auth.users(id), public_profile jsonb not null,
  active boolean not null default true, created_at timestamptz not null default now()
);
create table app.service_offerings (
  id uuid primary key default gen_random_uuid(), practitioner_id uuid not null references app.practitioners(id),
  category text not null check (category in ('psychosomatic_constellation_exploration', 'homeopathy_consultation', 'business_situation_constellation')),
  localized_copy jsonb not null, active boolean not null default true, confirmed_price numeric(10,2), currency text, duration_minutes integer,
  created_at timestamptz not null default now(), unique (id, practitioner_id),
  check ((confirmed_price is null and currency is null) or (confirmed_price is not null and currency is not null))
);
create table app.consultation_requests (
  id uuid primary key default gen_random_uuid(), account_id uuid not null references app.accounts(id) on delete cascade,
  service_offering_id uuid not null, recipient_practitioner_id uuid not null,
  status text not null default 'requested' check (status in ('requested', 'contacted', 'closed', 'cancelled')),
  message_ciphertext text, contact_ciphertext text, shared_excerpt jsonb, revision integer not null default 0 check (revision >= 0), operation_id uuid not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique (account_id, operation_id),
  foreign key (service_offering_id, recipient_practitioner_id) references app.service_offerings(id, practitioner_id)
);

grant usage on schema app to authenticated;
grant select on table app.assessment_versions, app.practitioners, app.service_offerings to authenticated;
grant select, update on table app.accounts to authenticated;
grant select, insert on table app.consent_events to authenticated;
grant select, insert, update on table app.assessment_runs to authenticated;
grant select, insert, update, delete on table app.context_events to authenticated;
grant select, insert, update on table app.consultation_requests to authenticated;
revoke all on table app.accounts, app.consent_events, app.assessment_versions, app.assessment_runs, app.assessment_results, app.profile_snapshots, app.context_events, app.practitioners, app.service_offerings, app.consultation_requests from anon;
revoke insert, update, delete on table app.assessment_results from anon, authenticated;
revoke insert, update, delete on table app.profile_snapshots from anon, authenticated;

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

create policy "accounts are private" on app.accounts for select to authenticated using ((select auth.uid()) = id);
create policy "accounts update own safe fields" on app.accounts for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id and status = 'active');
create policy "own consent history" on app.consent_events for select to authenticated using ((select auth.uid()) = account_id);
create policy "record own consent" on app.consent_events for insert to authenticated with check ((select auth.uid()) = account_id);
create policy "published definitions are readable" on app.assessment_versions for select to authenticated using (status = 'published');
create policy "runs are private" on app.assessment_runs for select to authenticated using ((select auth.uid()) = account_id);
create policy "create own draft run" on app.assessment_runs for insert to authenticated with check ((select auth.uid()) = account_id and status = 'draft');
create policy "edit own mutable run" on app.assessment_runs for update to authenticated using ((select auth.uid()) = account_id and status in ('draft', 'in_progress')) with check ((select auth.uid()) = account_id and status in ('draft', 'in_progress', 'discarded'));
create policy "results are private" on app.assessment_results for select to authenticated using ((select auth.uid()) = account_id);
create policy "snapshots are private" on app.profile_snapshots for select to authenticated using ((select auth.uid()) = account_id);
create policy "context events are private" on app.context_events for select to authenticated using ((select auth.uid()) = account_id);
create policy "create own context event" on app.context_events for insert to authenticated with check ((select auth.uid()) = account_id);
create policy "edit own context event" on app.context_events for update to authenticated using ((select auth.uid()) = account_id) with check ((select auth.uid()) = account_id);
create policy "delete own context event" on app.context_events for delete to authenticated using ((select auth.uid()) = account_id);
create policy "active practitioners are readable" on app.practitioners for select to authenticated using (active);
create policy "active service offerings are readable" on app.service_offerings for select to authenticated using (active);
create policy "requests are private" on app.consultation_requests for select to authenticated using ((select auth.uid()) = account_id);
create policy "create own request" on app.consultation_requests for insert to authenticated with check ((select auth.uid()) = account_id and status = 'requested');
create policy "cancel own open request" on app.consultation_requests for update to authenticated using ((select auth.uid()) = account_id and status = 'requested') with check ((select auth.uid()) = account_id and status = 'cancelled');
