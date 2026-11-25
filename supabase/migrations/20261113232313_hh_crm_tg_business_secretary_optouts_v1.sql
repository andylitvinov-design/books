-- Holistic House one secretary: persistent STOP for Business chats without orders.
-- Apply only after parent #4522 private business session migration succeeds.
BEGIN;
CREATE TABLE IF NOT EXISTS app_private.crm_tg_business_secretary_optouts (
  business_hash text NOT NULL CHECK (business_hash ~ '^[a-f0-9]{64}$'),
  user_hash text NOT NULL CHECK (user_hash ~ '^[a-f0-9]{64}$'),
  stopped_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (business_hash,user_hash)
);
ALTER TABLE app_private.crm_tg_business_secretary_optouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.crm_tg_business_secretary_optouts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.crm_tg_business_secretary_optouts
  FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend,hh_app_inbox;
GRANT SELECT,INSERT ON app_private.crm_tg_business_secretary_optouts TO hh_app_inbox;
CREATE POLICY crm_tg_business_secretary_inbox_only
 ON app_private.crm_tg_business_secretary_optouts FOR ALL TO hh_app_inbox
 USING(true) WITH CHECK(true);
COMMENT ON TABLE app_private.crm_tg_business_secretary_optouts IS
 'Signed Telegram Business Chat Automation stop suppressions; server-HMAC identifiers only, no chat text, contacts or health information. STOP is terminal, no marketing consent.';
COMMIT;
