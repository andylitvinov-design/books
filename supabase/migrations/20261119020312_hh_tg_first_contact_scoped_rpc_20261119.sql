-- Signed Telegram first-contact CRM: minimal owner-scoped bridge.
-- No broad hh_app_inbox grants, no raw messages/photos, no marketing consent,
-- no second CRM, no new provider, bot, or scheduled job.
BEGIN;

CREATE OR REPLACE FUNCTION app_private.crm_tg_first_contact_opportunity(
  p_account_hash text, p_user_hash text
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE v_owner uuid; v_contact uuid;
BEGIN
  IF p_account_hash IS NULL OR p_account_hash !~ '^[a-f0-9]{64}$'
     OR p_user_hash IS NULL OR p_user_hash !~ '^[a-f0-9]{64}$' THEN
    RETURN false;
  END IF;
  -- Only an already-ingested, non-suppressed Telegram CRM thread authorizes
  -- creating one generic opportunity. The hashes never identify a user publicly.
  SELECT t.owner_id,t.contact_id INTO v_owner,v_contact
  FROM app.crm_msg_accounts a
  JOIN app.accounts owner_account ON owner_account.id=a.owner_id
    AND owner_account.status='active'
  JOIN app.crm_msg_threads t ON t.account_id=a.id AND t.owner_id=a.owner_id
  JOIN app.crm_contacts c ON c.id=t.contact_id AND c.owner_id=t.owner_id
  WHERE a.channel='telegram' AND a.enabled
    AND a.external_hash=p_account_hash AND t.user_hash=p_user_hash
    AND NOT t.suppressed AND NOT c.suppressed
  LIMIT 1;
  IF v_contact IS NULL THEN RETURN false; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner::text||':telegram-lead:'||v_contact::text,0));
  -- Recheck after the lock: an explicit STOP must always win.
  IF NOT EXISTS(
    SELECT 1 FROM app.crm_msg_threads t
    JOIN app.crm_contacts c ON c.id=t.contact_id AND c.owner_id=t.owner_id
    WHERE t.owner_id=v_owner AND t.contact_id=v_contact
      AND t.user_hash=p_user_hash AND NOT t.suppressed AND NOT c.suppressed
  ) THEN RETURN false; END IF;
  INSERT INTO app.crm_opportunities
    (id,owner_id,contact_id,service,stage,operation_id)
  SELECT pg_catalog.gen_random_uuid(),v_owner,v_contact,'other','new',
    pg_catalog.gen_random_uuid()
  WHERE NOT EXISTS(
    SELECT 1 FROM app.crm_opportunities o
    WHERE o.owner_id=v_owner AND o.contact_id=v_contact
  );
  RETURN true;
END;
$fn$;

CREATE OR REPLACE FUNCTION app_private.crm_tg_business_lead_ingest(
  p_owner uuid, p_new_contact uuid, p_contact_cipher text,
  p_contact_hash text, p_locale text
) RETURNS text
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE v_contact uuid; v_suppressed boolean; v_created boolean:=false;
BEGIN
  IF p_owner IS NULL OR p_new_contact IS NULL
     OR p_contact_hash IS NULL OR p_contact_hash !~ '^[a-f0-9]{64}$'
     OR p_contact_cipher IS NULL OR length(p_contact_cipher) NOT BETWEEN 20 AND 12000
     OR p_locale NOT IN ('ru','en','es') THEN RETURN 'invalid'; END IF;
  -- The webhook already verified official can_reply and the owner; the DB
  -- independently bounds this operation to an active, connected Telegram owner.
  IF NOT EXISTS(
    SELECT 1 FROM app.crm_msg_accounts a
    JOIN app.accounts owner_account ON owner_account.id=a.owner_id
      AND owner_account.status='active'
    WHERE a.owner_id=p_owner AND a.channel='telegram' AND a.enabled
  ) THEN RETURN 'unavailable'; END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner::text||':tg-business-lead:'||p_contact_hash,0));
  SELECT c.id,c.suppressed INTO v_contact,v_suppressed
    FROM app.crm_contacts c
    WHERE c.owner_id=p_owner AND c.email_hash=p_contact_hash LIMIT 1 FOR UPDATE;
  IF v_suppressed IS TRUE THEN RETURN 'suppressed'; END IF;
  IF v_contact IS NULL THEN
    v_contact:=p_new_contact;
    INSERT INTO app.crm_contacts
      (id,owner_id,contact_ciphertext,email_hash,locale,lifecycle,source)
    VALUES (v_contact,p_owner,p_contact_cipher,p_contact_hash,p_locale,'lead','other');
    INSERT INTO app.crm_activity(id,owner_id,contact_id,kind)
    VALUES(pg_catalog.gen_random_uuid(),p_owner,v_contact,'contact_created');
    v_created:=true;
  END IF;
  INSERT INTO app.crm_opportunities
    (id,owner_id,contact_id,service,stage,operation_id)
  SELECT pg_catalog.gen_random_uuid(),p_owner,v_contact,'other','new',
    pg_catalog.gen_random_uuid()
  WHERE NOT EXISTS(
    SELECT 1 FROM app.crm_opportunities o
    WHERE o.owner_id=p_owner AND o.contact_id=v_contact
  );
  RETURN CASE WHEN v_created THEN 'created' ELSE 'existing' END;
END;
$fn$;

REVOKE ALL ON FUNCTION app_private.crm_tg_first_contact_opportunity(text,text)
  FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend;
REVOKE ALL ON FUNCTION app_private.crm_tg_business_lead_ingest(uuid,uuid,text,text,text)
  FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.crm_tg_first_contact_opportunity(text,text)
  TO hh_app_inbox;
GRANT EXECUTE ON FUNCTION app_private.crm_tg_business_lead_ingest(uuid,uuid,text,text,text)
  TO hh_app_inbox;
COMMENT ON FUNCTION app_private.crm_tg_first_contact_opportunity(text,text) IS
  'Signed Telegram-only, non-suppressed CRM thread → one generic opportunity. Private inbox RPC; no message or health data.';
COMMENT ON FUNCTION app_private.crm_tg_business_lead_ingest(uuid,uuid,text,text,text) IS
  'Signed verified Telegram Business first contact → deduplicated encrypted lead and generic opportunity. No general CRM table grants.';
COMMIT;
