BEGIN;

-- The two published Personal Consultation offers have distinct, server-owned
-- identities. Customer narrative is never stored in this session.
ALTER TABLE app_private.crm_tg_business_service_sessions
  ADD COLUMN IF NOT EXISTS offer_id text,
  ADD COLUMN IF NOT EXISTS source_path text;
ALTER TABLE app_private.crm_tg_business_service_sessions
  DROP CONSTRAINT crm_tg_business_service_sessions_service_key_check;
ALTER TABLE app_private.crm_tg_business_service_sessions
  ADD CONSTRAINT crm_tg_business_service_sessions_service_key_check
  CHECK (service_key IN ('homeopathy','coaching','reiki','constellations','business','ai_secretary','personal_review'));
ALTER TABLE app_private.crm_tg_business_service_sessions
  DROP CONSTRAINT crm_tg_business_service_sessions_stage_check;
ALTER TABLE app_private.crm_tg_business_service_sessions
  ADD CONSTRAINT crm_tg_business_service_sessions_stage_check
  CHECK (stage IN ('format','confirm','committing','submitted','cancelled','stopped',
    'ai_q1','ai_q2','ai_q3','ai_q4','ai_q5','review_understanding','review_outcome','review_action'));
ALTER TABLE app_private.crm_tg_business_service_sessions
  ADD CONSTRAINT crm_tg_business_review_offer_check CHECK (
    (service_key='personal_review' AND offer_id IN ('personal_express_review','personal_extended_review')
      AND source_path='/'||locale||'/services')
    OR (service_key<>'personal_review' AND offer_id IS NULL AND source_path IS NULL)
  );
ALTER TABLE app_private.crm_tg_business_service_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.crm_tg_business_service_sessions FORCE ROW LEVEL SECURITY;
COMMENT ON COLUMN app_private.crm_tg_business_service_sessions.offer_id IS
 'Allowlisted public offer ID, only for the two published review offers; no client-supplied identity.';
COMMENT ON COLUMN app_private.crm_tg_business_service_sessions.source_path IS
 'Locale-scoped public source route derived from the server catalogue.';

-- Expose the actual processing state of Business replies in Messages. These
-- states describe provider acceptance/uncertainty, never delivery itself.
ALTER TABLE app.crm_msg_items DROP CONSTRAINT crm_msg_items_status_check;
ALTER TABLE app.crm_msg_items ADD CONSTRAINT crm_msg_items_status_check CHECK
 (status IN ('received','processed','send_pending','provider_accepted','delivery_unknown',
  'draft','queued','accepted','delivered','read','failed','blocked','unknown'));
ALTER TABLE app.crm_msg_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.crm_msg_items FORCE ROW LEVEL SECURITY;
ALTER TABLE app.crm_msg_threads
  ADD COLUMN IF NOT EXISTS selected_service_key text,
  ADD COLUMN IF NOT EXISTS selected_offer_id text,
  ADD COLUMN IF NOT EXISTS service_source_path text,
  ADD COLUMN IF NOT EXISTS service_dialogue_stage text;
ALTER TABLE app.crm_msg_threads
  ADD CONSTRAINT crm_msg_threads_selected_offer_check CHECK (
    (selected_service_key IS NULL AND selected_offer_id IS NULL AND service_source_path IS NULL)
    OR (selected_service_key='personal_review'
      AND selected_offer_id IN ('personal_express_review','personal_extended_review')
      AND service_source_path IN ('/en/services','/ru/services','/es/services'))
  );
ALTER TABLE app.crm_msg_threads
  ADD CONSTRAINT crm_msg_threads_service_stage_check CHECK (
    service_dialogue_stage IS NULL OR service_dialogue_stage IN
      ('not_started','review_understanding','review_outcome','review_action','confirm','submitted','cancelled','stopped')
  );
ALTER TABLE app.crm_msg_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.crm_msg_threads FORCE ROW LEVEL SECURITY;

-- A signed webhook may update only the exact already-ingested Business
-- inbound item, addressed by HMAC account/user/provider hashes. No raw
-- Telegram identifiers enter this recovery/status path.
CREATE OR REPLACE FUNCTION app_private.crm_msg_business_reply_state(
 p_account_hash text,p_user_hash text,p_provider_hash text,p_state text,
 p_service_key text,p_offer_id text,p_source_path text,p_dialogue_stage text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE v_account uuid; v_thread uuid; v_count integer;
BEGIN
 IF length(p_account_hash)<>64 OR length(p_user_hash)<>64 OR length(p_provider_hash)<>64 OR
    p_state NOT IN ('processed','send_pending','provider_accepted','delivery_unknown','failed') OR
    (p_offer_id IS NOT NULL AND (p_service_key<>'personal_review' OR
      p_offer_id NOT IN ('personal_express_review','personal_extended_review') OR
      p_source_path NOT IN ('/en/services','/ru/services','/es/services'))) OR
    (p_dialogue_stage IS NOT NULL AND p_dialogue_stage NOT IN
      ('not_started','review_understanding','review_outcome','review_action','confirm','submitted','cancelled','stopped'))
 THEN RETURN false; END IF;
 SELECT id INTO v_account FROM app.crm_msg_accounts
  WHERE channel='telegram' AND external_hash=p_account_hash AND enabled;
 IF v_account IS NULL THEN RETURN false; END IF;
 SELECT id INTO v_thread FROM app.crm_msg_threads
  WHERE account_id=v_account AND user_hash=p_user_hash;
 IF v_thread IS NULL THEN RETURN false; END IF;
 UPDATE app.crm_msg_items SET status=p_state,updated_at=now()
  WHERE thread_id=v_thread AND direction='in' AND provider_hash=p_provider_hash
    AND status IN ('received','processed','send_pending','provider_accepted','delivery_unknown','failed');
 GET DIAGNOSTICS v_count=ROW_COUNT;
 IF p_offer_id IS NOT NULL THEN
  UPDATE app.crm_msg_threads SET selected_service_key=p_service_key,selected_offer_id=p_offer_id,
    service_source_path=p_source_path,service_dialogue_stage=p_dialogue_stage
   WHERE id=v_thread;
 ELSIF p_dialogue_stage IS NOT NULL THEN
  UPDATE app.crm_msg_threads SET service_dialogue_stage=p_dialogue_stage WHERE id=v_thread;
 END IF;
 RETURN v_count=1;
END $$;
REVOKE ALL ON FUNCTION app_private.crm_msg_business_reply_state(text,text,text,text,text,text,text,text)
 FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.crm_msg_business_reply_state(text,text,text,text,text,text,text,text)
 TO hh_app_inbox;

COMMIT;
