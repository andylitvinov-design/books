import {readFileSync} from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
import {v3Generate} from '../lib/crm/telegram-ai-diagnostic-v3-model.mjs';
import {V3_CHAT_COPY,v3CanChat,v3CanStart,v3ServiceStart} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {TELEGRAM_SERVICE_OPTIONS} from '../lib/assist/telegram-service-options.mjs';
import {aliGuidedIntakeTurn} from '../lib/assist/ali-guided-intake.mjs';
const botOffers=Object.fromEntries(Object.entries(TELEGRAM_SERVICE_OPTIONS)
 .filter(([,offer])=>!offer.channels||offer.channels.includes('telegram_bot')));
const env={VERCEL_ENV:'production',HH_CRM_TG_AI_V3_SCHEMA_READY:'true',
 HH_CRM_TG_AI_V3_ENABLED:'true',HH_CRM_TG_AI_V3_FREE_TIER_CONFIRMED:'true',
 HH_CRM_TG_AI_V3_SHARED_KEY_APPROVED:'true',
 HH_COUNCIL_OPENROUTER_API_KEY:'synthetic-legacy-should-not-be-used'};
const prompts={
 ru:['Привет','Поговорим?','Хочу обсудить работу','Мне тревожно',
  'Я боюсь сказать об этом','А что если я не знаю?','Расскажи об услугах','Кто ты?'],
 en:['Hello',"Let's chat",'I feel worried about work','I am embarrassed',
  "I'm not sure what to choose",'Can you help me?','What services exist?','Who are you?'],
 es:['Hola','Quiero charlar','Tengo miedo','No sé qué elegir',
  'Me preocupa el trabajo','¿Puedes ayudarme?','¿Qué servicios hay?','¿Quién eres?'],
};
test('24 realistic RU/EN/ES native Telegram chat turns use no OpenRouter and stay concise',async()=>{
 assert.equal(v3CanChat(env),true);
 let networkCalls=0;
 const fetcher=async()=>{networkCalls++;throw new Error('FORBIDDEN_EXTERNAL_FETCH');};
 for(const [locale,messages] of Object.entries(prompts)){
  assert.doesNotMatch(V3_CHAT_COPY[locale].intro,/OpenRouter/);
  assert.match(V3_CHAT_COPY[locale].intro,/Ali/);
  for(const message of messages){
   const result=await v3Generate({kind:'chat',locale,
    turns:[{role:'user',text:message}]},env,fetcher);
   assert.equal(result.provider,'holistic-house-native',locale+': '+message);
   assert.equal(result.modelUsed,false);
   assert.ok(result.text.trim().length>=8&&result.text.length<=900,locale+': '+message);
   assert.ok((result.text.match(/[?？]/gu)||[]).length<=1,locale+': '+message);
   assert.doesNotMatch(result.text,/https?:\/\/|<[^>]*>/u);
  }
 }
 assert.equal(networkCalls,0);
});
test('all Telegram Bot service entries preserve the right service and localized label',()=>{
 assert.equal(Object.keys(botOffers).length,35);
 for(const [id,offer] of Object.entries(botOffers)){
  for(const locale of ['ru','en','es']){
   const event=v3ServiceStart('/start hhitem_'+id+'_'+locale);
   assert.deepEqual(event,{service:offer.service,locale,offerId:id});
   assert.ok(typeof offer.titles[locale]==='string'&&offer.titles[locale].length>1);
  }
 }
});
test('short intake receives direct client wording without assigning speculative causes',()=>{
 for(const [locale,message] of [['ru','Меня волнуют отношения'],
   ['en','I want clarity in relationships'],['es','Quiero entender mi situación']]){
  const first=aliGuidedIntakeTurn({locale,message,serviceRequest:'coaching'});
  assert.ok(first&&typeof first.reply==='string'&&first.reply.length<650);
  assert.ok((first.reply.match(/[?？]/gu)||[]).length<=1);
  assert.ok(first.stage==='goal'||first.stage==='challenge'||first.stage==='situation'||first.stage==='ready');
 }
});

test('Companion hands natural text to keyless V3 instead of intercepting it',()=>{
 const noKey={...env,HH_COUNCIL_OPENROUTER_API_KEY:'',
   HH_CRM_TG_AI_V3_SHARED_KEY_APPROVED:'false'};
 assert.equal(v3CanChat(noKey),true);
 assert.equal(v3CanStart(noKey),false);
 const src=readFileSync(new URL('../lib/crm/telegram-companion-service.js',import.meta.url),'utf8');
 assert.match(src,/if\(v3CanChat\(env\)&&!stop&&!diagnostic&&!event\.inlineAction/);
 assert.doesNotMatch(src,/if\(v3CanStart\(env\)&&!stop/);
 assert.match(src,/!selected\|\|\(selected\.action==='home'&&greeting\)/);
 assert.match(src,/if\(stop\)/);
});
