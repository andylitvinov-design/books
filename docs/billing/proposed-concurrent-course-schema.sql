-- UNAPPLIED PROPOSAL. Requires exact-target SQL/security approval and isolated tests.
-- Never move this guarded file into the automatic migration runner.
DO $$ BEGIN RAISE EXCEPTION 'UNAPPLIED CONCURRENT COURSE PROPOSAL: explicit approval required'; END $$;
BEGIN;
-- Preserve every existing course/cycle ID and all encrypted progress/history.
ALTER TABLE app_private.growth_courses DROP CONSTRAINT growth_courses_account_id_key;
ALTER TABLE app_private.growth_courses DROP CONSTRAINT growth_courses_status_check;
ALTER TABLE app_private.growth_courses ADD CONSTRAINT growth_courses_status_check
  CHECK(status IN ('active','paused','completed','archived'));
ALTER TABLE app_private.growth_courses ADD COLUMN is_primary boolean NOT NULL DEFAULT false,
  ADD COLUMN finished_at timestamptz;
CREATE UNIQUE INDEX growth_courses_one_active_primary ON app_private.growth_courses(account_id)
  WHERE is_primary AND status IN ('active','paused');
CREATE INDEX growth_courses_active_owner ON app_private.growth_courses(account_id,updated_at DESC)
  WHERE status IN ('active','paused');
-- No automatic completion, primary selection, locking or pausing of old records.
-- Only explicit owner commands or a saved final lesson change course lifecycle.
DROP INDEX app_private.growth_one_current_cycle;
CREATE UNIQUE INDEX growth_one_current_cycle_per_course ON app_private.growth_cycles(course_id)
  WHERE status IN ('active','paused');

-- Fixed, owner-derived projection; no billing/health table reads granted to another role.
-- Must be owned by the trusted migration owner, never the application runtime.
CREATE FUNCTION app_private.course_access(p_environment text)
RETURNS TABLE(tier text,active_course_limit integer,active_course_count integer)
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner uuid; paid_tier text;
BEGIN
  owner:=auth.uid();
  IF owner IS NULL OR p_environment NOT IN ('sandbox','live') OR NOT app_private.session_active()
    OR NOT app_private.account_active() THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='COURSE_ACCESS_DENIED'; END IF;
  -- Account lock is held first by mutations and quota triggers. The same billing
  -- advisory lock orders payment/expiry/revocation reconciliation against grants.
  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended('billing:'||p_environment||':'||owner::text,0));
  SELECT s.plan_id INTO paid_tier FROM billing_private.subscriptions s
    WHERE s.owner_id=owner AND s.environment=p_environment AND s.is_current
      AND s.revoked_at IS NULL AND s.paid_through_at>clock_timestamp()
      AND s.plan_id IN ('start','advanced','premium') LIMIT 1;
  tier:=coalesce(paid_tier,'free'); active_course_limit:=CASE WHEN tier IN ('advanced','premium') THEN 5 ELSE 1 END;
  SELECT count(*)::integer INTO active_course_count FROM app_private.growth_courses c
    WHERE c.account_id=owner AND c.status='active' AND (c.stage<4
      OR NOT EXISTS(SELECT 1 FROM app_private.growth_cycles y WHERE y.account_id=owner AND y.course_id=c.id)
      OR EXISTS(SELECT 1 FROM app_private.growth_cycles y WHERE y.account_id=owner AND y.course_id=c.id AND y.status='active'));
  RETURN NEXT;
END $$;
REVOKE ALL ON FUNCTION app_private.course_access(text) FROM PUBLIC,anon,authenticated,hh_app_inbox,hh_billing_backend;
GRANT EXECUTE ON FUNCTION app_private.course_access(text) TO hh_app_backend;

CREATE FUNCTION app_private.guard_course_capacity() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $$
DECLARE owner uuid; target_course uuid; allowance record; occupied boolean; environment text;
BEGIN
  owner:=NEW.account_id;
  IF owner IS DISTINCT FROM auth.uid() OR NOT app_private.session_active() OR NOT app_private.account_active()
    THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='COURSE_ACCESS_DENIED'; END IF;
  IF NEW.status<>'active' THEN RETURN NEW; END IF;
  -- Existing active work is grandfathered through a downgrade. Its progress is
  -- never silently ended/deleted. Only new activation/resume consumes capacity.
  IF TG_OP='UPDATE' AND OLD.status='active' THEN RETURN NEW; END IF;
  PERFORM id FROM app.accounts WHERE id=owner FOR UPDATE;
  environment:=current_setting('hh.course_billing_environment',true);
  IF environment NOT IN ('sandbox','live') OR environment IS NULL
    THEN RAISE EXCEPTION USING ERRCODE='42501',MESSAGE='COURSE_ACCESS_DENIED'; END IF;
  SELECT * INTO allowance FROM app_private.course_access(environment);
  IF TG_TABLE_NAME='growth_cycles' THEN target_course:=NEW.course_id; ELSE target_course:=NEW.id; END IF;
  SELECT EXISTS(SELECT 1 FROM app_private.growth_courses c WHERE c.id=target_course AND c.account_id=owner
    AND c.status='active' AND (c.stage<4 OR NOT EXISTS(SELECT 1 FROM app_private.growth_cycles y WHERE y.course_id=c.id)
      OR EXISTS(SELECT 1 FROM app_private.growth_cycles y WHERE y.course_id=c.id AND y.status='active'))) INTO occupied;
  IF NOT occupied AND allowance.active_course_count>=allowance.active_course_limit
    THEN RAISE EXCEPTION USING ERRCODE='P0001',MESSAGE='COURSE_ACTIVE_LIMIT'; END IF;
  RETURN NEW;
END $$;
REVOKE ALL ON FUNCTION app_private.guard_course_capacity() FROM PUBLIC,anon,authenticated,hh_app_backend,hh_app_inbox,hh_billing_backend;
CREATE TRIGGER growth_course_capacity BEFORE INSERT OR UPDATE OF status ON app_private.growth_courses
  FOR EACH ROW EXECUTE FUNCTION app_private.guard_course_capacity();
CREATE TRIGGER growth_cycle_capacity BEFORE INSERT OR UPDATE OF status ON app_private.growth_cycles
  FOR EACH ROW EXECUTE FUNCTION app_private.guard_course_capacity();
-- No new role memberships, direct billing grants or automatic record changes.
COMMIT;
