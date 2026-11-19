-- One narrowly scoped, private privileged boundary for officially verified
-- Telegram Business first-contact lead capture. No new provider/marketing opt-in.
-- Must be called only by the existing signed webhook after can_reply proof.
-- No direct CRM table grant to the unprivileged hh_app_inbox role.
BEGIN;
CREATE OR REPLACE FUNCTION app_private.crm_tg_business_lead_capture_v1(
 p_practitioner_id uuid, p_owner_id uuid, p_email_hash text, p_locale text,
 p_contact_id uuid, p_contact_ciphertext text,
 p_opportunity_id uuid, p_operation_id uuid, p_activity_id uuid)
RETURNS TABLE(created boolean,suppressed boolean)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
  v_owner uuid;
  v_contact uuid;
  v_suppressed boolean := false;
  v_created boolean := false;
BEGIN
  IF p_practitioner_id IS NULL OR p_owner_id IS NULL OR
     p_contact_id IS NULL OR p_opportunity_id IS NULL OR
     p_operation_id IS NULL OR p_activity_id IS NULL OR
     coalesce(p_email_hash,'') !~ '^[a-f0-9]{64}$' OR
     coalesce(p_locale,'') NOT IN ('en','ru','es') OR
     length(coalesce(p_contact_ciphertext,'')) NOT BETWEEN 40 AND 12000
  THEN RAISE EXCEPTION 'HH_TG_LEAD_INVALID' USING ERRCODE='22023'; END IF;
  SELECT p.trusted_auth_user_id INTO v_owner
    FROM app.practitioners p
    JOIN app.accounts a ON a.id=p.trusted_auth_user_id AND a.status='active'
   WHERE p.id=p_practitioner_id AND p.trusted_auth_user_id=p_owner_id
     AND p.active AND p.status IN ('approved','submitted','changes_requested')
     AND p.public_profile <> '{}'::jsonb
   LIMIT 1;
  IF v_owner IS NULL THEN
    RAISE EXCEPTION 'HH_TG_LEAD_OWNER_UNCONFIRMED' USING ERRCODE='42501';
  END IF;
  PERFORM pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(v_owner::text||':telegram-lead:'||p_email_hash,0));
  SELECT c.id,c.suppressed INTO v_contact,v_suppressed
    FROM app.crm_contacts c WHERE owner_id=v_owner AND email_hash=p_email_hash LIMIT 1;
  IF coalesce(v_suppressed,false) THEN
    RETURN QUERY SELECT false,true;
    RETURN;
  END IF;
  IF v_contact IS NULL THEN
    INSERT INTO app.crm_contacts
      (id,owner_id,contact_ciphertext,email_hash,locale,lifecycle,source)
    VALUES (p_contact_id,v_owner,p_contact_ciphertext,p_email_hash,p_locale,'lead','other')
    ON CONFLICT (owner_id,email_hash) DO NOTHING
    RETURNING id INTO v_contact;
    IF v_contact IS NOT NULL THEN
      v_created:=true;
      INSERT INTO app.crm_activity(id,owner_id,contact_id,kind)
      VALUES (p_activity_id,v_owner,v_contact,'contact_created');
    ELSE
      SELECT c.id,c.suppressed INTO v_contact,v_suppressed FROM app.crm_contacts c
       WHERE owner_id=v_owner AND email_hash=p_email_hash LIMIT 1;
      IF v_contact IS NULL THEN
        RAISE EXCEPTION 'HH_TG_LEAD_CONTACT_UNCONFIRMED' USING ERRCODE='23505';
      END IF;
      IF coalesce(v_suppressed,false) THEN
        RETURN QUERY SELECT false,true;
        RETURN;
      END IF;
    END IF;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM app.crm_opportunities
    WHERE owner_id=v_owner AND contact_id=v_contact) THEN
    INSERT INTO app.crm_opportunities
      (id,owner_id,contact_id,service,stage,operation_id)
    VALUES (p_opportunity_id,v_owner,v_contact,'other','new',p_operation_id);
  END IF;
  RETURN QUERY SELECT v_created,false;
END
$fn$;
REVOKE ALL ON FUNCTION app_private.crm_tg_business_lead_capture_v1(
 uuid,uuid,text,text,uuid,text,uuid,uuid,uuid)
 FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.crm_tg_business_lead_capture_v1(
 uuid,uuid,text,text,uuid,text,uuid,uuid,uuid) TO hh_app_inbox;
COMMENT ON FUNCTION app_private.crm_tg_business_lead_capture_v1(
 uuid,uuid,text,text,uuid,text,uuid,uuid,uuid)
 IS 'One verified owner Telegram Business lead, no marketing consent, no raw IDs, neutral created/suppressed receipt. Privileged function restricted to signed inbox role.';
COMMIT;
