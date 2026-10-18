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
