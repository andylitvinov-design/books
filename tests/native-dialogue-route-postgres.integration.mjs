import test,{after,before} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import pg from 'pg';
import {AppError,onlyKeys} from '../lib/assessments/contracts.js';
import {ruleConversationReply} from '../lib/holistic-support/rule-conversation.mjs';
import {nativeSecretaryTurn} from '../lib/holistic-support/native-secretary.mjs';
import {progressConversationTurn,progressDialogueReply} from '../lib/holistic-support/dialogue-progression.mjs';
import {resolveComplaintTurn} from '../lib/holistic-support/complaint-mind.mjs';
import {buildHolisticGuidedTurn} from '../lib/holistic-support/holistic-guide-adapter.mjs';
import {AXIS_REFS} from '../lib/holistic-support/axis-offer-matcher.mjs';
import {prepareNaturalDialogue,finishNaturalDialogue} from '../lib/holistic-support/natural-dialogue.mjs';
import {nativeDialogueEventFromUtterance,understandConversationTurn} from '../lib/holistic-support/conversation-intelligence.mjs';
import {detectConversationLocale} from '../lib/holistic-support/conversation-locale.mjs';
import {resolveConversationFocus} from '../lib/holistic-support/conversation-context.mjs';
import {interpretSupportUtterance as realInterpretSupportUtterance,explainUserQuestion as realExplainUserQuestion} from '../lib/holistic-support/guide-dialogue.mjs';
import {evaluateSyntheticJourneys} from '../lib/holistic-support/native-growth-journeys.mjs';
import {planJudgmentTurn} from '../lib/holistic-support/judgment-mind.mjs';
import {signJudgmentChoice,verifyJudgmentChoice} from '../lib/holistic-support/judgment-token.mjs';
import {consultServiceQuestion,resolveConsultantSuggestion} from '../lib/assist/consultant-mind.mjs';
import {createNativeDialogueSession,readNativeDialogueSession,advanceNativeDialogueMessage} from '../lib/holistic-support/native-dialogue-session-store.js';
import {closeDatabase} from '../lib/app/database.js';
const raw=process.env.HH_NATIVE_TEST_DATABASE_URL;
if(!raw)throw Error('Set HH_NATIVE_TEST_DATABASE_URL to the isolated local test cluster');
const url=new URL(raw);
if(url.hostname!=='localhost'||!/^\/tmp\/hh4367-pg-[A-Za-z0-9]+$/.test(url.searchParams.get('host')||'')||url.port!=='55488')throw Error('Refusing non-isolated database');
const config={databaseUrl:raw,test:true,encryptionKey:Buffer.alloc(32,7),encryptionKeyId:'native-test'};
const actor=(id,session_id)=>({id,claims:{sub:id,session_id,exp:Math.floor(Date.now()/1000)+3600}});
const a=actor('11111111-1111-4111-8111-111111111111','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb');
const b=actor('22222222-2222-4222-8222-222222222222','cccccccc-cccc-4ccc-8ccc-cccccccccccc');
const admin=new pg.Client({connectionString:raw});
before(async()=>{await admin.connect();});
after(async()=>{await closeDatabase();await admin.end();});
const base=(message,nativeSession,locale='en')=>({message,locale,mode:'rules',ownedInferenceConsent:false,history:[],nativeSession});
const newTurn=(id=null,revision=0)=>({id,revision,turnId:randomUUID()});
async function execute(body,owner=a,{enabled=true,realLogic=false,suggestions,axisCatalog=[],serviceCatalog=[{id:'first',title:'First verified service'},{id:'second',title:'Second verified service'}]}={}){
 const source=readFileSync(new URL('../app/api/holistic-agent/turn/route.js',import.meta.url),'utf8');
 const context=vm.createContext({process:{env:enabled?{HH_NATIVE_DIALOGUE_STATE_ENABLED:'true'}:{}},AbortSignal,console});
 const denied=()=>{throw Error('UNEXPECTED_DEPENDENCY');};
 const deps={
  NextResponse:{json:(data,options={})=>({body:data,status:options.status||200})},AppError,onlyKeys,
  getAppConfig:()=>config,requireSameOrigin:()=>{},createRequestAuth:()=>({verified:async()=>owner,apply:x=>x}),
  createAppRepository:()=>({ensureAccount:async()=>{}}),consumeRate:async()=>{},PRIVATE_HEADERS:{},readBody:async()=>body,
  safeError:e=>({code:e.code||e.message,status:e.status||500}),detectConversationLocale,interpretSupportUtterance:realLogic?realInterpretSupportUtterance:()=>({kind:'none'}),
  ruleConversationReply,nativeSecretaryTurn,resolveComplaintTurn,progressConversationTurn,progressDialogueReply,nativeDialogueEventFromUtterance,understandConversationTurn,planJudgmentTurn,signJudgmentChoice,verifyJudgmentChoice,
  createNativeDialogueSession,readNativeDialogueSession,advanceNativeDialogueMessage,
  coreServiceOffers:()=>serviceCatalog,
  resolveWisdomRequest:async()=>null,consultServiceQuestion,resolveConsultantSuggestion,resolveConversationFocus,englishGuidedMeditations:[],freeMeditationVideos:()=>[],
  reviewedMeditationCandidates:{videos:[]},publishedAxisOffers:()=>axisCatalog,AXIS_REFS,
  buildHolisticGuidedTurn:input=>realLogic||input.safety.status!=='clear'?buildHolisticGuidedTurn(input):({status:'clarify',message:'Here are options.',suggestions:suggestions||[
    {id:'service:first',kind:'service',href:'/en/services/first',title:'First verified service'},
    {id:'service:second',kind:'service',href:'/en/services/second',title:'Second verified service'}]}),
  explainUserQuestion:realLogic?realExplainUserQuestion:()=>null,
  prepareNaturalDialogue:input=>realLogic||input.decision.status==='safety_handoff'?prepareNaturalDialogue(input):({}),
  finishNaturalDialogue:async envelope=>envelope.version?finishNaturalDialogue(envelope):({text:'Here are options.',provider:'rules',modelUsed:false}),
 };
 const imports=[...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["'];/g)];
 const paths=new Map(imports.map(x=>[x[2],x[1].split(',').map(v=>v.trim()).filter(Boolean)]));
 for(const m of source.matchAll(/import\s+\w+\s+from\s*["']([^"']+)["'];/g))paths.set(m[1],['default']);
 const routeModule=new vm.SourceTextModule(source,{context});
 await routeModule.link(async spec=>{
  const names=paths.get(spec);if(!names)throw Error('UNEXPECTED_IMPORT');
  return new vm.SyntheticModule(names,function(){for(const name of names)this.setExport(name,name==='default'?deps.reviewedMeditationCandidates:(deps[name]??denied));},{context});
 });
 await routeModule.evaluate();return routeModule.namespace.POST({headers:{get:()=>null}});
}

test('production complaints remain available with and without a stateful session',async()=>{
 for(const [locale,message] of [['ru','Вы меня не понимаете'],['en','You missed my question']]){
  const plain=await execute(base(message,undefined,locale),a,{enabled:false,realLogic:true});
  assert.equal(plain.status,200);assert.equal(plain.body.source,'complaint-mind');
  const stateful=await execute(base(message,newTurn(),locale),a,{realLogic:true});
  assert.equal(stateful.status,200);assert.equal(stateful.body.source,'complaint-mind');
  assert.equal(stateful.body.nativeSession.revision,1);
  assert.equal(stateful.body.modelUsed,false);assert.deepEqual(Array.from(stateful.body.suggestions),[]);
 }
});
test('a topic switch prevents later pricing from reviving a previous service',async()=>{
 for(const [locale,old,switched,question] of [
  ['ru','Сколько стоит сеанс Рейки?','Давай сменим тему и поговорим об отношениях.','А цена?'],
  ['en','How much does a Reiki session cost?',"Let's change the subject and talk about relationships.",'How much?'],
 ]){
  const first=await execute(base(old,newTurn(),locale),a,{realLogic:true});
  assert.equal(first.status,200);const id=first.body.nativeSession.id;
  const second=await execute({...base(switched,newTurn(id,1),locale),history:[{role:'user',text:old},{role:'assistant',text:first.body.reply}]},a,{realLogic:true});
  assert.equal(second.status,200);
  const third=await execute({...base(question,newTurn(id,2),locale),history:[{role:'user',text:old},
   {role:'assistant',text:first.body.reply},{role:'user',text:switched},{role:'assistant',text:second.body.reply}]},a,{realLogic:true});
  assert.equal(third.status,200);assert.doesNotMatch(third.body.reply,/reiki|рейки/iu);
  assert.ok(!third.body.suggestions.some(x=>x.id==='service:reiki'));
 }
});

test('route does not present an unrelated price as a site service price',async()=>{
 for(const [locale,message,prior] of [
  ['ru','Сколько стоит новый велосипед?','Хочу консультацию'],
  ['en','How much does a new bicycle cost?','I want a consultation'],
 ]){
  const result=await execute(base(message,undefined,locale),a,{enabled:false,realLogic:true});
  assert.equal(result.status,200);
  assert.doesNotMatch(result.body.reply,/^(?:цена зависит от конкретной услуги|the price depends on the specific service)/iu);
  assert.match(result.body.reply,locale==='ru'?/не могу проверить актуальную цену/iu:/cannot check the current price/iu);
  const created=await createNativeDialogueSession(config,a),id=created.sessionId;
  await advanceNativeDialogueMessage(config,a,id,{message:prior,locale,turnId:randomUUID(),expectedRevision:0});
  const followup=await execute(base(message,newTurn(id,1),locale),a,{realLogic:true});
  assert.equal(followup.status,200);
  assert.match(followup.body.reply,locale==='ru'?/не могу проверить актуальную цену/iu:/cannot check the current price/iu);
 }
});

test('route commits a visible choice atomically in isolated PostgreSQL',async()=>{
 const first=await execute(base('About relationships',newTurn()));
 assert.equal(first.status,200);assert.equal(first.body.suggestions.length,2);
 const {id,revision}=first.body.nativeSession;
 const picked=await execute(base('The second option',newTurn(id,revision)));
 assert.equal(picked.status,200);assert.equal(picked.body.selectedChoiceId,'service:second');
 assert.equal(picked.body.nativeSession.revision,revision+1);
 const state=await readNativeDialogueSession(config,a,id,revision+1);
 assert.deepEqual(state.lastOfferedChoices,[]);
});
test('a real signed Judgment choice retains server state and rejects another actor',async()=>{
 for(const [locale,opening,problem] of [
  ['en','I want a consultation','I keep blaming myself'],
  ['ru','Хочу консультацию','Ничего не успеваю'],
 ]){
 const created=await createNativeDialogueSession(config,a),id=created.sessionId;
 await advanceNativeDialogueMessage(config,a,id,{message:opening,locale,turnId:randomUUID(),expectedRevision:0});
 const first=await execute(base(problem,newTurn(id,1),locale));
 assert.equal(first.status,200);assert.equal(first.body.judgment?.needsChoice,true);
 assert.equal(first.body.nativeSession.revision,2);assert.ok(first.body.judgment.token);
 const choice=first.body.judgment.choices.find(item=>item.id==='a');assert.ok(choice);
 const input={...base(choice.label,newTurn(id,2),locale),history:[{role:'assistant',text:first.body.reply}],
  judgmentContext:first.body.judgment.token,judgmentChoice:'a'};
 const foreign=await execute(input,b);
 assert.equal(foreign.status,400);assert.equal(foreign.body.error,'INVALID_JUDGMENT_CONTEXT');
 const same=await readNativeDialogueSession(config,a,id,2);assert.equal(same.revision,2);
 const continued=await execute(input);
 assert.equal(continued.status,200);assert.equal(continued.body.source,'judgment-rules');
 assert.equal(continued.body.nativeSession.revision,3);
 const state=await readNativeDialogueSession(config,a,id,3);assert.equal(state.goal?.value,'consultation');
 }
});
test('a signed Judgment choice cannot be replayed after the goal is corrected',async()=>{
 const first=await execute(base('I keep blaming myself',newTurn(),'en'));
 assert.equal(first.status,200);assert.ok(first.body.judgment?.token);
 const {id,revision}=first.body.nativeSession,token=first.body.judgment.token;
 const history=[{role:'assistant',text:first.body.reply}];
 const corrected=await execute({...base('No, actually I want to speak more calmly.',newTurn(id,revision),'en'),
  history,judgmentContext:token});
 assert.equal(corrected.status,200);assert.equal(corrected.body.judgment?.token,null);
 const state=await readNativeDialogueSession(config,a,id,revision+1);
 assert.equal(state.pendingJudgmentTurnId,null);
 const priorChoice=first.body.judgment.choices.find(item=>item.id==='a');
 const replay=await execute({...base(priorChoice.label,newTurn(id,revision+1),'en'),
  history,judgmentContext:token,judgmentChoice:'a'});
 assert.equal(replay.status,400);assert.equal(replay.body.error,'INVALID_JUDGMENT_CONTEXT');
});
test('the production consultant answers about the current service instead of the earlier one',async()=>{
 for(const [locale,old,current] of [
  ['ru','Сколько стоит сеанс Рейки?','Сколько стоит бизнес-консультация?'],
  ['en','How much does a Reiki session cost?','How much is business consulting?'],
 ]){
  const first=await execute(base(old,newTurn(),locale));
  assert.equal(first.status,200);assert.equal(first.body.source,'consultant-rules');
  const {id,revision}=first.body.nativeSession;
  const input={...base(current,newTurn(id,revision),locale),history:[{role:'user',text:old},{role:'assistant',text:first.body.reply}]};
  const next=await execute(input);
  assert.equal(next.status,200);assert.equal(next.body.source,'consultant-rules');
  assert.equal(next.body.suggestions[0].id,'service:business');
 }
});
test('earlier offered choices survive an ordinary turn and are then resolved for RU/EN',async()=>{
 for(const [locale,firstText,greeting,selection] of [
  ['ru','Про отношения','Привет','Тогда второй вариант.'],['en','About relationships','Hello','Then I prefer the second option.'],
 ]){
  let response=await execute(base(firstText,newTurn(),locale));
  assert.equal(response.status,200);assert.equal(response.body.suggestions.length,2);
  const id=response.body.nativeSession.id;
  response=await execute(base(greeting,newTurn(id,1),locale));
  assert.equal(response.status,200);assert.equal(response.body.nativeSession.revision,2);
  const stored=await readNativeDialogueSession(config,a,id,2);
  assert.deepEqual(stored.lastOfferedChoices,['service:first','service:second']);
  response=await execute(base(selection,newTurn(id,2),locale));
  assert.equal(response.status,200);assert.equal(response.body.selectedChoiceId,'service:second');
 }
});
test('tentative consultation and corrected time with booking deferred use the same authenticated session',async()=>{
 for(const [locale,opening,correction,time,refusal] of [
  ['ru','Я думаю о консультации по работе','Не утром, а вечером, но пока не записывайте меня.',/вечер/i,/не запис/i],
  ['en','I was thinking about a consultation about work.','Not in the morning, evenings are better, but please do not book anything yet.',/evening/i,/not book/i],
 ]){
  const first=await execute(base(opening,newTurn(),locale));
  assert.equal(first.status,200,locale);assert.ok(first.body.nativeSession,locale);
  const {id,revision}=first.body.nativeSession;
  let state=await readNativeDialogueSession(config,a,id,revision);
  assert.equal(state.goal?.value,'consultation',locale);assert.equal(state.topic?.value,'work',locale);
  const response=await execute(base(correction,newTurn(id,revision),locale));
  assert.equal(response.status,200,locale);assert.match(response.body.reply,time);assert.match(response.body.reply,refusal);
  state=await readNativeDialogueSession(config,a,id,revision+1);
  assert.equal(state.timePreference?.value,'evening',locale);assert.equal(state.goal?.value,'consultation',locale);
  assert.deepEqual(Array.from(response.body.suggestions),[]);
 }
});
test('natural RU/EN time preferences persist without creating a booking',async()=>{
 for(const [locale,opening,preference,time] of [
  ['ru','Хочу консультацию','По вечерам мне удобнее',/вечер/i],
  ['en','I want a consultation','Evenings usually work best for me',/evening/i],
 ]){
  const first=await execute(base(opening,newTurn(),locale));
  assert.equal(first.status,200,locale);assert.ok(first.body.nativeSession,locale);
  const {id,revision}=first.body.nativeSession;
  const response=await execute(base(preference,newTurn(id,revision),locale));
  assert.equal(response.status,200,locale);assert.match(response.body.reply,time);
  assert.deepEqual(Array.from(response.body.suggestions),[]);
  const state=await readNativeDialogueSession(config,a,id,revision+1);
  assert.equal(state.timePreference?.value,'evening',locale);
  const question=locale==='ru'?'Мне удобнее утром?':'Morning works for me?';
  const followup=await execute(base(question,newTurn(id,revision+1),locale));
  assert.equal(followup.status,200,locale);
  const afterQuestion=await readNativeDialogueSession(config,a,id,revision+2);
  assert.equal(afterQuestion.timePreference?.value,'evening',locale);
 }
});
test('a follow-up price question preserves context and does not invent a quote',async()=>{
 for(const [locale,opening,preference,question,priceWord] of [
  ['ru','Хочу консультацию','Лучше вечером','А сколько стоит?',/цен|стоим|стоит/i],
  ['en','I want a consultation','In the evening, please','And how much does it cost?',/pric|cost|fee/i],
 ]){
  let response=await execute(base(opening,newTurn(),locale));
  assert.equal(response.status,200,locale);const id=response.body.nativeSession.id;
  response=await execute(base(preference,newTurn(id,1),locale));assert.equal(response.status,200,locale);
  response=await execute(base(question,newTurn(id,2),locale));
  assert.equal(response.status,200,locale);assert.match(response.body.reply,priceWord,locale);
  assert.doesNotMatch(response.body.reply,/(?:€|\$|£)\s*\d|\d\s*(?:€|\$|£|руб|евро|dollars?)/iu,locale);
  const state=await readNativeDialogueSession(config,a,id,3);
  assert.equal(state.goal?.value,'consultation',locale);assert.equal(state.timePreference?.value,'evening',locale);
 }
});
test('stop, no-advice and one-sentence requests retain their boundaries through the route',async()=>{
 for(const [locale,opening,noAdvice,concise,close] of [
  ['ru','Хочу консультацию','Продолжим про отношения, но без советов.','Поясни одним предложением.','Спасибо, давай закончим.'],
  ['en','I want a consultation',"Let's stay on relationships, but no advice.",'Explain that in a single sentence.',"Thank you, let's finish here."],
 ]){
  let result=await execute(base(opening,newTurn(),locale));assert.equal(result.status,200,locale);
  const id=result.body.nativeSession.id;
  result=await execute(base(noAdvice,newTurn(id,1),locale));
  assert.equal(result.status,200,locale);assert.doesNotMatch(result.body.reply,/\?/u,locale);
  assert.deepEqual(Array.from(result.body.suggestions),[]);
  result=await execute(base(concise,newTurn(id,2),locale));
  assert.equal(result.status,200,locale);assert.doesNotMatch(result.body.reply,/[.!?]\s+\p{L}/u,locale);
  result=await execute(base(close,newTurn(id,3),locale));
  assert.equal(result.status,200,locale);assert.doesNotMatch(result.body.reply,/\?/u,locale);
  const state=await readNativeDialogueSession(config,a,id,4);
  assert.equal(state.goal,null,locale);assert.equal(state.topic,null,locale);
 }
});
test('an advice refusal persists for later disclosures while factual questions stay available',async()=>{
 for(const [locale,decline,disclosure,price,allow,noAdvice] of [
  ['ru','Пожалуйста, не давай советов.','Мне сегодня очень одиноко.','Сколько стоит сеанс Рейки?',
   'Теперь можешь дать совет.',/совет|слуш/i],
  ['en','Please do not give me advice.','I feel lonely.','How much does a Reiki session cost?',
   'Now you can offer advice.',/advice|listen/i],
 ]){
  let r=await execute(base(decline,newTurn(),locale));assert.equal(r.status,200,locale);const id=r.body.nativeSession.id;
  assert.match(r.body.reply,noAdvice,locale);let state=await readNativeDialogueSession(config,a,id,1);
  assert.equal(state.declinedAdvice?.value,'advice',locale);
  r=await execute(base(disclosure,newTurn(id,1),locale));assert.equal(r.status,200,locale);
  assert.deepEqual(Array.from(r.body.suggestions),[]);assert.ok(!r.body.judgment?.choices?.length,locale);
  assert.doesNotMatch(r.body.reply,/попробу[йи]|советую|рекомендую|you should|i recommend|you could try/i,locale);
  state=await readNativeDialogueSession(config,a,id,2);assert.equal(state.declinedAdvice?.value,'advice',locale);
  r=await execute(base(price,newTurn(id,2),locale));assert.equal(r.status,200,locale);assert.equal(r.body.source,'consultant-rules',locale);
  r=await execute(base(allow,newTurn(id,3),locale));assert.equal(r.status,200,locale);
  state=await readNativeDialogueSession(config,a,id,4);assert.equal(state.declinedAdvice,null,locale);
 }
});
test('advice refusal survives a topic change until explicitly revoked',async()=>{
 for(const [locale,decline,switchTopic,disclosure,allow] of [
  ['ru','Пожалуйста, не давай советов.','Меняем тему: хочу поговорить об отношениях.','Мне сегодня очень одиноко.','Теперь можешь дать совет.'],
  ['en','Please do not give me advice.','New topic: I want to talk about relationships.','I feel lonely.','Now you can offer advice.'],
 ]){
  const first=await execute(base(decline,newTurn(),locale),a,{realLogic:true});assert.equal(first.status,200);
  const id=first.body.nativeSession.id;
  const second=await execute(base(switchTopic,newTurn(id,1),locale),a,{realLogic:true});assert.equal(second.status,200);
  let state=await readNativeDialogueSession(config,a,id,2);assert.equal(state.topic?.value,'relationships');assert.equal(state.declinedAdvice?.value,'advice');
  const third=await execute(base(disclosure,newTurn(id,2),locale),a,{realLogic:true});assert.equal(third.status,200);
  assert.deepEqual(Array.from(third.body.suggestions),[]);assert.doesNotMatch(third.body.reply,/попробу[йи]|советую|рекомендую|you should|i recommend|you could try/i);
  const fourth=await execute(base(allow,newTurn(id,3),locale),a,{realLogic:true});assert.equal(fourth.status,200);
  state=await readNativeDialogueSession(config,a,id,4);assert.equal(state.declinedAdvice,null);
 }
});
test('advice refusal also applies to ambivalence and uncertainty',async()=>{
 for(const [locale,decline,ambivalence,uncertainty,request] of [
  ['ru','Пожалуйста, не давай советов.','Я хочу сменить работу, но боюсь подвести команду','Не знаю.','Расскажи о стоимости сеанса Рейки'],
  ['en','Please do not give me advice.','I want to leave my job but I am worried about my team','Not sure.','Tell me the price of a Reiki session'],
 ]){
  const first=await execute(base(decline,newTurn(),locale),a,{realLogic:true});assert.equal(first.status,200);
  const id=first.body.nativeSession.id;
  for(const [index,message] of [[1,ambivalence],[2,uncertainty]]){
   const response=await execute(base(message,newTurn(id,index),locale),a,{realLogic:true});assert.equal(response.status,200);
   assert.deepEqual(Array.from(response.body.suggestions),[]);assert.ok(!response.body.judgment?.choices?.length);
   assert.doesNotMatch(response.body.reply,/попробу[йи]|советую|рекомендую|you should|i recommend|you could try/i);
  }
  const factual=await execute(base(request,newTurn(id,3),locale),a,{realLogic:true});assert.equal(factual.status,200);
  assert.match(factual.body.reply,/рейки|reiki/i);
 }
});
test('a conflicting emotional question clarifies advice consent instead of silently changing it',async()=>{
 for(const [locale,decline,question,permission] of [
  ['ru','Пожалуйста, не давай советов.','Мне одиноко, что мне делать?','Да.'],
  ['en','Please do not give me advice.','I feel lonely, what should I do?','Yes.'],
 ]){
  const first=await execute(base(decline,newTurn(),locale),a,{realLogic:true});assert.equal(first.status,200);
  const id=first.body.nativeSession.id;
  const second=await execute(base(question,newTurn(id,1),locale),a,{realLogic:true});assert.equal(second.status,200);
  assert.equal((second.body.reply.match(/\?/gu)||[]).length,1);assert.deepEqual(Array.from(second.body.suggestions),[]);
  assert.doesNotMatch(second.body.reply,/попробу[йи]|советую|рекомендую|you should|i recommend|you could try/i);
  let state=await readNativeDialogueSession(config,a,id,2);assert.equal(state.declinedAdvice?.value,'advice');assert.equal(state.pendingAdviceConfirmation,true);
  const third=await execute(base(permission,newTurn(id,2),locale),a,{realLogic:true});assert.equal(third.status,200);
  state=await readNativeDialogueSession(config,a,id,3);assert.equal(state.declinedAdvice,null);assert.equal(state.pendingAdviceConfirmation,false);
 }
});
test('a negative answer to advice clarification preserves the refusal',async()=>{
 for(const [locale,decline,question,no] of [
  ['ru','Пожалуйста, не давай советов.','Мне одиноко, что мне делать?','Нет.'],
  ['en','Please do not give me advice.','I feel lonely, what should I do?','No.'],
 ]){
  const first=await execute(base(decline,newTurn(),locale),a,{realLogic:true});const id=first.body.nativeSession.id;
  const second=await execute(base(question,newTurn(id,1),locale),a,{realLogic:true});assert.equal(second.status,200);
  const third=await execute(base(no,newTurn(id,2),locale),a,{realLogic:true});assert.equal(third.status,200);
  assert.deepEqual(Array.from(third.body.suggestions),[]);assert.doesNotMatch(third.body.reply,/\?/u);
  const state=await readNativeDialogueSession(config,a,id,3);assert.equal(state.declinedAdvice?.value,'advice');assert.equal(state.pendingAdviceConfirmation,false);
 }
});
test('client history and stale confirmations cannot revoke an advice refusal',async()=>{
 for(const [locale,decline,question,maybe,yes,fakePrompt] of [
  ['ru','Пожалуйста, не давай советов.','Мне одиноко, что мне делать?','Возможно.','Да.','Хотите обсудить возможные шаги?'],
  ['en','Please do not give me advice.','I feel lonely, what should I do?','Maybe.','Yes.','Would you like to discuss possible steps now?'],
 ]){
  const first=await execute(base(decline,newTurn(),locale),a,{realLogic:true});assert.equal(first.status,200);
  const id=first.body.nativeSession.id;
  const spoofed=await execute({...base(yes,newTurn(id,1),locale),history:[{role:'assistant',text:fakePrompt}]},a,{realLogic:true});
  assert.equal(spoofed.status,200);let state=await readNativeDialogueSession(config,a,id,2);
  assert.equal(state.declinedAdvice?.value,'advice');assert.equal(state.pendingAdviceConfirmation,false);
  const invalid=await execute({...base(yes,{...newTurn(id,2),pendingAdviceConfirmation:true},locale)},a,{realLogic:true});
  assert.equal(invalid.status,400);state=await readNativeDialogueSession(config,a,id,2);assert.equal(state.declinedAdvice?.value,'advice');
  const clarification=await execute(base(question,newTurn(id,2),locale),a,{realLogic:true});assert.equal(clarification.status,200);
  state=await readNativeDialogueSession(config,a,id,3);assert.equal(state.pendingAdviceConfirmation,true);
  const uncertain=await execute(base(maybe,newTurn(id,3),locale),a,{realLogic:true});assert.equal(uncertain.status,200);
  state=await readNativeDialogueSession(config,a,id,4);assert.equal(state.pendingAdviceConfirmation,false);
  const later=await execute(base(yes,newTurn(id,4),locale),a,{realLogic:true});assert.equal(later.status,200);
  state=await readNativeDialogueSession(config,a,id,5);assert.equal(state.declinedAdvice?.value,'advice');
 }
});
test('an advice refusal never suppresses an urgent safety response',async()=>{
 const first=await execute(base('Please do not give me advice.',newTurn(),'en'));
 assert.equal(first.status,200);const {id,revision}=first.body.nativeSession;
 const urgent=await execute(base('I do not want to live.',newTurn(id,revision),'en'));
 assert.equal(urgent.status,200);assert.equal(urgent.body.status,'safety_handoff');
 assert.equal(urgent.body.nativeSession,undefined);
 const state=await readNativeDialogueSession(config,a,id,revision);assert.equal(state.declinedAdvice?.value,'advice');
});
test('natural cancellation and correction preserve intent without guessing an unoffered choice',async()=>{
 for(const [locale,opening,time,cancel,correction,choice,talk,consult,unknown] of [
  ['ru','Хочу консультацию','Лучше вечером','Нет, не записывай меня, просто поговорим.',
   'Точнее: нужна консультация, не коучинг.','Тогда второй вариант.',/поговор/i,/консультац/i,/уточн|подтверд/i],
  ['en','I want a consultation','In the evening, please',"No, don't book anything. Let's just talk.",
   'Correction: I mean a consultation, not coaching.','Then I prefer the second option.',/talk/i,/consultation/i,/which|verify/i],
 ]){
  let r=await execute(base(opening,newTurn(),locale));assert.equal(r.status,200,locale);
  const id=r.body.nativeSession.id;
  r=await execute(base(time,newTurn(id,1),locale));assert.equal(r.status,200,locale);
  r=await execute(base(cancel,newTurn(id,2),locale));assert.equal(r.status,200,locale);assert.match(r.body.reply,talk,locale);
  assert.doesNotMatch(r.body.reply,/\?/u,locale);assert.deepEqual(Array.from(r.body.suggestions),[]);
  let state=await readNativeDialogueSession(config,a,id,3);assert.equal(state.goal?.value,'conversation',locale);assert.equal(state.timePreference,null,locale);
  r=await execute(base(correction,newTurn(id,3),locale));assert.equal(r.status,200,locale);assert.match(r.body.reply,consult,locale);
  state=await readNativeDialogueSession(config,a,id,4);assert.equal(state.goal?.value,'consultation',locale);
  r=await execute(base(choice,newTurn(id,4),locale));assert.equal(r.status,200,locale);
  assert.equal(r.body.selectedChoiceId,null,locale);assert.match(r.body.reply,unknown,locale);
 }
});
test('an explicit goal can be recalled across a long session and is erased on topic change',async()=>{
 for(const [locale,goal,recall,switchTopic,expected] of [
  ['ru','Хочу спокойнее обсуждать задачи с руководителем.','Какую цель мы сейчас обсуждаем?',
   'Давай сменим тему и поговорим об отношениях.',/руководител/i],
  ['en','I want a calmer conversation with my manager.','What goal are we discussing now?',
   "Let's change the subject and talk about relationships.",/manager/i],
 ]){
  let r=await execute(base(goal,newTurn(),locale));assert.equal(r.status,200,locale);
  const id=r.body.nativeSession.id;let revision=r.body.nativeSession.revision;
  assert.match(r.body.reply,expected,locale);
  for(let i=0;i<8;i++){r=await execute(base(locale==='ru'?'Привет':'Hello',newTurn(id,revision),locale));assert.equal(r.status,200);revision=r.body.nativeSession.revision;}
  const row=(await admin.query('select state_ciphertext from app_private.native_dialogue_sessions where id=$1',[id])).rows[0];
  assert.equal(row.state_ciphertext.includes(goal),false,locale);
  const foreign=await execute(base(recall,newTurn(id,revision),locale),b);assert.equal(foreign.status,404,locale);
  r=await execute(base(recall,newTurn(id,revision),locale));assert.equal(r.status,200,locale);assert.match(r.body.reply,expected,locale);revision=r.body.nativeSession.revision;
  r=await execute(base(switchTopic,newTurn(id,revision),locale));assert.equal(r.status,200,locale);
  assert.match(r.body.reply,locale==='ru'?/отношен/i:/relationship/i,locale);revision=r.body.nativeSession.revision;
  const state=await readNativeDialogueSession(config,a,id,revision);assert.equal(state.goalStatement,null,locale);assert.equal(state.topic?.value,'relationships',locale);
  r=await execute(base(recall,newTurn(id,revision),locale));assert.equal(r.status,200,locale);assert.doesNotMatch(r.body.reply,expected,locale);
 }
});
test('goal correction replaces its provenance and forgetting clears it from the session',async()=>{
 for(const [locale,initial,correction,forget,recall,oldSubject,newSubject] of [
  ['ru','Хочу спокойнее обсуждать работу.','Нет, точнее я хочу научиться говорить спокойнее.',
   'Пожалуйста, забудь мою цель.','Какую цель мы сейчас обсуждаем?',/работ/i,/говорить/i],
  ['en','I want a calmer conversation about work.','No, actually I want to speak more calmly.',
   'Please forget my goal.','What goal are we discussing now?',/work/i,/speak/i],
 ]){
  let r=await execute(base(initial,newTurn(),locale));assert.equal(r.status,200,locale);
  const id=r.body.nativeSession.id;assert.match(r.body.reply,oldSubject,locale);
  assert.equal((r.body.reply.match(/\?/gu)||[]).length,1,locale);
  r=await execute(base(correction,newTurn(id,1),locale));assert.equal(r.status,200,locale);
  assert.match(r.body.reply,newSubject,locale);assert.match(r.body.reply,locale==='ru'?/уточнен|поправ/i:/correction/i,locale);
  assert.ok((r.body.reply.match(/\?/gu)||[]).length<=1,locale);
  let state=await readNativeDialogueSession(config,a,id,2);
  assert.match(state.goalStatement.value,newSubject,locale);assert.doesNotMatch(state.goalStatement.value,oldSubject,locale);
  r=await execute(base(recall,newTurn(id,2),locale));assert.equal(r.status,200,locale);
  assert.match(r.body.reply,newSubject,locale);assert.doesNotMatch(r.body.reply,oldSubject,locale);
  r=await execute(base(forget,newTurn(id,3),locale));assert.equal(r.status,200,locale);
  assert.deepEqual(Array.from(r.body.suggestions),[]);state=await readNativeDialogueSession(config,a,id,4);
  assert.equal(state.goalStatement,null,locale);assert.equal(state.goal,null,locale);
  r=await execute(base(recall,newTurn(id,4),locale));assert.equal(r.status,200,locale);
  assert.doesNotMatch(r.body.reply,newSubject,locale);
 }
});
test('short time and price questions receive cautious answers without booking',async()=>{
 for(const [locale,goal,time,price,timeWords,priceWords] of [
  ['ru','Хочу спокойнее обсуждать работу.','Можно вечером?','А сколько это стоит?',/врем|слот/i,/цен|стоим/i],
  ['en','I want a calmer conversation about work.','Could we do it in the evening?',
   'How much would that cost?',/time|availability/i,/price|cost|fee/i],
 ]){
  let r=await execute(base(goal,newTurn(),locale));assert.equal(r.status,200,locale);const id=r.body.nativeSession.id;
  r=await execute(base(time,newTurn(id,1),locale));assert.equal(r.status,200,locale);assert.match(r.body.reply,timeWords,locale);
  assert.deepEqual(Array.from(r.body.suggestions),[]);let state=await readNativeDialogueSession(config,a,id,2);
  assert.equal(state.timePreference,null,locale);
  r=await execute(base(price,newTurn(id,2),locale));assert.equal(r.status,200,locale);assert.match(r.body.reply,priceWords,locale);
  assert.match(r.body.reply,locale==='ru'?/не могу подтвердить/i:/cannot confirm/i,locale);
  assert.doesNotMatch(r.body.reply,/(?:€|\$|£)\s*\d|\d\s*(?:€|\$|£|руб|евро|dollars?)/iu,locale);
  state=await readNativeDialogueSession(config,a,id,3);assert.equal(state.timePreference,null,locale);assert.ok(state.goalStatement,locale);
 }
});
test('a price follow-up uses the existing verified consultant when a service is explicit',async()=>{
 for(const [locale,opening,question] of [
  ['ru','Сколько стоит сеанс Рейки?','А сколько это стоит?'],
  ['en','How much does a Reiki session cost?','How much would that cost?'],
 ]){
  const first=await execute(base(opening,newTurn(),locale));assert.equal(first.status,200,locale);
  assert.equal(first.body.source,'consultant-rules',locale);const {id,revision}=first.body.nativeSession;
  const response=await execute({...base(question,newTurn(id,revision),locale),
   history:[{role:'user',text:opening},{role:'assistant',text:first.body.reply}]});
  assert.equal(response.status,200,locale);assert.equal(response.body.source,'consultant-rules',locale);
  assert.match(response.body.reply,/reiki|рейки/i,locale);
 }
});
test('twelve consecutive RU/EN turns retain and correct state without booking',async()=>{
 for(const [locale,turns] of [
  ['en',['I want a consultation','About relationships','In the evening, please','And how much does it cost?','No, do not book, just talk','You misunderstood: not coaching, but a consultation','Not about relationships, but about work','Not in the morning, but in the evening','About work','The second option','Hello','Stop']],
  ['ru',['Хочу консультацию','Про отношения','Лучше вечером','А сколько стоит?','Нет, не записывай, просто поговорим','Ты меня не понял: не коучинг, а консультация','Не про отношения, а про работу','Не утром, а вечером','Про работу','Второй вариант','Привет','Стоп']],
 ]){
  let id=null,revision=0;
  for(let index=0;index<turns.length;index++){
   const result=await execute(base(turns[index],newTurn(id,revision),locale));
   assert.equal(result.status,200,`${locale} turn ${index+1}`);
   assert.ok(result.body.nativeSession,`${locale} turn ${index+1}: missing state`);
   id=result.body.nativeSession.id;revision=result.body.nativeSession.revision;
   assert.equal(revision,index+1,`${locale} turn ${index+1}`);
   const state=await readNativeDialogueSession(config,a,id,revision);
   if(index===2){assert.equal(state.timePreference?.value,'evening',locale);assert.match(result.body.reply,locale==='ru'?/вечер/i:/evening/i,locale);}
   if(index===3){assert.equal(state.timePreference?.value,'evening',locale);assert.match(result.body.reply,locale==='ru'?/цен|стоим|стоит/i:/pric|cost|fee/i,locale);
    assert.doesNotMatch(result.body.reply,/(?:€|\$|£)\s*\d|\d\s*(?:€|\$|£|руб|евро|dollars?)/iu,locale);}
   if(index===4){assert.equal(state.goal?.value,'conversation',locale);assert.equal(state.timePreference,null,locale);
    assert.match(result.body.reply,locale==='ru'?/поговор/i:/talk/i,locale);assert.equal(result.body.suggestions.length,0,locale);}
   if(index===6)assert.equal(state.topic?.value,'work',locale);
   if(index===9)assert.equal(result.body.selectedChoiceId,'service:second',locale);
   if(index===11){assert.equal(state.goal,null,locale);assert.equal(state.topic,null,locale);}
  }
 }
});
test('reviewed synthetic 13-turn journeys use real dialogue logic and server-owned state',async()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./fixtures/native-12turn-ru-en.json',import.meta.url),'utf8'));
 const evidence=[];
 for(const scenario of fixtures.scenarios){
  let id=null,revision=0;const history=[],turns=[];
  for(let index=0;index<scenario.turns.length;index++){
   const step=scenario.turns[index],before=id?await readNativeDialogueSession(config,a,id,revision):null;
   const result=await execute({...base(step.user,newTurn(id,revision),scenario.locale),history:history.slice(-6)},a,{realLogic:true});
   assert.equal(result.status,200,`${scenario.locale} turn ${index+1}`);
   assert.ok(result.body.nativeSession,`${scenario.locale} turn ${index+1}`);
   id=result.body.nativeSession.id;revision=result.body.nativeSession.revision;
   assert.equal(revision,index+1);assert.equal(result.body.memorySaved,false);
   const state=await readNativeDialogueSession(config,a,id,revision);
   if(index===1){assert.equal(state.goalStatement?.value,step.user);assert.ok(result.body.reply.includes(step.user));}
   if(index===2)assert.equal(state.timePreference,null);
   if(index===4){assert.equal(state.goal?.value,'conversation');assert.equal(state.timePreference,null);}
   if(index===5){assert.equal(state.goal?.value,'consultation');assert.match(result.body.reply,scenario.locale==='ru'?/консультац/i:/consultation/i);}
   if(index===6){
    const shown=before.lastOfferedChoices;
    if(shown.length>=2)assert.equal(result.body.selectedChoiceId,shown[1]);
    else {assert.equal(result.body.selectedChoiceId,null);assert.match(result.body.reply,scenario.locale==='ru'?/уточн|подтверд/i:/which|verify/i);}
   }
   if(index===9)assert.ok(result.body.reply.includes(scenario.turns[1].user));
   if(index===10){assert.equal(state.topic?.value,'relationships');assert.equal(state.goalStatement,null);
    assert.match(result.body.reply,scenario.locale==='ru'?/отношен/i:/relationship/i);}
   if(index===11)assert.equal(state.declinedAdvice?.value,'advice');
   if(index===12){assert.equal(state.goal,null);assert.equal(state.goalStatement,null);assert.equal(state.topic,null);}
   turns.push({id:step.id,reply:result.body.reply,actionExecuted:false,memorySaved:result.body.memorySaved,
    approvedChoiceIds:before?.lastOfferedChoices??[],selectedChoiceId:result.body.selectedChoiceId??null});
   history.push({role:'user',text:step.user},{role:'assistant',text:result.body.reply});
  }
  evidence.push({scenarioId:scenario.id,turns});
 }
 const result=evaluateSyntheticJourneys(fixtures,evidence);
 assert.equal(result.status,'AUTOMATED_OFFLINE_CHECKS_FAIL');assert.equal(result.passed,24);
 for(const scenario of result.results)assert.match(scenario.failures[0]?.reason,/TWO_PRIOR_CHOICES_NOT_VERIFIED/);
 assert.equal(result.semanticPending,10);assert.equal(result.humanSemanticReviewVerified,false);assert.equal(result.liveVerified,false);
});
test('real guide offers and resolves a second option in a 15-turn RU/EN journey',async()=>{
 const fixtures=JSON.parse(readFileSync(new URL('./fixtures/native-12turn-ru-en.json',import.meta.url),'utf8'));
 for(const scenario of fixtures.scenarios){
  const locale=scenario.locale;
  const axisCatalog=['body','work'].map(id=>({id:`test:${id}`,kind:'test',title:`Synthetic ${id}`,
   href:`/${locale}/client/tests`,status:'published',free:true,axisLinks:[{ref:'recovery::energy',strength:3}]}));
  const offer={id:'synthetic-offer',user:locale==='ru'?'Помоги восстановить энергию':'Help me improve my energy'};
  const steps=scenario.turns.map(step=>step.rule==='time_unconfirmed'?{...step,
   user:locale==='ru'?'По вечерам мне удобнее':'Evenings usually work best for me'}:step);
  steps.splice(2,0,{id:'synthetic-consultation',user:locale==='ru'?'Хочу консультацию':'I want a consultation'});
  steps.splice(7,0,offer);
  let id=null,revision=0,shown=[];const history=[];
  for(const step of steps){
   const input={...base(step.user,newTurn(id,revision),locale),history:history.slice(-6)};
   if(step===offer){input.chosenAxes=['recovery::energy'];input.preferredFormat='test';}
   const response=await execute(input,a,{realLogic:true,axisCatalog});
   assert.equal(response.status,200,`${locale} ${step.id}`);assert.equal(response.body.memorySaved,false);
   assert.doesNotMatch(response.body.reply,/(?:я (?:вас )?(?:записал|записала|забронировал)|вы записаны|i (?:have|'ve) (?:booked|scheduled)|your (?:appointment|booking) is confirmed)/iu,`${locale} ${step.id}`);
   id=response.body.nativeSession.id;revision=response.body.nativeSession.revision;
   const state=await readNativeDialogueSession(config,a,id,revision);
   if(step.rule==='time_unconfirmed')assert.equal(state.timePreference?.value,'evening',locale);
   if(step.id.endsWith('05')){assert.equal(state.goal?.value,'conversation',locale);assert.equal(state.timePreference,null,locale);assert.deepEqual(Array.from(response.body.suggestions),[]);}
   if(step.rule==='correction')assert.equal(state.goal?.value,'consultation',locale);
   if(step.rule==='goal_recall')assert.ok(response.body.reply.includes(scenario.turns[1].user),locale);
   if(step.rule==='topic_switch')assert.equal(state.topic?.value,'relationships',locale);
   if(step===offer){shown=response.body.suggestions.map(item=>item.id);assert.deepEqual(shown,['test:body','test:work']);}
   if(step.rule==='choice_reference'){
    assert.equal(response.body.selectedChoiceId,shown[1],locale);
    assert.match(response.body.reply,/Synthetic work/u,locale);
    assert.doesNotMatch(response.body.reply,/[.!?]\s+\p{L}/u,locale);
   }
   if(step.rule==='one_sentence'){
    assert.match(response.body.reply,/Synthetic work/u,locale);
    assert.match(response.body.reply,locale==='ru'?/выбрать тесты/i:/choose questionnaires/i,locale);
    assert.doesNotMatch(response.body.reply,/[.!?]\s+\p{L}/u,locale);
   }
   history.push({role:'user',text:step.user},{role:'assistant',text:response.body.reply});
  }
  assert.equal(revision,15);
 }
});
test('a previously shown test cannot be selected after removal from the published catalog',async()=>{
 const axisCatalog=['body','work'].map(id=>({id:`test:${id}`,kind:'test',title:`Synthetic ${id}`,
  href:'/en/client/tests',status:'published',free:true,axisLinks:[{ref:'recovery::energy',strength:3}]}));
 const first=await execute({...base('Help me improve my energy',newTurn(),'en'),chosenAxes:['recovery::energy'],preferredFormat:'test'},a,{realLogic:true,axisCatalog});
 assert.deepEqual(first.body.suggestions.map(item=>item.id),['test:body','test:work']);
 const second=await execute(base('The second option',newTurn(first.body.nativeSession.id,1),'en'),a,{realLogic:true,axisCatalog:[]});
 assert.equal(second.status,200);assert.equal(second.body.selectedChoiceId,null);
 assert.match(second.body.reply,/cannot verify/i);
});
test('a previously selected option is rechecked before explaining it',async()=>{
 const axisCatalog=['body','work'].map(id=>({id:`test:${id}`,kind:'test',title:`Synthetic ${id}`,
  href:'/en/client/tests',status:'published',free:true,axisLinks:[{ref:'recovery::energy',strength:3}]}));
 const first=await execute({...base('Help me improve my energy',newTurn(),'en'),chosenAxes:['recovery::energy'],preferredFormat:'test'},a,{realLogic:true,axisCatalog});
 const id=first.body.nativeSession.id;
 const chosen=await execute(base('The second option',newTurn(id,1),'en'),a,{realLogic:true,axisCatalog});
 assert.equal(chosen.body.selectedChoiceId,'test:work');
 const response=await execute(base('Explain that in a single sentence.',newTurn(id,2),'en'),a,{realLogic:true,axisCatalog:[]});
 assert.equal(response.status,200);assert.match(response.body.reply,/cannot verify/i);
 assert.doesNotMatch(response.body.reply,/Synthetic work/u);
});
test('a test choice with a mismatched catalog route is not confirmed',async()=>{
 const axisCatalog=['body','work'].map(id=>({id:`test:${id}`,kind:'test',title:`Synthetic ${id}`,
  href:'/en/academy',status:'published',free:true,axisLinks:[{ref:'recovery::energy',strength:3}]}));
 const first=await execute({...base('Help me improve my energy',newTurn(),'en'),chosenAxes:['recovery::energy'],preferredFormat:'test'},a,{realLogic:true,axisCatalog});
 assert.equal(first.body.suggestions.length,2);
 const response=await execute(base('The second option',newTurn(first.body.nativeSession.id,1),'en'),a,{realLogic:true,axisCatalog});
 assert.equal(response.status,200);assert.equal(response.body.selectedChoiceId,null);assert.match(response.body.reply,/cannot verify/i);
 assert.equal((await readNativeDialogueSession(config,a,first.body.nativeSession.id,2)).selectedChoiceId,null);
});
test('a dismissed selected option is neither explained nor retained',async()=>{
 for(const locale of ['ru','en']){
  const axisCatalog=['body','work'].map(id=>({id:`test:${id}`,kind:'test',title:`Synthetic ${id}`,
   href:`/${locale}/client/tests`,status:'published',free:true,axisLinks:[{ref:'recovery::energy',strength:3}]}));
  const offer=locale==='ru'?'Помоги восстановить энергию':'Help me improve my energy';
  const first=await execute({...base(offer,newTurn(),locale),chosenAxes:['recovery::energy'],preferredFormat:'test'},a,{realLogic:true,axisCatalog});
  const id=first.body.nativeSession.id;
  const chosen=await execute(base(locale==='ru'?'Второй вариант':'The second option',newTurn(id,1),locale),a,{realLogic:true,axisCatalog});
  assert.equal(chosen.body.selectedChoiceId,'test:work');
  const ask=locale==='ru'?'Поясни одним предложением.':'Explain that in a single sentence.';
  const response=await execute({...base(ask,newTurn(id,2),locale),feedback:{dismissedIds:['test:work']}},a,{realLogic:true,axisCatalog});
  assert.equal(response.status,200);assert.doesNotMatch(response.body.reply,/Synthetic work/u);
  assert.equal((await readNativeDialogueSession(config,a,id,3)).selectedChoiceId,null);
 }
});
test('a gratitude-and-farewell closes the same session without another question',async()=>{
 for(const [locale,opening,closing] of [
  ['ru','Хочу консультацию','Спасибо за разговор, до встречи.'],
  ['en','I want a consultation','Thanks for our conversation, see you later.'],
 ]){
  const first=await execute(base(opening,newTurn(),locale),a,{realLogic:true});
  assert.equal(first.status,200);const {id,revision}=first.body.nativeSession;
  const second=await execute(base(closing,newTurn(id,revision),locale),a,{realLogic:true});
  assert.equal(second.status,200);assert.doesNotMatch(second.body.reply,/\?/u);
  const state=await readNativeDialogueSession(config,a,id,revision+1);
  assert.equal(state.goal,null);assert.equal(state.topic,null);assert.equal(state.timePreference,null);
  assert.deepEqual(state.lastOfferedChoices,[]);
 }
});
test('ending the conversation clears temporary refusals as well as the goal',async()=>{
 for(const [locale,goal,noAdvice,noMeditation,close] of [
  ['ru','Хочу консультацию','Пожалуйста, не давай советов.','Не предлагай мне медитации.','Спасибо, давай закончим.'],
  ['en','I want a consultation','Please do not give me advice.',"Please don't suggest meditation.","Thank you, let's finish here."],
 ]){
  const first=await execute(base(goal,newTurn(),locale),a,{realLogic:true});const id=first.body.nativeSession.id;
  assert.equal((await execute(base(noAdvice,newTurn(id,1),locale),a,{realLogic:true})).status,200);
  assert.equal((await execute(base(noMeditation,newTurn(id,2),locale),a,{realLogic:true})).status,200);
  let state=await readNativeDialogueSession(config,a,id,3);assert.equal(state.declinedAdvice?.value,'advice');assert.equal(state.declinedMeditation?.value,'meditation');
  const closed=await execute(base(close,newTurn(id,3),locale),a,{realLogic:true});assert.equal(closed.status,200);
  state=await readNativeDialogueSession(config,a,id,4);assert.equal(state.goal,null);assert.equal(state.declinedAdvice,null);
  assert.equal(state.declinedMeditation,null);assert.equal(state.pendingAdviceConfirmation,false);assert.equal(state.pendingJudgmentTurnId,null);
 }
});
test('a standalone booking refusal preserves the conversation goal without an action',async()=>{
 for(const [locale,opening,refusal] of [
  ['ru','Хочу консультацию','Пожалуйста, не записывайте меня пока.'],
  ['en','I want a consultation',"Please don't book anything yet."],
  ['ru','Хочу консультацию','Я пока не хочу записываться.'],
  ['en','I want a consultation',"I'm not ready to book yet."],
 ]){
  const first=await execute(base(opening,newTurn(),locale),a,{realLogic:true});
  assert.equal(first.status,200);const {id,revision}=first.body.nativeSession;
  const second=await execute(base(refusal,newTurn(id,revision),locale),a,{realLogic:true});
  assert.equal(second.status,200);assert.match(second.body.reply,locale==='ru'?/не буду.*запис/i:/won.t book/i);
  assert.doesNotMatch(second.body.reply,/\?/u);assert.deepEqual(Array.from(second.body.suggestions),[]);
  const state=await readNativeDialogueSession(config,a,id,revision+1);
  assert.equal(state.goal?.value,'consultation');assert.deepEqual(state.lastOfferedChoices,[]);
 }
});
test('a natural time correction replaces the preference without booking',async()=>{
 for(const [locale,opening,morning,correction,question] of [
  ['ru','Хочу консультацию','Утром','Утром мне неудобно, вечером удобнее.','Утром мне неудобно, вечером удобнее?'],
  ['en','I want a consultation','In the morning, please',"Mornings don't work for me, evenings are better.","Mornings don't work for me, evenings are better?"],
 ]){
  const first=await execute(base(opening,newTurn(),locale),a,{realLogic:true});
  assert.equal(first.status,200);const id=first.body.nativeSession.id;
  const second=await execute(base(morning,newTurn(id,1),locale),a,{realLogic:true});
  assert.equal(second.status,200);assert.equal((await readNativeDialogueSession(config,a,id,2)).timePreference?.value,'morning');
  const third=await execute(base(correction,newTurn(id,2),locale),a,{realLogic:true});
  assert.equal(third.status,200);assert.match(third.body.reply,locale==='ru'?/вечер/i:/evening/i);
  assert.equal((await readNativeDialogueSession(config,a,id,3)).timePreference?.value,'evening');
  assert.doesNotMatch(third.body.reply,/(?:вы записаны|встреча подтверждена|appointment is confirmed|i (?:have|'ve) booked)/iu);
  const fourth=await execute(base(question,newTurn(id,3),locale),a,{realLogic:true});
  assert.equal(fourth.status,200);assert.equal((await readNativeDialogueSession(config,a,id,4)).timePreference?.value,'evening');
 }
});
test('rejecting the saved time clears it and asks once for a replacement',async()=>{
 for(const [locale,opening,morning,rejected,evening] of [
  ['ru','Хочу консультацию','Утром','Утром мне неудобно.','Лучше вечером'],
  ['en','I want a consultation','In the morning, please',"Mornings don't work for me.",'In the evening, please'],
 ]){
  const first=await execute(base(opening,newTurn(),locale),a,{realLogic:true});
  const id=first.body.nativeSession.id;
  await execute(base(morning,newTurn(id,1),locale),a,{realLogic:true});
  const third=await execute(base(rejected,newTurn(id,2),locale),a,{realLogic:true});
  assert.equal(third.status,200);assert.equal((third.body.reply.match(/\?/gu)||[]).length,1);
  let state=await readNativeDialogueSession(config,a,id,3);
  assert.equal(state.timePreference,null);assert.equal(state.goal?.value,'consultation');
  const fourth=await execute(base(evening,newTurn(id,3),locale),a,{realLogic:true});
  assert.equal(fourth.status,200);state=await readNativeDialogueSession(config,a,id,4);
  assert.equal(state.timePreference?.value,'evening');
  assert.doesNotMatch(fourth.body.reply,/(?:вы записаны|встреча подтверждена|appointment is confirmed|i (?:have|'ve) booked)/iu);
 }
});
