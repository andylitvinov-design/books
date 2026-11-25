import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {v3CanStart,v3CanChat,v3ServiceIntakeReady,v3ServiceCopy} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {TELEGRAM_SERVICE_OPTIONS} from '../lib/assist/telegram-service-options.mjs';
const src=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const botOffers=Object.fromEntries(Object.entries(TELEGRAM_SERVICE_OPTIONS)
 .filter(([,offer])=>!offer.channels||offer.channels.includes('telegram_bot')));
const env={VERCEL_ENV:'production',HH_CRM_TG_AI_V3_SCHEMA_READY:'true',
 HH_CRM_TG_AI_V3_ENABLED:'true',HH_CRM_TG_AI_V3_FREE_TIER_CONFIRMED:'true',
 HH_CRM_TG_AI_V3_SHARED_KEY_APPROVED:'false',HH_COUNCIL_OPENROUTER_API_KEY:'',
 HH_CRM_TG_AI_V3_OPENROUTER_KEY:''};
test('local service intake needs production/schema but no external AI model key',()=>{
 assert.equal(v3CanChat(env),true);
 assert.equal(v3ServiceIntakeReady(env),true);
 assert.equal(v3CanStart(env),false);
 assert.equal(v3ServiceIntakeReady({...env,HH_CRM_TG_AI_V3_FREE_TIER_CONFIRMED:'false'}),true,
   'native Wave orders are independent of free external model quotas');
 for(const change of [{VERCEL_ENV:'preview'},{HH_CRM_TG_AI_V3_SCHEMA_READY:'false'},
  {HH_CRM_TG_AI_V3_ENABLED:'false'}])
  assert.equal(v3ServiceIntakeReady({...env,...change}),false);
});
test('all Telegram Bot service offers use exact localized title and truthful privacy notice',()=>{
 assert.equal(Object.keys(botOffers).length,35);
 for(const locale of ['ru','en','es']){
  for(const service of ['homeopathy','coaching','reiki','constellations','business','business_strategy']){
   const copy=v3ServiceCopy(locale,service);
   assert.ok(copy?.title&&copy.intro.includes(copy.title));
   assert.doesNotMatch(copy.intro,/OpenRouter/);
   assert.ok(copy.consent.length<130,'no second technical speech');
   assert.doesNotMatch(copy.consent,/OpenRouter|external AI model|медицинских документов|documentos médicos/i);
   assert.doesNotMatch(copy.consent,/OpenRouter/);
  }
  for(const [id,item] of Object.entries(botOffers)){
   const copy=v3ServiceCopy(locale,item.service,id);
   assert.ok(copy?.title&&copy.intro.includes(copy.title),id);
   assert.doesNotMatch(copy.intro,/OpenRouter/);
  }
 }
});
test('only service uses keyless gate; STOP, consent, CRM and deep model gate remain',()=>{
 for(const path of ['app/api/public/telegram-service-entry/route.js',
   'app/api/public/telegram-option-entry/route.js']){
  const text=src(path);
  assert.match(text,/channelTransportReady\('telegram',env\)&&v3ServiceIntakeReady\(env\)/);
  assert.doesNotMatch(text,/channelTransportReady\('telegram',env\)&&v3CanStart\(env\)/);
 }
 const diag=src('app/api/public/telegram-diagnostic/route.js');
 assert.match(diag,/serviceInterviewAvailable:v3ServiceIntakeReady\(env\)/);
 assert.match(diag,/aiInterviewAvailable:[^\n]+v3CanStart\(env\)/);
 const service=src('lib/crm/telegram-ai-diagnostic-v3-service.js');
 for(const phrase of ['supportSecretaryStart||assistantStart)?chatAllowed:serviceEntry?serviceAllowed:allowed',
  'const purposeReady=general||ctx.mode===FREE_DIAGNOSTIC_MODE||',
  "prior.ctx.supportSelection&&prior.ctx.mode!==SECRETARY_MODES.PSYCHOLOGIST",
  "provider:'wave-psychologist-native'",
  'if(stop)',"if(action==='send')",'ai_review_consent_at=now()','if(!row.ai_consent_at||!']){
   assert.ok(service.includes(phrase),phrase);
 }
});
