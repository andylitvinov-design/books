-- HH Telegram V3 service request: minimum backend-only proof read.
-- The existing FORCE RLS and crm_tg_diagnostic_coaching_handoff_read policy
-- still restrict rows to the exact operation-scoped, consented peer.
-- No schema/table-level grant, no new security-definer function.
grant select (flow_version, ai_context_id, ai_review_consent_at)
  on table app_private.crm_tg_diagnostic_sessions
  to hh_app_backend;
