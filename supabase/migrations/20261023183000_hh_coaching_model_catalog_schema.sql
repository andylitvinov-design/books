-- Holistic House · Personal Coaching Session: versioned reference catalog.
-- Catalog contains NO client information. Existing encrypted account-owned journals remain the
-- only eligible persistence layer for future answers/transcripts. No Data API exposure.
BEGIN;

CREATE TABLE IF NOT EXISTS app_private.coaching_models (
  model_key text PRIMARY KEY CHECK (model_key ~ '^[a-z0-9_]+_v[0-9]+$'),
  name_i18n jsonb NOT NULL CHECK (name_i18n ?& ARRAY['en','ru','es']),
  focus_i18n jsonb NOT NULL CHECK (focus_i18n ?& ARRAY['en','ru','es']),
  limitation_i18n jsonb NOT NULL CHECK (limitation_i18n ?& ARRAY['en','ru','es']),
  source_title text NOT NULL,
  source_url text NOT NULL CHECK (source_url ~ '^https://'),
  source_kind text NOT NULL CHECK (source_kind IN ('original','institutional','research','practitioner')),
  topic_tags text[] NOT NULL DEFAULT '{}'::text[],
  editorial_status text NOT NULL DEFAULT 'reviewed' CHECK (editorial_status IN ('draft','reviewed','retired')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_private.coaching_schemes (
  scheme_key text PRIMARY KEY CHECK (scheme_key ~ '^[a-z0-9_]+_v[0-9]+$'),
  model_key text NOT NULL REFERENCES app_private.coaching_models(model_key) ON DELETE RESTRICT,
  name_i18n jsonb NOT NULL CHECK (name_i18n ?& ARRAY['en','ru','es']),
  result_i18n jsonb NOT NULL CHECK (result_i18n ?& ARRAY['en','ru','es']),
  style text NOT NULL CHECK (style IN ('quick','reflective')),
  estimated_minutes integer NOT NULL CHECK (estimated_minutes BETWEEN 5 AND 90),
  topic_tags text[] NOT NULL,
  step_keys text[] NOT NULL CHECK (array_length(step_keys, 1) BETWEEN 3 AND 8),
  required_custom_plan boolean NOT NULL DEFAULT false,
  published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS coaching_schemes_topics_gin
 ON app_private.coaching_schemes USING gin (topic_tags);

CREATE TABLE IF NOT EXISTS app_private.coaching_steps (
  model_key text NOT NULL REFERENCES app_private.coaching_models(model_key) ON DELETE RESTRICT,
  step_key text NOT NULL CHECK (step_key ~ '^[a-z0-9_]+$'),
  model_order integer NOT NULL CHECK (model_order BETWEEN 1 AND 20),
  title_i18n jsonb NOT NULL CHECK (title_i18n ?& ARRAY['en','ru','es']),
  emphasis_i18n jsonb NOT NULL CHECK (emphasis_i18n ?& ARRAY['en','ru','es']),
  key_question_i18n jsonb NOT NULL CHECK (key_question_i18n ?& ARRAY['en','ru','es']),
  PRIMARY KEY (model_key, step_key),
  UNIQUE (model_key, model_order)
);
CREATE TABLE IF NOT EXISTS app_private.coaching_answer_sets (
  answer_set_key text PRIMARY KEY CHECK (answer_set_key ~ '^[a-z0-9_]+_v[0-9]+$'),
  choices jsonb NOT NULL CHECK (jsonb_typeof(choices) = 'array' AND jsonb_array_length(choices) BETWEEN 2 AND 8),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS app_private.coaching_questions (
  question_key text PRIMARY KEY CHECK (question_key ~ '^[a-z0-9_]+_v[0-9]+$'),
  model_key text NOT NULL,
  step_key text NOT NULL,
  position integer NOT NULL DEFAULT 1 CHECK (position BETWEEN 1 AND 8),
  prompt_i18n jsonb NOT NULL CHECK (prompt_i18n ?& ARRAY['en','ru','es']),
  answer_type text NOT NULL CHECK (answer_type IN ('single_choice','scale_0_10')),
  answer_set_key text REFERENCES app_private.coaching_answer_sets(answer_set_key) ON DELETE RESTRICT,
  core boolean NOT NULL DEFAULT true,
  required boolean NOT NULL DEFAULT true,
  interaction_note text NOT NULL DEFAULT 'An optional typed or transcribed clarification can appear on the same slide.',
  FOREIGN KEY (model_key,step_key) REFERENCES app_private.coaching_steps(model_key,step_key) ON DELETE RESTRICT,
  UNIQUE(model_key,step_key,position),
  CONSTRAINT coaching_question_answer_contract CHECK (
    (answer_type='single_choice' AND answer_set_key IS NOT NULL)
    OR (answer_type='scale_0_10' AND answer_set_key IS NULL)
  )
);

-- Backend read-only: the site can resolve the catalog server-side without granting
-- direct access to anon/authenticated or exposing it via public PostgREST schemas.
DO $rls$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'coaching_models','coaching_schemes','coaching_steps','coaching_answer_sets','coaching_questions'
  ] LOOP
    EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON TABLE app_private.%I FROM PUBLIC, anon, authenticated',t);
    EXECUTE format('GRANT SELECT ON TABLE app_private.%I TO hh_app_backend',t);
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies WHERE schemaname='app_private' AND tablename=t
        AND policyname=t||'_backend_read'
    ) THEN
      EXECUTE format('CREATE POLICY %I ON app_private.%I FOR SELECT TO hh_app_backend USING (true)',
        t||'_backend_read',t);
    END IF;
  END LOOP;
END $rls$;

-- Non-sensitive, server-side deterministic candidate ranking. Selection is based solely
-- on deliberately chosen concern tags, session duration and answer style, never tests/health.
CREATE OR REPLACE FUNCTION app_private.recommend_coaching_schemes(
  p_topics text[] DEFAULT ARRAY['goal']::text[],
  p_minutes integer DEFAULT 20,
  p_style text DEFAULT 'quick',
  p_limit integer DEFAULT 3
)
RETURNS TABLE (
  scheme_key text, model_key text, match_score integer, matched_topics text[],
  estimated_minutes integer, style text
) LANGUAGE sql STABLE SECURITY INVOKER SET search_path = pg_catalog, app_private AS $recommend$
  WITH candidates AS (
    SELECT s.scheme_key,s.model_key,s.topic_tags,s.estimated_minutes,s.style,
      ARRAY(
        SELECT unnest_tag FROM unnest(s.topic_tags) AS unnest_tag
        WHERE unnest_tag = ANY(COALESCE(p_topics,ARRAY[]::text[]))
        ORDER BY unnest_tag
      ) AS matched
    FROM app_private.coaching_schemes s
    JOIN app_private.coaching_models m ON m.model_key=s.model_key
    WHERE s.published AND m.editorial_status='reviewed'
  )
  SELECT c.scheme_key,c.model_key,
    (cardinality(c.matched)*10
     + CASE WHEN c.estimated_minutes <= GREATEST(COALESCE(p_minutes,20),5)
         THEN 3 ELSE -LEAST(12,(c.estimated_minutes-GREATEST(COALESCE(p_minutes,20),5))) END
     + CASE WHEN c.style=COALESCE(p_style,'quick') THEN 3 ELSE 0 END
    )::integer AS match_score,
    c.matched AS matched_topics,c.estimated_minutes,c.style
  FROM candidates c
  ORDER BY match_score DESC,cardinality(c.matched) DESC,c.estimated_minutes ASC,c.scheme_key
  LIMIT LEAST(GREATEST(COALESCE(p_limit,3),1),5);
$recommend$;
REVOKE ALL ON FUNCTION app_private.recommend_coaching_schemes(text[],integer,text,integer)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION app_private.recommend_coaching_schemes(text[],integer,text,integer)
  TO hh_app_backend;

COMMIT;
