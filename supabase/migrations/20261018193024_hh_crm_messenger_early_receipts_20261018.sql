-- Holistic House CRM Messenger: persist provider receipts that precede send acknowledgement.
-- #985. Additive owner-isolated receipt store; only signed webhook SECURITY DEFINER can write.
CREATE TABLE app.crm_msg_receipts (
 owner_id uuid NOT NULL,
 account_id uuid NOT NULL,
 provider_hash text NOT NULL CHECK(length(provider_hash)=64),
 status text NOT NULL CHECK(status IN ('delivered','read','failed')),
 received_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,provider_hash),
 FOREIGN KEY(account_id,owner_id) REFERENCES app.crm_msg_accounts(id,owner_id) ON DELETE CASCADE
);
CREATE INDEX crm_msg_receipts_owner_recent ON app.crm_msg_receipts(owner_id,received_at DESC);
ALTER TABLE app.crm_msg_receipts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.crm_msg_receipts FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.crm_msg_receipts FROM PUBLIC,anon,authenticated;
GRANT SELECT ON app.crm_msg_receipts TO hh_crm_backend;
CREATE POLICY crm_msg_receipts_owner_read ON app.crm_msg_receipts FOR SELECT TO hh_crm_backend
 USING(owner_id=(select auth.uid()) AND (select app_private.account_active()));
CREATE OR REPLACE FUNCTION app_private.crm_msg_receipt(
 p_channel text,p_account_hash text,p_provider_hash text,p_state text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
 DECLARE v_account uuid;v_owner uuid;
 BEGIN
 IF p_state NOT IN ('delivered','read','failed') OR length(p_provider_hash)<>64 THEN RETURN false; END IF;
 SELECT a.id,a.owner_id INTO v_account,v_owner FROM app.crm_msg_accounts a
 WHERE a.channel=p_channel AND a.external_hash=p_account_hash AND a.enabled;
 IF v_account IS NULL THEN RETURN false; END IF;
 INSERT INTO app.crm_msg_receipts(owner_id,account_id,provider_hash,status)
 VALUES(v_owner,v_account,p_provider_hash,p_state)
 ON CONFLICT(account_id,provider_hash) DO UPDATE
 SET status=CASE
   WHEN app.crm_msg_receipts.status='failed' THEN 'failed'
   WHEN EXCLUDED.status='failed' THEN 'failed'
   WHEN app.crm_msg_receipts.status='read' OR EXCLUDED.status='read' THEN 'read'
   ELSE 'delivered' END,
 received_at=now();
 UPDATE app.crm_msg_items m SET status=
   CASE WHEN m.status IN ('failed','blocked') THEN m.status
        WHEN m.status='read' THEN 'read'
        WHEN p_state='failed' THEN 'failed'
        WHEN p_state='read' THEN 'read'
        WHEN p_state='delivered' THEN 'delivered' ELSE m.status END,
   updated_at=now()
 FROM app.crm_msg_threads t
 WHERE m.thread_id=t.id AND t.account_id=v_account AND m.owner_id=v_owner
 AND m.direction='out' AND m.provider_hash=p_provider_hash;
 RETURN true;
 END
 $$;
REVOKE ALL ON FUNCTION app_private.crm_msg_receipt(text,text,text,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION app_private.crm_msg_receipt(text,text,text,text) TO hh_app_inbox;
