import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {composeTelegramWavePublicReply} from '../lib/crm/telegram-secretary-offers.mjs';
import {waveNativeTurn} from '../lib/holistic-support/wave-native-router.mjs';

test('Wave ordinary Telegram chat recommends OPORA for stress in RU/EN/ES',()=>{
 const examples=[['Подбери мне курс по стрессу','ru'],
  ['Recommend a stress course','en'],
  ['Recomiéndame un curso para el estrés','es']];
 for(const [message,locale] of examples){
  const reply=composeTelegramWavePublicReply(message,locale);
  assert.ok(reply?.text,message);
  assert.ok(reply.text.includes('/'+locale+'/courses/antistress'));
  assert.equal(reply.text.includes('/'+locale+'/academy/reiki'),false);
  assert.equal(reply.modelUsed,false);
 }
});
test('Reiki course goes to Academy; general course request lists both approved indexes',()=>{
 const reiki=composeTelegramWavePublicReply('Подбери курс Рейки','ru');
 assert.ok(reiki?.text.includes('/ru/academy/reiki'));
 assert.equal(reiki.text.includes('/ru/courses/antistress'),false);
 const general=composeTelegramWavePublicReply('Покажи курсы','ru');
 assert.ok(general?.text.includes('/ru/academy/reiki'));
 assert.ok(general?.text.includes('/ru/courses/antistress'));
});
test('non-requests, STOP, emergency, unverified prices and unrelated courses are not upsold',()=>{
 for(const message of ['Привет','Деньги','/stop','[HH-REQ:reiki:ru]',
   'Сколько стоит курс Рейки?','Подбери курс по отношениям',
   'Хочу покончить с собой, подбери курс']){
  assert.equal(composeTelegramWavePublicReply(message,'ru'),null,message);
 }
});
test('only first-party, fixed, unparameterized links are sent as Telegram text',()=>{
 for(const message of ['Подбери мне курс по стрессу','Покажи видео','Покажи тесты']){
  const response=composeTelegramWavePublicReply(message,'ru');
  assert.ok(response?.text);
  assert.doesNotMatch(response.text,/€|\$[0-9]|диагноз/i);
  const links=[...response.text.matchAll(/https:\/\/[^\s]+/g)].map(x=>x[0]);
  assert.ok(links.length>0);
  for(const link of links){
   const u=new URL(link);
   assert.equal(u.origin,'https://holistichouse.vercel.app');
   assert.match(u.pathname,/^\/ru\/(?:courses\/antistress|academy\/reiki|tests|mytube|masters|services\/free-situation-review|holistic-support\/mobile)$/);
   assert.equal(u.search,'');
  }
 }
});
test('Wave handles screenshot identity and money turns without cloud generation',()=>{
 const identity=waveNativeTurn({message:'Расскажи о себе',locale:'ru'});
 const money=waveNativeTurn({message:'Деньги',locale:'ru'});
 assert.match(identity?.reply||'',/Я Wave/);
 assert.match(money?.reply||'',/доходы, расходы/);
 assert.equal(identity?.externalCalled,false);
 assert.equal(money?.externalCalled,false);
});
test('V3 catalogue short circuit follows consent verification and precedes external model',()=>{
 const code=readFileSync(new URL('../lib/crm/telegram-ai-diagnostic-v3-service.js',import.meta.url),'utf8');
 const index=code.indexOf('const publicCatalogue=prior.ctx.conversationKind');
 const external=code.indexOf('else result=await v3Generate(',index);
 assert.ok(index>0&&external>index);
 assert.match(code,/if\(publicCatalogue\)\{/);
 assert.match(code,/provider:'wave-public-catalogue'/);
 assert.match(code,/!row\.ai_consent_at\|\|row\.ai_context_id!==job\.contextId/);
 assert.match(code,/ctx\.pending\?\.id!==job\.updateId/);
});
