import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {wavePsychologistNativeTurn,wavePsychologistNativeSummary} from '../lib/assist/wave-psychologist-native.mjs';
import {aliFreeDiagnosticTurn} from '../lib/assist/ali-free-diagnostic.mjs';
import {v3Action,v3ButtonsFor,v3Context,V3_LABELS,v3ServiceIntakeReady,
  v3CanStart,v3ServiceStart,v3ServiceCopy} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {SECRETARY_MODES} from '../lib/assist/secretary-modes.mjs';
import {TELEGRAM_SERVICE_OPTIONS} from '../lib/assist/telegram-service-options.mjs';
const code=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const countQuestions=value=>(String(value).match(/[?？]/gu)||[]).length;
const botOffers=Object.fromEntries(Object.entries(TELEGRAM_SERVICE_OPTIONS)
 .filter(([,offer])=>!offer.channels||offer.channels.includes('telegram_bot')));

test('Secretary and Secretary Psychologist need no OpenRouter key or free-tier entitlement',()=>{
 const env={VERCEL_ENV:'production',HH_CRM_TG_AI_V3_SCHEMA_READY:'true',
   HH_CRM_TG_AI_V3_ENABLED:'true',HH_CRM_TG_AI_V3_FREE_TIER_CONFIRMED:'false',
   HH_CRM_TG_AI_V3_OPENROUTER_KEY:'',HH_COUNCIL_OPENROUTER_API_KEY:''};
 assert.equal(v3CanStart(env),false);
 assert.equal(v3ServiceIntakeReady(env),true);
 for(const key of ['VERCEL_ENV','HH_CRM_TG_AI_V3_SCHEMA_READY','HH_CRM_TG_AI_V3_ENABLED']){
   const value=key==='VERCEL_ENV'?'preview':'false';
   assert.equal(v3ServiceIntakeReady({...env,[key]:value}),false,key);
 }
 const service=code('lib/crm/telegram-ai-diagnostic-v3-service.js');
 assert.match(service,/provider:'wave-psychologist-native'/);
 assert.match(service,/wavePsychologistNativeTurn/);
 assert.match(service,/wavePsychologistNativeSummary/);
 assert.match(service,/v3ServiceIntakeReady\(env\)/);
});
test('all Telegram Bot options retain exact title and service code in one Telegram bot',()=>{
 assert.equal(Object.keys(botOffers).length,35);
 for(const [id,option] of Object.entries(botOffers)){
   for(const locale of ['ru','en','es']){
     const start=v3ServiceStart('/start hhitem_'+id+'_'+locale);
     assert.deepEqual(start,{service:option.service,locale,offerId:id});
     const copy=v3ServiceCopy(locale,start.service,start.offerId);
     assert.equal(copy.title,option.titles[locale]);
   }
 }
});
test('psychological intake asks one adaptive question, remembers only client-authored facts',()=>{
 const first=wavePsychologistNativeTurn({locale:'ru',stage:'situation',
   message:'Хочу наладить отношения с супругом'});
 assert.equal(first.stage,'challenge');
 assert.match(first.slots.goal,/отношения/);
 assert.equal(countQuestions(first.reply),1);
 const second=wavePsychologistNativeTurn({locale:'ru',stage:first.stage,slots:first.slots,
   message:'Мне страшно говорить о конфликтах'});
 assert.equal(second.stage,'impact');
 assert.match(second.reply,/страшно|тревожно/);
 assert.equal(countQuestions(second.reply),1);
 const question=wavePsychologistNativeTurn({locale:'ru',stage:second.stage,
   slots:second.slots,message:'Сколько стоит консультация?'});
 assert.equal(question.stage,second.stage);
 assert.deepEqual(question.slots,second.slots);
 assert.equal(countQuestions(question.reply),0);
 const summary=wavePsychologistNativeSummary({locale:'ru',slots:second.slots});
 assert.match(summary,/Хочу наладить отношения/);
 assert.match(summary,/Мне страшно/);
 assert.doesNotMatch(summary,/диагноз|вызвано детством|трактовка внешности/iu);
});
test('RU EN ES and boundaries: pause, skip, uncertainty, danger',()=>{
 const queries=[['ru','Хочу разобраться со стрессом'],
  ['en','I want to understand my situation'],
  ['es','Quiero comprender mi situación']];
 for(const [locale,message] of queries){
   const p=wavePsychologistNativeTurn({locale,message});
   assert.equal(p.stage,'challenge');
   assert.equal(countQuestions(p.reply),1);
   assert.match(wavePsychologistNativeSummary({locale,slots:p.slots}),/./);
   const q=wavePsychologistNativeTurn({locale,message:'skip',
     stage:p.stage,slots:p.slots});
   assert.equal(q.stage,'impact');
   assert.equal(q.slots.challenge,undefined);
 }
 const paused=wavePsychologistNativeTurn({locale:'ru',message:'без вопросов'});
 assert.equal(paused.stage,'ready');
 assert.equal(countQuestions(paused.reply),0);
 assert.equal(wavePsychologistNativeTurn({locale:'ru',message:'хочу умереть'}),null);
 assert.equal(wavePsychologistNativeSummary({locale:'ru',slots:{}}),null);
});
test('signed psychologist context permits bounded facts, not arbitrary private profile fields',()=>{
 const ctx=v3Context({mode:SECRETARY_MODES.PSYCHOLOGIST,intakeStage:'impact',
   intakeSlots:{situation:'ситуация',goal:'цель',challenge:'сложно',
     impact:'влияние',attempts:'пробовал',support:'поддержка',notes:'уточнение',
     diagnosis:'fake',ownerPhone:'forged'},turns:[],privateEmail:'fake'});
 for(const key of ['impact','attempts','support','notes','goal'])assert.ok(ctx.intakeSlots[key],key);
 assert.equal(ctx.intakeSlots.diagnosis,undefined);
 assert.equal(ctx.intakeSlots.ownerPhone,undefined);
 assert.equal(ctx.privateEmail,undefined);
});
test('client can book directly in Telegram in all three locales; refusal never books',()=>{
 for(const [locale,message] of [['ru','Хочу записаться на консультацию'],
    ['en','I want to book a session'],['es','Quiero reservar una consulta']]){
   assert.equal(v3Action({rawText:message}),'book',locale);
   const actions=v3ButtonsFor(locale,'psych_interview',2);
   assert.equal(actions[0][1],V3_LABELS[locale].book);
   assert.equal(actions[1][0],V3_LABELS[locale].skip);
 }
 for(const text of ['Не хочу записываться','Not ready to book','No quiero reservar',
     'I want to book a flight'])assert.notEqual(v3Action({rawText:text}),'book',text);
});
test('book in free review changes purpose only after explicit user action, never redirects',()=>{
 const flow=code('lib/crm/telegram-ai-diagnostic-v3-service.js');
 assert.match(flow,/if\(action==='book'&&\['consent','interview','review_confirm'\]/);
 assert.match(flow,/ai_consent_at=null/);
 assert.match(flow,/selectedCopy\.reviewTitle\+prepared\+selectedCopy\.reviewQuestion/);
 assert.doesNotMatch(flow,/\/services\/free-consultation/);
 assert.match(flow,/if\(handoff\)return/);
 assert.match(flow,/ai_review_consent_at=now\(\)/);
 assert.match(flow,/if\(stop\)/);
 assert.match(flow,/serviceFinalize:/);
 assert.match(code('lib/crm/telegram-v3-service-finalizer.js'),
    /stage='done'/);
});
test('public order routes never switch client to unrelated personal Telegram chat',()=>{
 for(const path of ['app/api/public/telegram-service-entry/route.js',
       'app/api/public/telegram-option-entry/route.js']){
   const src=code(path);
   assert.match(src,/status:503/);
   assert.match(src,/Retry-After/);
   assert.doesNotMatch(src,/NextResponse\.redirect\(target/);
   assert.doesNotMatch(src,/t\.me\/holistichouse\?text=/);
 }
});
test('product and consent safety invariants: no new model API, bot, webhook, or payment',()=>{
 const psych=code('lib/assist/wave-psychologist-native.mjs');
 assert.doesNotMatch(psych,/https?:\/\/|fetch\(|axios|OPENROUTER_API_KEY|generateOwnedOllama|createPool|sendMessage\(/);
 const flow=code('lib/crm/telegram-ai-diagnostic-v3-service.js');
 assert.doesNotMatch(flow,/https:\/\/t\.me\/holistichouse\?text=/);
 assert.match(flow,/serviceFinalize|promptResult/);
 assert.match(flow,/encryptContext\(current,savedContext,config\)/);
});
test('Free Review booking FAQ stays in Wave and offers native Book, not a website',()=>{
 const sample=[['ru','Как записаться?','Записаться к Андрею'],
   ['en','Can I book a session?','Book with Andrey'],
   ['es','¿Puedo reservar una sesión?','Reservar con Andrey']];
 for(const [locale,message,button] of sample){
  const reply=aliFreeDiagnosticTurn({locale,message,
    stage:'challenge',slots:{goal:'Clarity'}});
  assert.equal(reply.stage,'challenge');
  assert.match(reply.reply,new RegExp(button));
  assert.doesNotMatch(reply.reply,/https?:\/\//);
 }
});
