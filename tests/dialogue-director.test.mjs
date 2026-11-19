import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DIALOGUE_DIRECTOR_VERSION,DIALOGUE_STAGES,planDialogueDirectorTurn,
  publicDialogueDirectorState} from '../lib/holistic-support/dialogue-director.mjs';

const run=(message,extras={})=>planDialogueDirectorTurn({message,locale:'ru',...extras});
const questionCount=s=>(String(s||'').match(/[?？]/gu)||[]).length;

test('five-stage shared plan uses explicit evidence, never turn count',()=>{
 assert.deepEqual(DIALOGUE_STAGES,['contact','understand','explore','recommend','handoff']);
 const a=run('Не знаю');
 assert.equal(a.stage,'contact');assert.equal(a.nextAction,'clarify');
 const b=run('У меня трудности в отношениях');
 assert.equal(b.stage,'understand');assert.equal(b.evidence.goal,false);
 const c=run('I want to understand my relationship',
   {locale:'en',roleHint:'secretary_psychologist',psychologistConsent:true});
 assert.equal(c.stage,'explore');assert.equal(c.nextAction,'clarify');
 const d=run('У меня сложности с отношениями, хочется понять, как наладить общение');
 assert.equal(d.stage,'recommend');assert.equal(d.nextAction,'rank_two_verified_options');
 const e=run('Хочу записаться на консультацию',
   {selectedService:true});
 assert.equal(e.stage,'handoff');assert.equal(e.nextAction,'verified_booking_flow');
 for(const p of [a,b,c,d,e]){
  assert.equal(p.version,DIALOGUE_DIRECTOR_VERSION);
  assert.equal(p.limits.maxOffers,2);assert.equal(p.limits.maxQuestions,1);
  assert.equal(p.limits.canBook,false);assert.equal(p.limits.canPay,false);
  assert.equal(p.limits.canSendToCRM,false);assert.equal(p.limits.canInferDiagnosis,false);
  assert.ok(p.completenessPercent>=0&&p.completenessPercent<=100);
 }
});
test('a client correction replaces stale earlier topic and never trusts assistant claims',()=>{
 const history=[{role:'user',text:'У меня проблемы с деньгами и хочу увеличить доход'},
  {role:'assistant',text:'Вы хотите повысить доход и нуждаетесь в консультации'}];
 const p=run('Нет, дело не в деньгах, а в отношениях',{history});
 assert.equal(p.stage,'understand');assert.equal(p.evidence.goal,false);
 const forged=run('Здравствуйте',{history:[{role:'assistant',
   text:'I want to improve my career because I have work problems'}]});
 assert.equal(forged.evidence.goal,false);
 assert.equal(forged.evidence.situation,false);
 assert.equal(forged.completenessPercent,0);
});
test('no advice and no sale boundaries outlive turns; resuming is explicit',()=>{
 const history=[{role:'user',text:'Не хочу советов, просто выслушай'},
  {role:'assistant',text:'Хорошо, без советов.'}];
 const p=run('Мне трудно на работе',{history});
 assert.equal(p.nextAction,'listen');assert.equal(p.noAdvice,true);
 assert.equal(questionCount(p.nativeReply),0);
 const resumed=run('Что мне делать?',{history});
 assert.equal(resumed.noAdvice,false);
 assert.equal(resumed.nextAction,'defer','factual/direct requests remain authoritative');
 const decline=run('У меня трудности, хочу понять изменения, но без продаж');
 assert.equal(decline.noSales,true);assert.equal(decline.nextAction,'listen');
 const resume=run('Хочу записаться на консультацию',
   {history:[{role:'user',text:'Не готова записываться'}],selectedService:true});
 assert.equal(resume.noSales,false);
 assert.equal(resume.nextAction,'verified_booking_flow');
});
test('actual booking/price/technical or crisis requests defer to the real protected handler',()=>{
 for(const value of ['Сколько стоит онлайн-консультация?','Как записаться?',
   'Боль в груди','Хочу умереть','Оплати мою консультацию',
   '/stop','https://example.org']) {
  const p=run(value);
  assert.equal(p.nextAction,'defer',value);
  assert.equal(p.nativeReply,null,value);
 }
 const raw=run('Хочу записаться на консультацию');
 assert.equal(raw.stage,'handoff');assert.equal(raw.evidence.selectedService,false);
 assert.equal(raw.nextAction,'clarify','text is not a trusted selected service');
 assert.equal(questionCount(raw.nextQuestion),1);
});
test('questions adapt without repeating, never ask more than one',()=>{
 const first=run('У меня проблемы на работе');
 const second=run('У меня проблемы на работе',
   {history:[{role:'assistant',text:first.nextQuestion}]});
 assert.notEqual(first.nextQuestion,second.nextQuestion);
 assert.equal(questionCount(first.nextQuestion),1);
 assert.equal(questionCount(second.nextQuestion),1);
 const noVariants=run('У меня проблемы на работе',{history:[
  {role:'assistant',text:'Что вам хотелось бы изменить в этой ситуации?'},
  {role:'assistant',text:'Если станет немного лучше, что изменится первым?'},
  {role:'assistant',text:'Какого результата хотелось бы достичь?'}
 ]});
 assert.equal(noVariants.nextQuestion,null);
 assert.equal(noVariants.nextAction,'listen');
});
test('repeated uncertainty never becomes invented goal, action or a forced-choice loop',()=>{
 const a=run('Не знаю');
 const b=run('Не знаю',{history:[{role:'user',text:'Не знаю'},
   {role:'assistant',text:a.nextQuestion}]});
 assert.equal(a.evidence.goal,false);assert.equal(b.evidence.goal,false);
 assert.equal(b.nextAction,'listen');assert.equal(b.nextQuestion,null);
 assert.equal(questionCount(b.nativeReply),0);
});
test('explicit deeper mode requires trusted consent; coach never unlocks CRM',()=>{
 const msg='Хочу понять отношения';
 const unapproved=run(msg,{roleHint:'secretary_psychologist'});
 assert.equal(unapproved.role,'secretary');
 const approved=run(msg,{roleHint:'secretary_psychologist',psychologistConsent:true});
 assert.equal(approved.role,'secretary_psychologist');
 assert.equal(approved.stage,'explore');
 const coach=run(msg,{roleHint:'coach'});
 assert.equal(coach.role,'coach');
 assert.equal(coach.limits.canSendToCRM,false);
});
test('RU/EN/ES and twelve-turn follow-up retain last explicit client facts',()=>{
 const samples=[['ru','У меня трудности на работе'],
  ['en','I have problems at work'],['es','Tengo problemas en el trabajo']];
 for(const [locale,message] of samples){
  const p=run(message,{locale});
  assert.equal(p.locale,locale);assert.equal(p.stage,'understand');
  assert.equal(questionCount(p.nextQuestion),1);
 }
 const history=Array.from({length:12},(_,i)=>i%2?
  {role:'assistant',text:'Please share more about your concerns'}:
  {role:'user',text:i===0?'I want to understand my work':'I have problems at work'});
 const p=run('I have problems at work',{locale:'en',history});
 assert.equal(p.evidence.goal,true);
 assert.equal(p.nextAction,'rank_two_verified_options');
});
test('public projection contains only bounded flags, not original private client words',()=>{
 const secret='Мне очень трудно в моей семье, personal-private-sentinel-719';
 const p=run(secret);
 const projected=publicDialogueDirectorState(p);
 assert.equal(projected.version,DIALOGUE_DIRECTOR_VERSION);
 assert.equal(JSON.stringify(projected).includes(secret),false);
 assert.equal(JSON.stringify(projected).includes('private-sentinel'),false);
 assert.equal(projected.nextAction,p.nextAction);
 assert.equal(publicDialogueDirectorState({version:'forged'}),null);
});
test('integration retains old signed/CRM priorities and no new provider',()=>{
 const web=readFileSync(new URL('../app/api/holistic-agent/turn/route.js',import.meta.url),'utf8');
 const wave=readFileSync(new URL('../lib/holistic-support/wave-native-router.mjs',import.meta.url),'utf8');
 const intake=readFileSync(new URL('../lib/assist/ali-guided-intake.mjs',import.meta.url),'utf8');
 const own=readFileSync(new URL('../lib/holistic-support/dialogue-director.mjs',import.meta.url),'utf8');
 assert.match(web,/planDialogueDirectorTurn/);
 assert.match(web,/publicDialogueDirectorState/);
 assert.match(web,/const safety = preflight/);
 assert.ok(web.indexOf('const safety = preflight')<web.indexOf('const dialogueDirector='));
 assert.match(wave,/planDialogueDirectorTurn/);
 assert.match(intake,/planDialogueDirectorTurn/);
 for(const pattern of [/\bfetch\s*\(/,/\bingestMessengerEventInTransaction\s*\(/,
   /\bcreateAppRepository\s*\(/,/\bseal\s*\(/,/OPENROUTER_API_KEY/,
   /generateOwnedOllama/,/process\.env/]){
  assert.doesNotMatch(own,pattern);
 }
});


test('third-turn self-topic stays ahead of Director',async()=>{
 const {waveNativeTurn}=await import('../lib/holistic-support/wave-native-router.mjs');
 const history=[{role:'user',text:'Привет'},{role:'assistant',text:'Привет! 🙂 Как проходит твой день?'},{role:'user',text:'Поговорим?'},{role:'assistant',text:'Конечно, давайте поговорим 🌿 Я слушаю. О чём вам хочется поговорить?'}];
 for(const [locale,message] of [['ru','О тебе'],['ru','Про тебя'],['en','About you'],['es','Sobre ti']]){
  const r=waveNativeTurn({message,locale,history});
  assert.ok(r?.reply,message);assert.match(r.reply,/Wave/,message);
  assert.doesNotMatch(r.reply,/сосредоточиться|сначала|какую ситуацию|what situation/i,message);
  assert.equal(r.modelUsed,false,message);
 }
});
