import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FREE_DIAGNOSTIC_MODE,FREE_DIAGNOSTIC_PHASES,
  aliFreeDiagnosticTurn,aliFreeDiagnosticSummary,
  aliFreeDiagnosticIntro} from '../lib/assist/ali-free-diagnostic.mjs';
import {FREE_DIAGNOSTIC_LIBRARY} from '../lib/assist/ali-free-diagnostic-library.mjs';
import {v3Context,v3FreeDiagnosticStart,v3StartLocale,v3ButtonsFor,
  V3_LABELS,V3_BUTTONS,v3Action,v3CanChat,v3CanStart} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {telegramInlineButtonForText,telegramInlineCallbackSelection}
  from '../lib/crm/telegram-inline-buttons.mjs';
const source=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');
const turn=(message,opts={})=>aliFreeDiagnosticTurn({message,locale:'en',stage:'goal',...opts});
const questions=s=>(s.match(/[?？]/gu)||[]).length;

test('a separate free mode exists on the existing RU/EN/ES review link',()=>{
 assert.equal(FREE_DIAGNOSTIC_MODE,'free_diagnostic');
 assert.deepEqual(FREE_DIAGNOSTIC_PHASES,['goal','challenge','situation','impact','attempts','support','ready']);
 for(const locale of ['ru','en','es']){
   assert.equal(v3FreeDiagnosticStart('/start hhreview_'+locale).mode,FREE_DIAGNOSTIC_MODE);
   assert.equal(v3FreeDiagnosticStart('/start hhdiagnostic_'+locale).locale,locale);
   assert.equal(v3StartLocale('/start hhdiagnostic_'+locale),locale);
   assert.match(aliFreeDiagnosticIntro(locale),/\/stop/);
   assert.ok(FREE_DIAGNOSTIC_LIBRARY[locale].questions.goal.length>=3);
   assert.ok(FREE_DIAGNOSTIC_LIBRARY[locale].questions.support.length>=3);
 }
 assert.equal(v3FreeDiagnosticStart('/start hhsecretary_ru'),null);
 assert.equal(v3FreeDiagnosticStart('/start hhpsych_en'),null);
 assert.equal(v3FreeDiagnosticStart('/start hhreview_en?client_private=1'),null);
 assert.equal(v3FreeDiagnosticStart('I need a diagnostic'),null);
});
test('full goal → obstacle → situation → effects → attempts → support → review',()=>{
 let stage='goal',slots={},turns=[];
 const answers=['I want a clear path in my career','I struggle with making decisions',
   'Recently I have changed jobs','My confidence at work is affected',
   'I tried talking with my manager','My friend sometimes helps'];
 const progress=['challenge','situation','impact','attempts','support','ready'];
 for(let i=0;i<answers.length;i++){
   const p=turn(answers[i],{stage,slots,turns});
   assert.equal(p.stage,progress[i]);
   assert.equal(questions(p.reply),i===5?0:1);
   assert.ok(p.reply.length<950);
   slots=p.slots;stage=p.stage;
   turns.push({role:'user',text:answers[i]},{role:'assistant',text:p.reply});
 }
 const summary=aliFreeDiagnosticSummary({locale:'en',slots});
 for(const fact of answers)assert.ok(summary.includes(fact),fact);
 assert.doesNotMatch(summary,/diagnosed|treatment required|guaranteed/i);
 const more=turn('One more thing: I am starting a new job',{stage,slots,turns});
 assert.equal(more.stage,'ready');
 assert.match(more.slots.notes,/new job/);
});
test('completed answer with explicit labels skips the rest immediately',()=>{
 const message=['Goal: I want to make a career decision',
 'Problem: I lack clarity','Currently: I have two job offers',
 'Impact: I feel stuck in my day','Tried: I spoke with my family',
 'Support: My close friend'].join('\n');
 const p=turn(message);
 assert.equal(p.stage,'ready');
 assert.equal(questions(p.reply),0);
 assert.equal(Object.keys(p.slots).length,6);
 const next=aliFreeDiagnosticSummary({slots:p.slots});
 assert.match(next,/two job offers/);
});
test('negative life events are kept as client situation, not a fictional goal',()=>{
 const first=turn('Currently I am going through lots of negative events in my life');
 assert.equal(first.stage,'goal');
 assert.equal(first.slots.goal,undefined);
 assert.match(first.slots.situation,/negative events/);
 assert.equal(questions(first.reply),1);
 const second=turn('I want to know where to go next',{stage:first.stage,slots:first.slots});
 assert.equal(second.stage,'challenge');
 const third=turn('Too many decisions',{stage:second.stage,slots:second.slots});
 assert.equal(third.stage,'impact','known situation should not be asked again');
});
test('greetings, first-time uncertainty, referral and vague wording do not fill facts',()=>{
 for(const message of ['Hi','My happening life','I need help','Help please lol',
   'Sorry it is my first time']){
   const p=turn(message);
   assert.equal(p.stage,'goal',message);
   assert.equal(p.slots.goal,undefined,message);
   assert.equal(questions(p.reply),1,message);
 }
 const ref=turn('I got this link from meet up app');
 assert.equal(ref.stage,'goal');
 assert.equal(ref.slots.goal,undefined);
 assert.match(ref.slots.source,/meet up/);
 assert.equal(questions(ref.reply),1);
});
test('unsure is gently rephrased once, then skipped without inventing an answer',()=>{
 const one=turn("I don't know");
 assert.equal(one.stage,'goal');assert.equal(one.retryStage,'goal');
 assert.equal(questions(one.reply),1);
 const two=turn("I don't know",{stage:one.stage,slots:one.slots,
   retryStage:one.retryStage});
 assert.equal(two.stage,'challenge');assert.equal(two.retryStage,null);
 assert.deepEqual(two.slots,{});
 const three=turn("I don't know",{stage:two.stage,slots:two.slots,
   retryStage:two.retryStage});
 assert.equal(three.stage,'challenge','retry flag resets after skip');
});
test('one-question interrupt/FAQ does not advance or overwrite facts',()=>{
 const list=['photo scan reading?','check my energy','Are you a psychic?',
 'What information would you need?','Is this free?','How long?',
 'What about privacy?','I want to talk to a person'];
 for(const message of list){
   const p=turn(message);
   assert.equal(p.stage,'goal',message);
   assert.deepEqual(p.slots,{},message);
   assert.equal(questions(p.reply),1,message);
 }
 assert.match(turn('photo scan reading?').reply,/cannot reliably|cannot|photo/i);
 assert.doesNotMatch(turn('check my energy').reply,/I can read your energy|I checked/);
 const related=turn('Is this free?',{stage:'impact',slots:{goal:'Help with work'}});
 assert.equal(related.stage,'impact');
 assert.equal(related.slots.goal,'Help with work');
});
test('boundary, explicit stop and severe symptoms do not create a lead',()=>{
 const hold=turn('No more questions',{stage:'impact',slots:{goal:'Clarity'}});
 assert.equal(hold.stage,'ready');assert.equal(questions(hold.reply),0);
 const noAdvice=turn('No advice',{stage:'challenge',slots:{goal:'Clarity'}});
 assert.equal(noAdvice.stage,'challenge');assert.equal(questions(noAdvice.reply),1);
 for(const danger of ['I want to die','suicide','Chest pain','/stop','У меня боль в груди']){
   assert.equal(turn(danger),null,danger);
 }
 const empty=aliFreeDiagnosticSummary({slots:{source:'Meetup'}});
 assert.equal(empty,null,'referral by itself must not be presented as a diagnosis');
});
test('skip button belongs only to this consented V3 free mode',()=>{
 for(const locale of ['ru','en','es']){
   const buttons=v3ButtonsFor(locale,'free_interview',1);
   assert.deepEqual(buttons,[[V3_LABELS[locale].skip,V3_LABELS[locale].finish]]);
   assert.deepEqual(v3ButtonsFor(locale,'free_interview',0),[[V3_LABELS[locale].skip]]);
   const inline=telegramInlineButtonForText(V3_LABELS[locale].skip,locale);
   assert.equal(inline.callback_data,'hhv3:'+locale+':skip');
   assert.equal(telegramInlineCallbackSelection(inline.callback_data).inlineAction,'v3:skip');
 }
 assert.equal(v3Action({inlineAction:'v3:skip'}),'skip');
 assert.equal(v3Action({rawText:'Пропустить вопрос'}),'skip');
 assert.equal(new Set(V3_BUTTONS).size,V3_BUTTONS.length);
 const skipped=turn('',{stage:'impact',slots:{goal:'Clarity'},action:'skip'});
 assert.equal(skipped.stage,'attempts');
 assert.equal(skipped.slots.impact,undefined);
});
test('encrypted V3 allowlist retains only this mode and verified user facts',()=>{
 const c=v3Context({mode:FREE_DIAGNOSTIC_MODE,intakeStage:'impact',
   intakeSlots:{goal:'Direction',impact:'x'.repeat(600),source:'Meetup',secret:'ignore'},
   freeRetryStage:'impact',turns:[]});
 assert.equal(c.mode,FREE_DIAGNOSTIC_MODE);
 assert.equal(c.intakeStage,'impact');
 assert.equal(c.freeRetryStage,'impact');
 assert.equal(c.intakeSlots.impact.length,360);
 assert.equal(c.intakeSlots.secret,undefined);
 const bad=v3Context({mode:'clinical_psychologist',intakeStage:'clinical',turns:[]});
 assert.equal(bad.mode,undefined);
 assert.equal(bad.intakeStage,undefined);
});
test('production hook is consent-first, never uses external LLM or silent CRM handoff',()=>{
 const handler=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 const planner=source('lib/assist/ali-free-diagnostic.mjs');
 assert.match(handler,/freeStart=v3FreeDiagnosticStart\(raw\)/);
 assert.match(handler,/ctx\.mode===FREE_DIAGNOSTIC_MODE/);
 assert.match(handler,/aliFreeDiagnosticTurn\(/);
 assert.match(handler,/aliFreeDiagnosticSummary\(/);
 assert.match(handler,/if\(action==='send'\)/);
 assert.match(handler,/ai_review_consent_at=now\(\)/);
 assert.match(handler,/return promptResult/);
 assert.match(handler,/ctx\.mode===FREE_DIAGNOSTIC_MODE\?chatAllowed:allowed/);
 assert.doesNotMatch(planner,/\bfetch\s*\(|\baxios\s*\(|\bingestMessengerEventInTransaction\s*\(/);
 const local={VERCEL_ENV:'production',HH_CRM_TG_AI_V3_SCHEMA_READY:'true',
   HH_CRM_TG_AI_V3_ENABLED:'true',HH_CRM_TG_AI_V3_FREE_TIER_CONFIRMED:'true',
   HH_COUNCIL_OPENROUTER_API_KEY:''};
 assert.equal(v3CanChat(local),true);
 assert.equal(v3CanStart(local),false);
});
