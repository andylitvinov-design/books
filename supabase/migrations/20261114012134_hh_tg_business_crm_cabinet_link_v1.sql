-- Holistic House: verified Telegram Business service request → CRM contact → explicit Supabase Cabinet pairing.
-- Additive only; no anonymous/authenticated Data API privileges and no provider activation.
BEGIN;
ALTER TABLE app_private.crm_tg_business_service_sessions
  ADD COLUMN IF NOT EXISTS telegram_peer_hash text,
  ADD COLUMN IF NOT EXISTS contact_id uuid REFERENCES app.crm_contacts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS account_id uuid REFERENCES app.accounts(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS linked_at timestamptz;
ALTER TABLE app_private.crm_tg_business_service_sessions
  ADD CONSTRAINT crm_tg_business_peer_hash_check
  CHECK (telegram_peer_hash IS NULL OR telegram_peer_hash ~ '^[a-f0-9]{64}$');
CREATE INDEX IF NOT EXISTS crm_tg_business_peer_idx
  ON app_private.crm_tg_business_service_sessions(telegram_peer_hash)
  WHERE telegram_peer_hash IS NOT NULL;
GRANT UPDATE(contact_id,account_id,linked_at)
  ON app_private.crm_tg_business_service_sessions TO hh_app_backend;

-- Ordinary site users can never access private tables directly; server role
-- is checked against the existing verified Supabase session on every read.
CREATE POLICY crm_tg_business_cabinet_self_read
  ON app_private.crm_tg_business_service_sessions FOR SELECT TO hh_app_backend
  USING (
    (select app_private.session_active())
    AND (account_id = (select auth.uid())
      OR (stage='submitted' AND contact_id IS NOT NULL
        AND telegram_peer_hash=current_setting('hh.telegram_verified_peer_hash',true)))
  );
CREATE POLICY crm_tg_business_cabinet_verified_link
  ON app_private.crm_tg_business_service_sessions FOR UPDATE TO hh_app_backend
  USING (
    (select app_private.session_active()) AND account_id IS NULL
    AND stage='submitted' AND contact_id IS NOT NULL
    AND telegram_peer_hash=current_setting('hh.telegram_verified_peer_hash',true)
  )
  WITH CHECK (
    (select app_private.session_active()) AND account_id=(select auth.uid())
    AND linked_at IS NOT NULL AND stage='submitted' AND contact_id IS NOT NULL
    AND telegram_peer_hash=current_setting('hh.telegram_verified_peer_hash',true)
  );
CREATE POLICY crm_tg_business_cabinet_self_unlink
  ON app_private.crm_tg_business_service_sessions FOR UPDATE TO hh_app_backend
  USING (
    (select app_private.session_active())
    AND account_id=(select auth.uid())
  )
  WITH CHECK (
    (select app_private.session_active())
    AND account_id IS NULL AND linked_at IS NULL
  );
COMMENT ON COLUMN app_private.crm_tg_business_service_sessions.telegram_peer_hash IS
  'HMAC of verified official Telegram Business private chat sender ID, never phone or raw Telegram ID.';
COMMENT ON COLUMN app_private.crm_tg_business_service_sessions.account_id IS
  'User-approved link to existing Supabase Cabinet after verified Telegram OIDC identity; no automatic account creation from a bot message.';

-- Only the same server-confirmed, consented Business operation may resolve a
-- pre-existing CRM contact with this keyed HMAC. No cross-owner contact search.
GRANT SELECT(id,owner_id,email_hash,suppressed) ON app.crm_contacts TO hh_app_backend;
CREATE POLICY crm_contact_tg_business_verified_peer_lookup
  ON app.crm_contacts FOR SELECT TO hh_app_backend
  USING (
    email_hash=current_setting('hh.tg_business_contact_hash',true)
    AND EXISTS (
      SELECT 1
      FROM app.public_service_enquiries e
      JOIN app.practitioners p ON p.id=e.recipient_practitioner_id
      JOIN app_private.crm_tg_business_service_sessions s
        ON s.operation_id=e.operation_id AND s.practitioner_id=p.id
      WHERE e.operation_id::text=current_setting('hh.tg_business_operation',true)
        AND e.contact_channel='telegram'
        AND e.telegram_handoff_digest IS NOT NULL
        AND s.stage='committing' AND s.consent_at IS NOT NULL
        AND s.consent_at > now()-interval '15 minutes'
        AND s.telegram_peer_hash=current_setting('hh.telegram_verified_peer_hash',true)
        AND p.trusted_auth_user_id=crm_contacts.owner_id
    )
  );

-- Existing guest links mean a newly created contact. Telegram follow-ups
-- legitimately reuse an old contact and carry a different, verified proof.
ALTER TABLE app_private.public_enquiry_contact_links
  DROP CONSTRAINT public_enquiry_contact_links_evidence_check;
ALTER TABLE app_private.public_enquiry_contact_links
  ADD CONSTRAINT public_enquiry_contact_links_evidence_check
  CHECK (evidence IN ('created_from_this_enquiry','verified_telegram_business_enquiry'));
CREATE POLICY public_enquiry_contact_links_tg_business_verified_insert
  ON app_private.public_enquiry_contact_links FOR INSERT TO hh_app_backend
  WITH CHECK (
    evidence='verified_telegram_business_enquiry'
    AND EXISTS (
      SELECT 1
      FROM app.public_service_enquiries e
      JOIN app.practitioners p ON p.id=e.recipient_practitioner_id
      JOIN app_private.crm_tg_business_service_sessions s
        ON s.operation_id=e.operation_id AND s.practitioner_id=p.id
      WHERE e.id=public_enquiry_contact_links.enquiry_id
        AND e.operation_id::text=current_setting('hh.tg_business_operation',true)
        AND e.contact_channel='telegram' AND e.telegram_handoff_digest IS NOT NULL
        AND s.stage='committing' AND s.consent_at IS NOT NULL
        AND s.consent_at>now()-interval '15 minutes'
        AND s.telegram_peer_hash=current_setting('hh.telegram_verified_peer_hash',true)
        AND p.trusted_auth_user_id=public_enquiry_contact_links.owner_id
    )
  );

GRANT SELECT(enquiry_id,owner_id,contact_id,evidence)
  ON app_private.public_enquiry_contact_links TO hh_app_backend;
CREATE POLICY public_enquiry_contact_links_tg_cabinet_read
  ON app_private.public_enquiry_contact_links FOR SELECT TO hh_app_backend
  USING (
    evidence='verified_telegram_business_enquiry'
    AND (select app_private.session_active())
    AND EXISTS (
      SELECT 1 FROM app_private.crm_tg_business_service_sessions s
      WHERE s.contact_id=public_enquiry_contact_links.contact_id
        AND s.account_id=(select auth.uid())
    )
  );
CREATE POLICY public_service_enquiry_tg_cabinet_read
  ON app.public_service_enquiries FOR SELECT TO hh_app_backend
  USING (
    (select app_private.session_active())
    AND EXISTS (
      SELECT 1 FROM app_private.public_enquiry_contact_links l
      WHERE l.enquiry_id=public_service_enquiries.id
        AND l.evidence='verified_telegram_business_enquiry'
    )
  );
COMMIT;