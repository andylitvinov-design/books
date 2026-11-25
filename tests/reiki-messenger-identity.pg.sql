-- Run with tests/reiki-messenger.integration.mjs on its isolated synthetic database.
-- The database roles, account/session checks, provider link and CRM tables are real.
BEGIN;
CREATE FUNCTION pg_temp.check_result(value boolean, label text) RETURNS void
LANGUAGE plpgsql AS $$ BEGIN IF value IS DISTINCT FROM true THEN RAISE EXCEPTION 'Reiki identity: %',label; END IF; END $$;

INSERT INTO auth.users(id,email) VALUES ('c0000000-0000-4000-8000-000000000001','reiki-proof@example.invalid');
INSERT INTO auth.sessions(id,user_id) VALUES ('c0000000-0000-4000-8000-000000000002','c0000000-0000-4000-8000-000000000001');
INSERT INTO app.accounts(id,onboarding_state) VALUES ('c0000000-0000-4000-8000-000000000001','active');
SELECT set_config('request.jwt.claims',json_build_object('sub','c0000000-0000-4000-8000-000000000001',
  'session_id','c0000000-0000-4000-8000-000000000002','role','authenticated',
  'exp',floor(extract(epoch FROM now()))::bigint+3600)::text,true);

-- Use the teacher seeded by the integrated test. The two threads share one
-- CRM contact so a contact-only matcher would leak to the wrong conversation.
CREATE TEMP TABLE peer_fixture AS
  SELECT p.id AS practitioner,p.trusted_auth_user_id AS owner FROM app.practitioners p
  WHERE p.id='246aa1a3-a371-5a83-9f4b-cd23ff027a76';
INSERT INTO app.crm_msg_accounts(id,owner_id,channel,external_hash)
  SELECT 'c0000000-0000-4000-8000-000000000003',owner,'telegram',repeat('7',64) FROM peer_fixture ON CONFLICT DO NOTHING;
CREATE TEMP TABLE peer_account AS
  SELECT a.id,a.external_hash FROM app.crm_msg_accounts a,peer_fixture f
  WHERE a.channel='telegram' AND a.owner_id=f.owner AND a.enabled ORDER BY a.id LIMIT 1;
SELECT set_config('test.bot_hash',(SELECT external_hash FROM peer_account),true);
INSERT INTO app.crm_contacts(id,owner_id,contact_ciphertext,email_hash,locale,lifecycle)
  SELECT 'c0000000-0000-4000-8000-000000000004',owner,'fixture',repeat('8',64),'en','client' FROM peer_fixture;
INSERT INTO app.crm_msg_threads(id,owner_id,account_id,contact_id,user_hash,user_ciphertext,display_ciphertext,last_inbound_at)
  SELECT x.id::uuid,f.owner,a.id,'c0000000-0000-4000-8000-000000000004',repeat(x.digit,64),'fixture','fixture',now()
  FROM peer_fixture f,peer_account a,(VALUES
    ('c0000000-0000-4000-8000-000000000005','1'),('c0000000-0000-4000-8000-000000000006','2')) AS x(id,digit);

SET LOCAL ROLE hh_app_backend;
SELECT pg_temp.check_result(NOT EXISTS(SELECT 1 FROM app_private.reiki_messenger_destination()),'unlinked learner');
SELECT pg_temp.check_result(NOT has_function_privilege(current_user,'app_private.reiki_messenger_destination(uuid)','EXECUTE'),'no arbitrary learner lookup');
SELECT pg_temp.check_result(NOT has_function_privilege('authenticated','app_private.reiki_messenger_destination()','EXECUTE'),'no browser access');
INSERT INTO app_private.academy_course_progress(id,account_id,messenger_consent)
  VALUES ('c0000000-0000-4000-8000-000000000007',auth.uid(),true);
INSERT INTO app_private.reiki_course_events(id,enrollment_id,account_id,event_key,kind,revision,payload_ciphertext)
  VALUES ('c0000000-0000-4000-8000-000000000008','c0000000-0000-4000-8000-000000000007',auth.uid(),'start','start',0,repeat('x',64));
RESET ROLE;
SELECT pg_temp.check_result(NOT EXISTS(SELECT 1 FROM app.crm_msg_items WHERE reiki_event_id='c0000000-0000-4000-8000-000000000008'),'pending event stays private');

INSERT INTO app_private.notification_telegram_links(account_id,chat_hash,chat_ciphertext,consent_version)
  VALUES ('c0000000-0000-4000-8000-000000000001',repeat('3',64),repeat('x',40),'hh-tg-message-alerts-v1');
INSERT INTO app_private.crm_google_telegram_links(account_id,crm_owner_id,chat_hash,crm_bot_hash,crm_user_hash)
  SELECT 'c0000000-0000-4000-8000-000000000001',f.owner,repeat('3',64),a.external_hash,repeat('1',64)
  FROM peer_fixture f,peer_account a;
SELECT pg_temp.check_result(NOT EXISTS(SELECT 1 FROM app_private.reiki_messenger_destination()),'bot chat before provider consent');

INSERT INTO app_private.crm_tg_diagnostic_sessions(business_hash,user_hash,stage,locale,last_update_id,consent_at)
  SELECT external_hash,repeat('1',64),'done','en',1,now() FROM peer_account;
SELECT pg_temp.check_result((SELECT array_agg(thread_id)=ARRAY['c0000000-0000-4000-8000-000000000005'::uuid]
  FROM app_private.reiki_messenger_destination()),'exact bot thread');
SELECT pg_temp.check_result((SELECT count(*)=1 FROM app.crm_msg_items WHERE reiki_event_id='c0000000-0000-4000-8000-000000000008'
  AND thread_id='c0000000-0000-4000-8000-000000000005' AND direction='note' AND provider_hash IS NULL),'provider consent delivered pending internal event');
UPDATE app_private.crm_tg_diagnostic_sessions SET stage='stopped'
  WHERE business_hash=(SELECT external_hash FROM peer_account) AND user_hash=repeat('1',64);
SELECT pg_temp.check_result(NOT EXISTS(SELECT 1 FROM app_private.reiki_messenger_destination()),'bot STOP');

INSERT INTO app_private.crm_tg_business_service_sessions(business_hash,user_hash,practitioner_id,service_key,locale,
  stage,last_update_id,consent_at,delivery_format,reference_code,telegram_peer_hash,account_id,contact_id,linked_at)
  SELECT repeat('4',64),repeat('5',64),practitioner,'reiki','en','submitted',1,now(),'online','HH-0123456789AB',repeat('6',64),
    'c0000000-0000-4000-8000-000000000001','c0000000-0000-4000-8000-000000000004',now() FROM peer_fixture;
SELECT pg_temp.check_result(NOT EXISTS(SELECT 1 FROM app_private.reiki_messenger_destination()),'Business contact alone rejected');
SET LOCAL ROLE hh_app_backend;
SELECT set_config('hh.telegram_verified_peer_hash',repeat('6',64),true);
SELECT app_private.reiki_record_business_peer(repeat('0',64),repeat('7',64),repeat('2',64));
SELECT pg_temp.check_result(NOT EXISTS(SELECT 1 FROM app_private.reiki_messenger_destination()),'wrong Business peer');
SELECT app_private.reiki_record_business_peer(repeat('6',64),repeat('0',64),repeat('2',64));
SELECT pg_temp.check_result(NOT EXISTS(SELECT 1 FROM app_private.reiki_messenger_destination()),'wrong Business provider account');
SELECT app_private.reiki_record_business_peer(repeat('6',64),current_setting('test.bot_hash'),repeat('2',64));
SELECT pg_temp.check_result((SELECT array_agg(thread_id)=ARRAY['c0000000-0000-4000-8000-000000000006'::uuid]
  FROM app_private.reiki_messenger_destination()),'exact Business thread only');
SELECT pg_temp.check_result(app_private.reconcile_my_reiki_messenger() IS FALSE,'cannot reroute original enrollment to new channel');
RESET ROLE;
INSERT INTO app_private.crm_tg_business_secretary_optouts(business_hash,user_hash) VALUES (repeat('4',64),repeat('5',64));
SELECT pg_temp.check_result(NOT EXISTS(SELECT 1 FROM app_private.reiki_messenger_destination()),'Business STOP');
DELETE FROM app_private.crm_tg_business_secretary_optouts WHERE business_hash=repeat('4',64) AND user_hash=repeat('5',64);
INSERT INTO app_private.crm_tg_business_cabinet_optouts(account_id) VALUES ('c0000000-0000-4000-8000-000000000001');
SELECT pg_temp.check_result(NOT EXISTS(SELECT 1 FROM app_private.reiki_messenger_destination()),'Cabinet disconnected');
DELETE FROM app_private.crm_tg_business_cabinet_optouts WHERE account_id='c0000000-0000-4000-8000-000000000001';
UPDATE app.crm_contacts SET suppressed=true WHERE id='c0000000-0000-4000-8000-000000000004';
SELECT pg_temp.check_result(NOT EXISTS(SELECT 1 FROM app_private.reiki_messenger_destination()),'owner suppression');
SELECT set_config('request.jwt.claims','{}',true);
SET LOCAL ROLE hh_app_backend;
SELECT pg_temp.check_result(NOT EXISTS(SELECT 1 FROM app_private.reiki_messenger_destination()),'no verified session');
ROLLBACK;
