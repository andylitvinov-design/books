-- LOCAL REVIEW ARTIFACT. Apply only within the separately authorized production change.
-- Creates only the new interpretation registry, two SECURITY INVOKER trigger functions,
-- two triggers on that NEW table, and its backend-only SELECT policy/ACL.
-- Does not alter assessment_versions or read/write client tables.
-- No IF NOT EXISTS / CREATE OR REPLACE / upsert: an existing object is a hard stop.
-- This migration creates no interpretation rows. Exact 436-row batch is separate.
BEGIN;
SET LOCAL lock_timeout = '5s';
SET LOCAL statement_timeout = '60s';
SET LOCAL search_path = pg_catalog;

DO $preflight$
BEGIN
  IF pg_catalog.to_regnamespace('app') IS NULL
     OR pg_catalog.to_regclass('app.assessment_versions') IS NULL THEN
    RAISE EXCEPTION 'Required existing assessment registry is missing';
  END IF;
  IF pg_catalog.to_regclass('app.assessment_interpretation_versions') IS NOT NULL
     OR pg_catalog.to_regprocedure('app.assessment_interpretation_validate_insert()') IS NOT NULL
     OR pg_catalog.to_regprocedure('app.assessment_interpretation_reject_mutation()') IS NOT NULL THEN
    RAISE EXCEPTION 'Interpretation registry object already exists; stop rather than replace';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'hh_app_backend')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'anon')
     OR NOT EXISTS (SELECT 1 FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    RAISE EXCEPTION 'Required existing application roles are missing';
  END IF;
  IF NOT pg_catalog.has_schema_privilege('hh_app_backend', 'app', 'USAGE') THEN
    RAISE EXCEPTION 'Backend lacks existing app schema USAGE; no permission expansion allowed';
  END IF;
  IF EXISTS (SELECT 1 FROM pg_catalog.pg_roles
             WHERE rolname IN ('hh_app_backend', 'anon', 'authenticated')
               AND (rolsuper OR rolbypassrls)) THEN
    RAISE EXCEPTION 'Application roles must not be superusers or bypass RLS';
  END IF;
  IF pg_catalog.pg_has_role('anon', 'hh_app_backend', 'MEMBER')
     OR pg_catalog.pg_has_role('authenticated', 'hh_app_backend', 'MEMBER') THEN
    RAISE EXCEPTION 'Browser role inherits backend role; backend-only access cannot be guaranteed';
  END IF;
  IF current_user IN ('hh_app_backend', 'anon', 'authenticated') THEN
    RAISE EXCEPTION 'Use the already authorized administrative migration role';
  END IF;
END
$preflight$;

CREATE TABLE app.assessment_interpretation_versions (
  assessment_version_id uuid NOT NULL
    REFERENCES app.assessment_versions(id) ON DELETE RESTRICT ON UPDATE RESTRICT,
  interpretation_version text NOT NULL
    CHECK (interpretation_version = btrim(interpretation_version)
      AND length(interpretation_version) BETWEEN 1 AND 100),
  report_locale text NOT NULL CHECK (report_locale IN ('en', 'ru')),
  definition_content_hash text NOT NULL CHECK (definition_content_hash ~ '^sha256:[0-9a-f]{64}$'),
  provenance jsonb NOT NULL CHECK (jsonb_typeof(provenance) = 'object'),
  source_commit text NOT NULL CHECK (source_commit ~ '^[0-9a-f]{40}$'),
  rules_engine_version text NOT NULL
    CHECK (rules_engine_version = btrim(rules_engine_version)
      AND length(rules_engine_version) BETWEEN 1 AND 100),
  payload_sha256 text NOT NULL CHECK (payload_sha256 ~ '^sha256:[0-9a-f]{64}$'),
  payload jsonb NOT NULL,
  payload_canonical text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (assessment_version_id, interpretation_version, report_locale),
  CONSTRAINT interpretation_payload_contract CHECK ((
    jsonb_typeof(payload) = 'object'
    AND jsonb_typeof(payload -> 'schemaVersion') = 'string'
    AND payload ->> 'schemaVersion' = 'hh-interpretation.v1'
    AND jsonb_typeof(payload -> 'interpretationVersion') = 'string'
    AND payload ->> 'interpretationVersion' = interpretation_version
    AND jsonb_typeof(payload -> 'reportLocale') = 'string'
    AND jsonb_typeof(payload -> 'sourceCommit') = 'string'
    AND jsonb_typeof(payload -> 'rulesEngineVersion') = 'string'
    AND payload -> 'provenance' = provenance
    AND payload ->> 'reportLocale' = report_locale
    AND payload ->> 'sourceCommit' = source_commit
    AND payload ->> 'rulesEngineVersion' = rules_engine_version
    AND jsonb_typeof(payload -> 'dimensions') = 'array'
    AND jsonb_array_length(payload -> 'dimensions') > 0
  ) IS TRUE),
  CONSTRAINT interpretation_payload_bytes CHECK ((payload_canonical::jsonb = payload) IS TRUE),
  CONSTRAINT interpretation_payload_digest CHECK ((
    payload_sha256 = 'sha256:' || encode(sha256(convert_to(payload_canonical, 'UTF8')), 'hex')
  ) IS TRUE)
);

-- Invoker-only function. It requires only the permissions the INSERT caller already has.
-- SECURITY DEFINER is deliberately not used; no wider permissions or credentials are created.
CREATE FUNCTION app.assessment_interpretation_validate_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $validate$
DECLARE
  definition_record app.assessment_versions%ROWTYPE;
  expected_provenance jsonb;
  dimension_record jsonb;
  variant_record jsonb;
  combined_values jsonb;
  required_text_key text;
  required_array_key text;
BEGIN
  -- Fail closed if this trigger function is ever attached to another object.
  IF TG_TABLE_SCHEMA <> 'app' OR TG_TABLE_NAME <> 'assessment_interpretation_versions'
     OR TG_OP <> 'INSERT' OR TG_LEVEL <> 'ROW' THEN
    RAISE EXCEPTION 'Interpretation validation trigger attached outside its scope';
  END IF;
  SELECT v.* INTO definition_record
  FROM app.assessment_versions AS v
  WHERE v.id = NEW.assessment_version_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION USING ERRCODE = '23503', MESSAGE = 'Referenced assessment definition does not exist or is not visible';
  END IF;
  IF definition_record.status IS DISTINCT FROM 'published' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Interpretations require a published assessment definition';
  END IF;
  IF (definition_record.definition ->> 'id') IS DISTINCT FROM definition_record.id::text
     OR jsonb_typeof(definition_record.result_schema -> 'version') IS DISTINCT FROM 'string'
     OR length(definition_record.result_schema ->> 'version') = 0
     OR (definition_record.definition ->> 'resultVersion') IS DISTINCT FROM
        (definition_record.result_schema ->> 'version') THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Existing definition identity/result provenance is inconsistent';
  END IF;
  expected_provenance := jsonb_build_object(
    'assessmentVersionId', definition_record.id::text,
    'definitionKey', definition_record.definition_key,
    'definitionVersion', definition_record.definition_version,
    'instrumentLocale', definition_record.instrument_locale,
    'translationVersion', definition_record.translation_version,
    'scoringKey', definition_record.scoring_key,
    'scoringVersion', definition_record.scoring_version,
    'resultVersion', definition_record.result_schema ->> 'version',
    'contentHash', definition_record.content_hash
  );
  IF NEW.definition_content_hash IS DISTINCT FROM definition_record.content_hash
     OR NEW.provenance IS DISTINCT FROM expected_provenance THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Interpretation provenance does not exactly match its assessment definition';
  END IF;
  -- CHECK constraints enforce the outer payload and byte hash; validate dimension identities here.
  IF jsonb_typeof(NEW.payload -> 'dimensions') = 'array' THEN
    IF EXISTS (
      SELECT 1 FROM jsonb_array_elements(NEW.payload -> 'dimensions') AS item(value)
      WHERE jsonb_typeof(value) IS DISTINCT FROM 'object'
        OR jsonb_typeof(value -> 'signature' -> 'key') IS DISTINCT FROM 'string'
        OR length(btrim(value -> 'signature' ->> 'key')) NOT BETWEEN 1 AND 250
    ) OR EXISTS (
      SELECT value -> 'signature' ->> 'key' FROM jsonb_array_elements(NEW.payload -> 'dimensions') AS item(value)
      GROUP BY value -> 'signature' ->> 'key' HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Interpretation dimension keys must be unique nonempty strings';
    END IF;
  END IF;
  -- This release uses a finite-domain declarative renderer. Reject malformed, missing,
  -- duplicate or uncovered variant data even when its byte hash is internally consistent.
  IF (NEW.payload ->> 'rendererStrategy') IS DISTINCT FROM 'finite-domain-template.v1' THEN
    RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Unsupported interpretation renderer strategy';
  END IF;
  IF jsonb_typeof(NEW.payload -> 'dimensions') = 'array' THEN
    FOR dimension_record IN SELECT value FROM jsonb_array_elements(NEW.payload -> 'dimensions') LOOP
      IF jsonb_typeof(dimension_record -> 'signature') IS DISTINCT FROM 'object'
         OR jsonb_typeof(dimension_record -> 'signature' -> 'min') IS DISTINCT FROM 'number'
         OR jsonb_typeof(dimension_record -> 'signature' -> 'max') IS DISTINCT FROM 'number'
         OR jsonb_typeof(dimension_record -> 'allowedValues') IS DISTINCT FROM 'array'
         OR jsonb_typeof(dimension_record -> 'variants') IS DISTINCT FROM 'array' THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Invalid interpretation dimension shape';
      END IF;
      IF (dimension_record -> 'signature' ->> 'min')::numeric > (dimension_record -> 'signature' ->> 'max')::numeric
         OR jsonb_array_length(dimension_record -> 'allowedValues') = 0
         OR jsonb_array_length(dimension_record -> 'variants') = 0
         OR EXISTS (SELECT 1 FROM jsonb_array_elements(dimension_record -> 'allowedValues') AS item(value)
                    WHERE jsonb_typeof(value) IS DISTINCT FROM 'number') THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Invalid interpretation score domain';
      END IF;
      IF EXISTS (SELECT 1 FROM jsonb_array_elements(dimension_record -> 'allowedValues') AS item(value)
                 WHERE value::text::numeric < (dimension_record -> 'signature' ->> 'min')::numeric
                    OR value::text::numeric > (dimension_record -> 'signature' ->> 'max')::numeric)
         OR EXISTS (SELECT value FROM jsonb_array_elements(dimension_record -> 'allowedValues') AS item(value)
                    GROUP BY value HAVING count(*) > 1) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Interpretation domain values must be unique and within bounds';
      END IF;
      combined_values := '[]'::jsonb;
      FOR variant_record IN SELECT value FROM jsonb_array_elements(dimension_record -> 'variants') LOOP
        IF jsonb_typeof(variant_record) IS DISTINCT FROM 'object'
           OR jsonb_typeof(variant_record -> 'values') IS DISTINCT FROM 'array'
           OR jsonb_typeof(variant_record -> 'template') IS DISTINCT FROM 'object' THEN
          RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Invalid interpretation variant shape';
        END IF;
        IF jsonb_array_length(variant_record -> 'values') = 0
           OR EXISTS (SELECT 1 FROM jsonb_array_elements(variant_record -> 'values') AS item(value)
                      WHERE jsonb_typeof(value) IS DISTINCT FROM 'number') THEN
          RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Interpretation variant needs numeric score values';
        END IF;
        FOREACH required_text_key IN ARRAY ARRAY['basis','code','label','summary','meaning','construct','presentationDirection'] LOOP
          IF jsonb_typeof(variant_record -> 'template' -> required_text_key) IS DISTINCT FROM 'string' THEN
            RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Interpretation template text is missing or malformed';
          END IF;
        END LOOP;
        FOREACH required_array_key IN ARRAY ARRAY['actions','limitations','bands'] LOOP
          IF jsonb_typeof(variant_record -> 'template' -> required_array_key) IS DISTINCT FROM 'array' THEN
            RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Interpretation template list is missing or malformed';
          END IF;
        END LOOP;
        IF (variant_record -> 'template' -> 'verified') IS DISTINCT FROM 'true'::jsonb
           OR jsonb_typeof(variant_record -> 'template' -> 'continuous') IS DISTINCT FROM 'boolean'
           OR jsonb_typeof(variant_record -> 'template' -> 'reliableDirection') IS DISTINCT FROM 'boolean'
           OR jsonb_typeof(variant_record -> 'template' -> 'recommendedReview') IS DISTINCT FROM 'boolean'
           OR EXISTS (SELECT 1 FROM jsonb_array_elements(variant_record -> 'template' -> 'actions') AS item(value) WHERE jsonb_typeof(value) IS DISTINCT FROM 'string')
           OR EXISTS (SELECT 1 FROM jsonb_array_elements(variant_record -> 'template' -> 'limitations') AS item(value) WHERE jsonb_typeof(value) IS DISTINCT FROM 'string')
           OR EXISTS (SELECT 1 FROM jsonb_array_elements(variant_record -> 'template' -> 'bands') AS item(value) WHERE jsonb_typeof(value) IS DISTINCT FROM 'object') THEN
          RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Interpretation template values are malformed or unverified';
        END IF;
        combined_values := combined_values || (variant_record -> 'values');
      END LOOP;
      IF jsonb_array_length(combined_values) <> jsonb_array_length(dimension_record -> 'allowedValues')
         OR NOT (combined_values @> (dimension_record -> 'allowedValues'))
         OR NOT ((dimension_record -> 'allowedValues') @> combined_values) THEN
        RAISE EXCEPTION USING ERRCODE = '23514', MESSAGE = 'Interpretation variants must cover the score domain exactly once';
      END IF;
    END LOOP;
  END IF;
  RETURN NEW;
END
$validate$;

CREATE FUNCTION app.assessment_interpretation_reject_mutation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = pg_catalog
AS $immutable$
BEGIN
  IF TG_TABLE_SCHEMA <> 'app' OR TG_TABLE_NAME <> 'assessment_interpretation_versions'
     OR TG_OP NOT IN ('UPDATE', 'DELETE', 'TRUNCATE') OR TG_LEVEL <> 'STATEMENT' THEN
    RAISE EXCEPTION 'Interpretation immutability trigger attached outside its scope';
  END IF;
  RAISE EXCEPTION USING ERRCODE = '55000', MESSAGE = 'Assessment interpretations are immutable; append a new interpretation version';
END
$immutable$;

CREATE TRIGGER interpretation_validate_insert
  BEFORE INSERT ON app.assessment_interpretation_versions
  FOR EACH ROW EXECUTE FUNCTION app.assessment_interpretation_validate_insert();
CREATE TRIGGER interpretation_reject_mutation
  BEFORE UPDATE OR DELETE OR TRUNCATE ON app.assessment_interpretation_versions
  FOR EACH STATEMENT EXECUTE FUNCTION app.assessment_interpretation_reject_mutation();

ALTER TABLE app.assessment_interpretation_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.assessment_interpretation_versions FORCE ROW LEVEL SECURITY;

-- Revoke grants inherited from default ACLs, on these NEW objects only.
-- Owner/superuser administrative access cannot be removed by table ACLs or RLS.
-- No schema USAGE grants, existing-object grants, default privileges or role changes occur.
DO $new_object_acl$
DECLARE
  grantee_record record;
  new_object record;
  target_role text;
BEGIN
  FOR grantee_record IN
    SELECT DISTINCT a.grantee
    FROM pg_catalog.pg_class c
    CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(c.relacl, pg_catalog.acldefault('r', c.relowner))) AS a
    WHERE c.oid = 'app.assessment_interpretation_versions'::regclass AND a.grantee <> c.relowner
  LOOP
    target_role := CASE WHEN grantee_record.grantee = 0 THEN 'PUBLIC'
      ELSE pg_catalog.quote_ident(pg_catalog.pg_get_userbyid(grantee_record.grantee)) END;
    EXECUTE 'REVOKE ALL ON TABLE app.assessment_interpretation_versions FROM ' || target_role;
  END LOOP;
  FOR new_object IN
    SELECT p.oid, p.proowner FROM pg_catalog.pg_proc p
    WHERE p.oid IN ('app.assessment_interpretation_validate_insert()'::regprocedure,
                    'app.assessment_interpretation_reject_mutation()'::regprocedure)
  LOOP
    FOR grantee_record IN
      SELECT DISTINCT a.grantee FROM pg_catalog.pg_proc p
      CROSS JOIN LATERAL pg_catalog.aclexplode(coalesce(p.proacl, pg_catalog.acldefault('f', p.proowner))) AS a
      WHERE p.oid = new_object.oid AND a.grantee <> p.proowner
    LOOP
      target_role := CASE WHEN grantee_record.grantee = 0 THEN 'PUBLIC'
        ELSE pg_catalog.quote_ident(pg_catalog.pg_get_userbyid(grantee_record.grantee)) END;
      EXECUTE 'REVOKE ALL ON FUNCTION ' || new_object.oid::regprocedure::text || ' FROM ' || target_role;
    END LOOP;
  END LOOP;
END
$new_object_acl$;

GRANT SELECT ON TABLE app.assessment_interpretation_versions TO hh_app_backend;
CREATE POLICY interpretation_backend_read ON app.assessment_interpretation_versions
  FOR SELECT TO hh_app_backend USING (true);

DO $verify_new_object$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_catalog.pg_class
    WHERE oid = 'app.assessment_interpretation_versions'::regclass AND relrowsecurity AND relforcerowsecurity) THEN
    RAISE EXCEPTION 'Registry RLS flags failed verification';
  END IF;
  IF EXISTS (
    SELECT 1 FROM pg_catalog.pg_class c
    CROSS JOIN LATERAL pg_catalog.aclexplode(c.relacl) AS a
    WHERE c.oid = 'app.assessment_interpretation_versions'::regclass
      AND a.grantee <> c.relowner
      AND NOT (a.grantee = (SELECT oid FROM pg_catalog.pg_roles WHERE rolname = 'hh_app_backend')
        AND a.privilege_type = 'SELECT' AND NOT a.is_grantable)
  ) THEN
    RAISE EXCEPTION 'Registry has unexpected non-owner grants';
  END IF;
  IF pg_catalog.has_table_privilege('anon', 'app.assessment_interpretation_versions', 'SELECT')
     OR pg_catalog.has_table_privilege('authenticated', 'app.assessment_interpretation_versions', 'SELECT')
     OR NOT pg_catalog.has_table_privilege('hh_app_backend', 'app.assessment_interpretation_versions', 'SELECT')
     OR pg_catalog.has_table_privilege('hh_app_backend', 'app.assessment_interpretation_versions', 'INSERT,UPDATE,DELETE,TRUNCATE,REFERENCES,TRIGGER') THEN
    RAISE EXCEPTION 'Registry effective application-role privileges failed verification';
  END IF;
END
$verify_new_object$;
COMMIT;
