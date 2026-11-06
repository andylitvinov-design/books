-- Additive, previously applied as Supabase migration 20261026171737.
-- Existing V1 sessions, consent, encrypted messages, and private media are untouched.
begin;
alter table app_private.crm_tg_diagnostic_sessions
  add column if not exists flow_version smallint not null default 1;
alter table app_private.crm_tg_diagnostic_sessions
  add column if not exists topic text;
alter table app_private.crm_tg_diagnostic_sessions
  drop constraint if exists crm_tg_diagnostic_sessions_stage_check;
alter table app_private.crm_tg_diagnostic_sessions
  add constraint crm_tg_diagnostic_sessions_stage_check
  check (stage in ('consent','focus','photo','question','drawing','done','stopped'));
alter table app_private.crm_tg_diagnostic_sessions
  add constraint crm_tg_diagnostic_sessions_flow_version_check
  check (flow_version in (1,2));
alter table app_private.crm_tg_diagnostic_sessions
  add constraint crm_tg_diagnostic_sessions_topic_check
  check (topic is null or topic in ('business','wellbeing','relationships','other'));
comment on column app_private.crm_tg_diagnostic_sessions.flow_version is
  'V1 retained for in-progress consented requests; V2 is the first-person six-step coaching dialogue. No automatic mass sends.';
comment on column app_private.crm_tg_diagnostic_sessions.topic is
  'Only a broad allowlisted conversation category; detailed answers and files remain encrypted in existing private CRM inbox.';
commit;
