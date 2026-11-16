-- Holistic House · Client Memory & Care Journey v3 — integration candidate, not applied.
-- Run as a single migration after CI, two-account RLS tests, review and permission.
-- Use `supabase migration new` to assign an official migration filename.
-- NOT APPLIED TO PRODUCTION. Create an official migration filename using
-- `supabase migration new ...`, reconcile against current protected HEAD,
-- run a two-account RLS fixture and Supabase advisors before any application.
-- No clinical records, secrets or actual client data are required.
BEGIN;

CREATE TABLE app_private.client_ai_memory_settings (
  account_id uuid PRIMARY KEY REFERENCES app.accounts(id) ON DELETE CASCADE,
  memory_enabled boolean NOT NULL DEFAULT false,
  sensitive_enabled boolean NOT NULL DEFAULT false,
  chat_history_enabled boolean NOT NULL DEFAULT false,
  master_sharing_enabled boolean NOT NULL DEFAULT false,
  reminders_enabled boolean NOT NULL DEFAULT false,
  third_party_inference_enabled boolean NOT NULL DEFAULT false,
  consent_version text NOT NULL DEFAULT 'client-ai-memory-v2'
    CHECK (consent_version = 'client-ai-memory-v2'),
  opted_in_at timestamptz,
  revoked_at timestamptz,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE app_private.client_ai_memory_items (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN
    ('goal','current_desired_state','resource','boundary',
     'practice_feedback','commitment')),
  scope text NOT NULL CHECK (scope IN ('coaching','support','learning','media')),
  privacy_class text NOT NULL DEFAULT 'general'
    CHECK (privacy_class IN ('general','sensitive')),
  payload_ciphertext text NOT NULL
    CHECK (char_length(payload_ciphertext) BETWEEN 40 AND 16000),
  source_kind text NOT NULL CHECK (source_kind IN
    ('client_explicit','client_confirmed_ai','checkin_self_report',
     'learning_progress','practitioner_shared')),
  source_hash text,
  source_at timestamptz,
  confidence text NOT NULL CHECK (confidence IN
    ('client_confirmed','client_edited','user_self_report')),
  status text NOT NULL DEFAULT 'confirmed'
    CHECK (status IN ('confirmed','archived')),
  pinned boolean NOT NULL DEFAULT false,
  supersedes_id uuid REFERENCES app_private.client_ai_memory_items(id) ON DELETE SET NULL,
  confirmed_at timestamptz NOT NULL,
  recheck_at timestamptz,
  expires_at timestamptz NOT NULL,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  operation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id,id),
  UNIQUE(account_id,operation_id),
  CHECK (expires_at > confirmed_at),
  CHECK (source_hash IS NULL OR char_length(source_hash) BETWEEN 32 AND 128)
);
CREATE INDEX client_ai_memory_items_recall_idx
  ON app_private.client_ai_memory_items(account_id,status,expires_at,category);

CREATE TABLE app_private.client_ai_memory_shares (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  memory_item_id uuid NOT NULL,
  consultation_request_id uuid NOT NULL REFERENCES app.consultation_requests(id) ON DELETE CASCADE,
  practitioner_account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  scope text NOT NULL CHECK (scope IN ('view_one_item')),
  consent_version text NOT NULL CHECK (consent_version='client-ai-share-v2'),
  operation_id uuid NOT NULL,
  granted_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  revoked_at timestamptz,
  UNIQUE(account_id,operation_id),
  FOREIGN KEY(account_id,memory_item_id)
    REFERENCES app_private.client_ai_memory_items(account_id,id) ON DELETE CASCADE,
  CHECK (expires_at > granted_at)
);
CREATE INDEX client_ai_shares_master_idx
  ON app_private.client_ai_memory_shares(practitioner_account_id,consultation_request_id,expires_at);
CREATE UNIQUE INDEX client_ai_shares_active_unique
  ON app_private.client_ai_memory_shares(account_id,memory_item_id,consultation_request_id,practitioner_account_id)
  WHERE revoked_at IS NULL;

CREATE TABLE app_private.client_care_tasks (
  id uuid PRIMARY KEY,
  client_account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  practitioner_account_id uuid REFERENCES app.accounts(id) ON DELETE SET NULL,
  consultation_request_id uuid REFERENCES app.consultation_requests(id) ON DELETE CASCADE,
  origin text NOT NULL CHECK (origin IN ('master_assignment','client_commitment','assistant_suggestion')),
  task_type text NOT NULL CHECK (task_type IN
    ('practice','reflection','test','course','checkin','video','other')),
  payload_ciphertext text NOT NULL CHECK (char_length(payload_ciphertext) BETWEEN 40 AND 20000),
  status text NOT NULL CHECK (status IN
    ('proposed','offered','accepted','in_progress','self_reported','reviewed',
     'declined','paused','cancelled','archived')),
  due_on date,
  accepted_at timestamptz,
  self_reported_at timestamptz,
  reviewed_at timestamptz,
  revision integer NOT NULL DEFAULT 0 CHECK (revision >= 0),
  operation_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_account_id,operation_id),
  UNIQUE(id,client_account_id),
  CHECK ((origin='master_assignment' AND practitioner_account_id IS NOT NULL
    AND consultation_request_id IS NOT NULL) OR
    (origin <> 'master_assignment' AND practitioner_account_id IS NULL
    AND consultation_request_id IS NULL))
);
CREATE INDEX client_care_tasks_client_idx
  ON app_private.client_care_tasks(client_account_id,status,due_on);
CREATE INDEX client_care_tasks_master_idx
  ON app_private.client_care_tasks(practitioner_account_id,consultation_request_id,status);

CREATE TABLE app_private.client_care_task_events (
  id uuid PRIMARY KEY,
  task_id uuid NOT NULL,
  client_account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  actor_account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  event_kind text NOT NULL CHECK (event_kind IN
    ('offered','accepted','declined','started','paused','resumed','self_reported',
     'revised_report','reviewed','requested_revision','cancelled','archived')),
  payload_ciphertext text,
  operation_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(client_account_id,operation_id),
  FOREIGN KEY(task_id,client_account_id)
    REFERENCES app_private.client_care_tasks(id,client_account_id) ON DELETE CASCADE,
  CHECK (payload_ciphertext IS NULL OR char_length(payload_ciphertext) BETWEEN 40 AND 16000)
);
CREATE INDEX client_care_task_events_idx
  ON app_private.client_care_task_events(client_account_id,task_id,occurred_at);

CREATE TABLE app_private.client_ai_memory_audit (
  id uuid PRIMARY KEY,
  account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  actor_account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN
    ('consent_enabled','consent_revoked','item_confirmed','item_edited',
     'item_forgotten','all_forgotten','share_granted','share_revoked',
     'task_offered','task_changed','task_reviewed')),
  record_id uuid,
  operation_id uuid NOT NULL,
  request_hash text CHECK(request_hash IS NULL OR request_hash ~ '^[0-9a-f]{64}$'),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(account_id,operation_id)
);
CREATE INDEX client_ai_memory_audit_owner_idx
  ON app_private.client_ai_memory_audit(account_id,created_at);

-- SQL invoker binding helper: no elevated privileges; caller explicitly checks actor identity.
CREATE FUNCTION app_private.client_care_request_binding_valid(
  p_request_id uuid, p_client_account_id uuid, p_practitioner_account_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = ''
AS $fn$
  SELECT EXISTS (
    SELECT 1
      FROM app.consultation_requests r
      JOIN app.practitioners p ON p.id = r.recipient_practitioner_id
     WHERE r.id = p_request_id
       AND r.account_id = p_client_account_id
       AND p.trusted_auth_user_id = p_practitioner_account_id
       AND p.active IS TRUE AND p.status = 'approved'
       AND r.status IN ('requested','contacted','confirmed','in_progress')
   );
$fn$;
REVOKE ALL ON FUNCTION app_private.client_care_request_binding_valid(uuid,uuid,uuid)
  FROM PUBLIC,anon,authenticated,hh_app_inbox;
GRANT EXECUTE ON FUNCTION app_private.client_care_request_binding_valid(uuid,uuid,uuid)
  TO hh_app_backend;

-- Narrow, actor-bound share target lookup to break reciprocal RLS expansion.
-- Migration owner must be reviewed for FORCE RLS bypass; client roles get none.
CREATE FUNCTION app_private.client_ai_share_item_valid(
  p_account_id uuid, p_memory_item_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
AS $fn$
  SELECT p_account_id=(SELECT auth.uid())
    AND (SELECT app_private.account_active())
    AND EXISTS (
      SELECT 1 FROM app_private.client_ai_memory_items item
      WHERE item.account_id=p_account_id
        AND item.id=p_memory_item_id
        AND item.status='confirmed'
        AND item.expires_at>now()
    );
$fn$;
REVOKE ALL ON FUNCTION app_private.client_ai_share_item_valid(uuid,uuid)
  FROM PUBLIC,anon,authenticated,hh_app_inbox;
GRANT EXECUTE ON FUNCTION app_private.client_ai_share_item_valid(uuid,uuid)
  TO hh_app_backend;

DO $roles$ DECLARE t text; BEGIN
  FOREACH t IN ARRAY ARRAY[
    'client_ai_memory_settings','client_ai_memory_items',
    'client_ai_memory_shares','client_care_tasks',
    'client_care_task_events','client_ai_memory_audit'
  ] LOOP
    EXECUTE format('ALTER TABLE app_private.%I ENABLE ROW LEVEL SECURITY',t);
    EXECUTE format('ALTER TABLE app_private.%I FORCE ROW LEVEL SECURITY',t);
    EXECUTE format('REVOKE ALL ON app_private.%I FROM PUBLIC,anon,authenticated,hh_app_backend,hh_app_inbox',t);
  END LOOP;
END $roles$;

GRANT SELECT,INSERT,UPDATE,DELETE ON app_private.client_ai_memory_settings TO hh_app_backend;
CREATE POLICY client_ai_settings_select ON app_private.client_ai_memory_settings
 FOR SELECT TO hh_app_backend USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY client_ai_settings_insert ON app_private.client_ai_memory_settings
 FOR INSERT TO hh_app_backend WITH CHECK(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY client_ai_settings_update ON app_private.client_ai_memory_settings
 FOR UPDATE TO hh_app_backend USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
 WITH CHECK(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY client_ai_settings_delete ON app_private.client_ai_memory_settings
 FOR DELETE TO hh_app_backend USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));

GRANT SELECT,INSERT,UPDATE,DELETE ON app_private.client_ai_memory_items TO hh_app_backend;
-- Only explicitly consented, non-expired, active shares can expose an item to a master.
CREATE POLICY client_ai_items_select ON app_private.client_ai_memory_items
 FOR SELECT TO hh_app_backend USING (
  (account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
  OR EXISTS (
    SELECT 1 FROM app_private.client_ai_memory_shares s
    WHERE s.account_id=client_ai_memory_items.account_id
      AND s.memory_item_id=client_ai_memory_items.id
      AND s.practitioner_account_id=(SELECT auth.uid())
      AND s.revoked_at IS NULL AND s.expires_at>now()
      AND client_ai_memory_items.status='confirmed'
      AND client_ai_memory_items.expires_at>now()
      -- Owner-only settings cannot be SELECTed by a master under RLS.
      -- The consent trigger atomically revokes every share when switched off.
      AND app_private.client_care_request_binding_valid(
        s.consultation_request_id,s.account_id,s.practitioner_account_id)
  )
 );
CREATE POLICY client_ai_items_insert ON app_private.client_ai_memory_items
 FOR INSERT TO hh_app_backend WITH CHECK(
   account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active())
   AND EXISTS (SELECT 1 FROM app_private.client_ai_memory_settings settings
       WHERE settings.account_id=client_ai_memory_items.account_id
         AND settings.memory_enabled IS TRUE
         AND (client_ai_memory_items.privacy_class<>'sensitive'
              OR settings.sensitive_enabled IS TRUE))
 );
CREATE POLICY client_ai_items_update ON app_private.client_ai_memory_items
 FOR UPDATE TO hh_app_backend USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
 WITH CHECK(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY client_ai_items_delete ON app_private.client_ai_memory_items
 FOR DELETE TO hh_app_backend USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));

GRANT SELECT,INSERT,UPDATE,DELETE ON app_private.client_ai_memory_shares TO hh_app_backend;
CREATE POLICY client_ai_shares_select ON app_private.client_ai_memory_shares
 FOR SELECT TO hh_app_backend USING (
  account_id=(SELECT auth.uid())
  OR (practitioner_account_id=(SELECT auth.uid()) AND revoked_at IS NULL AND expires_at>now()
    -- Live sharing consent is the unrevoked time-bounded grant; revocation
    -- of the owner's purpose disables all grants in the same DB transaction.
    AND app_private.client_care_request_binding_valid(
      consultation_request_id,account_id,practitioner_account_id))
 );
CREATE POLICY client_ai_shares_insert ON app_private.client_ai_memory_shares
 FOR INSERT TO hh_app_backend WITH CHECK(
    account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active())
    AND EXISTS (SELECT 1 FROM app_private.client_ai_memory_settings settings
      WHERE settings.account_id=client_ai_memory_shares.account_id
        AND settings.memory_enabled IS TRUE
        AND settings.master_sharing_enabled IS TRUE)
    AND app_private.client_ai_share_item_valid(
      client_ai_memory_shares.account_id,client_ai_memory_shares.memory_item_id)
    AND app_private.client_care_request_binding_valid(
      consultation_request_id,account_id,practitioner_account_id)
 );
CREATE POLICY client_ai_shares_update ON app_private.client_ai_memory_shares
 FOR UPDATE TO hh_app_backend USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
 WITH CHECK(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY client_ai_shares_delete ON app_private.client_ai_memory_shares
 FOR DELETE TO hh_app_backend USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));

GRANT SELECT,INSERT,UPDATE ON app_private.client_care_tasks TO hh_app_backend;
CREATE POLICY client_care_tasks_select ON app_private.client_care_tasks
 FOR SELECT TO hh_app_backend USING (
  (client_account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
  OR (practitioner_account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active())
    AND app_private.client_care_request_binding_valid(
      consultation_request_id,client_account_id,practitioner_account_id))
 );
CREATE POLICY client_care_tasks_insert ON app_private.client_care_tasks
 FOR INSERT TO hh_app_backend WITH CHECK (
   (client_account_id=(SELECT auth.uid()) AND origin<>'master_assignment'
     AND status='proposed' AND revision=0 AND (SELECT app_private.account_active()))
  OR (practitioner_account_id=(SELECT auth.uid()) AND origin='master_assignment'
    AND status='offered' AND revision=0 AND (SELECT app_private.account_active())
    AND app_private.client_care_request_binding_valid(
      consultation_request_id,client_account_id,practitioner_account_id))
 );
CREATE POLICY client_care_tasks_update ON app_private.client_care_tasks
 FOR UPDATE TO hh_app_backend USING (
   client_account_id=(SELECT auth.uid())
   OR (practitioner_account_id=(SELECT auth.uid()) AND
       app_private.client_care_request_binding_valid(
         consultation_request_id,client_account_id,practitioner_account_id))
 ) WITH CHECK (
   client_account_id=(SELECT auth.uid())
   OR (practitioner_account_id=(SELECT auth.uid()) AND
       app_private.client_care_request_binding_valid(
         consultation_request_id,client_account_id,practitioner_account_id))
 );

GRANT SELECT,INSERT ON app_private.client_care_task_events TO hh_app_backend;
CREATE POLICY client_care_events_select ON app_private.client_care_task_events
 FOR SELECT TO hh_app_backend USING (
  EXISTS (SELECT 1 FROM app_private.client_care_tasks t
    WHERE t.id=task_id AND t.client_account_id=client_account_id)
 );
CREATE POLICY client_care_events_insert ON app_private.client_care_task_events
 FOR INSERT TO hh_app_backend WITH CHECK (
  actor_account_id=(SELECT auth.uid())
  AND EXISTS(SELECT 1 FROM app_private.client_care_tasks t
    WHERE t.id=task_id AND t.client_account_id=client_account_id
      AND (
        (t.client_account_id=(SELECT auth.uid()) AND event_kind IN
          ('accepted','declined','started','paused','resumed','self_reported',
           'revised_report','archived'))
        OR (t.origin='master_assignment' AND
            t.practitioner_account_id=(SELECT auth.uid()) AND
            event_kind IN ('offered','reviewed','requested_revision','cancelled') AND
            app_private.client_care_request_binding_valid(
              t.consultation_request_id,t.client_account_id,t.practitioner_account_id))
      ))
 );

GRANT SELECT,INSERT ON app_private.client_ai_memory_audit TO hh_app_backend;
CREATE POLICY client_ai_audit_select ON app_private.client_ai_memory_audit
 FOR SELECT TO hh_app_backend USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY client_ai_audit_insert ON app_private.client_ai_memory_audit
 FOR INSERT TO hh_app_backend WITH CHECK(actor_account_id=(SELECT auth.uid()) AND
   account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));

-- Defense-in-depth: even a backend route bug may not re-bind another
-- client/consultation/practitioner to an existing encrypted assignment.
CREATE FUNCTION app_private.client_memory_guard_immutable_bindings()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $guard$
BEGIN
  IF TG_TABLE_NAME = 'client_care_tasks' THEN
    IF (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.client_account_id IS DISTINCT FROM OLD.client_account_id OR
    NEW.practitioner_account_id IS DISTINCT FROM OLD.practitioner_account_id OR
    NEW.consultation_request_id IS DISTINCT FROM OLD.consultation_request_id OR
    NEW.origin IS DISTINCT FROM OLD.origin OR
    NEW.task_type IS DISTINCT FROM OLD.task_type OR
    NEW.payload_ciphertext IS DISTINCT FROM OLD.payload_ciphertext OR
    NEW.due_on IS DISTINCT FROM OLD.due_on OR
    NEW.operation_id IS DISTINCT FROM OLD.operation_id OR
    NEW.created_at IS DISTINCT FROM OLD.created_at
    ) THEN
      RAISE EXCEPTION 'CLIENT_CARE_BINDING_IMMUTABLE' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'client_ai_memory_shares' THEN
    IF (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.account_id IS DISTINCT FROM OLD.account_id OR
    NEW.memory_item_id IS DISTINCT FROM OLD.memory_item_id OR
    NEW.consultation_request_id IS DISTINCT FROM OLD.consultation_request_id OR
    NEW.practitioner_account_id IS DISTINCT FROM OLD.practitioner_account_id OR
    NEW.operation_id IS DISTINCT FROM OLD.operation_id OR
    NEW.granted_at IS DISTINCT FROM OLD.granted_at OR
    NEW.expires_at IS DISTINCT FROM OLD.expires_at OR
    NEW.consent_version IS DISTINCT FROM OLD.consent_version OR
    (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at)
    ) THEN
      RAISE EXCEPTION 'CLIENT_MEMORY_SHARE_IMMUTABLE' USING ERRCODE = '23514';
    END IF;
  ELSIF TG_TABLE_NAME = 'client_ai_memory_items' THEN
    IF (
    NEW.id IS DISTINCT FROM OLD.id OR
    NEW.account_id IS DISTINCT FROM OLD.account_id OR
    NEW.category IS DISTINCT FROM OLD.category OR
    NEW.privacy_class IS DISTINCT FROM OLD.privacy_class OR
    NEW.scope IS DISTINCT FROM OLD.scope OR
    NEW.source_kind IS DISTINCT FROM OLD.source_kind OR
    NEW.operation_id IS DISTINCT FROM OLD.operation_id OR
    NEW.confirmed_at IS DISTINCT FROM OLD.confirmed_at OR
    NEW.created_at IS DISTINCT FROM OLD.created_at
    ) THEN
      RAISE EXCEPTION 'CLIENT_MEMORY_ITEM_OWNER_IMMUTABLE' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$guard$;
REVOKE ALL ON FUNCTION app_private.client_memory_guard_immutable_bindings()
  FROM PUBLIC,anon,authenticated,hh_app_inbox;
CREATE TRIGGER client_care_task_bindings_immutable BEFORE UPDATE
  ON app_private.client_care_tasks FOR EACH ROW
  EXECUTE FUNCTION app_private.client_memory_guard_immutable_bindings();
CREATE TRIGGER client_ai_memory_share_bindings_immutable BEFORE UPDATE
  ON app_private.client_ai_memory_shares FOR EACH ROW
  EXECUTE FUNCTION app_private.client_memory_guard_immutable_bindings();
CREATE TRIGGER client_ai_memory_item_bindings_immutable BEFORE UPDATE
  ON app_private.client_ai_memory_items FOR EACH ROW
  EXECUTE FUNCTION app_private.client_memory_guard_immutable_bindings();

-- Even if a trusted route accidentally changes a task state directly,
-- the authenticated client cannot write master review and vice versa.
CREATE FUNCTION app_private.client_care_guard_transition()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $guard$
DECLARE actor uuid := (SELECT auth.uid());
        client_allowed boolean;
        master_allowed boolean;
BEGIN
  IF NEW.revision <> OLD.revision + 1 THEN
    RAISE EXCEPTION 'CLIENT_CARE_STALE_REVISION' USING ERRCODE='23514';
  END IF;
  -- Canonical event timestamps belong to the server, never to the caller.
  IF NEW.accepted_at IS DISTINCT FROM OLD.accepted_at AND
     NOT (OLD.status IN ('proposed','offered') AND NEW.status='accepted') THEN
    RAISE EXCEPTION 'CLIENT_CARE_ACCEPTED_TIME_FORBIDDEN' USING ERRCODE='23514';
  END IF;
  IF NEW.self_reported_at IS DISTINCT FROM OLD.self_reported_at AND
     NOT (OLD.status IN ('accepted','in_progress') AND NEW.status='self_reported') THEN
    RAISE EXCEPTION 'CLIENT_CARE_REPORT_TIME_FORBIDDEN' USING ERRCODE='23514';
  END IF;
  IF NEW.reviewed_at IS DISTINCT FROM OLD.reviewed_at AND
     NOT (OLD.status='self_reported' AND NEW.status='reviewed') THEN
    RAISE EXCEPTION 'CLIENT_CARE_REVIEW_TIME_FORBIDDEN' USING ERRCODE='23514';
  END IF;
  client_allowed := actor=OLD.client_account_id AND (
    (OLD.status IN ('proposed','offered') AND NEW.status IN ('accepted','declined')) OR
    (OLD.status IN ('accepted','paused') AND NEW.status='in_progress') OR
    (OLD.status IN ('accepted','in_progress') AND NEW.status IN ('self_reported','paused')) OR
    (OLD.status='self_reported' AND NEW.status IN ('self_reported','archived')) OR
    (OLD.status IN ('reviewed','declined','cancelled') AND NEW.status='archived')
  );
  master_allowed := actor=OLD.practitioner_account_id AND
    OLD.origin='master_assignment' AND app_private.client_care_request_binding_valid(
      OLD.consultation_request_id,OLD.client_account_id,OLD.practitioner_account_id)
    AND (
       (OLD.status='self_reported' AND NEW.status IN ('reviewed','in_progress')) OR
       (OLD.status IN ('offered','accepted','in_progress','paused','self_reported')
        AND NEW.status='cancelled')
    );
  IF NOT (client_allowed OR master_allowed) THEN
    RAISE EXCEPTION 'CLIENT_CARE_TRANSITION_FORBIDDEN' USING ERRCODE='23514';
  END IF;
  -- Overwrite supplied values even if a future trusted route has a bug.
  IF NEW.status='accepted' AND OLD.status IN ('proposed','offered') THEN
    NEW.accepted_at := now();
  END IF;
  IF NEW.status='self_reported' AND OLD.status IN ('accepted','in_progress') THEN
    NEW.self_reported_at := now();
  END IF;
  IF NEW.status='reviewed' AND OLD.status='self_reported' THEN
    NEW.reviewed_at := now();
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$guard$;
REVOKE ALL ON FUNCTION app_private.client_care_guard_transition()
  FROM PUBLIC,anon,authenticated,hh_app_inbox;
CREATE TRIGGER client_care_task_guard_transition BEFORE UPDATE
  ON app_private.client_care_tasks FOR EACH ROW
  EXECUTE FUNCTION app_private.client_care_guard_transition();


-- Security-critical: the client revoking AI memory/sensitive/master sharing
-- must invalidate previously granted master access in the SAME transaction.
-- SECURITY INVOKER intentionally inherits the current owner-only RLS.
CREATE FUNCTION app_private.client_memory_revoke_shares()
RETURNS trigger LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $revoke$
DECLARE active_account uuid;
BEGIN
  IF TG_OP='DELETE' THEN
    active_account:=OLD.account_id;
  ELSIF (OLD.memory_enabled AND NOT NEW.memory_enabled)
     OR (OLD.master_sharing_enabled AND NOT NEW.master_sharing_enabled)
     OR (OLD.sensitive_enabled AND NOT NEW.sensitive_enabled) THEN
    active_account:=NEW.account_id;
  ELSE
    RETURN NEW;
  END IF;
  UPDATE app_private.client_ai_memory_shares
     SET revoked_at=now()
   WHERE account_id=active_account AND revoked_at IS NULL;
  IF TG_OP='DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END;
$revoke$;
REVOKE ALL ON FUNCTION app_private.client_memory_revoke_shares()
  FROM PUBLIC,anon,authenticated,hh_app_inbox;
CREATE TRIGGER client_ai_memory_disable_revokes_shares AFTER UPDATE OF
  memory_enabled,master_sharing_enabled,sensitive_enabled
  ON app_private.client_ai_memory_settings FOR EACH ROW
  EXECUTE FUNCTION app_private.client_memory_revoke_shares();
CREATE TRIGGER client_ai_memory_delete_revokes_shares BEFORE DELETE
  ON app_private.client_ai_memory_settings FOR EACH ROW
  EXECUTE FUNCTION app_private.client_memory_revoke_shares();


COMMIT;

-- Remaining review TODO before release: validate all status transition
-- permissions in the server service and per-role HTTP/SQL tests. Verify
-- authenticated master/request SELECT grants and actual r.status values.
-- Beware ON DELETE CASCADE and settings-delete share revocation order.
-- Run migration only in an isolated PostgreSQL test fixture before prod.
-- Build 2-owner and 2-master tests and review retention/consent contracts.
