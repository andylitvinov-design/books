-- Holistic House practitioner/client account-to-account messaging, only within verified service requests.
-- No external API, no merging by names/phone, no access to private assessment or client cabinet.
CREATE TABLE app.practitioner_request_messages (
 id uuid PRIMARY KEY,
 request_id uuid NOT NULL REFERENCES app.consultation_requests(id) ON DELETE CASCADE,
 author_account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
 author_role text NOT NULL CHECK (author_role IN ('client','practitioner')),
 body_ciphertext text NOT NULL CHECK (char_length(body_ciphertext) BETWEEN 40 AND 16000),
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (request_id,id)
);
CREATE INDEX practitioner_request_messages_history_idx
 ON app.practitioner_request_messages(request_id,created_at DESC,id DESC);
ALTER TABLE app.practitioner_request_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.practitioner_request_messages FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.practitioner_request_messages FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON app.practitioner_request_messages TO hh_app_backend;
-- Participant SELECT: the verified requester or the authenticated owner of the
-- exact recipient practitioner. No global "master" role or cross-master visibility.
CREATE POLICY practitioner_request_messages_participant_read
 ON app.practitioner_request_messages FOR SELECT TO hh_app_backend
 USING (
  (SELECT app_private.account_active())
  AND EXISTS (
   SELECT 1 FROM app.consultation_requests r
   JOIN app.practitioners p ON p.id=r.recipient_practitioner_id
   WHERE r.id=practitioner_request_messages.request_id
     AND (
       r.account_id=(SELECT auth.uid())
       OR (p.trusted_auth_user_id=(SELECT auth.uid())
         AND p.active AND p.status IN ('approved','submitted','changes_requested'))
     )
  )
 );
-- Immutable sender and request binding. Only live requested/contacted requests
-- can receive fresh in-app replies; closed or withdrawn requests remain readable.
CREATE POLICY practitioner_request_messages_participant_insert
 ON app.practitioner_request_messages FOR INSERT TO hh_app_backend
 WITH CHECK (
  author_account_id=(SELECT auth.uid())
  AND (SELECT app_private.account_active())
  AND EXISTS (
   SELECT 1 FROM app.consultation_requests r
   JOIN app.practitioners p ON p.id=r.recipient_practitioner_id
   WHERE r.id=practitioner_request_messages.request_id
     AND r.status IN ('requested','contacted')
     AND (
       (practitioner_request_messages.author_role='client'
         AND r.account_id=(SELECT auth.uid()))
       OR (practitioner_request_messages.author_role='practitioner'
         AND p.trusted_auth_user_id=(SELECT auth.uid()) AND p.active
         AND p.status IN ('approved','submitted','changes_requested'))
     )
  )
 );
-- No UPDATE, DELETE or user-level direct Data API grants; messages are immutable.
