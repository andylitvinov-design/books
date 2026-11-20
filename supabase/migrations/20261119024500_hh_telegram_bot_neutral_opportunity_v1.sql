-- Telegram Bot first-contact messages already create an encrypted CRM contact/thread
-- through app_private.crm_msg_ingest. Attach one generic *unqualified* pipeline
-- opportunity to the first non-suppressed inbound thread, without copying content.
-- This is not a booking, named service enquiry or marketing permission.
BEGIN;

CREATE OR REPLACE FUNCTION app_private.crm_tg_bot_thread_opportunity_v1()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO '' AS $fn$
DECLARE
  v_owner uuid;
  v_contact uuid;
BEGIN
  IF TG_OP <> 'INSERT' THEN RETURN NEW; END IF;
  -- Deferred trigger sees the FINAL STOP/suppression state at transaction commit.
  -- An actual incoming CRM item, not merely a newly allocated thread, is required.
  SELECT t.owner_id,t.contact_id INTO v_owner,v_contact
  FROM app.crm_msg_threads t
  JOIN app.crm_msg_accounts a ON a.id=t.account_id AND a.owner_id=t.owner_id
  JOIN app.crm_contacts c ON c.id=t.contact_id AND c.owner_id=t.owner_id
  JOIN app.accounts o ON o.id=t.owner_id AND o.status='active'
  WHERE t.id=NEW.id AND t.owner_id=NEW.owner_id
    AND a.channel='telegram' AND a.enabled
    AND NOT t.suppressed AND NOT c.suppressed AND c.lifecycle<>'archived'
    AND t.last_inbound_at IS NOT NULL
    AND EXISTS (SELECT 1 FROM app.crm_msg_items m
      WHERE m.thread_id=t.id AND m.owner_id=t.owner_id AND m.direction='in')
  LIMIT 1;
  IF v_owner IS NULL THEN RETURN NEW; END IF;

  PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
    v_owner::text||':telegram-bot-opportunity:'||v_contact::text,0));
  IF NOT EXISTS (SELECT 1 FROM app.crm_opportunities q
    WHERE q.owner_id=v_owner AND q.contact_id=v_contact) THEN
    INSERT INTO app.crm_opportunities
      (id,owner_id,contact_id,service,stage,operation_id)
    VALUES (pg_catalog.gen_random_uuid(),v_owner,v_contact,
      'other','new',pg_catalog.gen_random_uuid());
  END IF;
  RETURN NEW;
END;
$fn$;

REVOKE ALL ON FUNCTION app_private.crm_tg_bot_thread_opportunity_v1()
  FROM PUBLIC,anon,authenticated,service_role,hh_app_inbox,hh_app_backend,hh_crm_backend;

DROP TRIGGER IF EXISTS crm_tg_bot_thread_neutral_opportunity ON app.crm_msg_threads;
CREATE CONSTRAINT TRIGGER crm_tg_bot_thread_neutral_opportunity
  AFTER INSERT ON app.crm_msg_threads
  DEFERRABLE INITIALLY DEFERRED
  FOR EACH ROW EXECUTE FUNCTION app_private.crm_tg_bot_thread_opportunity_v1();

-- One-time reconciliation of existing non-suppressed Telegram Bot threads.
-- Reuse the very same scoped idempotency lock; no raw text or private IDs leave SQL.
DO $backfill$
DECLARE
  r record;
BEGIN
  FOR r IN
    SELECT DISTINCT t.owner_id,t.contact_id
    FROM app.crm_msg_threads t
    JOIN app.crm_msg_accounts a ON a.id=t.account_id AND a.owner_id=t.owner_id
    JOIN app.crm_contacts c ON c.id=t.contact_id AND c.owner_id=t.owner_id
    JOIN app.accounts o ON o.id=t.owner_id AND o.status='active'
    WHERE a.channel='telegram' AND a.enabled
      AND NOT t.suppressed AND NOT c.suppressed AND c.lifecycle<>'archived'
      AND t.last_inbound_at IS NOT NULL
      AND EXISTS (SELECT 1 FROM app.crm_msg_items m
        WHERE m.thread_id=t.id AND m.owner_id=t.owner_id AND m.direction='in')
  LOOP
    PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(
      r.owner_id::text||':telegram-bot-opportunity:'||r.contact_id::text,0));
    IF NOT EXISTS (SELECT 1 FROM app.crm_opportunities q
      WHERE q.owner_id=r.owner_id AND q.contact_id=r.contact_id) THEN
      INSERT INTO app.crm_opportunities
        (id,owner_id,contact_id,service,stage,operation_id)
      VALUES (pg_catalog.gen_random_uuid(),r.owner_id,r.contact_id,
        'other','new',pg_catalog.gen_random_uuid());
    END IF;
  END LOOP;
END;
$backfill$;

COMMENT ON FUNCTION app_private.crm_tg_bot_thread_opportunity_v1() IS
  'After committed customer-originated non-STOP Telegram Bot thread, one neutral CRM opportunity per contact. No content, consent or broadcasts.';
COMMENT ON TRIGGER crm_tg_bot_thread_neutral_opportunity ON app.crm_msg_threads IS
  'Deferred to respect same-transaction STOP and avoid false lead on duplicate inbound events.';
COMMIT;
