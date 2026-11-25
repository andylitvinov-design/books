import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {FREE_DIAGNOSTIC_MODE,FREE_DIAGNOSTIC_PHASES,
  aliFreeDiagnosticTurn,aliFreeDiagnosticSummary,
  aliFreeDiagnosticIntro} from '../lib/assist/ali-free-diagnostic.mjs';
import {FREE_DIAGNOSTIC_LIBRARY} from '../lib/assist/ali-free-diagnostic-library.mjs';
import {ALI_FREE_REACTION_COUNTS,planAliFreeReaction} from '../lib/assist/ali-free-diagnostic-reactions.mjs';
import {v3Context,v3FreeDiagnosticStart,v3StartLocale,v3ButtonsFor,
  V3_LABELS,V3_BUTTONS,v3Action,v3CanChat,v3CanStart} from '../lib/crm/telegram-ai-diagnostic-v3.mjs';
import {telegramInlineButtonForText,telegramInlineCallbackSelection}
  from '../lib/crm/telegram-inline-buttons.mjs';
import {telegramExploreDetailButtons,parseTelegramHomeCallback}
  from '../lib/crm/telegram-companion-menu.mjs';
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
   const welcome=aliFreeDiagnosticIntro(locale);
   assert.equal(welcome,FREE_DIAGNOSTIC_LIBRARY[locale].intro,
     'Telegram welcome must match the provider-validated canonical copy');
   assert.match(welcome,/\bAli\b/u);
   assert.match(welcome,locale==='ru'?/личных вопросов.*согласны/iu:
     locale==='es'?/preguntas personales/iu:/personal questions/iu);
   assert.doesNotMatch(welcome,/\bWave\b/u);
   assert.ok(welcome.length<155,locale+' first screen must be warm and brief');
   assert.doesNotMatch(welcome,/\/stop|not a medical|diagnos|OpenRouter|medical records|no envíes|документы|не диагноз/i);
   assert.ok(FREE_DIAGNOSTIC_LIBRARY[locale].questions.goal.length>=3);
   assert.ok(FREE_DIAGNOSTIC_LIBRARY[locale].questions.support.length>=3);
 }
 assert.equal(v3FreeDiagnosticStart('/start hhsecretary_ru'),null);
 assert.equal(v3FreeDiagnosticStart('/start hhpsych_en'),null);
 assert.equal(v3FreeDiagnosticStart('/start hhreview_en?client_private=1'),null);
 assert.equal(v3FreeDiagnosticStart('I need a diagnostic'),null);
});
test('client-facing identity and booking replies never use internal Wave naming',()=>{
 for(const [locale,message] of [['ru','Ты бот?'],['en','Are you a bot?'],['es','¿Eres un bot?']]){
  const result=aliFreeDiagnosticTurn({message,locale,stage:'goal'});
  assert.match(result.reply,/\bAli\b/u,locale);
  assert.doesNotMatch(result.reply,/\bWave\b/u,locale);
 }
 for(const [locale,message] of [['ru','Как записаться?'],['en','Can I book a session?'],['es','Quiero reservar una sesión']]){
  const result=aliFreeDiagnosticTurn({message,locale,stage:'goal'});
  assert.doesNotMatch(result.reply,/\bWave\b/u,locale);
 }
});

test('three gentle questions lead to review without an interrogation',()=>{
 let stage='goal',slots={},turns=[];
 const answers=['I want a clear path in my career',
   'I struggle with making decisions',
   'Currently I am deciding between two offers'];
 const progress=['challenge','situation','ready'];
 for(let i=0;i<answers.length;i++){
   const p=turn(answers[i],{stage,slots,turns});
   assert.equal(p.stage,progress[i]);
   assert.equal(questions(p.reply),i===2?0:1);
   assert.ok(p.reply.length<320,'each reply should fit an easy Telegram screen');
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
test('real first-time client can answer the numbered sample fields in one turn',()=>{
 const p=turn('1. My goal/desire is to understand my direction\n'+
   '2. My problem is uncertainty\n'+
   '3. Currently: several negative events have occurred');
 assert.equal(p.slots.goal,'to understand my direction');
 assert.equal(p.slots.challenge,'uncertainty');
 assert.match(p.slots.situation,/negative events/);
 assert.equal(p.stage,'ready','the third required situation fact completes the short interview');
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
 assert.equal(third.stage,'ready','known situation should not be asked again');
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
   assert.deepEqual(buttons,[[V3_LABELS[locale].skip,V3_LABELS[locale].finish],[V3_LABELS[locale].book]]);
   assert.deepEqual(v3ButtonsFor(locale,'free_interview',0),[[V3_LABELS[locale].skip,V3_LABELS[locale].book]]);
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
test('free review has one photo-before-text welcome and an explicit booking choice',()=>{
 for(const locale of ['ru','en','es']){
   const welcome=v3ButtonsFor(locale,'free_consent');
   assert.deepEqual(welcome,[[V3_LABELS[locale].agree,V3_LABELS[locale].decline],[V3_LABELS[locale].book]]);
   assert.deepEqual(v3ButtonsFor(locale,'free_ready'),[[V3_LABELS[locale].finish,V3_LABELS[locale].book]]);
   const selected=telegramInlineButtonForText(V3_LABELS[locale].book,locale);
   assert.equal(telegramInlineCallbackSelection(selected.callback_data).inlineAction,'v3:book');
   assert.equal(v3Action({rawText:V3_LABELS[locale].book}),'book');
   assert.match(FREE_DIAGNOSTIC_LIBRARY[locale].booking,/€50/);
 }
 const service=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 const webhook=source('app/api/app/crm/messenger/webhook/[provider]/route.js');
 const sender=source('lib/crm/messenger-provider.js');
 assert.match(service,/if\(freeStart\)return \{\.\.\.greeting,freeWelcomePhoto:true\}/);
 assert.match(service,/!activeServiceConsent&&!activeFreeConsent/);
 assert.match(service,/if\(action==='book'&&\['consent','interview','review_confirm'\]/);
 assert.doesNotMatch(service,/\+'\/services\/free-consultation'/);
 assert.doesNotMatch(service,/services\/free-consultation/);
 assert.match(webhook,/freeWelcomePhoto:aiIntake\.freeWelcomePhoto===true/);
 assert.match(sender,/TELEGRAM_FREE_REVIEW_WELCOME_PHOTO/);
 assert.match(sender,/andy-about\.png/);
 assert.match(sender,/text!==freeDiagnosticCopy\(lang\)\.intro/);
 assert.match(sender,/if\(freeWelcomePhoto\)\{/);
 assert.ok(sender.indexOf("await readProvider(endpoint+'/sendPhoto'") <
   sender.indexOf("const method=serviceWelcome?"),
   'photo must be sent before first text, not as a giant caption');
 assert.doesNotMatch(sender,/text\.length>900\|\|!text\.includes\('OpenRouter'\)/);
});

test('a natural booking question directs to the Telegram Book button, not an external website',()=>{
 const reply=turn('Can I book a session?',{stage:'challenge',slots:{goal:'Clarity'}});
 assert.equal(reply.stage,'challenge','booking must not fabricate an answered phase');
 assert.match(reply.reply,/Book with Andrey/);
 assert.doesNotMatch(reply.reply,/https?:\/\//);
 assert.equal(questions(reply.reply),0,'a booking request should not trigger another interrogation question');
});
test('existing compact Telegram menu offers Free Diagnostic as second-level choice',()=>{
 for(const locale of ['ru','en']){
   const menu=telegramExploreDetailButtons(locale,'consultation');
   assert.equal(menu.inline_keyboard.length,3);
   assert.equal(menu.inline_keyboard[0][0].callback_data,'hhhome:'+locale+':review');
   assert.deepEqual(parseTelegramHomeCallback('hhhome:'+locale+':review'),
     {locale,action:'review'});
 }
 const service=source('lib/crm/telegram-companion-service.js');
 assert.match(service,/\['ai_on','daily_on','home','review'/);
 assert.match(service,/hh\(\?:review\|diagnostic\)/);
 const route=source('app/api/app/crm/messenger/webhook/[provider]/route.js');
 assert.match(route,/companion\.reviewRequested/);
 assert.match(route,/\/start hhreview_/);
});
test('pre-consent danger is answered without storing or advancing interview',()=>{
 const handler=source('lib/crm/telegram-ai-diagnostic-v3-service.js');
 const index=handler.indexOf("if(row.stage==='consent')");
 const safety=handler.indexOf("const emergency=v3ChatPreConsentSafetyReply(raw,lang)",index);
 const agree=handler.indexOf("const agrees=general?action",index);
 assert.ok(safety>index&&safety<agree);
 assert.match(handler,/if\(emergency\)\{/);
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
 assert.match(handler,/const purposeReady=general\|\|ctx\.mode===FREE_DIAGNOSTIC_MODE\|\|/);
 assert.match(handler,/ctx\.conversationKind==='general'\|\|ctx\.mode===FREE_DIAGNOSTIC_MODE/);
 assert.match(handler,/prior\.ctx\.conversationKind==='general'\|\|prior\.ctx\.mode===FREE_DIAGNOSTIC_MODE/);
 assert.match(handler,/wavePsychologistNativeTurn/);
 assert.doesNotMatch(planner,/\bfetch\s*\(|\baxios\s*\(|\bingestMessengerEventInTransaction\s*\(/);
 const local={VERCEL_ENV:'production',HH_CRM_TG_AI_V3_SCHEMA_READY:'true',
   HH_CRM_TG_AI_V3_ENABLED:'true',HH_CRM_TG_AI_V3_FREE_TIER_CONFIRMED:'true',
   HH_COUNCIL_OPENROUTER_API_KEY:''};
 assert.equal(v3CanChat(local),true);
 assert.equal(v3CanStart(local),false);
});


test('Ali free diagnostic covers 43 reaction intents without consuming the current stage',()=>{
 assert.equal(ALI_FREE_REACTION_COUNTS.faq,24);
 assert.equal(ALI_FREE_REACTION_COUNTS.comment,19);
 const samples=[
  ['Is this free?','en','free_price'],
  ['What will I get after?','en','next_step'],
  ['Are you a psychic?','en','bot_identity'],
  ['Check my energy','en','photo_energy'],
  ['What information would you exactly need?','en','information_needed'],
  ['How long does the review take?','en','duration'],
  ['What about privacy?','en','privacy'],
  ['Why are you asking?','en','why_question'],
  ['Can I speak to a person?','en','human_handoff'],
  ['When will Andrey reply?','en','response_time'],
  ['How accurate is this?','en','accuracy_guarantee'],
  ['Can you diagnose me?','en','medical_diagnosis'],
  ['Should I draw something?','en','drawing'],
  ['Do I need a form?','en','form'],
  ['Can I book a session?','en','booking'],
  ['Do you speak Russian?','en','language'],
  ["What's next?",'en','next_step'],
  ['Can I stop at any time?','en','stop_anytime'],
  ['Can I skip this question?','en','cannot_answer'],
  ['Do you have reviews?','en','source_testimonials'],
  ['Can I do this online?','en','online_format'],
  ['Give me a solution','en','advice_now'],
  ['I feel ashamed','en','embarrassed'],
  ["I'm scared",'en','fear'],
  ["I'm angry",'en','anger'],
  ["I'm sad",'en','sadness'],
  ['I feel overwhelmed','en','overwhelm'],
  ['I am hopeful','en','hopeful'],
  ['I am failing at life','en','hopelessness'],
  ["I don't trust this",'en','uncertain_trust'],
  ['Too many questions','en','robotic'],
  ["You don't understand",'en','misunderstood'],
  ['I do not understand this question','en','confused_question'],
  ['No more sales please','en','no_sales'],
  ["I don't want to share",'en','no_share'],
  ['I need more time','en','need_time'],
  ['No','en','short_refusal'],
  ['Thank you','en','gratitude'],
  ['Okay','en','short_ack'],
  ['This is not helping me','en','uncertain_help'],
  ['Мне страшно','ru','fear'],
  ['Мне стыдно','ru','embarrassed'],
  ['Я не верю','ru','uncertain_trust'],
  ['Это конфиденциально?','ru','privacy'],
  ['Можно без анкеты?','ru','form'],
  ['Можно прекратить разговор?','ru','stop_anytime'],
  ['Quiero saber el precio','es','free_price'],
  ['Tengo miedo','es','fear'],
  ['No creo que esto ayude','es','uncertain_help'],
 ];
 for(const [message,locale,id] of samples){
  const planned=planAliFreeReaction({message,locale});
  assert.equal(planned?.id,id,message);
  const result=turn(message,{locale,stage:'challenge',slots:{goal:'I want clarity'}});
  assert.equal(result?.kind,'reaction',message);
  assert.equal(result?.reactionId,id,message);
  assert.equal(result?.stage,'challenge',message);
  assert.deepEqual(result?.slots,{goal:'I want clarity'},message);
  assert.ok(result.reply.length<950,message);
  assert.ok(questions(result.reply)<=1,message);
 }
});
test('reactions do not invent goals or chase a client who requests boundaries',()=>{
 for(const text of ["I don't want to share","Don't sell me anything",
  'I need more time','No','No creo que esto ayude']){
  const result=turn(text,{stage:'goal',locale:'en'});
  assert.equal(result.stage,'goal',text);
  assert.equal(result.slots.goal,undefined,text);
  assert.equal(questions(result.reply),0,text);
 }
 for(const text of ["I'm scared","I'm angry",'Мне стыдно','Thank you']){
  const result=turn(text,{stage:'goal',locale:/[а-яё]/iu.test(text)?'ru':'en'});
  assert.equal(result.stage,'goal',text);
  assert.equal(result.slots.goal,undefined,text);
 }
 const real=turn('I want a different career, and I feel nervous');
 assert.equal(real.kind,'progress','a real stated goal must not be lost to the emotion classifier');
 assert.equal(real.stage,'challenge');
 assert.match(real.slots.goal,/different career/);
 const correction=turn("You don't understand",{stage:'challenge',slots:{goal:'A better job'}});
 assert.equal(questions(correction.reply),1,'only the correction question, not a second stage question');
 assert.match(correction.reply,/correct|miss/i);
});
test('recent replies rotate among verified variants and preserve user context',()=>{
 const first=turn('Is this free?',{stage:'challenge',slots:{goal:'Career clarity'}});
 const second=turn('Is this free?',{stage:'challenge',slots:first.slots,
   turns:[{role:'assistant',text:first.reply}]});
 assert.notEqual(first.reply,second.reply);
 const third=turn('Is this free?',{stage:'challenge',slots:second.slots,
   turns:[{role:'assistant',text:first.reply},{role:'assistant',text:second.reply}]});
 assert.notEqual(second.reply,third.reply,'never repeat the immediately preceding template');
 assert.equal(questions(third.reply),1);
 assert.equal(third.stage,'challenge');
 const same=planAliFreeReaction({message:'Я не верю',locale:'ru'});
 assert.equal(same.kind,'comment');
 assert.equal(same.modelUsed,false);
 for(const locale of ['ru','en','es']){
  const example={ru:'Это конфиденциально?',en:'What about privacy?',es:'¿Quién verá mis datos?'}[locale];
  const reply=planAliFreeReaction({message:example,locale});
  assert.ok(reply,locale);
  assert.equal(reply.stageConsumed,false);
  assert.ok(reply.reply.length>20);
 }
 const reactionsSource=source('lib/assist/ali-free-diagnostic-reactions.mjs');
 assert.doesNotMatch(reactionsSource,/\bfetch\s*\(|\baxios\s*\(|\bingestMessengerEventInTransaction\s*\(/);
 assert.doesNotMatch(reactionsSource,/api_key|token_secret/i);
});
