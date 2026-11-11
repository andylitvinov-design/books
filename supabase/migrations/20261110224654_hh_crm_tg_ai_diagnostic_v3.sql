-- Telegram AI Diagnostics V3: additive, encrypted, consented interview state.
-- Existing V1/V2 sessions, CRM messages, owner replies and opt-outs are intact.
-- The existing private signed Telegram webhook role owns all writes.
begin;

alter table app_private.crm_tg_diagnostic_sessions
  add column if not exists ai_context_id uuid not null default gen_random_uuid();
alter table app_private.crm_tg_diagnostic_sessions
  add column if not exists ai_context_ciphertext text;
alter table app_private.crm_tg_diagnostic_sessions
  add column if not exists ai_consent_at timestamptz;
alter table app_private.crm_tg_diagnostic_sessions
  add column if not exists ai_review_consent_at timestamptz;

alter table app_private.crm_tg_diagnostic_sessions
  drop constraint if exists crm_tg_diagnostic_sessions_stage_check;
alter table app_private.crm_tg_diagnostic_sessions
  add constraint crm_tg_diagnostic_sessions_stage_check
  check (stage in ('consent','focus','photo','question','drawing','interview',
    'review_confirm','done','stopped'));

alter table app_private.crm_tg_diagnostic_sessions
  drop constraint if exists crm_tg_diagnostic_sessions_flow_version_check;
alter table app_private.crm_tg_diagnostic_sessions
  add constraint crm_tg_diagnostic_sessions_flow_version_check
  check (flow_version in (1,2,3));

alter table app_private.crm_tg_diagnostic_sessions
  drop constraint if exists crm_tg_diagnostic_sessions_reply_count_check;
alter table app_private.crm_tg_diagnostic_sessions
  add constraint crm_tg_diagnostic_sessions_reply_count_check
  check (reply_count between 0 and 40);

alter table app_private.crm_tg_diagnostic_sessions
  add constraint crm_tg_diagnostic_v3_context_size_check
  check (ai_context_ciphertext is null or
    (length(ai_context_ciphertext) between 20 and 40000));
alter table app_private.crm_tg_diagnostic_sessions
  add constraint crm_tg_diagnostic_v3_consent_pair_check
  check (ai_review_consent_at is null or (ai_consent_at is not null and consent_at is not null));

comment on column app_private.crm_tg_diagnostic_sessions.ai_context_id is
  'Per-visit UUID for server-side AES-GCM AAD, never a Telegram ID';
comment on column app_private.crm_tg_diagnostic_sessions.ai_context_ciphertext is
  'Bounded, encrypted, consented AI interview context; no plaintext client data';
comment on column app_private.crm_tg_diagnostic_sessions.ai_consent_at is
  'Separate explicit permission for external zero-price model inference';
comment on column app_private.crm_tg_diagnostic_sessions.ai_review_consent_at is
  'Separate customer confirmation before writing AI summary to existing owner CRM';

-- Existing FORCE RLS and hh_app_inbox-only privileges remain unchanged.
-- Never grant access to anon, authenticated, service_role or public.
commit;
