-- REHEARSAL ONLY. Extends existing Client Memory & Care Journey settings.
-- Depends on its reviewed migration and My Coach durable archive.
-- Corrected values are encrypted separately. No transcript or duplicate archive values. Register only after native SQL
-- rehearsal, privacy/retention review and production prerequisite verification.
BEGIN;
CREATE TABLE app_private.client_ai_memory_protocol_refs (
 account_id uuid NOT NULL REFERENCES app_private.client_ai_memory_settings(account_id) ON DELETE CASCADE,
 id uuid NOT NULL,
 protocol_id uuid NOT NULL,
 field_id text NOT NULL CHECK(field_id ~ '^[a-z0-9_]{1,60}$'),
 field_revision integer NOT NULL CHECK(field_revision>0),
 turn_index integer NOT NULL CHECK(turn_index BETWEEN 0 AND 511),
 source_hash text,
 status text NOT NULL DEFAULT 'active' CHECK(status IN ('active','blocked')),
 revision integer NOT NULL DEFAULT 0 CHECK(revision>=0),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,id),
 UNIQUE(account_id,protocol_id,field_id),
 FOREIGN KEY(account_id,protocol_id) REFERENCES app_private.my_coach_protocol_records(account_id,protocol_id) ON DELETE CASCADE,
 CHECK((status='active' AND source_hash IS NOT NULL AND source_hash ~ '^[0-9a-f]{64}$')
    OR (status='blocked' AND source_hash IS NULL))
);
CREATE INDEX client_ai_memory_protocol_refs_active_idx
 ON app_private.client_ai_memory_protocol_refs(account_id,id) WHERE status='active';
CREATE TABLE app_private.client_ai_memory_protocol_ref_versions (
 account_id uuid NOT NULL,
 ref_id uuid NOT NULL,
 revision integer NOT NULL CHECK(revision>0),
 value_ciphertext text NOT NULL CHECK(char_length(value_ciphertext) BETWEEN 40 AND 8000),
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,ref_id,revision),
 FOREIGN KEY(account_id,ref_id) REFERENCES app_private.client_ai_memory_protocol_refs(account_id,id) ON DELETE CASCADE
);
CREATE TABLE app_private.client_ai_memory_protocol_ref_ops (
 account_id uuid NOT NULL REFERENCES app.accounts(id) ON DELETE CASCADE,
 operation_id uuid NOT NULL,
 action text NOT NULL CHECK(action IN ('save','correct','forget')),
 request_hash text NOT NULL CHECK(request_hash ~ '^[0-9a-f]{64}$'),
 ref_id uuid NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(account_id,operation_id)
);
ALTER TABLE app_private.client_ai_memory_protocol_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.client_ai_memory_protocol_refs FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.client_ai_memory_protocol_ref_ops ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.client_ai_memory_protocol_ref_ops FORCE ROW LEVEL SECURITY;
ALTER TABLE app_private.client_ai_memory_protocol_ref_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.client_ai_memory_protocol_ref_versions FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.client_ai_memory_protocol_refs,app_private.client_ai_memory_protocol_ref_ops,
 app_private.client_ai_memory_protocol_ref_versions
 FROM PUBLIC,anon,authenticated,hh_app_backend,hh_app_inbox;
GRANT SELECT,INSERT,UPDATE ON app_private.client_ai_memory_protocol_refs TO hh_app_backend;
GRANT SELECT,INSERT ON app_private.client_ai_memory_protocol_ref_ops TO hh_app_backend;
GRANT SELECT,INSERT,DELETE ON app_private.client_ai_memory_protocol_ref_versions TO hh_app_backend;
CREATE POLICY memory_protocol_ref_versions_owner_select ON app_private.client_ai_memory_protocol_ref_versions
 FOR SELECT TO hh_app_backend USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY memory_protocol_ref_versions_owner_insert ON app_private.client_ai_memory_protocol_ref_versions
 FOR INSERT TO hh_app_backend WITH CHECK(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active())
 AND EXISTS (
  SELECT 1 FROM app_private.client_ai_memory_protocol_refs r
  JOIN app_private.client_ai_memory_settings s ON s.account_id=r.account_id
  WHERE r.account_id=client_ai_memory_protocol_ref_versions.account_id
    AND r.id=client_ai_memory_protocol_ref_versions.ref_id AND r.status='active'
    AND r.revision=client_ai_memory_protocol_ref_versions.revision-1 AND s.memory_enabled AND s.sensitive_enabled
 ));
CREATE POLICY memory_protocol_ref_versions_owner_delete ON app_private.client_ai_memory_protocol_ref_versions
 FOR DELETE TO hh_app_backend USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active())
 AND EXISTS (
  SELECT 1 FROM app_private.client_ai_memory_protocol_refs r
  WHERE r.account_id=client_ai_memory_protocol_ref_versions.account_id
    AND r.id=client_ai_memory_protocol_ref_versions.ref_id AND r.status='blocked'
 ));
CREATE POLICY memory_protocol_refs_owner_select ON app_private.client_ai_memory_protocol_refs
 FOR SELECT TO hh_app_backend USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY memory_protocol_refs_owner_insert ON app_private.client_ai_memory_protocol_refs
 FOR INSERT TO hh_app_backend WITH CHECK(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active())
 AND status='active' AND revision=0 AND EXISTS(
  SELECT 1 FROM app_private.client_ai_memory_settings s
   WHERE s.account_id=client_ai_memory_protocol_refs.account_id AND s.memory_enabled AND s.sensitive_enabled));
CREATE POLICY memory_protocol_refs_owner_update ON app_private.client_ai_memory_protocol_refs
 FOR UPDATE TO hh_app_backend USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()))
 WITH CHECK(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY memory_protocol_ref_ops_owner_select ON app_private.client_ai_memory_protocol_ref_ops
 FOR SELECT TO hh_app_backend USING(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE POLICY memory_protocol_ref_ops_owner_insert ON app_private.client_ai_memory_protocol_ref_ops
 FOR INSERT TO hh_app_backend WITH CHECK(account_id=(SELECT auth.uid()) AND (SELECT app_private.account_active()));
CREATE FUNCTION app_private.guard_memory_protocol_ref() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NEW.account_id IS DISTINCT FROM OLD.account_id OR NEW.id IS DISTINCT FROM OLD.id
 OR NEW.protocol_id IS DISTINCT FROM OLD.protocol_id OR NEW.field_id IS DISTINCT FROM OLD.field_id
 OR NEW.field_revision IS DISTINCT FROM OLD.field_revision OR NEW.turn_index IS DISTINCT FROM OLD.turn_index
 OR NEW.created_at IS DISTINCT FROM OLD.created_at OR OLD.status<>'active' OR NEW.revision<>OLD.revision+1
 OR (NEW.status='blocked' AND NEW.source_hash IS NOT NULL)
 OR (NEW.status='active' AND (NEW.source_hash IS DISTINCT FROM OLD.source_hash OR NOT EXISTS (
  SELECT 1 FROM app_private.client_ai_memory_protocol_ref_versions v
  WHERE v.account_id=NEW.account_id AND v.ref_id=NEW.id AND v.revision=NEW.revision
 ))) THEN
  RAISE EXCEPTION 'MEMORY_PROTOCOL_REF_IMMUTABLE' USING ERRCODE='23514';
 END IF;
 NEW.updated_at:=now(); RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_private.guard_memory_protocol_ref() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER guard_memory_protocol_ref BEFORE UPDATE ON app_private.client_ai_memory_protocol_refs
 FOR EACH ROW EXECUTE FUNCTION app_private.guard_memory_protocol_ref();
-- Blocking a reference erases corrected content in the same transaction.
CREATE FUNCTION app_private.purge_blocked_memory_protocol_ref_versions() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 DELETE FROM app_private.client_ai_memory_protocol_ref_versions
  WHERE account_id=NEW.account_id AND ref_id=NEW.id;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_private.purge_blocked_memory_protocol_ref_versions() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER purge_blocked_memory_protocol_ref_versions
 AFTER UPDATE OF status ON app_private.client_ai_memory_protocol_refs FOR EACH ROW
 WHEN (OLD.status='active' AND NEW.status='blocked')
 EXECUTE FUNCTION app_private.purge_blocked_memory_protocol_ref_versions();
-- The canonical settings row serializes writes/revokes. Re-enabling settings
-- never resurrects blocked references. The original Daybook record remains.
CREATE FUNCTION app_private.block_memory_protocol_refs_on_revoke() RETURNS trigger
 LANGUAGE plpgsql SECURITY INVOKER SET search_path='' AS $$
BEGIN
 IF NOT NEW.memory_enabled OR NOT NEW.sensitive_enabled THEN
  UPDATE app_private.client_ai_memory_protocol_refs SET status='blocked',source_hash=NULL,revision=revision+1
   WHERE account_id=NEW.account_id AND status='active';
 END IF;
 RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_private.block_memory_protocol_refs_on_revoke() FROM PUBLIC,anon,authenticated;
CREATE TRIGGER block_memory_protocol_refs_on_revoke
 AFTER UPDATE OF memory_enabled,sensitive_enabled ON app_private.client_ai_memory_settings
 FOR EACH ROW EXECUTE FUNCTION app_private.block_memory_protocol_refs_on_revoke();
COMMIT;
