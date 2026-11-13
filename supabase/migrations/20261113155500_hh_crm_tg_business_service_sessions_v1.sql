-- Scoped, minimal Telegram Business @holistichouse Service Request state.
-- Signed existing @holistichouse_bot webhook; no plaintext user/chat/health data.
-- The normal official bot diagnostic, its consent state and CRM remain untouched.
BEGIN;
CREATE TABLE IF NOT EXISTS app_private.crm_tg_business_service_sessions (
 business_hash text NOT NULL CHECK (business_hash ~ '^[a-f0-9]{64}$'),
 user_hash text NOT NULL CHECK (user_hash ~ '^[a-f0-9]{64}$'),
 operation_id uuid NOT NULL DEFAULT gen_random_uuid(),
 practitioner_id uuid NOT NULL REFERENCES app.practitioners(id),
 service_key text NOT NULL CHECK (service_key IN ('homeopathy','coaching','reiki','constellations','business')),
 locale text NOT NULL CHECK (locale IN ('ru','en','es')),
 delivery_format text CHECK (delivery_format IN ('online','inperson','async')),
 stage text NOT NULL DEFAULT 'format' CHECK (stage IN
   ('format','confirm','committing','submitted','cancelled','stopped')),
 last_update_id bigint NOT NULL CHECK (last_update_id>=0),
 consent_at timestamptz,
 reference_code text CHECK (reference_code ~ '^HH-[A-F0-9]{12}$'),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (business_hash,user_hash),
 UNIQUE (operation_id),
 CONSTRAINT tg_business_confirmed_requires_consent CHECK (
   stage NOT IN ('committing','submitted') OR
   (consent_at IS NOT NULL AND delivery_format IS NOT NULL)
 ),
 CONSTRAINT tg_business_submitted_reference CHECK (
   stage <> 'submitted' OR reference_code IS NOT NULL
 )
);
CREATE INDEX IF NOT EXISTS crm_tg_business_sessions_stale_idx
 ON app_private.crm_tg_business_service_sessions(updated_at);

ALTER TABLE app_private.crm_tg_business_service_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.crm_tg_business_service_sessions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.crm_tg_business_service_sessions
 FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend,hh_app_inbox;
-- Only the already signed official Telegram webhook may stage or revoke requests.
GRANT SELECT,INSERT,UPDATE ON app_private.crm_tg_business_service_sessions TO hh_app_inbox;
CREATE POLICY crm_tg_business_service_signed_inbox
 ON app_private.crm_tg_business_service_sessions FOR ALL TO hh_app_inbox
 USING(true) WITH CHECK(true);
-- The existing first-party server role may validate ONLY the exact explicitly
-- confirmed request during a transaction which sets a matching operation scope.
-- It cannot mutate this state or enumerate other customers.
GRANT SELECT ON app_private.crm_tg_business_service_sessions TO hh_app_backend;
CREATE POLICY crm_tg_business_service_committing_proof
 ON app_private.crm_tg_business_service_sessions FOR SELECT TO hh_app_backend
 USING(operation_id::text = current_setting('hh.tg_business_operation',true)
   AND stage='committing' AND consent_at IS NOT NULL
   AND consent_at>now()-interval '15 minutes');
COMMENT ON TABLE app_private.crm_tg_business_service_sessions IS
 'Opt-in Telegram Business session: keyed hashes, public service/locale/format, no raw Telegram identity, message or medical information. Signed webhook only; confirmed server read is operation-scoped.';
COMMIT;
