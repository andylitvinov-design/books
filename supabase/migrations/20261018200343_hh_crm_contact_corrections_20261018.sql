-- Non-clinical owner CRM contact correction, without moving verified email consent.
-- Existing RLS, irreversible suppression and external email verification remain in force.
GRANT UPDATE(contact_ciphertext,email_hash,phone_hash,locale,source)
  ON app.crm_contacts TO hh_crm_backend;

ALTER TABLE app.crm_activity DROP CONSTRAINT crm_activity_kind_check;
ALTER TABLE app.crm_activity
  ADD CONSTRAINT crm_activity_kind_check
  CHECK (kind IN ('contact_created','contact_updated','stage_changed',
    'opt_out','contacted','call_completed','offer_sent','booking_requested',
    'booking_confirmed'));

-- No UPDATE/DELETE grants on the append-only activity ledger.
-- No anonymous/authenticated contact grants or unverified email setting changes.

-- Defense in depth: even a compromised call site using the restricted role
-- cannot transfer old verified email permissions or redirect active chats.
CREATE OR REPLACE FUNCTION app_private.crm_contact_update_guard()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path=pg_catalog AS $$
BEGIN
 IF OLD.suppressed AND NOT NEW.suppressed THEN
  RAISE EXCEPTION 'CRM_SUPPRESSION_IMMUTABLE';
 END IF;
 IF OLD.email_hash IS DISTINCT FROM NEW.email_hash THEN
  IF OLD.email_verified
    OR EXISTS(SELECT 1 FROM app.crm_consent_ledger
       WHERE owner_id=OLD.owner_id AND contact_id=OLD.id AND channel='email')
    OR EXISTS(SELECT 1 FROM app.crm_email_tokens
       WHERE owner_id=OLD.owner_id AND contact_id=OLD.id)
    OR EXISTS(SELECT 1 FROM app.crm_email_jobs
       WHERE owner_id=OLD.owner_id AND contact_id=OLD.id)
  THEN RAISE EXCEPTION 'CRM_EMAIL_IDENTITY_IMMUTABLE';
  END IF;
 END IF;
 IF OLD.phone_hash IS DISTINCT FROM NEW.phone_hash AND
   EXISTS(SELECT 1 FROM app.crm_msg_threads
     WHERE owner_id=OLD.owner_id AND contact_id=OLD.id)
 THEN RAISE EXCEPTION 'CRM_MESSENGER_PHONE_IMMUTABLE';
 END IF;
 RETURN NEW;
END $$;

REVOKE ALL ON FUNCTION app_private.crm_contact_update_guard()
 FROM public,anon,authenticated;
GRANT EXECUTE ON FUNCTION app_private.crm_contact_update_guard() TO hh_crm_backend;
ALTER TABLE app.crm_contacts FORCE ROW LEVEL SECURITY;
