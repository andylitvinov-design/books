-- UNAPPLIED proposal. Depends on separately approved billing and CRM schemas.
-- Explicit security approval and cross-owner/default-deny integration tests required.
DO $$ BEGIN RAISE EXCEPTION 'UNAPPLIED CRM BILLING REGISTRY PROPOSAL'; END $$;
BEGIN;
CREATE TABLE billing_private.crm_reader_owners (
  account_id uuid PRIMARY KEY,
  approved_at timestamptz NOT NULL DEFAULT now()
);
REVOKE ALL ON billing_private.crm_reader_owners FROM PUBLIC,anon,authenticated,
  hh_app_backend,hh_app_inbox,hh_billing_backend,hh_crm_backend;
ALTER TABLE billing_private.crm_reader_owners ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_private.crm_reader_owners FORCE ROW LEVEL SECURITY;
-- No runtime policy and NO auto-provisioned row. A separate reviewed migration
-- may insert the exact verified owner UUID; an empty table denies every request.
-- Invoker-only RLS would require broad cross-owner billing grants. This helper
-- instead returns only seven fixed operational fields, never PII or clinical data.
CREATE FUNCTION billing_private.crm_subscription_summary()
RETURNS TABLE(subscriber_id uuid,provider text,environment text,status text,
  paid_through_at timestamptz,cancel_at_period_end boolean,updated_at timestamptz)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
BEGIN
  IF auth.uid() IS NULL OR NOT app_private.session_active()
    OR NOT app_private.account_active()
    OR NOT EXISTS(SELECT 1 FROM billing_private.crm_reader_owners r WHERE r.account_id=auth.uid())
  THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='ACCESS_DENIED'; END IF;
  RETURN QUERY SELECT s.owner_id,s.provider,s.environment,s.status,s.paid_through_at,
    s.cancel_at_period_end,s.updated_at
  FROM billing_private.subscriptions s WHERE s.is_current
  ORDER BY s.updated_at DESC,s.owner_id LIMIT 100;
END $$;
REVOKE ALL ON FUNCTION billing_private.crm_subscription_summary()
  FROM PUBLIC,anon,authenticated,hh_app_backend,hh_app_inbox,hh_billing_backend;
GRANT USAGE ON SCHEMA billing_private TO hh_crm_backend;
GRANT EXECUTE ON FUNCTION billing_private.crm_subscription_summary() TO hh_crm_backend;
-- No billing table SELECT grant and no runtime allowlist mutation grant.
-- Function/table owner must remain the reviewed migration owner with the ability
-- to read these FORCE-RLS relations, never a runtime role. Inspect ownership and
-- inherited/public grants, rather than changing RLS to work around a denied call.
COMMIT;
