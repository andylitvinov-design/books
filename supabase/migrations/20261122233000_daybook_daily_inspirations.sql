-- Daybook Inspirations: opt-in daily Telegram messages, a 30-local-day no-repeat window.
-- Additive only; no provider send, enrollment, cron or existing preference mutation.
BEGIN;

CREATE TABLE app_private.daybook_inspiration_preferences (
 account_id uuid PRIMARY KEY REFERENCES app.accounts(id) ON DELETE CASCADE,
 enabled boolean NOT NULL DEFAULT false,
 channel text NOT NULL DEFAULT 'telegram' CHECK (channel='telegram'),
 locale text NOT NULL DEFAULT 'en' CHECK(locale IN ('en','ru','es')),
 time_zone text NOT NULL DEFAULT 'UTC' CHECK(length(time_zone) BETWEEN 2 AND 64),
 daily_at time without time zone NOT NULL DEFAULT time '09:00',
 consent_version text NOT NULL CHECK(consent_version='hh-daybook-inspirations-v1'),
 consent_at timestamptz NOT NULL,
 revoked_at timestamptz,
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK (NOT enabled OR revoked_at IS NULL)
);
COMMENT ON TABLE app_private.daybook_inspiration_preferences IS
 'Separate, revocable user opt-in. Existing messenger contact/notification permission never subscribes a client.';
ALTER TABLE app_private.daybook_inspiration_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.daybook_inspiration_preferences FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.daybook_inspiration_preferences FROM PUBLIC,anon,authenticated,hh_app_inbox;
GRANT SELECT,INSERT ON app_private.daybook_inspiration_preferences TO hh_app_backend;
GRANT UPDATE(enabled,channel,locale,time_zone,daily_at,consent_version,consent_at,revoked_at,updated_at)
 ON app_private.daybook_inspiration_preferences TO hh_app_backend;
CREATE POLICY daybook_inspiration_owner ON app_private.daybook_inspiration_preferences
 FOR ALL TO hh_app_backend
 USING (account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
 WITH CHECK (account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));

CREATE TABLE app_private.daybook_inspiration_consents (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
 accepted boolean NOT NULL,
 consent_version text NOT NULL CHECK(consent_version='hh-daybook-inspirations-v1'),
 channel text NOT NULL CHECK(channel='telegram'),
 recorded_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE app_private.daybook_inspiration_consents ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.daybook_inspiration_consents FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.daybook_inspiration_consents FROM PUBLIC,anon,authenticated,hh_app_inbox;
GRANT INSERT,SELECT ON app_private.daybook_inspiration_consents TO hh_app_backend;
CREATE POLICY daybook_inspiration_consent_owner ON app_private.daybook_inspiration_consents
 FOR ALL TO hh_app_backend
 USING (account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
 WITH CHECK (account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));

CREATE TABLE app_private.daybook_inspiration_history (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
 local_day date NOT NULL,
 phrase_id text NOT NULL,
 chat_hash text NOT NULL CHECK(length(chat_hash)=64),
 status text NOT NULL DEFAULT 'claimed'
   CHECK(status IN ('claimed','accepted','unknown','suppressed')),
 provider_message_id text,
 claimed_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(account_id,local_day)
);
CREATE INDEX daybook_inspiration_repeat_window
 ON app_private.daybook_inspiration_history(account_id,local_day DESC,phrase_id);
ALTER TABLE app_private.daybook_inspiration_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.daybook_inspiration_history FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.daybook_inspiration_history FROM PUBLIC,anon,authenticated,hh_app_backend,hh_app_inbox;

-- The authenticated backend can call this private definer, not select
-- anybody's chat links, send history or provider identities directly.
CREATE FUNCTION app_private.daybook_inspiration_claim_due(p_now timestamptz,p_limit integer)
RETURNS TABLE(account_id uuid,local_day date,phrase_id text,phrase_text text,
 locale text,chat_hash text,chat_ciphertext text)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
DECLARE
 pref record;
 chosen record;
 day_value date;
BEGIN
 FOR pref IN
  SELECT s.account_id,s.locale,s.time_zone,s.daily_at,l.chat_hash,l.chat_ciphertext
  FROM app_private.daybook_inspiration_preferences s
  JOIN app.accounts a ON a.id=s.account_id
  JOIN app_private.notification_telegram_links l ON l.account_id=s.account_id
  WHERE s.enabled=true AND s.channel='telegram' AND s.revoked_at IS NULL
    AND s.consent_version='hh-daybook-inspirations-v1'
    AND a.status='active' AND a.onboarding_state='active'
    AND (p_now AT TIME ZONE s.time_zone)::time >= s.daily_at
    AND NOT EXISTS (
      SELECT 1 FROM app_private.daybook_inspiration_history h
      WHERE h.account_id=s.account_id AND h.local_day=(p_now AT TIME ZONE s.time_zone)::date
    )
  ORDER BY s.updated_at,s.account_id
  FOR UPDATE OF s SKIP LOCKED
  LIMIT LEAST(GREATEST(COALESCE(p_limit,1),1),20)
 LOOP
  day_value := (p_now AT TIME ZONE pref.time_zone)::date;
  SELECT c.id AS id,
    CASE pref.locale WHEN 'ru' THEN c.text_ru WHEN 'es' THEN c.text_es ELSE c.text_en END AS body
    INTO chosen
  FROM public.hh_ideas_aphorisms c
  WHERE c.is_published=true
    AND length(trim(CASE pref.locale WHEN 'ru' THEN c.text_ru
      WHEN 'es' THEN c.text_es ELSE c.text_en END)) BETWEEN 10 AND 600
    -- Even failed/unknown attempts reserve a phrase for the last 30 local days.
    AND NOT EXISTS (
      SELECT 1 FROM app_private.daybook_inspiration_history h
      WHERE h.account_id=pref.account_id AND h.phrase_id=c.id
      AND h.local_day >= day_value - 30 AND h.local_day < day_value
    )
  ORDER BY pg_catalog.random() LIMIT 1;
  IF NOT FOUND THEN CONTINUE; END IF;
  INSERT INTO app_private.daybook_inspiration_history(
    account_id,local_day,phrase_id,chat_hash,status
  ) VALUES(pref.account_id,day_value,chosen.id,pref.chat_hash,'claimed')
  ON CONFLICT (account_id,local_day) DO NOTHING;
  IF FOUND THEN
    account_id:=pref.account_id;
    local_day:=day_value;
    phrase_id:=chosen.id;
    phrase_text:=chosen.body;
    locale:=pref.locale;
    chat_hash:=pref.chat_hash;
    chat_ciphertext:=pref.chat_ciphertext;
    RETURN NEXT;
  END IF;
 END LOOP;
END
$body$;

CREATE FUNCTION app_private.daybook_inspiration_send_allowed(
 p_account uuid,p_day date,p_chat_hash text
) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $body$
 SELECT EXISTS(
  SELECT 1 FROM app_private.daybook_inspiration_history h
  JOIN app_private.daybook_inspiration_preferences s ON s.account_id=h.account_id
  JOIN app_private.notification_telegram_links l ON l.account_id=h.account_id
  JOIN app.accounts a ON a.id=h.account_id
  WHERE h.account_id=p_account AND h.local_day=p_day
    AND h.chat_hash=p_chat_hash AND h.status='claimed'
    AND s.enabled AND s.revoked_at IS NULL AND s.channel='telegram'
    AND s.consent_version='hh-daybook-inspirations-v1'
    AND l.chat_hash=p_chat_hash
    AND a.status='active' AND a.onboarding_state='active'
 )
$body$;

CREATE FUNCTION app_private.daybook_inspiration_finish(
 p_account uuid,p_day date,p_chat_hash text,p_status text,p_provider_message_id text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
BEGIN
 IF p_status NOT IN ('accepted','unknown','suppressed')
   OR length(coalesce(p_provider_message_id,''))>80 THEN RETURN false; END IF;
 UPDATE app_private.daybook_inspiration_history h SET
  status=p_status,
  provider_message_id=CASE WHEN p_status='accepted' THEN p_provider_message_id ELSE NULL END,
  updated_at=now()
 WHERE h.account_id=p_account AND h.local_day=p_day
  AND h.chat_hash=p_chat_hash AND h.status='claimed';
 RETURN FOUND;
END
$body$;

REVOKE ALL ON FUNCTION app_private.daybook_inspiration_claim_due(timestamptz,integer)
 FROM PUBLIC,anon,authenticated,hh_app_inbox;
REVOKE ALL ON FUNCTION app_private.daybook_inspiration_send_allowed(uuid,date,text)
 FROM PUBLIC,anon,authenticated,hh_app_inbox;
REVOKE ALL ON FUNCTION app_private.daybook_inspiration_finish(uuid,date,text,text,text)
 FROM PUBLIC,anon,authenticated,hh_app_inbox;
GRANT EXECUTE ON FUNCTION app_private.daybook_inspiration_claim_due(timestamptz,integer),
 app_private.daybook_inspiration_send_allowed(uuid,date,text),
 app_private.daybook_inspiration_finish(uuid,date,text,text,text)
 TO hh_app_backend;
COMMIT;
