-- One existing report model for verified signed-in consultations OR an explicitly
-- Google-claimed free express enquiry. No name/phone/email matching.
BEGIN;

-- Migration 20261026164817 (owner account reply) already added this column
-- and its owner SELECT policy. Do not duplicate either object.
UPDATE app_private.free_express_account_links l
SET recipient_practitioner_id=e.recipient_practitioner_id
FROM app.public_service_enquiries e
WHERE e.id=l.enquiry_id AND l.recipient_practitioner_id IS NULL;

-- Backwards-compatible with a READY Vercel build still inserting four columns.
-- DB derives and validates the recipient, never trusts a browser identity.
CREATE FUNCTION app_private.free_express_link_practitioner()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $func$
DECLARE expected_id uuid;
BEGIN
  SELECT e.recipient_practitioner_id INTO expected_id
    FROM app.public_service_enquiries e WHERE e.id=NEW.enquiry_id;
  IF expected_id IS NULL OR
     (NEW.recipient_practitioner_id IS NOT NULL AND
      NEW.recipient_practitioner_id<>expected_id) THEN
    RAISE EXCEPTION 'INVALID_FREE_EXPRESS_PRACTITIONER';
  END IF;
  NEW.recipient_practitioner_id:=expected_id;
  RETURN NEW;
END;
$func$;
REVOKE ALL ON FUNCTION app_private.free_express_link_practitioner()
  FROM PUBLIC,anon,authenticated,hh_app_inbox,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.free_express_link_practitioner()
  TO hh_app_backend;
CREATE TRIGGER free_express_link_practitioner_before_insert
BEFORE INSERT ON app_private.free_express_account_links
FOR EACH ROW EXECUTE FUNCTION app_private.free_express_link_practitioner();

ALTER TABLE app_private.free_express_account_links
  ALTER COLUMN recipient_practitioner_id SET NOT NULL;

ALTER TABLE app.practitioner_express_reports
  ALTER COLUMN request_id DROP NOT NULL;
ALTER TABLE app.practitioner_express_reports
  ADD COLUMN public_enquiry_id uuid REFERENCES app.public_service_enquiries(id) ON DELETE CASCADE;
ALTER TABLE app.practitioner_express_reports
  ADD COLUMN sent_at timestamptz;
ALTER TABLE app.practitioner_express_reports
  ADD CONSTRAINT hh_express_report_exactly_one_request
  CHECK ((request_id IS NOT NULL) <> (public_enquiry_id IS NOT NULL));
CREATE INDEX practitioner_express_reports_public_enquiry_idx
  ON app.practitioner_express_reports(public_enquiry_id,created_at DESC)
  WHERE public_enquiry_id IS NOT NULL;
CREATE INDEX practitioner_express_reports_client_sent_idx
  ON app.practitioner_express_reports(client_account_id,sent_at DESC)
  WHERE status='published' AND sent_at IS NOT NULL;

DROP POLICY IF EXISTS express_report_master_insert ON app.practitioner_express_reports;
CREATE POLICY express_report_master_insert ON app.practitioner_express_reports
FOR INSERT TO hh_app_backend
WITH CHECK (
  practitioner_account_id=(SELECT auth.uid()) AND
  status='draft' AND revision=1 AND published_at IS NULL AND sent_at IS NULL AND
  (SELECT app_private.account_active()) AND
  EXISTS (SELECT 1 FROM app.practitioners p
    WHERE p.id=practitioner_id AND p.trusted_auth_user_id=(SELECT auth.uid())
      AND p.active AND p.status IN ('approved','submitted','changes_requested')) AND
  (
    (request_id IS NOT NULL AND public_enquiry_id IS NULL AND
      EXISTS (SELECT 1 FROM app.consultation_requests r
        WHERE r.id=request_id AND r.account_id=client_account_id
          AND r.recipient_practitioner_id=practitioner_id))
    OR
    (request_id IS NULL AND public_enquiry_id IS NOT NULL AND
      EXISTS (SELECT 1 FROM app_private.free_express_account_links l
        JOIN app.public_service_enquiries e ON e.id=l.enquiry_id
        WHERE l.enquiry_id=public_enquiry_id AND l.account_id=client_account_id
          AND l.recipient_practitioner_id=practitioner_id
          AND e.recipient_practitioner_id=practitioner_id
          AND e.source_path ~ '^/(en|ru|es)/services/free-situation-review$'))
  )
);

DROP POLICY IF EXISTS express_report_master_update ON app.practitioner_express_reports;
CREATE POLICY express_report_master_update ON app.practitioner_express_reports
FOR UPDATE TO hh_app_backend
USING (
  practitioner_account_id=(SELECT auth.uid()) AND
  (SELECT app_private.account_active()) AND
  EXISTS (SELECT 1 FROM app.practitioners p
    WHERE p.id=practitioner_id AND p.trusted_auth_user_id=(SELECT auth.uid())
      AND p.active AND p.status IN ('approved','submitted','changes_requested'))
)
WITH CHECK (
  practitioner_account_id=(SELECT auth.uid()) AND
  (SELECT app_private.account_active()) AND
  EXISTS (SELECT 1 FROM app.practitioners p
    WHERE p.id=practitioner_id AND p.trusted_auth_user_id=(SELECT auth.uid())
      AND p.active AND p.status IN ('approved','submitted','changes_requested')) AND
  (
    (request_id IS NOT NULL AND public_enquiry_id IS NULL AND
      EXISTS (SELECT 1 FROM app.consultation_requests r
        WHERE r.id=request_id AND r.account_id=client_account_id
          AND r.recipient_practitioner_id=practitioner_id))
    OR
    (request_id IS NULL AND public_enquiry_id IS NOT NULL AND
      EXISTS (SELECT 1 FROM app_private.free_express_account_links l
        JOIN app.public_service_enquiries e ON e.id=l.enquiry_id
        WHERE l.enquiry_id=public_enquiry_id AND l.account_id=client_account_id
          AND l.recipient_practitioner_id=practitioner_id
          AND e.recipient_practitioner_id=practitioner_id
          AND e.source_path ~ '^/(en|ru|es)/services/free-situation-review$'))
  )
);

-- Each outgoing neutral Telegram alert is claimed at most once, regardless
-- of retries/timeouts. This table never contains report text or link secrets.
CREATE TABLE app_private.express_report_telegram_dispatch (
  report_id uuid PRIMARY KEY REFERENCES app.practitioner_express_reports(id) ON DELETE CASCADE,
  recipient_account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  chat_hash text NOT NULL CHECK(chat_hash ~ '^[0-9a-f]{64}$'),
  state text NOT NULL DEFAULT 'claimed'
    CHECK(state IN ('claimed','accepted','failed','suppressed')),
  provider_message_id text CHECK(provider_message_id IS NULL OR length(provider_message_id)<=64),
  claimed_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_private.express_report_telegram_dispatch ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.express_report_telegram_dispatch FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.express_report_telegram_dispatch
  FROM PUBLIC,anon,authenticated,hh_app_backend,hh_app_inbox,hh_crm_backend;

CREATE FUNCTION app_private.express_report_tg_claim(p_report_id uuid)
RETURNS TABLE(target_account_id uuid,target_ciphertext text,target_locale text,target_chat_hash text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $func$
DECLARE v_account uuid;v_cipher text;v_locale text;v_hash text;
BEGIN
  SELECT r.client_account_id,l.chat_ciphertext,n.locale,l.chat_hash
    INTO v_account,v_cipher,v_locale,v_hash
  FROM app.practitioner_express_reports r
  JOIN app.practitioners p ON p.id=r.practitioner_id
  JOIN app.accounts a ON a.id=r.client_account_id
  JOIN app_private.notification_messenger_requests n
    ON n.account_id=a.id AND n.channel='telegram'
  JOIN app_private.notification_telegram_links l ON l.account_id=a.id
  WHERE r.id=p_report_id AND r.status='published'
    AND r.sent_at > now()-interval '15 minutes'
    AND r.practitioner_account_id=p.trusted_auth_user_id
    AND p.active AND p.status IN ('approved','submitted','changes_requested')
    AND a.status='active' AND a.onboarding_state='active'
    AND n.topics->>'messages'='true'
    AND n.consent_version='hh-messenger-contact-v1'
    AND l.consent_version='hh-tg-message-alerts-v1'
  LIMIT 1;
  IF v_account IS NULL THEN RETURN; END IF;
  INSERT INTO app_private.express_report_telegram_dispatch
    (report_id,recipient_account_id,chat_hash)
  VALUES (p_report_id,v_account,v_hash) ON CONFLICT DO NOTHING;
  IF NOT FOUND THEN RETURN; END IF;
  target_account_id:=v_account;target_ciphertext:=v_cipher;
  target_locale:=v_locale;target_chat_hash:=v_hash;
  RETURN NEXT;
END;
$func$;

CREATE FUNCTION app_private.express_report_tg_allowed(p_report_id uuid,p_hash text)
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path TO ''
AS $func$
SELECT EXISTS(
  SELECT 1 FROM app_private.express_report_telegram_dispatch d
  JOIN app.practitioner_express_reports r ON r.id=d.report_id
  JOIN app_private.notification_telegram_links l
    ON l.account_id=d.recipient_account_id AND l.chat_hash=d.chat_hash
  JOIN app_private.notification_messenger_requests n
    ON n.account_id=d.recipient_account_id AND n.channel='telegram'
  JOIN app.accounts a ON a.id=d.recipient_account_id
  WHERE d.report_id=p_report_id AND d.chat_hash=p_hash AND d.state='claimed'
    AND r.status='published' AND r.client_account_id=d.recipient_account_id
    AND l.consent_version='hh-tg-message-alerts-v1'
    AND n.consent_version='hh-messenger-contact-v1'
    AND n.topics->>'messages'='true'
    AND a.status='active' AND a.onboarding_state='active'
) $func$;

CREATE FUNCTION app_private.express_report_tg_finish(p_report_id uuid,p_state text,p_provider_id text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path TO ''
AS $func$
DECLARE changed integer;
BEGIN
  IF p_state NOT IN ('accepted','failed','suppressed')
    OR (p_provider_id IS NOT NULL AND length(p_provider_id)>64) THEN RETURN false; END IF;
  UPDATE app_private.express_report_telegram_dispatch
    SET state=p_state,provider_message_id=CASE WHEN p_state='accepted' THEN p_provider_id ELSE NULL END,
      updated_at=now()
  WHERE report_id=p_report_id AND state='claimed';
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN changed=1;
END;
$func$;

REVOKE ALL ON FUNCTION app_private.express_report_tg_claim(uuid),
  app_private.express_report_tg_allowed(uuid,text),
  app_private.express_report_tg_finish(uuid,text,text)
  FROM PUBLIC,anon,authenticated,hh_app_inbox,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.express_report_tg_claim(uuid),
  app_private.express_report_tg_allowed(uuid,text),
  app_private.express_report_tg_finish(uuid,text,text)
  TO hh_app_backend;

COMMIT;
