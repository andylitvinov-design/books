import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aliBusinessLinkReference,aliBusinessLinkCopy}
 from '../lib/assist/ali-business-diagnostic-link.mjs';
import {v3Context} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {telegramBusinessConversationReply} from '../lib/assist/telegram-business-request.mjs';
const source=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');

test('cross-channel link parses ONLY an explicit anchored command',()=>{
 assert.equal(aliBusinessLinkReference('/link HH-ABCDEF123456'),'HH-ABCDEF123456');
 assert.equal(aliBusinessLinkReference('/link hh-abcdef123456'),'HH-ABCDEF123456');
 for(const input of [
  'HH-ABCDEF123456','link HH-ABCDEF123456','/link HH-123',
  '/link HH-ABCDEF123456 copy', '/link HH-ABCDEF123456\n/stop',
  '/link HH-ABCDEF123456?token=private','/link HH-ABCDEF123456;DELETE',
  '/link HH-ABCDEF12345Z'
 ])assert.equal(aliBusinessLinkReference(input),null,input);
});

test('encrypted V3 allowlist retains ONLY valid Free Diagnostic link evidence',()=>{
 const good=v3Context({turns:[],mode:'free_diagnostic',
   linkedBusinessReference:'HH-ABCDEF123456'});
 assert.equal(good.linkedBusinessReference,'HH-ABCDEF123456');
 for(const opts of [{mode:'secretary'},{mode:'secretary_psychologist'},
   {mode:'free_diagnostic',linkedBusinessReference:'HH-INVALIDCODE'}]){
   const ctx=v3Context({turns:[],linkedBusinessReference:'HH-ABCDEF123456',...opts});
   if(opts.mode!=='free_diagnostic')assert.equal(ctx.linkedBusinessReference,undefined);
 }
 assert.equal(v3Context({turns:[],mode:'free_diagnostic',
  linkedBusinessReference:'HH-ABCDEF12345Z'}).linkedBusinessReference,undefined);
});

test('matching a reference alone NEVER authorizes cross-transport identity',()=>{
 const s=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 assert.match(s,/if\(row.stage==='done'\)/);
 assert.match(s,/if\(!row.consent_at\)return \{handled:true\}/);
 assert.match(s,/if\(\/\^\\\/link\\b\/i\.test\(raw\)\)/);
 assert.match(s,/ctx\.verifiedTelegramUserId===String\(event\.userId\)/);
 assert.match(s,/scope:'hh-telegram-business-peer'/);
 assert.match(s,/b\.telegram_peer_hash=\$2/);
 assert.match(s,/b\.reference_code=\$1/);
 assert.match(s,/p\.trusted_auth_user_id=\$3/);
 assert.match(s,/b\.stage='submitted'/);
 assert.match(s,/b\.consent_at is not null/);
 assert.match(s,/ALI_BUSINESS_LINK_CRM_CONFIRM_FAILED/);
 assert.match(s,/ingestMessengerEventInTransaction/);
 assert.match(s,/linkedBusinessReference:ref/);
});

test('submitted Business reviews explain independent package and verified one-time link',()=>{
 for(const [locale,title] of [
  ['ru','Расширенная диагностика'],['en','Extended review'],['es','Revisión ampliada']
 ]){
  const message=telegramBusinessConversationReply('submitted',{
   locale,service:'personal_review',offerId:'personal_extended_review',
   referenceCode:'HH-ABCDEF123456'});
  assert.ok(message.length>70&&message.length<=600,locale);
  assert.match(message,/\/link HH-ABCDEF123456/);
  assert.match(message,/https:\/\/t\.me\/holistichouse_bot\?start=hhreview_/);
  assert.match(message,new RegExp(title));
 }
});
test('uniform safe responses do not reveal strangers references or status',()=>{
 for(const locale of ['ru','en','es']){
  assert.equal(aliBusinessLinkCopy(locale,'unverified','HH-ABCDEF123456')
   .includes('HH-ABCDEF123456'),false);
  assert.equal(aliBusinessLinkCopy(locale,'linked','HH-ABCDEF123456')
   .includes('HH-ABCDEF123456'),true);
 }
});
