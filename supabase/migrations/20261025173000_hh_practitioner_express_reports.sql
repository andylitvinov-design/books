-- Private express situation reports, independent of owner's homeopathic prescription records.
-- Verified requester + exact assigned practitioner only; no public API privileges.
CREATE TABLE app.practitioner_express_reports (
  id uuid PRIMARY KEY,
  request_id uuid NOT NULL REFERENCES app.consultation_requests(id) ON DELETE CASCADE,
  practitioner_id uuid NOT NULL REFERENCES app.practitioners(id),
  practitioner_account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  client_account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  language_preference text NOT NULL CHECK (language_preference IN ('en','ru','es')),
  issued_on date NOT NULL,
  document_ciphertext text NOT NULL CHECK (char_length(document_ciphertext) BETWEEN 40 AND 40000),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published','revoked')),
  revision integer NOT NULL DEFAULT 1 CHECK (revision > 0),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX practitioner_express_reports_master_idx
  ON app.practitioner_express_reports(practitioner_account_id,created_at DESC,id DESC);
CREATE INDEX practitioner_express_reports_client_idx
  ON app.practitioner_express_reports(client_account_id,status,published_at DESC,id DESC);
CREATE INDEX practitioner_express_reports_request_idx
  ON app.practitioner_express_reports(request_id,created_at DESC);
ALTER TABLE app.practitioner_express_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.practitioner_express_reports FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.practitioner_express_reports FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON app.practitioner_express_reports TO hh_app_backend;

-- No site-wide master role. Possession of a report UUID gives no access.
CREATE POLICY express_report_master_select ON app.practitioner_express_reports
  FOR SELECT TO hh_app_backend
  USING (
    practitioner_account_id=(SELECT auth.uid()) AND
    (SELECT app_private.account_active()) AND
    EXISTS (SELECT 1 FROM app.practitioners p
      WHERE p.id=practitioner_id AND p.trusted_auth_user_id=(SELECT auth.uid())
        AND p.active AND p.status IN ('approved','submitted','changes_requested'))
  );
CREATE POLICY express_report_client_select ON app.practitioner_express_reports
  FOR SELECT TO hh_app_backend
  USING (
    status='published' AND client_account_id=(SELECT auth.uid()) AND
    (SELECT app_private.account_active())
  );
CREATE POLICY express_report_master_insert ON app.practitioner_express_reports
  FOR INSERT TO hh_app_backend
  WITH CHECK (
    practitioner_account_id=(SELECT auth.uid()) AND status='draft' AND
    revision=1 AND published_at IS NULL AND
    (SELECT app_private.account_active()) AND
    EXISTS (
      SELECT 1 FROM app.consultation_requests r
        JOIN app.practitioners p ON p.id=r.recipient_practitioner_id
      WHERE r.id=request_id AND r.account_id=client_account_id
        AND p.id=practitioner_id AND p.trusted_auth_user_id=(SELECT auth.uid())
        AND p.active AND p.status IN ('approved','submitted','changes_requested')
    )
  );
CREATE POLICY express_report_master_update ON app.practitioner_express_reports
  FOR UPDATE TO hh_app_backend
  USING (
    practitioner_account_id=(SELECT auth.uid()) AND
    (SELECT app_private.account_active()) AND
    EXISTS (SELECT 1 FROM app.practitioners p
      WHERE p.id=practitioner_id AND p.trusted_auth_user_id=(SELECT auth.uid())
        AND p.active AND p.status IN ('approved','submitted','changes_requested'))
  )
  WITH CHECK (
    practitioner_account_id=(SELECT auth.uid()) AND
    (SELECT app_private.account_active()) AND
    EXISTS (
      SELECT 1 FROM app.consultation_requests r
        JOIN app.practitioners p ON p.id=r.recipient_practitioner_id
      WHERE r.id=request_id AND r.account_id=client_account_id
        AND p.id=practitioner_id AND p.trusted_auth_user_id=(SELECT auth.uid())
        AND p.active AND p.status IN ('approved','submitted','changes_requested')
    )
  );
-- No DELETE and no PUBLIC/anon/authenticated grants.
