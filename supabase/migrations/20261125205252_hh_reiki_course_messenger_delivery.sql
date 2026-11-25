-- Represent authorized course activity in the existing owner inbox. The provider
-- never receives a message. The only copy of the answer is the encrypted event.
BEGIN;
CREATE TABLE app_private.reiki_messenger_bindings (
  enrollment_id uuid PRIMARY KEY REFERENCES app_private.academy_course_progress(id) ON DELETE CASCADE,
  owner_id uuid NOT NULL,
  thread_id uuid NOT NULL
);
ALTER TABLE app_private.reiki_messenger_bindings ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_private.reiki_messenger_bindings FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app_private.reiki_messenger_bindings
  FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_app_inbox,hh_crm_backend;

ALTER TABLE app.crm_msg_threads ADD COLUMN reiki_erasure_revision bigint NOT NULL DEFAULT 0;
ALTER TABLE app.crm_msg_items ADD COLUMN reiki_event_id uuid UNIQUE
  REFERENCES app_private.reiki_course_events(id) ON DELETE CASCADE,
  ADD CONSTRAINT reiki_internal_item CHECK (reiki_event_id IS NULL OR
    (id=reiki_event_id AND direction='note' AND status='received' AND body_ciphertext=''
     AND provider_hash IS NULL AND request_hash IS NULL AND campaign_id IS NULL));

-- Only trusted row triggers and the self-scoped wrapper below can call this.
CREATE FUNCTION app_private.reconcile_reiki_messenger(p_account uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
DECLARE
  v_enrollment uuid; v_owner uuid; v_thread uuid; v_at timestamptz;
  v_pinned app_private.reiki_messenger_bindings%ROWTYPE; v_count integer;
BEGIN
  SELECT p.id INTO v_enrollment FROM app_private.academy_course_progress p
  WHERE p.account_id=p_account AND p.course_key='academy-energywork-principles'
    AND p.messenger_consent FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  SELECT * INTO v_pinned FROM app_private.reiki_messenger_bindings WHERE enrollment_id=v_enrollment;
  SELECT dest.owner_id,dest.thread_id INTO v_owner,v_thread
  FROM app_private.reiki_messenger_destination(p_account) dest
  WHERE v_pinned.enrollment_id IS NULL OR
    (dest.owner_id=v_pinned.owner_id AND dest.thread_id=v_pinned.thread_id)
  LIMIT 1;
  IF NOT FOUND THEN RETURN false; END IF;
  -- Do not reroute already-shared history if an old provider identity unlinks.
  IF v_pinned.enrollment_id IS NULL THEN
    INSERT INTO app_private.reiki_messenger_bindings VALUES (v_enrollment,v_owner,v_thread);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM app_private.reiki_course_events e
    WHERE e.enrollment_id=v_enrollment AND NOT EXISTS
      (SELECT 1 FROM app.crm_msg_items i WHERE i.reiki_event_id=e.id)) THEN RETURN true; END IF;
  SELECT greatest(clock_timestamp(),t.last_message_at+interval '1 microsecond') INTO v_at
  FROM app.crm_msg_threads t WHERE t.owner_id=v_owner AND t.id=v_thread AND NOT t.suppressed
  FOR UPDATE;
  IF NOT FOUND THEN RETURN false; END IF;
  INSERT INTO app.crm_msg_items(id,owner_id,thread_id,direction,status,body_ciphertext,reiki_event_id,created_at)
  SELECT e.id,v_owner,v_thread,'note','received','',e.id,
    v_at+(row_number() OVER (ORDER BY e.sequence)-1)*interval '1 microsecond'
  FROM app_private.reiki_course_events e
  WHERE e.enrollment_id=v_enrollment AND e.account_id=p_account AND NOT EXISTS
    (SELECT 1 FROM app.crm_msg_items i WHERE i.reiki_event_id=e.id);
  GET DIAGNOSTICS v_count=ROW_COUNT;
  IF v_count>0 THEN
    UPDATE app.crm_msg_threads SET unread_count=least(unread_count+v_count,100000),
      last_message_at=v_at+(v_count-1)*interval '1 microsecond'
    WHERE owner_id=v_owner AND id=v_thread;
  END IF;
  RETURN true;
END $fn$;
REVOKE ALL ON FUNCTION app_private.reconcile_reiki_messenger(uuid)
  FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_app_inbox,hh_crm_backend;

CREATE FUNCTION app_private.reconcile_my_reiki_messenger()
RETURNS boolean LANGUAGE sql SECURITY DEFINER SET search_path='' AS $fn$
 SELECT CASE WHEN auth.uid() IS NOT NULL AND app_private.session_active()
   THEN app_private.reconcile_reiki_messenger(auth.uid()) ELSE false END
$fn$;
REVOKE ALL ON FUNCTION app_private.reconcile_my_reiki_messenger()
  FROM PUBLIC,anon,authenticated,service_role,hh_app_inbox,hh_crm_backend;
GRANT EXECUTE ON FUNCTION app_private.reconcile_my_reiki_messenger() TO hh_app_backend;

CREATE FUNCTION app_private.reiki_messenger_event_saved() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
  PERFORM app_private.reconcile_reiki_messenger(NEW.account_id);
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION app_private.reiki_messenger_event_saved()
  FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_app_inbox,hh_crm_backend;
CREATE TRIGGER reiki_event_saved AFTER INSERT ON app_private.reiki_course_events
  FOR EACH ROW EXECUTE FUNCTION app_private.reiki_messenger_event_saved();

-- Only a current, authenticated owner may resolve references from their own
-- inbox. Joining the pinned enrollment also rejects references to another
-- learner's event, including a reference inserted by a different CRM owner.
CREATE FUNCTION app_private.reiki_messenger_page(p_thread uuid,p_items uuid[])
RETURNS TABLE(event_id uuid,learner_id uuid,occurred_at timestamptz,payload_ciphertext text)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path='' AS $fn$
 SELECT e.id,e.account_id,e.occurred_at,e.payload_ciphertext
 FROM app.crm_msg_items i
 JOIN app_private.reiki_course_events e ON e.id=i.reiki_event_id
 JOIN app_private.reiki_messenger_bindings b
   ON b.enrollment_id=e.enrollment_id AND b.owner_id=i.owner_id AND b.thread_id=i.thread_id
 JOIN app_private.academy_course_progress p ON p.id=e.enrollment_id AND p.messenger_consent
 WHERE i.owner_id=auth.uid() AND app_private.account_active()
   AND i.thread_id=p_thread AND i.direction='note' AND i.id=ANY(p_items)
   AND cardinality(p_items) BETWEEN 1 AND 50
$fn$;
REVOKE ALL ON FUNCTION app_private.reiki_messenger_page(uuid,uuid[])
  FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_app_inbox;
GRANT EXECUTE ON FUNCTION app_private.reiki_messenger_page(uuid,uuid[]) TO hh_crm_backend;

CREATE FUNCTION app_private.reiki_messenger_withdrawn() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
  DELETE FROM app_private.reiki_course_events WHERE enrollment_id=OLD.id;
  DELETE FROM app_private.reiki_messenger_bindings WHERE enrollment_id=OLD.id;
  RETURN NEW;
END $fn$;
REVOKE ALL ON FUNCTION app_private.reiki_messenger_withdrawn()
  FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_app_inbox,hh_crm_backend;
CREATE TRIGGER reiki_messenger_withdrawn AFTER UPDATE OF messenger_consent
  ON app_private.academy_course_progress FOR EACH ROW WHEN (OLD.messenger_consent AND NOT NEW.messenger_consent)
  EXECUTE FUNCTION app_private.reiki_messenger_withdrawn();

-- Clearing unread evidence for an erased course must leave genuine unread
-- inbound messages intact, even if the learner withdraws after the owner read.
CREATE FUNCTION app_private.reiki_messenger_item_erased() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path='' AS $fn$
BEGIN
  UPDATE app.crm_msg_threads t SET reiki_erasure_revision=t.reiki_erasure_revision+1,
    unread_count=greatest(0,t.unread_count-CASE WHEN t.read_at IS NULL OR OLD.created_at>t.read_at THEN 1 ELSE 0 END),
    last_message_at=CASE WHEN t.last_message_at=OLD.created_at THEN
      coalesce((SELECT max(i.created_at) FROM app.crm_msg_items i
        WHERE i.thread_id=t.id AND i.owner_id=t.owner_id AND (i.direction<>'note' OR i.reiki_event_id IS NOT NULL)),
        t.last_inbound_at,t.last_message_at) ELSE t.last_message_at END
  WHERE t.id=OLD.thread_id AND t.owner_id=OLD.owner_id;
  RETURN OLD;
END $fn$;
REVOKE ALL ON FUNCTION app_private.reiki_messenger_item_erased()
  FROM PUBLIC,anon,authenticated,service_role,hh_app_backend,hh_app_inbox,hh_crm_backend;
CREATE TRIGGER reiki_item_erased AFTER DELETE ON app.crm_msg_items FOR EACH ROW WHEN (OLD.reiki_event_id IS NOT NULL)
  EXECUTE FUNCTION app_private.reiki_messenger_item_erased();
COMMIT;
