-- READ-ONLY technical validation after the separately approved atomic import.
-- No client data. Keep the exact release value synchronized with the approved manifest.
WITH release AS (
  SELECT * FROM app.assessment_interpretation_versions
  WHERE interpretation_version = '2026-10-17.v1'
), expected AS (
  SELECT v.id, locale FROM app.assessment_versions v
  CROSS JOIN (VALUES ('en'), ('ru')) AS languages(locale)
  WHERE v.status = 'published'
)
SELECT
  (SELECT count(*) FROM app.assessment_versions WHERE status='published') AS published_definitions,
  count(*) AS registry_rows,
  count(DISTINCT assessment_version_id) AS referenced_definitions,
  count(*) FILTER (WHERE report_locale='en') AS en_report_rows,
  count(*) FILTER (WHERE report_locale='ru') AS ru_report_rows,
  count(*) FILTER (WHERE payload->>'catalogActive'='true') AS active_rows,
  count(*) FILTER (WHERE payload->>'catalogActive'='false') AS historical_rows,
  count(*) FILTER (WHERE payload_canonical::jsonb IS DISTINCT FROM payload) AS payload_byte_mismatches,
  count(*) FILTER (WHERE payload_sha256 IS DISTINCT FROM 'sha256:' || encode(sha256(convert_to(payload_canonical,'UTF8')),'hex')) AS payload_hash_mismatches,
  (SELECT count(*) FROM expected e LEFT JOIN release r ON r.assessment_version_id=e.id AND r.report_locale=e.locale WHERE r.assessment_version_id IS NULL) AS missing_expected_keys,
  (SELECT count(*) FROM release r LEFT JOIN expected e ON e.id=r.assessment_version_id AND e.locale=r.report_locale WHERE e.id IS NULL) AS unexpected_keys,
  array_agg(DISTINCT source_commit) AS source_commits,
  array_agg(DISTINCT rules_engine_version) AS rules_engine_versions
FROM release;
-- Historical v1 seed is immutable: 230 source versions × 2 report locales = 460 rows,
-- of which 440 were active and 20 historical when this version was signed.
-- app.assessment_versions can now include newer registered source forms (235
-- at the 19 October 2026 audit). Their 10 unsupplied v1 locales appear as
-- missing_expected_keys in THIS cross-release diagnostic query, not as missing
-- records from the original approved 460-row source set. Do not update the
-- signed v1/v2/v3 seed, source digests, or historical payloads to fill that gap.
-- The native CI uses the signed digest identities to determine exact historical
-- coverage and checks newer forms use a separately verified code fallback.

SELECT count(*) AS provenance_mismatches
FROM app.assessment_interpretation_versions i
JOIN app.assessment_versions v ON v.id=i.assessment_version_id
WHERE i.interpretation_version='2026-10-17.v1' AND (
  i.definition_content_hash IS DISTINCT FROM v.content_hash
  OR i.provenance IS DISTINCT FROM jsonb_build_object(
    'assessmentVersionId',v.id::text,'definitionKey',v.definition_key,
    'definitionVersion',v.definition_version,'instrumentLocale',v.instrument_locale,
    'translationVersion',v.translation_version,'scoringKey',v.scoring_key,
    'scoringVersion',v.scoring_version,'resultVersion',v.result_schema->>'version',
    'contentHash',v.content_hash)
  OR i.payload->'provenance' IS DISTINCT FROM i.provenance
  OR i.payload->>'reportLocale' IS DISTINCT FROM i.report_locale
  OR i.payload->>'interpretationVersion' IS DISTINCT FROM i.interpretation_version
  OR i.payload->>'sourceCommit' IS DISTINCT FROM i.source_commit
  OR i.payload->>'rulesEngineVersion' IS DISTINCT FROM i.rules_engine_version
);

SELECT c.relrowsecurity,c.relforcerowsecurity,pg_get_userbyid(c.relowner) AS owner,c.relacl::text
FROM pg_class c WHERE c.oid='app.assessment_interpretation_versions'::regclass;
SELECT polname,polcmd,array(SELECT rolname FROM pg_roles WHERE oid=ANY(polroles)) AS roles,
  pg_get_expr(polqual,polrelid) AS select_predicate,pg_get_expr(polwithcheck,polrelid) AS write_predicate
FROM pg_policy WHERE polrelid='app.assessment_interpretation_versions'::regclass;
SELECT rolname,has_table_privilege(rolname,'app.assessment_interpretation_versions','SELECT') AS can_select,
  has_table_privilege(rolname,'app.assessment_interpretation_versions','INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') AS any_non_select_privilege
FROM pg_roles WHERE rolname IN ('anon','authenticated','hh_app_backend');
SELECT p.proname,p.prosecdef,p.proconfig,p.proacl::text
FROM pg_proc p WHERE p.oid IN ('app.assessment_interpretation_validate_insert()'::regprocedure,'app.assessment_interpretation_reject_mutation()'::regprocedure);
SELECT tgname,tgenabled,pg_get_triggerdef(oid) AS trigger_definition FROM pg_trigger
WHERE tgrelid='app.assessment_interpretation_versions'::regclass AND NOT tgisinternal;
