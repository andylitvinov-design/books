-- Owner-only Telegram → AI Council / Agent Commander message routing.
-- Do not expose drafts or raw prompts to customer/anonymous APIs.
-- Never dispatch an agent or an AI model until explicit button selection.
BEGIN;

-- Preserve up to 2000 characters of the original user prompt, as already
-- supported by the signed owner Council question parser. No silent truncation.
ALTER TABLE app_private.cc_tasks
  DROP CONSTRAINT IF EXISTS cc_tasks_description_check;
ALTER TABLE app_private.cc_tasks
  ADD CONSTRAINT cc_tasks_description_check
  CHECK(length(description) BETWEEN 10 AND 2000);

CREATE TABLE IF NOT EXISTS app_private.telegram_owner_router_drafts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 practitioner_id uuid NOT NULL REFERENCES app.practitioners(id) ON DELETE CASCADE,
 source_update_id bigint NOT NULL UNIQUE CHECK(source_update_id>=0),
 kind text NOT NULL CHECK(kind IN ('text','voice')),
 payload_ciphertext text CHECK(payload_ciphertext IS NULL OR
   length(payload_ciphertext) BETWEEN 20 AND 18000),
 status text NOT NULL DEFAULT 'pending' CHECK(status IN
   ('pending','processing','sent','failed','expired')),
 chosen_target text CHECK(chosen_target IS NULL OR chosen_target IN ('council','commander')),
 claimed_update_id bigint CHECK(claimed_update_id IS NULL OR claimed_update_id>=0),
 task_id uuid REFERENCES app_private.cc_tasks(id) ON DELETE SET NULL,
 failure_code text CHECK(failure_code IS NULL OR
   (length(failure_code)<=72 AND failure_code ~ '^[A-Z0-9_]+$')),
 created_at timestamptz NOT NULL DEFAULT now(),
 expires_at timestamptz NOT NULL DEFAULT now()+interval '24 hours',
 settled_at timestamptz,
 CONSTRAINT owner_router_state_settled CHECK (
   (status IN ('pending','processing') AND settled_at IS NULL) OR
   (status IN ('sent','failed','expired') AND settled_at IS NOT NULL)
 )
);
CREATE INDEX IF NOT EXISTS owner_router_due_idx
 ON app_private.telegram_owner_router_drafts(expires_at)
 WHERE status='pending';
CREATE INDEX IF NOT EXISTS owner_router_recent_idx
 ON app_private.telegram_owner_router_drafts(created_at DESC);

REVOKE ALL ON app_private.telegram_owner_router_drafts
 FROM PUBLIC,anon,authenticated,hh_app_inbox,hh_crm_backend;
GRANT SELECT,INSERT,UPDATE ON app_private.telegram_owner_router_drafts
 TO hh_app_backend;
ALTER TABLE app_private.telegram_owner_router_drafts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.telegram_owner_router_drafts FORCE ROW LEVEL SECURITY;
CREATE POLICY hh_owner_router_private_backend ON app_private.telegram_owner_router_drafts
 FOR ALL TO hh_app_backend
 USING (
   current_setting('hh.owner_router',true)='1' AND
   practitioner_id='246aa1a3-a371-5a83-9f4b-cd23ff027a76'::uuid
 )
 WITH CHECK (
   current_setting('hh.owner_router',true)='1' AND
   practitioner_id='246aa1a3-a371-5a83-9f4b-cd23ff027a76'::uuid
 );
COMMENT ON TABLE app_private.telegram_owner_router_drafts IS
 'Owner-only encrypted pending Telegram text or voice metadata; 24h choice TTL, at-most-once target; prompt erased on settlement. No client data.';
COMMIT;
