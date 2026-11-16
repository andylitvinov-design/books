-- Additive official Meta signed-webhook account link; NOT standalone phone login.
CREATE TABLE app_private.crm_whatsapp_link_challenges (
  account_id uuid PRIMARY KEY REFERENCES app.accounts(id) ON DELETE CASCADE,
  token_hash text NOT NULL UNIQUE CHECK (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_private.crm_whatsapp_link_challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.crm_whatsapp_link_challenges FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.crm_whatsapp_link_challenges FROM PUBLIC,anon,authenticated,service_role,hh_app_inbox,hh_crm_backend;
GRANT SELECT,INSERT,UPDATE,DELETE ON app_private.crm_whatsapp_link_challenges TO hh_app_backend;
CREATE POLICY hh_wa_challenge_self ON app_private.crm_whatsapp_link_challenges FOR ALL TO hh_app_backend
 USING(account_id=(select auth.uid()) AND (select app_private.session_active()))
 WITH CHECK(account_id=(select auth.uid()) AND (select app_private.session_active()));
CREATE TABLE app_private.crm_google_whatsapp_links (
 account_id uuid PRIMARY KEY REFERENCES app.accounts(id) ON DELETE CASCADE,
 crm_owner_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
 business_hash text NOT NULL CHECK(business_hash ~ '^[0-9a-f]{64}$'),
 user_hash text NOT NULL CHECK(user_hash ~ '^[0-9a-f]{64}$'),
 notice_version text NOT NULL DEFAULT 'hh-whatsapp-account-link-v1'
   CHECK(notice_version='hh-whatsapp-account-link-v1'),
 linked_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(business_hash,user_hash)
);
CREATE INDEX hh_wa_link_owner_lookup ON app_private.crm_google_whatsapp_links(crm_owner_id,business_hash,user_hash);
ALTER TABLE app_private.crm_google_whatsapp_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.crm_google_whatsapp_links FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.crm_google_whatsapp_links FROM PUBLIC,anon,authenticated,service_role,hh_app_inbox;
GRANT SELECT,DELETE ON app_private.crm_google_whatsapp_links TO hh_app_backend;
GRANT SELECT ON app_private.crm_google_whatsapp_links TO hh_crm_backend;
CREATE POLICY hh_wa_link_self_read ON app_private.crm_google_whatsapp_links FOR SELECT TO hh_app_backend
 USING(account_id=(select auth.uid()) AND (select app_private.session_active()));
CREATE POLICY hh_wa_link_self_delete ON app_private.crm_google_whatsapp_links FOR DELETE TO hh_app_backend
 USING(account_id=(select auth.uid()) AND (select app_private.session_active()));
CREATE POLICY hh_wa_link_owner_read ON app_private.crm_google_whatsapp_links FOR SELECT TO hh_crm_backend
 USING(crm_owner_id=(select auth.uid()) AND (select app_private.account_active()));
CREATE FUNCTION app_private.crm_whatsapp_claim_verified(p_token_hash text,p_business_hash text,p_user_hash text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_account uuid;v_owner uuid;
BEGIN
 IF p_token_hash !~ '^[0-9a-f]{64}$' OR p_business_hash !~ '^[0-9a-f]{64}$'
  OR p_user_hash !~ '^[0-9a-f]{64}$' THEN RETURN false;END IF;
 SELECT business.owner_id INTO v_owner
 FROM app.crm_msg_accounts business JOIN app.accounts owner_account ON owner_account.id=business.owner_id
 WHERE business.channel='whatsapp' AND business.enabled AND business.external_hash=p_business_hash
  AND owner_account.status='active' AND owner_account.onboarding_state='active' LIMIT 1;
 IF v_owner IS NULL THEN RETURN false;END IF;
 DELETE FROM app_private.crm_whatsapp_link_challenges challenge USING app.accounts client
 WHERE challenge.token_hash=p_token_hash AND challenge.expires_at>clock_timestamp()
  AND client.id=challenge.account_id AND client.status='active' AND client.onboarding_state='active'
 RETURNING challenge.account_id INTO v_account;
 IF v_account IS NULL THEN RETURN false;END IF;
 INSERT INTO app_private.crm_google_whatsapp_links(account_id,crm_owner_id,business_hash,user_hash,notice_version)
 VALUES(v_account,v_owner,p_business_hash,p_user_hash,'hh-whatsapp-account-link-v1')
 ON CONFLICT(account_id) DO UPDATE SET crm_owner_id=excluded.crm_owner_id,
  business_hash=excluded.business_hash,user_hash=excluded.user_hash,
  notice_version=excluded.notice_version,linked_at=now();
 RETURN true;
EXCEPTION WHEN unique_violation THEN RETURN false;
END $fn$;
REVOKE ALL ON FUNCTION app_private.crm_whatsapp_claim_verified(text,text,text)
 FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.crm_whatsapp_claim_verified(text,text,text) TO hh_app_inbox;
CREATE FUNCTION app_private.crm_whatsapp_revoke_verified(p_business_hash text,p_user_hash text,p_sent_at timestamptz)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE v_count integer;
BEGIN
 IF p_business_hash !~ '^[0-9a-f]{64}$' OR p_user_hash !~ '^[0-9a-f]{64}$'
  OR p_sent_at IS NULL OR p_sent_at>clock_timestamp()+interval '60 seconds'
  OR p_sent_at<clock_timestamp()-interval '30 days' THEN RETURN false;END IF;
 -- Delayed/replayed STOP predating a newer link cannot revoke the new link.
 DELETE FROM app_private.crm_google_whatsapp_links
 WHERE business_hash=p_business_hash AND user_hash=p_user_hash
   AND linked_at<p_sent_at+interval '1 second';
 GET DIAGNOSTICS v_count=ROW_COUNT;
 RETURN v_count>0;
END $fn$;
REVOKE ALL ON FUNCTION app_private.crm_whatsapp_revoke_verified(text,text,timestamptz)
 FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.crm_whatsapp_revoke_verified(text,text,timestamptz) TO hh_app_inbox;
