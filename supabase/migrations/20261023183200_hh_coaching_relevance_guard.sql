-- Only return coaching schemes that match at least one topic explicitly chosen by the client.
-- Prevents irrelevant models from being presented as personalized advice.
BEGIN;
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
  WHERE cardinality(c.matched)>0
  ORDER BY match_score DESC,cardinality(c.matched) DESC,c.estimated_minutes ASC,c.scheme_key
  LIMIT LEAST(GREATEST(COALESCE(p_limit,3),1),5);
$recommend$;
COMMIT;
