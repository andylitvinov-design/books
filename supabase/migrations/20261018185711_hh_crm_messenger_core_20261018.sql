-- Holistic House CRM messenger core, issue #985. Additive only. No provider sends or contact imports.
-- Data stays under owner RLS; signed provider webhooks reach ONLY narrow SECURITY DEFINER entry points.
CREATE TABLE app.crm_msg_accounts (
 id uuid primary key, owner_id uuid not null references app.accounts(id) on delete cascade,
 channel text not null check(channel in ('telegram','whatsapp','instagram','messenger')),
 external_hash text not null, enabled boolean not null default true,
 created_at timestamptz not null default now(),
 unique(owner_id,channel), unique(channel,external_hash), unique(id,owner_id)
);
CREATE TABLE app.crm_msg_threads (
 id uuid primary key, owner_id uuid not null,
 account_id uuid not null, contact_id uuid not null,
 user_hash text not null, user_ciphertext text not null,
 display_ciphertext text not null,
 suppressed boolean not null default false, unread_count integer not null default 0 check(unread_count>=0),
 last_inbound_at timestamptz, last_message_at timestamptz not null default now(),
 read_at timestamptz,
 foreign key(account_id,owner_id) references app.crm_msg_accounts(id,owner_id) on delete cascade,
 foreign key(contact_id,owner_id) references app.crm_contacts(id,owner_id) on delete cascade,
 unique(account_id,user_hash), unique(id,owner_id)
);
CREATE TABLE app.crm_msg_items (
 id uuid primary key,owner_id uuid not null,thread_id uuid not null,
 direction text not null check(direction in ('in','out','note')),
 status text not null check(status in ('received','draft','queued','accepted','delivered','read','failed','blocked','unknown')),
 body_ciphertext text not null,
 provider_hash text, request_hash text,
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 foreign key(thread_id,owner_id) references app.crm_msg_threads(id,owner_id) on delete cascade,
 unique(thread_id,provider_hash), unique(owner_id,request_hash)
);
CREATE TABLE app.crm_msg_events (
 account_id uuid not null references app.crm_msg_accounts(id) on delete cascade,
 event_hash text not null, created_at timestamptz not null default now(),
 primary key(account_id,event_hash)
);
CREATE INDEX crm_msg_threads_owner_last ON app.crm_msg_threads(owner_id,last_message_at desc);
CREATE INDEX crm_msg_items_thread_date ON app.crm_msg_items(thread_id,created_at desc);
CREATE INDEX crm_msg_items_provider ON app.crm_msg_items(owner_id,provider_hash) where provider_hash is not null;
CREATE INDEX crm_msg_events_recent ON app.crm_msg_events(created_at);
-- No changes to existing clinical tables or to email consent and sending semantics.
ALTER TABLE app.crm_msg_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.crm_msg_accounts FORCE ROW LEVEL SECURITY;
ALTER TABLE app.crm_msg_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.crm_msg_threads FORCE ROW LEVEL SECURITY;
ALTER TABLE app.crm_msg_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.crm_msg_items FORCE ROW LEVEL SECURITY;
ALTER TABLE app.crm_msg_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE app.crm_msg_events FORCE ROW LEVEL SECURITY;
REVOKE ALL ON app.crm_msg_accounts,app.crm_msg_threads,app.crm_msg_items,app.crm_msg_events FROM PUBLIC,anon,authenticated;
GRANT SELECT,INSERT ON app.crm_msg_accounts TO hh_crm_backend;
GRANT SELECT ON app.crm_msg_threads TO hh_crm_backend;
GRANT UPDATE(contact_id,read_at,unread_count) ON app.crm_msg_threads TO hh_crm_backend;
GRANT SELECT,INSERT ON app.crm_msg_items TO hh_crm_backend;
GRANT UPDATE(status,provider_hash,updated_at) ON app.crm_msg_items TO hh_crm_backend;
CREATE POLICY crm_msg_accounts_owner ON app.crm_msg_accounts FOR ALL TO hh_crm_backend
 USING(owner_id=(select auth.uid()) and (select app_private.account_active()))
 WITH CHECK(owner_id=(select auth.uid()) and (select app_private.account_active()));
CREATE POLICY crm_msg_threads_owner ON app.crm_msg_threads FOR ALL TO hh_crm_backend
 USING(owner_id=(select auth.uid()) and (select app_private.account_active()))
 WITH CHECK(owner_id=(select auth.uid()) and (select app_private.account_active()));
CREATE POLICY crm_msg_items_owner ON app.crm_msg_items FOR ALL TO hh_crm_backend
 USING(owner_id=(select auth.uid()) and (select app_private.account_active()))
 WITH CHECK(owner_id=(select auth.uid()) and (select app_private.account_active()));
-- SECURITY DEFINER functions are only invokable by the restricted server inbox role,
-- which must validate provider webhook cryptography BEFORE calling them.
CREATE OR REPLACE FUNCTION app_private.crm_msg_resolve(p_channel text,p_account_hash text)
 RETURNS TABLE(owner_id uuid,account_id uuid)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path = ''
 AS $$
 SELECT a.owner_id,a.id FROM app.crm_msg_accounts a JOIN app.accounts o ON o.id=a.owner_id
 WHERE a.channel=p_channel AND a.external_hash=p_account_hash AND a.enabled AND o.status='active'
 LIMIT 1
 $$;
CREATE OR REPLACE FUNCTION app_private.crm_msg_ingest(
 p_channel text,p_account_hash text,p_user_hash text,
 p_user_ciphertext text,p_display_ciphertext text,
 p_contact_id uuid,p_contact_ciphertext text,p_contact_email_hash text,p_locale text,
 p_message_id uuid,p_body_ciphertext text,p_provider_hash text,p_event_hash text,
 p_inbound_at timestamptz,p_stop boolean
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
 DECLARE v_owner uuid;v_account uuid;v_thread uuid;v_contact uuid;v_new_event boolean;v_new_message boolean;
 BEGIN
 IF p_channel NOT IN ('telegram','whatsapp','instagram','messenger') OR
    length(p_user_hash)<>64 OR length(p_provider_hash)<>64 OR length(p_event_hash)<>64 OR
    length(p_contact_email_hash)<>64 OR p_locale NOT IN ('en','ru','es') OR
    p_user_ciphertext IS NULL OR p_display_ciphertext IS NULL OR p_contact_ciphertext IS NULL OR p_body_ciphertext IS NULL OR
    length(p_body_ciphertext)>16000 OR
    p_inbound_at IS NULL OR p_inbound_at>now()+interval '5 minutes' OR p_inbound_at<now()-interval '30 days'
 THEN RETURN false; END IF;
 SELECT a.owner_id,a.id INTO v_owner,v_account FROM app.crm_msg_accounts a
 JOIN app.accounts o ON o.id=a.owner_id
 WHERE a.channel=p_channel AND a.external_hash=p_account_hash AND a.enabled AND o.status='active';
 IF v_account IS NULL THEN RETURN false; END IF;
 PERFORM pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(p_account_hash||':'||p_user_hash,0));
 INSERT INTO app.crm_msg_events(account_id,event_hash) VALUES(v_account,p_event_hash)
 ON CONFLICT DO NOTHING RETURNING true INTO v_new_event;
 IF NOT coalesce(v_new_event,false) THEN RETURN false; END IF;
 SELECT id,contact_id INTO v_thread,v_contact FROM app.crm_msg_threads
 WHERE account_id=v_account AND user_hash=p_user_hash FOR UPDATE;
 IF v_thread IS NULL THEN
   SELECT c.id INTO v_contact FROM app.crm_contacts c WHERE c.owner_id=v_owner AND c.email_hash=p_contact_email_hash LIMIT 1;
   IF v_contact IS NULL THEN
     v_contact:=p_contact_id;
     INSERT INTO app.crm_contacts(id,owner_id,contact_ciphertext,email_hash,locale,lifecycle,source)
     VALUES(v_contact,v_owner,p_contact_ciphertext,p_contact_email_hash,p_locale,'lead','other');
   END IF;
   v_thread:=pg_catalog.gen_random_uuid();
   INSERT INTO app.crm_msg_threads(id,owner_id,account_id,contact_id,user_hash,user_ciphertext,display_ciphertext,last_inbound_at)
   VALUES(v_thread,v_owner,v_account,v_contact,p_user_hash,p_user_ciphertext,p_display_ciphertext,p_inbound_at);
 END IF;
 INSERT INTO app.crm_msg_items(id,owner_id,thread_id,direction,status,body_ciphertext,provider_hash,created_at)
 VALUES(p_message_id,v_owner,v_thread,'in','received',p_body_ciphertext,p_provider_hash,LEAST(p_inbound_at,now()))
 ON CONFLICT DO NOTHING RETURNING true INTO v_new_message;
 IF coalesce(v_new_message,false) THEN
  UPDATE app.crm_msg_threads SET unread_count=LEAST(unread_count+1,100000),
   last_inbound_at=GREATEST(coalesce(last_inbound_at,p_inbound_at),p_inbound_at),
   last_message_at=GREATEST(last_message_at,p_inbound_at),
   suppressed=suppressed OR p_stop WHERE id=v_thread;
  IF p_stop THEN
    UPDATE app.crm_contacts SET suppressed=true,revision=revision+1 WHERE id=v_contact AND owner_id=v_owner AND suppressed=false;
  END IF;
 END IF;
 RETURN coalesce(v_new_message,false);
 END
 $$;
CREATE OR REPLACE FUNCTION app_private.crm_msg_receipt(
 p_channel text,p_account_hash text,p_provider_hash text,p_state text
) RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
 DECLARE v_account uuid;v_owner uuid;v_updated integer;
 BEGIN
 IF p_state NOT IN ('delivered','read','failed') OR length(p_provider_hash)<>64 THEN RETURN false; END IF;
 SELECT a.id,a.owner_id INTO v_account,v_owner FROM app.crm_msg_accounts a
 WHERE a.channel=p_channel AND a.external_hash=p_account_hash AND a.enabled;
 IF v_account IS NULL THEN RETURN false; END IF;
 UPDATE app.crm_msg_items m SET status=
   CASE WHEN m.status IN ('failed','blocked') THEN m.status
        WHEN m.status='read' THEN 'read'
        WHEN p_state='failed' THEN 'failed'
        WHEN p_state='read' THEN 'read'
        WHEN p_state='delivered' THEN 'delivered' ELSE m.status END,
   updated_at=now()
 FROM app.crm_msg_threads t
 WHERE m.thread_id=t.id AND t.account_id=v_account AND m.owner_id=v_owner
 AND m.direction='out' AND m.provider_hash=p_provider_hash;
 GET DIAGNOSTICS v_updated = ROW_COUNT;
 RETURN v_updated>0;
 END
 $$;
DO $guard$ DECLARE f record; BEGIN
 FOR f IN SELECT p.oid::regprocedure AS signature FROM pg_catalog.pg_proc p
 WHERE p.pronamespace='app_private'::regnamespace AND p.proname IN ('crm_msg_resolve','crm_msg_ingest','crm_msg_receipt')
 LOOP
  EXECUTE 'REVOKE ALL ON FUNCTION '||f.signature||' FROM PUBLIC,anon,authenticated';
  EXECUTE 'GRANT EXECUTE ON FUNCTION '||f.signature||' TO hh_app_inbox';
 END LOOP;
END $guard$;
