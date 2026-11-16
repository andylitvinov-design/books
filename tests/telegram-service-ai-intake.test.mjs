import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {telegramServiceRequestUrl} from '../lib/assist/telegram-business-request.mjs';
import {resolveTelegramFirstEntry,resolveTelegramServiceEntry} from '../lib/app/telegram-entry-url.mjs';
import {v3ServiceStart,v3Context,v3ServiceCopy,v3ButtonsFor,V3_LABELS,v3Action} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {v3ModelMessages} from '../lib/crm/telegram-ai-diagnostic-v3-model.mjs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const services=['homeopathy','coaching','reiki','constellations','business'];
const locales=['ru','en','es'];
const ready={available:true,aiInterviewAvailable:true,url:'https://t.me/holistichouse_bot'};
test('15 approved Telegram service-deep links preserve exact service/locale',()=>{
 for(const lang of locales)for(const service of services){
  const entry=resolveTelegramServiceEntry(ready,telegramServiceRequestUrl(service,lang),lang);
  assert.equal(entry?.href,'https://t.me/holistichouse_bot?start=hhservice_'+service+'_'+lang);
  assert.deepEqual(v3ServiceStart('/start hhservice_'+service+'_'+lang),{service,locale:lang});
  assert.ok(v3ServiceCopy(lang,service).intro.includes('OpenRouter'));
  assert.deepEqual(v3ButtonsFor(lang,'review_confirm',3,service),[
   [V3_LABELS[lang].servicesend],[V3_LABELS[lang].edit,V3_LABELS[lang].cancel]]);
 }
});
test('Strict bot readiness and tamper rejection retain human fallback',()=>{
 const human=telegramServiceRequestUrl('reiki','ru');
 assert.equal(resolveTelegramServiceEntry({...ready,aiInterviewAvailable:false},human,'ru'),null);
 assert.equal(resolveTelegramServiceEntry({...ready,available:false},human,'ru'),null);
 assert.equal(resolveTelegramServiceEntry(ready,human,'en'),null);
 assert.equal(resolveTelegramServiceEntry(ready,human+'&extra=private','ru'),null);
 assert.equal(resolveTelegramServiceEntry(ready,human.replace('/holistichouse','/attacker'),'ru'),null);
 assert.equal(resolveTelegramServiceEntry({...ready,url:'https://t.me/attacker_bot?evil=1'},human,'ru'),null);
 assert.equal(v3ServiceStart('/start hhservice_invalid_ru'),null);
 assert.equal(v3ServiceStart('/start hhservice_reiki_ru?text=private'),null);
 assert.equal(v3ServiceStart('/start hhreview_ru'),null);
});
test('Encrypted session only retains allowlisted service, model only sees public title',()=>{
 const ctx=v3Context({turns:[],serviceRequest:'reiki',chat_id:'forged'});
 assert.equal(ctx.serviceRequest,'reiki');
 assert.equal(Object.hasOwn(ctx,'chat_id'),false);
 assert.equal(v3Context({turns:[],serviceRequest:'fake'}).serviceRequest,undefined);
 assert.equal(v3Action({inlineAction:'v3:servicesend'}),'send');
 assert.match(v3ModelMessages({kind:'question',locale:'ru',serviceRequest:'reiki'})[0].content,/Сеанс Рейки/);
 assert.match(v3ModelMessages({kind:'summary',locale:'en',serviceRequest:'business'})[0].content,/Business coaching/);
});
test('Owner CRM transfer requires existing confirmation path; no early lead',()=>{
 const code=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 const ui=source('components/mandatory-messenger-actions.tsx');
 assert.match(code,/serviceStart=v3ServiceStart\(raw\)/);
 assert.match(code,/serviceRequest:serviceStart.service/);
 assert.match(code,/if\(action==='send'\)/);
 assert.match(code,/Confirmed service request/);
 assert.match(code,/ingestMessengerEventInTransaction/);
 assert.match(code,/ai_review_consent_at=now\(\)/);
 assert.match(code,/crm_tg_suppress_existing/);
 assert.match(ui,/resolveTelegramServiceEntry/);
 assert.match(ui,/serviceBot\|\|telegramUrl/);
});

test('Generic public free-review fallback is distinct from a selected service request',()=>{
 const publicBot={available:true,directAvailable:false,
  url:'https://t.me/holistichouse_bot',
  urls:{en:'https://t.me/holistichouse_bot?start=hhreview_en',
    ru:'https://t.me/holistichouse_bot?start=hhreview_ru',
    es:'https://t.me/holistichouse_bot?start=hhreview_es'}};
 for(const locale of ['ru','en','es']){
  assert.equal(resolveTelegramFirstEntry(publicBot,locale)?.href,
    'https://t.me/holistichouse_bot?start=hhreview_'+locale);
  assert.equal(resolveTelegramServiceEntry(publicBot,
    telegramServiceRequestUrl('reiki',locale),locale),null,
    'Without active AI interview readiness, a product may not silently turn into free review');
 }
});
