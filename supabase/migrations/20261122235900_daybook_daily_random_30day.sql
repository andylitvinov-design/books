-- Daybook: upgrade ONE existing opt-in goal-aware sender, without new cron/provider.
-- Atomic random selection and immutable last-30-local-calendar-days exclusion.
BEGIN;
ALTER TABLE app_private.daybook_daily_attempts
 ADD COLUMN IF NOT EXISTS phrase_id text,
 ADD COLUMN IF NOT EXISTS focus_axis text;
CREATE INDEX IF NOT EXISTS daybook_daily_recent_phrase_idx
 ON app_private.daybook_daily_attempts(account_id,local_day DESC,phrase_id);

CREATE OR REPLACE FUNCTION app_private.daybook_daily_claim(p_account uuid,p_day date)
 RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
 DECLARE
  v_goal uuid;
  v_axis text;
  v_phrase_id text;
  v_inserted integer;
 BEGIN
  IF NOT app_private.daybook_daily_worker_authorized() OR p_day IS NULL THEN RETURN false; END IF;
  SELECT p.goal_id,p.focus_axis INTO v_goal,v_axis
  FROM app_private.daybook_daily_preferences p
   JOIN app.accounts a ON a.id=p.account_id
     AND a.status='active' AND a.onboarding_state='active'
   JOIN app_private.coaching_goals g
     ON g.id=p.goal_id AND g.account_id=p.account_id AND g.status='active'
   JOIN app_private.notification_telegram_links l
     ON l.account_id=p.account_id AND l.consent_version='hh-tg-message-alerts-v1'
   JOIN app_private.notification_messenger_requests n
     ON n.account_id=p.account_id AND n.channel='telegram'
       AND n.consent_version='hh-messenger-contact-v1'
  WHERE p.account_id=p_account AND p.enabled AND p.consented_at IS NOT NULL
   AND p.consent_version='daybook-goal-to-messenger-v1'
   AND (now() AT TIME ZONE p.timezone)::date=p_day
   AND (EXTRACT(hour FROM (now() AT TIME ZONE p.timezone))::int*60+
        EXTRACT(minute FROM (now() AT TIME ZONE p.timezone))::int)
     BETWEEN (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int)
         AND (substring(p.daily_at,1,2)::int*60+substring(p.daily_at,4,2)::int+14)
  FOR UPDATE OF p;
  IF v_goal IS NULL OR v_axis IS NULL THEN RETURN false; END IF;
  SELECT c.id INTO v_phrase_id
  FROM public.hh_ideas_aphorisms c
  WHERE c.is_published=true
   AND length(btrim(COALESCE(c.text_ru,''))) BETWEEN 10 AND 600
   AND length(btrim(COALESCE(c.text_en,''))) BETWEEN 10 AND 600
   AND length(btrim(COALESCE(c.text_es,''))) BETWEEN 10 AND 600
   AND CASE v_axis
    WHEN 'anchor' THEN c.topic=ANY(ARRAY['stress','time','acceptance','resources','grief','gratitude'])
    WHEN 'connection' THEN c.topic=ANY(ARRAY['relationships','loneliness','love','grief','gratitude','acceptance'])
    WHEN 'freedom' THEN c.topic=ANY(ARRAY['boundaries','direction','courage','acceptance','purpose','work'])
    WHEN 'agency' THEN c.topic=ANY(ARRAY['courage','work','direction','resources','time','purpose'])
    WHEN 'love' THEN c.topic=ANY(ARRAY['love','relationships','gratitude','loneliness','grief'])
    WHEN 'dignity' THEN c.topic=ANY(ARRAY['selfworth','boundaries','acceptance','gratitude','courage'])
    WHEN 'realization' THEN c.topic=ANY(ARRAY['creativity','purpose','direction','work','time'])
    WHEN 'recognition' THEN c.topic=ANY(ARRAY['selfworth','gratitude','relationships','work','creativity'])
    ELSE false
   END
   AND NOT EXISTS (
    SELECT 1 FROM app_private.daybook_daily_attempts h
    WHERE h.account_id=p_account AND h.phrase_id=c.id
      AND h.local_day>=p_day-30 AND h.local_day<p_day
   )
  ORDER BY pg_catalog.random()
  LIMIT 1;
  IF v_phrase_id IS NULL THEN RETURN false; END IF;
  INSERT INTO app_private.daybook_daily_attempts(account_id,local_day,goal_id,phrase_id,focus_axis)
   VALUES(p_account,p_day,v_goal,v_phrase_id,v_axis)
   ON CONFLICT(account_id,local_day) DO NOTHING;
  GET DIAGNOSTICS v_inserted=ROW_COUNT;
  RETURN v_inserted=1;
 END $body$;

CREATE OR REPLACE FUNCTION app_private.daybook_daily_selected_phrase(p_account uuid,p_day date)
 RETURNS TABLE(phrase_id text,phrase_text text)
 LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $body$
 BEGIN
  IF NOT app_private.daybook_daily_worker_authorized() THEN RETURN; END IF;
  RETURN QUERY
   SELECT d.phrase_id,
    CASE p.locale WHEN 'ru' THEN c.text_ru
     WHEN 'es' THEN c.text_es ELSE c.text_en END
   FROM app_private.daybook_daily_attempts d
    JOIN app_private.daybook_daily_preferences p ON p.account_id=d.account_id
    JOIN app.accounts a ON a.id=p.account_id
      AND a.status='active' AND a.onboarding_state='active'
    JOIN app_private.coaching_goals g
      ON g.id=d.goal_id AND g.account_id=p.account_id AND g.status='active'
    JOIN app_private.notification_telegram_links l
      ON l.account_id=p.account_id AND l.consent_version='hh-tg-message-alerts-v1'
    JOIN public.hh_ideas_aphorisms c ON c.id=d.phrase_id AND c.is_published=true
   WHERE d.account_id=p_account AND d.local_day=p_day AND d.status='claimed'
    AND d.claimed_at>now()-interval '30 minutes'
    AND p.enabled AND p.consented_at IS NOT NULL
    AND p.consent_version='daybook-goal-to-messenger-v1'
    AND d.goal_id=p.goal_id AND d.focus_axis=p.focus_axis
    AND (now() AT TIME ZONE p.timezone)::date=p_day
    AND length(btrim(CASE p.locale WHEN 'ru' THEN c.text_ru
      WHEN 'es' THEN c.text_es ELSE c.text_en END)) BETWEEN 10 AND 600;
 END $body$;
REVOKE ALL ON FUNCTION app_private.daybook_daily_claim(uuid,date)
 FROM PUBLIC,anon,authenticated,hh_app_inbox,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.daybook_daily_claim(uuid,date) TO hh_app_backend;
REVOKE ALL ON FUNCTION app_private.daybook_daily_selected_phrase(uuid,date)
 FROM PUBLIC,anon,authenticated,hh_app_inbox,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.daybook_daily_selected_phrase(uuid,date) TO hh_app_backend;
COMMIT;