-- Add one owner-scoped, deterministic five-question AI-secretary PRODUCT enquiry.
-- No external model, second bot, anonymous API read or marketing opt-in.
-- The old confirmed service-order and Cabinet flows remain unchanged.
BEGIN;
ALTER TABLE app_private.crm_tg_business_service_sessions
  ADD COLUMN IF NOT EXISTS intake_answers_ciphertext text;
ALTER TABLE app_private.crm_tg_business_service_sessions
  DROP CONSTRAINT crm_tg_business_service_sessions_service_key_check;
ALTER TABLE app_private.crm_tg_business_service_sessions
  ADD CONSTRAINT crm_tg_business_service_sessions_service_key_check
  CHECK (service_key IN ('homeopathy','coaching','reiki','constellations','business','ai_secretary'));
ALTER TABLE app_private.crm_tg_business_service_sessions
  DROP CONSTRAINT crm_tg_business_service_sessions_stage_check;
ALTER TABLE app_private.crm_tg_business_service_sessions
  ADD CONSTRAINT crm_tg_business_service_sessions_stage_check
  CHECK (stage IN ('format','confirm','committing','submitted','cancelled','stopped',
    'ai_q1','ai_q2','ai_q3','ai_q4','ai_q5'));
ALTER TABLE app_private.crm_tg_business_service_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.crm_tg_business_service_sessions FORCE ROW LEVEL SECURITY;
COMMENT ON COLUMN app_private.crm_tg_business_service_sessions.intake_answers_ciphertext IS
  'Five customer-authored business-process answers encrypted for the verified practitioner, with no raw chat ID, credentials or external LLM processing.';
COMMIT;
