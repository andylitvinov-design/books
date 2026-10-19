-- Minimal audit for explicit CRM owner data export, no PII in audit records.
-- Owner's CRM business contact export remains encrypted in the source table;
-- this table records when the owner requested a download and how many rows.
CREATE TABLE app.crm_data_exports (
  id uuid PRIMARY KEY,
  owner_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope='business_contacts'),
  format text NOT NULL CHECK (format='csv'),
  record_count integer NOT NULL CHECK (record_count BETWEEN 0 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX crm_data_exports_owner_recent_idx
 ON app.crm_data_exports(owner_id,created_at DESC,id DESC);
ALTER TABLE app.crm_data_exports ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.crm_data_exports FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.crm_data_exports FROM public,anon,authenticated;
GRANT SELECT,INSERT ON app.crm_data_exports TO hh_crm_backend;
CREATE POLICY crm_data_exports_owner_read ON app.crm_data_exports
 FOR SELECT TO hh_crm_backend
 USING(owner_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY crm_data_exports_owner_create ON app.crm_data_exports
 FOR INSERT TO hh_crm_backend
 WITH CHECK(owner_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
