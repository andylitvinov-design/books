-- Owner-only business follow-ups for the actual assigned practitioner.
-- No patient records, automatic sends, or public/client access.
CREATE TABLE app.practitioner_request_tasks(
 id uuid PRIMARY KEY,
 request_id uuid NOT NULL REFERENCES app.consultation_requests(id) ON DELETE CASCADE,
 practitioner_account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
 kind text NOT NULL CHECK(kind IN ('reply','call','booking','check_in','general')),
 due_on date NOT NULL,
 status text NOT NULL DEFAULT 'open' CHECK(status IN ('open','done')),
 revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 completed_at timestamptz,
 CHECK ((status='done' AND completed_at IS NOT NULL) OR (status='open' AND completed_at IS NULL))
);
CREATE INDEX practitioner_request_tasks_due_idx ON app.practitioner_request_tasks(practitioner_account_id,status,due_on,id);
CREATE INDEX practitioner_request_tasks_request_idx ON app.practitioner_request_tasks(request_id,created_at DESC,id DESC);
ALTER TABLE app.practitioner_request_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.practitioner_request_tasks FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.practitioner_request_tasks FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT,UPDATE ON app.practitioner_request_tasks TO hh_app_backend;
CREATE POLICY practitioner_request_tasks_select ON app.practitioner_request_tasks
 FOR SELECT TO hh_app_backend
 USING (practitioner_account_id=(SELECT auth.uid())
 AND (SELECT app_private.account_active()) AND EXISTS(
  SELECT 1 FROM app.consultation_requests r JOIN app.practitioners p ON p.id=r.recipient_practitioner_id
  WHERE r.id=practitioner_request_tasks.request_id AND p.trusted_auth_user_id=(SELECT auth.uid())
    AND p.active AND p.status IN ('approved','submitted','changes_requested')));
CREATE POLICY practitioner_request_tasks_insert ON app.practitioner_request_tasks
 FOR INSERT TO hh_app_backend
 WITH CHECK (practitioner_account_id=(SELECT auth.uid()) AND status='open' AND revision=0 AND completed_at IS NULL
 AND (SELECT app_private.account_active()) AND EXISTS(
  SELECT 1 FROM app.consultation_requests r JOIN app.practitioners p ON p.id=r.recipient_practitioner_id
  WHERE r.id=practitioner_request_tasks.request_id AND p.trusted_auth_user_id=(SELECT auth.uid())
    AND p.active AND p.status IN ('approved','submitted','changes_requested')));
CREATE POLICY practitioner_request_tasks_update ON app.practitioner_request_tasks
 FOR UPDATE TO hh_app_backend
 USING (practitioner_account_id=(SELECT auth.uid())
 AND (SELECT app_private.account_active()) AND EXISTS(
  SELECT 1 FROM app.consultation_requests r JOIN app.practitioners p ON p.id=r.recipient_practitioner_id
  WHERE r.id=practitioner_request_tasks.request_id AND p.trusted_auth_user_id=(SELECT auth.uid())
    AND p.active AND p.status IN ('approved','submitted','changes_requested')))
 WITH CHECK (practitioner_account_id=(SELECT auth.uid())
 AND (SELECT app_private.account_active()) AND EXISTS(
  SELECT 1 FROM app.consultation_requests r JOIN app.practitioners p ON p.id=r.recipient_practitioner_id
  WHERE r.id=practitioner_request_tasks.request_id AND p.trusted_auth_user_id=(SELECT auth.uid())
    AND p.active AND p.status IN ('approved','submitted','changes_requested')));
