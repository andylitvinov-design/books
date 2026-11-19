import test from 'node:test';
import assert from 'node:assert/strict';
import {telegramBusinessReplyFailure,telegramBusinessReplyCrmState} from '../lib/crm/telegram-delivery-status.mjs';

test('Business reply errors are classified without logging provider payloads or customer data',()=>{
 const cases=[
  ['PROVIDER_REJECTED','provider_rejected','failed'],
  ['PROVIDER_TIMEOUT','delivery_unknown','delivery_unknown'],
  ['PROVIDER_STATUS_UNKNOWN','delivery_unknown','delivery_unknown'],
  ['PROVIDER_RATE_LIMITED','rate_limited','failed'],
  ['RATE_LIMITED','rate_limited','failed'],
  ['INVALID_KEYBOARD','invalid_payload','failed'],
  ['CHANNEL_NOT_CONNECTED','business_connection_unavailable','failed'],
  ['ACCOUNT_CHANGED','business_connection_unavailable','failed'],
  ['SUPABASE_UNAVAILABLE','persistence_failure','failed'],
  ['anything_else','unknown','delivery_unknown'],
 ];
 for(const [code,category,state] of cases){
  const error={code,message:'private customer text and raw Telegram ID'};
  assert.equal(telegramBusinessReplyFailure(error),category);
  assert.equal(telegramBusinessReplyCrmState(category),state);
 }
 assert.equal(telegramBusinessReplyFailure({}), 'unknown');
});

test('a non-confirmed send is not retried and CRM state is written against the signed inbound item',async()=>{
 const {readFileSync}=await import('node:fs');
 const route=readFileSync(new URL('../app/api/app/crm/messenger/webhook/[provider]/route.js',import.meta.url),'utf8');
 const inbox=readFileSync(new URL('../lib/crm/telegram-business-inbox.js',import.meta.url),'utf8');
 const migration=readFileSync(new URL('../supabase/migrations/20261119190000_hh_telegram_review_offer_and_delivery_states.sql',import.meta.url),'utf8');
 assert.match(route,/setTelegramBusinessReplyState\(config,telegramBusinessInbox,'send_pending',business\)/);
 assert.match(route,/setTelegramBusinessReplyState\(config,telegramBusinessInbox,'provider_accepted',business\)/);
 assert.match(route,/telegramBusinessReplyCrmState\(failure\)/);
 assert.match(route,/HH_TG_BUSINESS_REPLY_FAILED:/);
 assert.match(inbox,/providerHash:msgHash/);
 assert.match(inbox,/crm_msg_business_reply_state\(\$1,\$2,\$3,\$4,\$5,\$6,\$7,\$8\)/);
 const store=readFileSync(new URL('../lib/crm/messenger-store.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../components/app/crm-messenger.jsx',import.meta.url),'utf8');
 assert.match(store,/selectedOfferId:r\.selected_offer_id/);
 assert.match(store,/serviceDialogueStage:r\.service_dialogue_stage/);
 assert.match(ui,/TELEGRAM_SERVICE_OPTIONS\[thread\.selectedOfferId\]/);
 assert.match(migration,/FORCE ROW LEVEL SECURITY/);
 assert.match(migration,/GRANT EXECUTE ON FUNCTION app_private\.crm_msg_business_reply_state/);
 assert.match(migration,/p_state NOT IN \('processed','send_pending','provider_accepted','delivery_unknown','failed'\)/);
});

test('generic Secretary and first-contact Business replies track sends and avoid unknown-outcome retries',async()=>{
 const {readFileSync}=await import('node:fs');
 const route=readFileSync(new URL('../app/api/app/crm/messenger/webhook/[provider]/route.js',import.meta.url),'utf8');
 const snippet=route.split('const secretary=await processTelegramBusinessSecretary(body,config)')[1]
   ?.split('const updates=normalizeMessengerUpdates(provider,body)')[0];
 assert.ok(snippet,'signed Business FAQ and first-contact paths remain present');
 assert.match(snippet,/setTelegramBusinessReplyState\(config,telegramBusinessInbox,'send_pending'\)/);
 assert.match(snippet,/setTelegramBusinessReplyState\(config,telegramBusinessInbox,'provider_accepted'\)/);
 assert.match(snippet,/setTelegramBusinessReplyState\(config,telegramBusinessInbox,telegramBusinessReplyCrmState\(failure\)\)/);
 assert.match(snippet,/HH_TG_SECRETARY_REPLY_FAILED:/);
 assert.match(snippet,/HH_TG_BUSINESS_FIRST_REPLY_FAILED:/);
 assert.doesNotMatch(snippet,/HH_TG_(?:SECRETARY|BUSINESS_FIRST)_REPLY_NOT_CONFIRMED/);
 assert.equal((snippet.match(/sendHolisticBusinessRequestReply\(\{/g)||[]).length,2);
 assert.doesNotMatch(snippet,/setTimeout|setInterval|retry.?send|forceNew/i);
});
