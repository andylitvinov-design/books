-- Wisdom Library server-side coaching corpus. Replicates the already-applied
-- 2026-11-12 database schema; no user transcripts or author archive is seeded.
-- No new public API permissions. Preserve the original 142 Ideas aphorisms.
BEGIN;

CREATE TABLE IF NOT EXISTS public.hh_coach_wisdom_additions_v1 (
  id text PRIMARY KEY,
  content_type text NOT NULL CHECK (content_type IN (
    'koan','aphorism','classical_paraphrase','parable','proverb')),
  origin text NOT NULL CHECK (origin IN (
    'user_archive','holistic_editorial','public_domain_paraphrase')),
  tradition text NOT NULL,
  topic text NOT NULL,
  tags text[] NOT NULL DEFAULT '{}',
  text_ru text NOT NULL CHECK (char_length(btrim(text_ru)) >= 20),
  text_en text,
  text_es text,
  coach_question_ru text NOT NULL CHECK (char_length(btrim(coach_question_ru)) >= 10),
  coach_question_en text,
  coach_question_es text,
  coaching_phase text NOT NULL DEFAULT 'reflection' CHECK (
    coaching_phase IN ('clarify','reflection','reframe','action','closing')),
  usage_note_ru text,
  avoid_when text[] NOT NULL DEFAULT '{crisis,acute_distress,client_declines_metaphors}',
  source_author text,
  source_title text,
  source_url text,
  source_locator text,
  attribution text NOT NULL CHECK (
    attribution IN ('modern_archive','modern_original','classical_paraphrase')),
  license_note text NOT NULL,
  review_status text NOT NULL DEFAULT 'draft' CHECK (
    review_status IN ('draft','curated','needs_review')),
  coach_enabled boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT hh_coach_wisdom_ready_requires_review CHECK (
    NOT coach_enabled OR review_status = 'curated')
);
COMMENT ON TABLE public.hh_coach_wisdom_additions_v1 IS
  'Private coach-specific wisdom metadata. New material is authored or modern paraphrase, not historic literal quotations.';

CREATE INDEX IF NOT EXISTS hh_coach_wisdom_topic_idx
  ON public.hh_coach_wisdom_additions_v1 (topic, coaching_phase)
  WHERE coach_enabled;
CREATE INDEX IF NOT EXISTS hh_coach_wisdom_tags_gin
  ON public.hh_coach_wisdom_additions_v1 USING gin(tags);

ALTER TABLE public.hh_coach_wisdom_additions_v1 ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.hh_coach_wisdom_additions_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.hh_coach_wisdom_additions_v1
  TO service_role;
GRANT SELECT ON TABLE public.hh_coach_wisdom_additions_v1 TO hh_app_backend;
DROP POLICY IF EXISTS hh_wisdom_backend_curated_v1 ON public.hh_coach_wisdom_additions_v1;
CREATE POLICY hh_wisdom_backend_curated_v1
  ON public.hh_coach_wisdom_additions_v1 FOR SELECT TO hh_app_backend
  USING (coach_enabled AND review_status='curated');

-- The published base catalog remains the one public source for Ideas.
GRANT SELECT ON TABLE public.hh_ideas_aphorisms TO hh_app_backend;
DROP POLICY IF EXISTS hh_ideas_backend_published_v1 ON public.hh_ideas_aphorisms;
CREATE POLICY hh_ideas_backend_published_v1
  ON public.hh_ideas_aphorisms FOR SELECT TO hh_app_backend
  USING (is_published=true);

CREATE OR REPLACE VIEW public.hh_coach_wisdom_catalog_v1
WITH (security_invoker=true) AS
SELECT
  'base:' || a.id AS entry_id,
  CASE WHEN a.kind='proverb' THEN 'proverb'
       WHEN a.kind='inspired' THEN 'classical_paraphrase'
       ELSE 'aphorism' END AS content_type,
  'existing_library'::text AS origin,
  'cross_cultural'::text AS tradition,
  a.topic,
  a.keywords AS tags,
  a.text_ru,a.text_en,a.text_es,
  NULL::text AS coach_question_ru,
  NULL::text AS coach_question_en,
  NULL::text AS coach_question_es,
  'reflection'::text AS coaching_phase,
  NULL::text AS usage_note_ru,
  ARRAY['crisis','acute_distress','client_declines_metaphors']::text[] AS avoid_when,
  a.source_author,
  a.source_work AS source_title,
  a.source_url,
  a.source_locator,
  CASE WHEN a.kind='proverb' THEN 'source_in_base_catalog'
       WHEN a.kind='inspired' THEN 'inspired_not_verbatim'
       ELSE 'modern_editorial' END AS attribution,
  a.source_license AS license_note,
  'curated'::text AS review_status,
  a.is_published AS coach_enabled
FROM public.hh_ideas_aphorisms a
WHERE a.is_published
UNION ALL
SELECT
  w.id,w.content_type,w.origin,w.tradition,w.topic,w.tags,
  w.text_ru,w.text_en,w.text_es,
  w.coach_question_ru,w.coach_question_en,w.coach_question_es,
  w.coaching_phase,w.usage_note_ru,w.avoid_when,
  w.source_author,w.source_title,w.source_url,w.source_locator,
  w.attribution,w.license_note,w.review_status,w.coach_enabled
FROM public.hh_coach_wisdom_additions_v1 w
WHERE w.coach_enabled;

COMMENT ON VIEW public.hh_coach_wisdom_catalog_v1 IS
  'Read-only server-side view: existing Ideas catalog plus curator-approved wisdom additions. No user data.';
REVOKE ALL ON TABLE public.hh_coach_wisdom_catalog_v1 FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE public.hh_coach_wisdom_catalog_v1 TO service_role,hh_app_backend;
GRANT USAGE ON SCHEMA public TO hh_app_backend;
COMMIT;
