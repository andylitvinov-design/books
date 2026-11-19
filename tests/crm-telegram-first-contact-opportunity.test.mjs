import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const code=read('lib/crm/telegram-lead-capture.js');
const sql=read('supabase/migrations/20261119020312_hh_tg_first_contact_scoped_rpc_20261119.sql');
const route=read('app/api/app/crm/messenger/webhook/[provider]/route.js');
test('signed first contact uses the existing encrypted CRM inbox before a generic opportunity',()=>{
  assert.ok(route.indexOf('verifyMessengerWebhook')<route.indexOf('captureTelegramBotLead(event,config)'));
  assert.ok(route.indexOf('captureTelegramBotLead(event,config)')<route.indexOf('processTelegramCompanion(event,config)'));
  const bot=code.slice(code.indexOf('export async function captureTelegramBotLead'),code.indexOf('export async function captureTelegramBusinessLead'));
  assert.match(bot,/ingestMessengerEventInTransaction/);
  assert.match(bot,/crm_tg_first_contact_opportunity/);
  assert.match(bot,/TELEGRAM_CRM_PIPELINE_UNCONFIRMED/);
  assert.match(bot,/body:'Telegram conversation started'/);
  assert.doesNotMatch(bot,/body:event\.rawText|body:event\.body/);
});
test('private RPC is owner-scoped, non-suppressed, deduplicated and locked',()=>{
  assert.match(sql,/SECURITY DEFINER SET search_path = ''/);
  assert.match(sql,/t\.user_hash=p_user_hash/);
  assert.match(sql,/NOT t\.suppressed AND NOT c\.suppressed/);
  assert.match(sql,/pg_advisory_xact_lock/);
  assert.match(sql,/WHERE NOT EXISTS/);
  assert.match(sql,/app\.crm_opportunities/);
  assert.match(sql,/REVOKE ALL ON FUNCTION app_private\.crm_tg_first_contact_opportunity/);
  assert.match(sql,/TO hh_app_inbox/);
  assert.doesNotMatch(sql,/GRANT (?:SELECT|INSERT|UPDATE|DELETE) ON app\.crm_/);
});
test('migration does not overwrite Telegram Business owner logic',()=>{
  assert.doesNotMatch(code.slice(code.indexOf('async function ensureUnqualifiedLead'),code.indexOf('function localeForBusiness')),/crm_tg_business_lead_ingest/);
  assert.match(code,/captureTelegramBusinessLead/);
  assert.match(code,/assertHolisticBusinessConnection/);
  assert.match(code,/marketingConsent:false/);
});
