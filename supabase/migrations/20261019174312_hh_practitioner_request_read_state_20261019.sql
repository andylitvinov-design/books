-- Private per-request view markers; NEVER a provider delivered/read receipt.
-- An account can view/update only its own state for requests where it is the
-- verified requester or precisely the assigned active practitioner.
CREATE TABLE app.practitioner_request_reads (
  request_id uuid NOT NULL REFERENCES app.consultation_requests(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  last_seen_at timestamptz NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (request_id, account_id)
);
ALTER TABLE app.practitioner_request_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.practitioner_request_reads FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.practitioner_request_reads FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON app.practitioner_request_reads TO hh_app_backend;
CREATE POLICY practitioner_request_reads_owner_select
 ON app.practitioner_request_reads FOR SELECT TO hh_app_backend
 USING (
  account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active())
  AND EXISTS (
    SELECT 1 FROM app.consultation_requests r
    JOIN app.practitioners p ON p.id=r.recipient_practitioner_id
    WHERE r.id=practitioner_request_reads.request_id
      AND (r.account_id=(SELECT auth.uid()) OR
        (p.trusted_auth_user_id=(SELECT auth.uid()) AND p.active
          AND p.status IN ('approved','submitted','changes_requested')))
  )
 );
CREATE POLICY practitioner_request_reads_owner_insert
 ON app.practitioner_request_reads FOR INSERT TO hh_app_backend
 WITH CHECK (
  account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active())
  AND EXISTS (
    SELECT 1 FROM app.consultation_requests r
    JOIN app.practitioners p ON p.id=r.recipient_practitioner_id
    WHERE r.id=practitioner_request_reads.request_id
      AND (r.account_id=(SELECT auth.uid()) OR
        (p.trusted_auth_user_id=(SELECT auth.uid()) AND p.active
          AND p.status IN ('approved','submitted','changes_requested')))
  )
 );
CREATE POLICY practitioner_request_reads_owner_update
 ON app.practitioner_request_reads FOR UPDATE TO hh_app_backend
 USING (
  account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active())
  AND EXISTS (
    SELECT 1 FROM app.consultation_requests r
    JOIN app.practitioners p ON p.id=r.recipient_practitioner_id
    WHERE r.id=practitioner_request_reads.request_id
      AND (r.account_id=(SELECT auth.uid()) OR
        (p.trusted_auth_user_id=(SELECT auth.uid()) AND p.active
          AND p.status IN ('approved','submitted','changes_requested')))
  )
 )
 WITH CHECK (
  account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active())
  AND EXISTS (
    SELECT 1 FROM app.consultation_requests r
    JOIN app.practitioners p ON p.id=r.recipient_practitioner_id
    WHERE r.id=practitioner_request_reads.request_id
      AND (r.account_id=(SELECT auth.uid()) OR
        (p.trusted_auth_user_id=(SELECT auth.uid()) AND p.active
          AND p.status IN ('approved','submitted','changes_requested')))
  )
 );