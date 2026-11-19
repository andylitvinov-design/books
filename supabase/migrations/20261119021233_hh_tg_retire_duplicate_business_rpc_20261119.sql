-- Canonical Business bridge: app_private.crm_tg_business_lead_capture_v1.
-- Historical duplicate may have been dropped by a separate owner-scoped cleanup.
-- Replay safely if absent; no table grants or Business state changes.
BEGIN;
DO $guard$
BEGIN
  IF pg_catalog.to_regprocedure(
    'app_private.crm_tg_business_lead_ingest(uuid,uuid,text,text,text)'
  ) IS NOT NULL THEN
    REVOKE ALL ON FUNCTION app_private.crm_tg_business_lead_ingest(
      uuid,uuid,text,text,text
    ) FROM hh_app_inbox;
    COMMENT ON FUNCTION app_private.crm_tg_business_lead_ingest(
      uuid,uuid,text,text,text
    ) IS 'Retired duplicate; canonical Telegram Business capture is crm_tg_business_lead_capture_v1.';
  END IF;
END
$guard$;
COMMIT;
