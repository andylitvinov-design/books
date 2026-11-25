import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {aliGuidedIntakeTurn,aliGuidedIntakeSummary,
  aliIntakeStageFromTurns} from '../lib/assist/ali-guided-intake.mjs';
import {v3Context} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';

const step=(message,stage='goal',slots={},locale='en',turns=[])=>
  aliGuidedIntakeTurn({message,stage,slots,locale,turns});
const countQuestions=value=>(value.match(/[?？]/gu)||[]).length;
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('Ali uses exactly one goal -> obstacle -> current -> review question at a time',()=>{
 const a=step('I want a clearer idea of where I am going with my career');
 assert.equal(a.stage,'challenge');
 assert.match(a.reply,/difficult/i);
 assert.equal(countQuestions(a.reply),1);
 assert.match(a.slots.goal,/clearer idea/);
 const b=step('My obstacle is that I am uncertain what fits me',a.stage,a.slots);
 assert.equal(b.stage,'situation');
 assert.equal(countQuestions(b.reply),1);
 const c=step('Currently I am switching work and feeling lost',b.stage,b.slots);
 assert.equal(c.stage,'ready');
 assert.equal(countQuestions(c.reply),0);
 assert.match(c.reply,/draft/i);
 assert.doesNotMatch(c.reply,/sent to|submitted to|diagnosed with/i);
 const summary=aliGuidedIntakeSummary({slots:c.slots});
 assert.match(summary,/career/);
 assert.match(summary,/uncertain/);
 assert.match(summary,/switching work/);
 assert.doesNotMatch(summary,/trauma|diagnosis|therapy recommended/i);
});
test('Meetup referral is remembered as the CLIENT source, never mistaken for their goal',()=>{
 const scenarios=[
  ['I got this link from meet up app','en','goal'],
  ['Я пришёл по ссылке из Meetup','ru','goal'],
  ['Recibí el enlace de Meetup','es','goal'],
 ];
 for(const [message,locale] of scenarios){
   const a=step(message,'goal',{},locale);
   assert.equal(a.stage,'goal');
   assert.equal(a.slots.goal,undefined);
   assert.equal(a.slots.source,message);
   assert.equal(countQuestions(a.reply),1);
   const b=step(locale==='en'?'I want direction':locale==='ru'?'Хочу найти направление':'Quiero tener claridad',
     a.stage,a.slots,locale);
   assert.equal(b.stage,'challenge');
   const summary=aliGuidedIntakeSummary({locale,slots:b.slots});
   assert.match(summary,/Meetup|meet up/i);
 }
 const generic=step('I need help');
 assert.equal(generic.stage,'goal');
 assert.equal(generic.slots.goal,undefined);
 assert.equal(countQuestions(generic.reply),1);
});
test('An unclear, distressed or first-time visitor is not forced to invent a goal',()=>{
 for(const text of ['Currently I am going through lots of negative events in my life',
   'My happening life','Sorry it is my first time','Help please lol']){
   const a=step(text);
   assert.equal(a.stage,'goal',text);
   assert.equal(a.slots.goal,undefined,text);
   assert.equal(countQuestions(a.reply),1,text);
 }
 const changed=step('My goal is to regain direction after many negative events');
 assert.equal(changed.stage,'challenge');
 assert.match(changed.slots.goal,/regain direction/);
 const distress=step('Currently I am going through lots of negative events in my life');
 assert.match(distress.slots.situation,/negative events/);
 const desired=step('I want clarity','goal',distress.slots);
 assert.equal(desired.stage,'challenge');
 const done=step('Too many setbacks','challenge',desired.slots);
 assert.equal(done.stage,'ready','known current situation must not be asked again');
});
test('Identity, photo reading, and details questions receive an explanation first',()=>{
 for(const text of ['You are therapist or physic','Are you a psychic?',
   'Pls chk my energy','photo scan reading?',
   'So what information would you exactly need?']){
   const a=step(text);
   assert.equal(a.stage,'goal',text);
   assert.deepEqual(a.slots,{},text);
   assert.equal(countQuestions(a.reply),1,text);
 }
 assert.match(step('photo scan reading?').reply,/can't reliably assess health/);
 assert.match(step('You are therapist or physic').reply,/digital assistant/);
});
test('RU and ES ask just one question in the requested language',()=>{
 const ru=step('Хочу понять, куда двигаться дальше','goal',{},'ru');
 const es=step('Quiero comprender mis dificultades','goal',{},'es');
 assert.equal(ru.stage,'challenge');
 assert.equal(es.stage,'challenge');
 assert.equal(countQuestions(ru.reply),1);
 assert.equal(countQuestions(es.reply),1);
 assert.match(ru.reply,/мешает/);
 assert.match(es.reply,/dificultando/);
});
test('Explicit three-part client answer can skip repeated questions',()=>{
 const a=step('Goal: career clarity\nProblem: difficult choices\nCurrently: changing jobs');
 assert.equal(a.stage,'ready');
 assert.match(a.slots.goal,/career/);
 assert.match(a.slots.challenge,/choices/);
 assert.match(a.slots.situation,/changing/);
 assert.equal(countQuestions(a.reply),0);
});
test('Uncertainty and boundaries are respected; neither creates fake facts',()=>{
 const one=step("I don't know");
 assert.equal(one.stage,'goal');
 assert.deepEqual(one.slots,{});
 const two=step("I don't know",'goal',{},'en',[{role:'user',text:"I don't know"}]);
 assert.equal(two.stage,'challenge');
 assert.deepEqual(two.slots,{});
 const paused=step('No more questions','challenge',{goal:'I want clarity'});
 assert.equal(paused.stage,'ready');
 assert.equal(countQuestions(paused.reply),0);
 assert.equal(paused.slots.challenge,undefined);
 for(const risk of ['I want to die','У меня боль в груди','/stop']){
   assert.equal(step(risk),null,risk);
 }
});
test('Corrections received after ready are included in the client-reviewed draft',()=>{
 const slots={goal:'I want clarity',challenge:'I feel stuck',situation:'I am changing work'};
 const followUp=step('One more detail: my family situation is changing','ready',slots);
 assert.equal(followUp.stage,'ready');
 const summary=aliGuidedIntakeSummary({slots:followUp.slots,turns:[
   {role:'user',text:'I want clarity'},
   {role:'user',text:'One more detail: my family situation is changing'},
 ]});
 assert.match(summary,/family situation/);
 assert.equal(countQuestions(followUp.reply),0);
});
test('Existing V3 ciphertext explicitly allowlists stage and bounded factual slots',()=>{
 const ctx=v3Context({turns:[],intakeStage:'challenge',
   intakeSlots:{goal:'x'.repeat(500),challenge:'what is difficult',
     source:'Found your page through Meetup '+'.'.repeat(250),
     diagnosis:'unverified label'},photoFileId:'test-file-id'});
 assert.equal(ctx.intakeStage,'challenge');
 assert.equal(ctx.intakeSlots.goal.length,360);
 assert.equal(ctx.intakeSlots.challenge,'what is difficult');
 assert.equal(ctx.intakeSlots.source.length,180);
 assert.equal(ctx.intakeSlots.diagnosis,undefined);
 assert.equal(ctx.photoFileId,undefined);
 assert.equal(v3Context({turns:[],intakeStage:'secretly_sent'}).intakeStage,undefined);
 assert.equal(v3Context({turns:[],intakeSlots:{goal:123}}).intakeSlots.goal,undefined);
});
test('Old V3 interviews resume from user answers, not a new interview',()=>{
 assert.equal(aliIntakeStageFromTurns([]),'goal');
 assert.equal(aliIntakeStageFromTurns([{role:'user',text:'Hello'}]),'goal');
 assert.equal(aliIntakeStageFromTurns([{role:'user',text:'I want direction'}]),'challenge');
 assert.equal(aliIntakeStageFromTurns([
   {role:'user',text:'I want direction'}, {role:'assistant',text:'What is hard?'},
   {role:'user',text:'I cannot decide'}, {role:'user',text:'Now is a difficult time'},
 ]),'ready');
});
test('No new external calls, consent bypass or implicit CRM handoff',()=>{
 const planner=source('lib/assist/ali-guided-intake.mjs');
 for(const term of [/from 'node:fs'/,/\bfetch\s*\(/,/\baxios\s*\(/,
   /\bingestMessengerEventInTransaction\s*\(/,/\bseal\s*\(/])
   assert.doesNotMatch(planner,term);
 const handler=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 assert.match(handler,/aliGuidedIntakeTurn\(/);
 assert.match(handler,/aliGuidedIntakeSummary\(/);
 assert.match(handler,/prior\.ctx\.conversationKind!=='general'/);
 assert.match(handler,/prior\.ctx\.mode!==SECRETARY_MODES\.PSYCHOLOGIST/);
 assert.match(handler,/if\(!row\.ai_consent_at\|\|!/);
 assert.match(handler,/if\(stop\)/);
 assert.match(handler,/if\(action==='send'\)/);
 assert.match(handler,/ai_review_consent_at=now\(\)/);
 assert.match(handler,/ingestMessengerEventInTransaction/);
 assert.match(handler,/readyForReview\?\[\[V3_LABELS\[locale\]\.finish\]\]/);
});


test('Screenshot regression: what, why photo, and consent never become a request',()=>{
 const history=[{role:'user',text:"I agree, let's talk"},{role:'assistant',text:'What situation would you like to explore?'},
   {role:'user',text:'Что?'},{role:'assistant',text:'Достаточно пары слов. Фото не нужно.'},
   {role:'user',text:'Почему фото'}];
 const consent=step("I agree, let's talk");
 assert.equal(consent.stage,'goal');
 assert.deepEqual(consent.slots,{});
 const confused=step('Что?','goal',{},'ru');
 assert.equal(confused.stage,'goal');
 assert.deepEqual(confused.slots,{});
 assert.match(confused.reply,/понятно|извините/i);
 assert.equal(countQuestions(confused.reply),1);
 const photo=step('Почему фото','goal',{},'ru');
 assert.equal(photo.stage,'goal');
 assert.deepEqual(photo.slots,{});
 assert.match(photo.reply,/Фото не требуется/);
 assert.equal(countQuestions(photo.reply),1);
 assert.equal(aliIntakeStageFromTurns(history,true),'goal');
 assert.equal(aliGuidedIntakeSummary({locale:'ru',turns:history,
   slots:{goal:"I agree, let's talk",challenge:'Почему фото'}}),null);
 assert.equal(aliGuidedIntakeSummary({locale:'ru',slots:{source:'Я из Meetup'}}),null);
 const real=step('Хочу разобраться в отношениях','goal',{},'ru',history);
 assert.equal(real.stage,'challenge');
 assert.match(real.slots.goal,/отношениях/);
});

test('Explanations preserve the pending question across stages and languages',()=>{
 for(const [locale,confusion,photo] of [
   ['ru','Что?','Почему фото'],
   ['en','What?','Why photo'],
   ['es','¿Qué?','¿Por qué la foto?'],
 ]){
   for(const [stage,slots] of [['goal',{}],
     ['challenge',{goal:'I want clarity'}],['situation',{goal:'I want clarity',challenge:'I feel stuck'}]]){
     const a=step(confusion,stage,slots,locale);
     const b=step(photo,stage,slots,locale);
     assert.equal(a.stage,stage);
     assert.equal(b.stage,stage);
     assert.deepEqual(a.slots,slots);
     assert.deepEqual(b.slots,slots);
     assert.equal(countQuestions(a.reply),1);
     assert.equal(countQuestions(b.reply),1);
   }
 }
 const personal=step('Почему я боюсь близости?','goal',{},'ru');
 assert.equal(personal.stage,'challenge');
 assert.match(personal.slots.goal,/боюсь близости/);
 const old=aliGuidedIntakeSummary({locale:'en',turns:[
   {role:'user',text:'What?'},{role:'user',text:'Why photo'},
   {role:'user',text:'I agree, let’s talk'}]});
 assert.equal(old,null);
});
