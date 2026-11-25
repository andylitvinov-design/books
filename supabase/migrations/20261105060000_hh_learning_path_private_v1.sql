-- HH-AI-LEARNING-PATH v1: private, consented, rules-first study path.
-- Additive: never change the existing Reiki answers/progress/CRM.
BEGIN;
CREATE TABLE app_private.learning_paths (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  locale text NOT NULL CHECK (locale IN ('ru','en','es')),
  source_course_id text NOT NULL CHECK (source_course_id = 'academy-energywork-principles'),
  source_version text NOT NULL CHECK (length(source_version) BETWEEN 4 AND 80),
  interview_ciphertext text NOT NULL,
  plan jsonb NOT NULL CHECK (jsonb_typeof(plan) = 'object'),
  progress jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(progress) = 'object'),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','paused','archived')),
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  create_operation_id uuid NOT NULL,
  create_hash text NOT NULL CHECK (length(create_hash) = 64),
  consented_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, account_id),
  UNIQUE (account_id, create_operation_id)
);
CREATE UNIQUE INDEX learning_paths_one_active ON app_private.learning_paths(account_id) WHERE status='active';
CREATE INDEX learning_paths_owner_recent ON app_private.learning_paths(account_id,updated_at DESC);

CREATE TABLE app_private.learning_path_tutor_turns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL,
  path_id uuid NOT NULL,
  step_key text NOT NULL CHECK (length(step_key) BETWEEN 3 AND 80),
  mode text NOT NULL DEFAULT 'rules' CHECK (mode = 'rules'),
  action text NOT NULL CHECK (action IN ('explain','hint','example','review')),
  question_ciphertext text NOT NULL,
  reply_ciphertext text NOT NULL,
  operation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (path_id, account_id) REFERENCES app_private.learning_paths(id,account_id) ON DELETE CASCADE,
  UNIQUE (account_id, path_id, operation_id)
);
CREATE INDEX learning_tutor_owner_recent ON app_private.learning_path_tutor_turns(account_id,path_id,created_at DESC);
ALTER TABLE app_private.learning_paths ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.learning_paths FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.learning_path_tutor_turns ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.learning_path_tutor_turns FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.learning_paths, app_private.learning_path_tutor_turns FROM PUBLIC,anon,authenticated,hh_app_inbox;
GRANT SELECT,INSERT,UPDATE,DELETE ON app_private.learning_paths TO hh_app_backend;
GRANT SELECT,INSERT ON app_private.learning_path_tutor_turns TO hh_app_backend;
CREATE POLICY learning_paths_owner ON app_private.learning_paths FOR ALL TO hh_app_backend
  USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
  WITH CHECK(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY learning_path_tutor_owner ON app_private.learning_path_tutor_turns FOR ALL TO hh_app_backend
  USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
  WITH CHECK(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
COMMIT;
