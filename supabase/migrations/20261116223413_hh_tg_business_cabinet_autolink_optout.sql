-- Automatic verified Telegram OIDC → Cabinet association with durable opt-out.
-- Additive private schema only; apply once before enabling this feature.
BEGIN;
CREATE TABLE IF NOT EXISTS app_private.crm_tg_business_cabinet_optouts (
 account_id uuid PRIMARY KEY REFERENCES app.accounts(id) ON DELETE CASCADE,
 disabled_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_private.crm_tg_business_cabinet_optouts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.crm_tg_business_cabinet_optouts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE app_private.crm_tg_business_cabinet_optouts FROM PUBLIC, anon, authenticated;
GRANT SELECT,INSERT,DELETE ON app_private.crm_tg_business_cabinet_optouts TO hh_app_backend;
CREATE POLICY crm_tg_cabinet_optout_self_select
 ON app_private.crm_tg_business_cabinet_optouts FOR SELECT TO hh_app_backend
 USING ((select app_private.session_active()) AND account_id=(select auth.uid()));
CREATE POLICY crm_tg_cabinet_optout_self_insert
 ON app_private.crm_tg_business_cabinet_optouts FOR INSERT TO hh_app_backend
 WITH CHECK ((select app_private.session_active()) AND account_id=(select auth.uid()));
CREATE POLICY crm_tg_cabinet_optout_self_delete
 ON app_private.crm_tg_business_cabinet_optouts FOR DELETE TO hh_app_backend
 USING ((select app_private.session_active()) AND account_id=(select auth.uid()));
COMMENT ON TABLE app_private.crm_tg_business_cabinet_optouts IS
 'User disconnect remains in force on subsequent website logins and Telegram requests.';
COMMIT;
