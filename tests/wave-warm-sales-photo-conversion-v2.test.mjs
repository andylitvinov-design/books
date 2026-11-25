import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aliGuidedIntakeTurn} from '../lib/assist/ali-guided-intake.mjs';
import {v3ServiceCopy,V3_COPY,V3_CHAT_COPY,v3ButtonsFor,V3_LABELS} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {aliFreeDiagnosticIntro} from '../lib/assist/ali-free-diagnostic.mjs';
import {SECRETARY_PSYCHOLOGIST_COPY} from '../lib/assist/secretary-modes.mjs';
import {telegramSupportIntro} from '../lib/crm/telegram-support-quiz.mjs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
test('chosen service skips an interrogation for direct booking (RU EN ES)',()=>{
 const cases=[['ru','Хочу записаться на консультацию'],
  ['en','I want to book a session'],['es','Quiero reservar una consulta']];
 for(const [locale,message] of cases){
  const r=aliGuidedIntakeTurn({locale,serviceRequest:'coaching',message});
  assert.equal(r.stage,'ready');
  assert.ok(r.slots.goal.includes(message));
  assert.equal((r.reply.match(/[?¿？]/g)||[]).length,0);
  assert.ok(r.reply.length<240);
 }
});
test('unselected service: ask exactly one booking-clarification question',()=>{
 const r=aliGuidedIntakeTurn({locale:'ru',message:'Хочу записаться'});
 assert.equal(r.stage,'goal');
 assert.equal(r.slots.goal,undefined);
 assert.equal((r.reply.match(/[?？]/g)||[]).length,1);
});
test('negated booking is not treated as a request to schedule',()=>{
 const r=aliGuidedIntakeTurn({locale:'ru',serviceRequest:'coaching',
  message:'Не хочу записываться, просто изучаю варианты'});
 assert.notEqual(r.stage,'ready');
});
test('explicitly mentioned fear can be reflected safely with one question',()=>{
 const r=aliGuidedIntakeTurn({locale:'ru',serviceRequest:'coaching',
  message:'Мне страшно говорить о проблеме с партнёром'});
 assert.equal((r.reply.match(/[?？]/g)||[]).length,1);
 assert.doesNotMatch(r.reply,/у вас диагноз|обязаны записаться/i);
});
test('two meaningful answers suffice for review of a selected session',()=>{
 const a=aliGuidedIntakeTurn({locale:'en',serviceRequest:'coaching',message:'I want to improve my relationship'});
 const b=aliGuidedIntakeTurn({locale:'en',serviceRequest:'coaching',
  message:'We have trouble communicating',stage:a.stage,slots:a.slots});
 assert.equal(b.stage,'ready');
 assert.equal((b.reply.match(/[?]/g)||[]).length,0);
});
test('greetings stay short; processing disclosure and stop are kept in their relevant flows',()=>{
 for(const locale of ['ru','en','es']){
  assert.ok(aliFreeDiagnosticIntro(locale).length<230);
  assert.ok(SECRETARY_PSYCHOLOGIST_COPY[locale].intro.length<290);
  assert.ok(V3_COPY[locale].intro.length<165);
  assert.ok(V3_CHAT_COPY[locale].intro.length<160);
  assert.doesNotMatch(V3_COPY[locale].intro,/\/stop|medical records|медицинские документы|documentos médicos/);
  assert.doesNotMatch(V3_CHAT_COPY[locale].intro,/\/stop|medical records|медицинские документы|documentos médicos/);
  assert.match(SECRETARY_PSYCHOLOGIST_COPY[locale].intro,/\/stop/);
  for(const service of ['homeopathy','coaching','reiki','constellations','business','business_strategy']){
   const copy=v3ServiceCopy(locale,service);
   assert.ok(copy.intro.length<260);
   assert.ok(copy.consent.length<230);
   assert.ok(copy.consent.includes('OpenRouter'));
  }
 }
 for(const locale of ['ru','en'])
  assert.ok(telegramSupportIntro(locale,'0000').length<310);
});
test('first photo uses a fixed first-party key and optional CRM send remains explicit',()=>{
 const provider=source('lib/crm/messenger-provider.js');
 const flow=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 const hook=source('app/api/app/crm/messenger/webhook/[provider]/route.js');
 assert.match(provider,/const V3_WELCOME_PHOTOS=Object\.freeze/);
 assert.match(provider,/Object\.hasOwn\(V3_WELCOME_PHOTOS,welcomePhotoKey\)/);
 assert.match(provider,/photo:topicPhoto\|\|TELEGRAM_EXPLORE_PHOTO,caption:text/);
 assert.match(provider,/if\(freeWelcomePhoto\|\|\(!serviceWelcome&&topicPhoto\)\)/);
 assert.match(provider,/serviceWelcome\?'sendPhoto':'sendMessage'/);
 assert.match(provider,/text\.includes\('Ali'\)/);
 assert.match(provider,/freeConsent=keyboard\.length===2/);
 for(const key of ['free_diagnostic','psychologist','support_stress_energy',
  'support_relationships_esteem','support_money_growth',
  'support_business_support','reiki','coaching','business'])
  assert.ok(provider.includes(key),key);
 assert.match(flow,/welcomePhotoKey=serviceStart\?\.service/);
 assert.match(flow,/welcomePhotoKey:'chat'/);
 assert.match(flow,/if\(freeStart\)return \{\.\.\.greeting,freeWelcomePhoto:true\}/);
 assert.match(hook,/welcomePhotoKey:aiIntake\.welcomePhotoKey/);
 assert.match(flow,/const quickDraft=kind==='question'/);
 assert.match(flow,/const review=Boolean\(reviewText\)/);
 assert.match(flow,/if\(action==='send'\)/);
 assert.match(flow,/ai_review_consent_at=now\(\)/);
 for(const locale of ['ru','en','es'])
  assert.deepEqual(v3ButtonsFor(locale,'review_confirm',2,'coaching'),
   [[V3_LABELS[locale].servicesend],[V3_LABELS[locale].edit,V3_LABELS[locale].cancel]]);
});
