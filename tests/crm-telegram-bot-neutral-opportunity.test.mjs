import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'

const migration=readFileSync(new URL(
  '../supabase/migrations/20261119024500_hh_telegram_bot_neutral_opportunity_v1.sql',
  import.meta.url),'utf8')
const telegram=readFileSync(new URL('../lib/crm/telegram-lead-capture.js',import.meta.url),'utf8')
const crmIngest=readFileSync(new URL('../lib/crm/messenger-webhook.js',import.meta.url),'utf8')

test('Telegram Bot inbound creates only a neutral, idempotent pipeline lead',()=>{
  assert.match(telegram,/ingestMessengerEventInTransaction\(db,'telegram'/)
  assert.match(crmIngest,/app_private\.crm_msg_ingest/)
  assert.match(migration,/a\.channel='telegram' AND a\.enabled/g)
  assert.match(migration,/q\.owner_id=v_owner AND q\.contact_id=v_contact/)
  assert.match(migration,/q\.owner_id=r\.owner_id AND q\.contact_id=r\.contact_id/)
  assert.match(migration,/service,stage,operation_id/g)
  assert.match(migration,/'other','new'/g)
  assert.match(migration,/pg_advisory_xact_lock/g)
  assert.match(migration,/direction='in'/g)
  assert.match(migration,/JOIN app\.accounts o ON o\.id=t\.owner_id AND o\.status='active'/g)
})

test('Deferred trigger observes STOP and no message at commit',()=>{
  assert.match(migration,/CREATE CONSTRAINT TRIGGER crm_tg_bot_thread_neutral_opportunity/)
  assert.match(migration,/DEFERRABLE INITIALLY DEFERRED/)
  assert.match(migration,/NOT t\.suppressed AND NOT c\.suppressed/g)
  assert.match(migration,/c\.lifecycle<>'archived'/g)
  assert.match(migration,/t\.last_inbound_at IS NOT NULL/g)
  assert.match(migration,/EXISTS \(SELECT 1 FROM app\.crm_msg_items m/g)
})

test('No new client data exposure or marketing privileges',()=>{
  assert.match(migration,/SECURITY DEFINER SET search_path TO ''/)
  assert.match(migration,/REVOKE ALL ON FUNCTION app_private\.crm_tg_bot_thread_opportunity_v1/)
  assert.doesNotMatch(migration,/GRANT\s+(?:SELECT|INSERT|UPDATE|ALL)\s+ON\s+app\./i)
  assert.doesNotMatch(migration,/marketing_opt_in_at|crm_consent_ledger|sendOneMessengerMessage/)
  assert.doesNotMatch(migration,/contact_ciphertext|body_ciphertext|user_ciphertext|telegramPhotoFileId/)
  assert.match(migration,/CREATE OR REPLACE FUNCTION app_private\.crm_tg_bot_thread_opportunity_v1/)
  assert.match(migration,/DROP TRIGGER IF EXISTS crm_tg_bot_thread_neutral_opportunity/)
})
