-- Proposed schema, NOT a live migration. Review before production application.
-- No existing instrument/result/client table is altered.
create table app.assessment_interpretation_versions (
  assessment_version_id uuid not null references app.assessment_versions(id),
  definition_key text not null,
  definition_version text not null,
  instrument_locale text not null check (instrument_locale in ('en','ru')),
  translation_version text not null,
  instrument_content_hash text not null check (instrument_content_hash ~ '^sha256:[a-f0-9]{64}$'),
  scoring_key text not null,
  scoring_version text not null,
  result_version text not null,
  ui_locale text not null check (ui_locale in ('en','ru')),
  interpretation_version text not null,
  payload jsonb not null check (jsonb_typeof(payload) = 'object'),
  payload_hash text not null check (payload_hash ~ '^sha256:[a-f0-9]{64}$'),
  published_at timestamptz not null default now(),
  primary key (assessment_version_id, ui_locale, interpretation_version),
  unique (definition_key,definition_version,instrument_locale,translation_version,scoring_key,scoring_version,result_version,ui_locale,interpretation_version)
);
alter table app.assessment_interpretation_versions enable row level security;
alter table app.assessment_interpretation_versions force row level security;
-- Only prepared, non-personal content is read. No anon/authenticated/API grants.
revoke all on app.assessment_interpretation_versions from public, anon, authenticated, hh_app_backend, hh_app_inbox;
grant select on app.assessment_interpretation_versions to hh_app_backend;
create policy interpretation_content_read on app.assessment_interpretation_versions
  for select to hh_app_backend using (true);
-- Reuse the existing immutable-version trigger; no new elevated function.
create trigger immutable_interpretation_version before update on app.assessment_interpretation_versions
  for each row execute function app_private.immutable_version();
