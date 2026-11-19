-- The first-contact bridge migration was applied before the separate, reviewed
-- official Telegram Business capture #5061. The older helper is unused and
-- must not remain an unnecessary SECURITY DEFINER attack surface.
BEGIN;
DROP FUNCTION IF EXISTS app_private.crm_tg_business_lead_ingest(uuid,uuid,text,text,text);
COMMIT;
