import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {ruleConversationReply} from '../lib/holistic-support/rule-conversation.mjs';
import {nativeSecretaryTurn} from '../lib/holistic-support/native-secretary.mjs';
import {resolveComplaintTurn} from '../lib/holistic-support/complaint-mind.mjs';
import {planJudgmentTurn as realJudgment} from '../lib/holistic-support/judgment-mind.mjs';
import {nativeDialogueEventFromUtterance,understandConversationTurn} from '../lib/holistic-support/conversation-intelligence.mjs';
import {emptyNativeDialogueState,transitionNativeDialogueState} from '../lib/holistic-support/native-dialogue-state.mjs';
import {progressConversationTurn,progressDialogueReply} from '../lib/holistic-support/dialogue-progression.mjs';

async function execute(body,{valid=false,useRealJudgment=false,nativeEnabled=false,fixture={state:emptyNativeDialogueState()},suggestions=[],judgmentResult=null,consultation=null}={}){
 const source=readFileSync(new URL('../app/api/holistic-agent/turn/route.js',import.meta.url),'utf8');
 const calls=[],unexpected=()=>{throw Error('UNEXPECTED_DEPENDENCY')};
 class AppError extends Error{constructor(code,status){super(code);this.code=code;this.status=status}}
 const deps={NextResponse:{json:(data,options={})=>({body:data,status:options.status||200})},AppError,onlyKeys:(value,keys)=>{if(Object.keys(value).some(key=>!keys.includes(key)))throw new AppError('INVALID_KEYS',400)},
  getAppConfig:()=>({}),requireSameOrigin:()=>calls.push('origin'),
  createRequestAuth:()=>({verified:async()=>{calls.push('actor');return {id:'synthetic'}},apply:x=>x}),
  createAppRepository:()=>({ensureAccount:async()=>calls.push('account')}),consumeRate:async()=>calls.push('rate'),
  PRIVATE_HEADERS:{},readBody:async()=>body,safeError:e=>({code:e.code||e.message,status:e.status||500}),
  detectConversationLocale:(_,locale)=>locale,interpretSupportUtterance:()=>({kind:'none'}),nativeDialogueEventFromUtterance,understandConversationTurn,
  resolveWisdomRequest:async()=>null,ruleConversationReply,nativeSecretaryTurn,resolveComplaintTurn,progressConversationTurn,progressDialogueReply,
  consultServiceQuestion:()=>{calls.push('consultant');return consultation},
  resolveConsultantSuggestion:(id)=>id==='service:therapy'?{id,title:'Guided imagery sessions'}:id==='service:business'?{id,title:'Business consulting'}:null,
  verifyJudgmentChoice:()=>{calls.push('verify');return valid?{pending:{},turnId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc',conversationRevision:1}:null},
  planJudgmentTurn:input=>{calls.push('judgment');return judgmentResult||(useRealJudgment?realJudgment(input):valid?({status:'clarify',reply:'synthetic verified continuation',pending:null}):({status:'abstain'}))},
  createNativeDialogueSession:async()=>{calls.push('state-create');return {sessionId:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',state:fixture.state}},
  readNativeDialogueSession:async()=>{calls.push('state-read');return fixture.state},
  advanceNativeDialogueMessage:async(_config,_actor,_id,input,options)=>{calls.push('state-advance');const event=nativeDialogueEventFromUtterance({...input,state:fixture.state});const result=transitionNativeDialogueState(fixture.state,{...event,turnId:input.turnId,expectedRevision:input.expectedRevision},options);fixture.state=result.state;return result},
  resolveConversationFocus:()=>({goal:'conversation'}),coreServiceOffers:()=>[{id:'first',title:'First service'},{id:'second',title:'Second service'},{id:'business',title:'Founder coaching'}],freeMeditationVideos:()=>[],publishedAxisOffers:()=>[],
  buildHolisticGuidedTurn:()=>({status:'recommend',message:'Here are options.',suggestions}),
  explainUserQuestion:()=>null,prepareNaturalDialogue:()=>({}),finishNaturalDialogue:async()=>({text:'Here are options.',provider:'rules',modelUsed:false}),
  englishGuidedMeditations:[],default:{videos:[]},AXIS_REFS:{}};
 const context=vm.createContext({process:{env:nativeEnabled?{HH_NATIVE_DIALOGUE_STATE_ENABLED:'true'}:{}},console,AbortSignal});
 const imports=[...source.matchAll(/import\s*\{([^}]+)\}\s*from\s*["']([^"']+)["'];/g)];
 const byPath=new Map(imports.map(x=>[x[2],x[1].split(',').map(n=>n.trim()).filter(Boolean)]));
 for(const m of source.matchAll(/import\s+\w+\s+from\s*["']([^"']+)["'];/g))byPath.set(m[1],['default']);
 const routeModule=new vm.SourceTextModule(source,{context});
 await routeModule.link(async spec=>new vm.SyntheticModule(byPath.get(spec),function(){for(const name of byPath.get(spec))this.setExport(name,deps[name]??unexpected)},{context}));
 await routeModule.evaluate();return {result:await routeModule.namespace.POST({}),calls};
}
const input={locale:'en',message:'Hello',history:[],mode:'rules',ownedInferenceConsent:false,judgmentContext:'synthetic.signature',judgmentChoice:'a'};
test('production emotional progression respects Judgment and advances enabled server state',async()=>{
 const nativeSession={id:null,revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 const body={locale:'ru',message:'Грустно',history:[],mode:'rules',ownedInferenceConsent:false,nativeSession};
 const progressed=await execute(body,{nativeEnabled:true});
 assert.equal(progressed.result.status,200);
 assert.ok(progressed.calls.includes('state-advance'));
 assert.equal(progressed.result.body.nativeSession.revision,1);
 const judgment=await execute(body,{nativeEnabled:true,judgmentResult:{status:'clarify',reply:'Judgment owns this turn',pending:null}});
 assert.equal(judgment.result.status,200);
 assert.equal(judgment.result.body.reply,'Judgment owns this turn');
 assert.ok(judgment.calls.includes('state-advance'));
});
test('a fast greeting cannot bypass verification of a signed judgment continuation',async()=>{
 const invalid=await execute(input);assert.equal(invalid.result.status,400);assert.equal(invalid.result.body.error,'INVALID_JUDGMENT_CONTEXT');assert.ok(invalid.calls.includes('verify'));
 const invalidWithoutChoice=await execute({...input,judgmentChoice:null});assert.equal(invalidWithoutChoice.result.status,400);assert.ok(invalidWithoutChoice.calls.includes('verify'));
 const valid=await execute(input,{valid:true});assert.equal(valid.result.status,200);assert.equal(valid.result.body.reply,'synthetic verified continuation');assert.ok(valid.calls.includes('verify'));
 const ordinary=await execute({...input,judgmentContext:null,judgmentChoice:null});assert.equal(ordinary.result.status,200);assert.equal(ordinary.calls.includes('verify'),false);
});
test('production consultant response remains behind Judgment and advances the dialogue session',async()=>{
 const nativeSession={id:null,revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 const body={locale:'en',message:'What is the price of a consultation?',history:[],mode:'rules',ownedInferenceConsent:false,nativeSession};
 const consultation={status:'clarify',reply:'Verified catalogue reply.',suggestions:[]};
 const normal=await execute(body,{nativeEnabled:true,consultation});
 assert.equal(normal.result.status,200);assert.equal(normal.result.body.source,'consultant-rules');
 assert.equal(normal.result.body.nativeSession?.revision,1);
 const guarded=await execute({...body,judgmentContext:'synthetic.signature',judgmentChoice:'a'},{nativeEnabled:true,consultation});
 assert.equal(guarded.result.status,400);assert.equal(guarded.calls.includes('consultant'),false);
});
test('a previously shown production consultant choice resolves against its source catalogue',async()=>{
 const nativeSession={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 const fixture={state:{...emptyNativeDialogueState(),lastOfferedChoices:['service:therapy']}};
 const {result}=await execute({locale:'en',message:'The first option',history:[],mode:'rules',ownedInferenceConsent:false,nativeSession},{nativeEnabled:true,fixture});
 assert.equal(result.status,200);assert.equal(result.body.selectedChoiceId,'service:therapy');
 assert.match(result.body.reply,/Guided imagery sessions/);
});
test('a choice shared by two catalogues is acknowledged without inventing which title was shown',async()=>{
 const nativeSession={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 const fixture={state:{...emptyNativeDialogueState(),lastOfferedChoices:['service:business']}};
 const {result}=await execute({locale:'en',message:'The first option',history:[],mode:'rules',ownedInferenceConsent:false,nativeSession},{nativeEnabled:true,fixture});
 assert.equal(result.status,200);assert.equal(result.body.selectedChoiceId,'service:business');
 assert.doesNotMatch(result.body.reply,/Founder coaching|Business consulting/);
});
test('the existing guide does not present a previously refused meditation',async()=>{
 const nativeSession={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 const fixture={state:{...emptyNativeDialogueState(),declinedMeditation:{value:'meditation',confirmed:true,sourceTurnId:'prior'}}};
 const suggestions=[{id:'youtube:abcdefghijk',kind:'video',title:'Meditation',href:'/watch'},{id:'service:course',kind:'service',title:'Course',href:'/course'}];
 const {result}=await execute({locale:'en',message:'Could you suggest something helpful?',history:[],mode:'rules',ownedInferenceConsent:false,nativeSession},{nativeEnabled:true,fixture,suggestions});
 assert.equal(result.status,200);assert.deepEqual(Array.from(result.body.suggestions,x=>x.id),['service:course']);
 assert.deepEqual(Array.from(result.body.decision.suggestions,x=>x.id),['service:course']);
 assert.deepEqual(fixture.state.lastOfferedChoices,['service:course']);
});
test('RU/EN ordinal choice resolves only a still-published, previously shown option without action',async()=>{
 for(const [locale,message] of [['ru','Второй вариант'],['en','The second option']]){
  const nativeSession={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
  const fixture={state:{...emptyNativeDialogueState(),lastOfferedChoices:['service:first','service:second']}};
  const {result}=await execute({locale,message,history:[],mode:'rules',ownedInferenceConsent:false,nativeSession},{nativeEnabled:true,fixture});
  assert.equal(result.status,200);assert.equal(result.body.selectedChoiceId,'service:second');
  assert.match(result.body.reply,/Second service/);assert.equal(result.body.nativeSession.revision,1);
  assert.deepEqual(fixture.state.lastOfferedChoices,[]);assert.deepEqual(Array.from(result.body.suggestions),[]);
 }
 const nativeSession={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 const fixture={state:{...emptyNativeDialogueState(),lastOfferedChoices:['service:unpublished']}};
 const {result}=await execute({locale:'en',message:'The first option',history:[],mode:'rules',ownedInferenceConsent:false,nativeSession},{nativeEnabled:true,fixture});
 assert.equal(result.status,200);assert.equal(result.body.selectedChoiceId,null);assert.doesNotMatch(result.body.reply,/unpublished/);
});
test('a neutral reply does not erase earlier offered choices before a later selection',async()=>{
 for(const [locale,greeting,selection] of [['en','Hello','The second option'],['ru','Привет','Второй вариант']]){
  const id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
  const fixture={state:{...emptyNativeDialogueState(),lastOfferedChoices:['service:first','service:second']}};
  const input={locale,message:greeting,history:[],mode:'rules',ownedInferenceConsent:false,
   nativeSession:{id,revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'}};
  const first=await execute(input,{nativeEnabled:true,fixture});
  assert.equal(first.result.status,200);assert.deepEqual(fixture.state.lastOfferedChoices,['service:first','service:second']);
  const second=await execute({...input,message:selection,nativeSession:{id,revision:1,turnId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}},{nativeEnabled:true,fixture});
  assert.equal(second.result.body.selectedChoiceId,'service:second');
 }
});
test('a handled Judgment response cannot be replaced by a stored ordinal choice',async()=>{
 const nativeSession={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 const fixture={state:{...emptyNativeDialogueState(),lastOfferedChoices:['service:first']}};
 const judgmentResult={status:'handled',state:'paused',pending:null,needsChoice:false,reply:'Please pause.'};
 const {result}=await execute({locale:'en',message:'The first option',history:[],mode:'rules',ownedInferenceConsent:false,nativeSession},{nativeEnabled:true,fixture,judgmentResult});
 assert.equal(result.status,200);assert.equal(result.body.reply,'Please pause.');assert.equal(result.body.selectedChoiceId,undefined);
});
test('the reply acknowledges a time preference and refusal to book without claiming availability',async()=>{
 for(const [locale,message,expected] of [
  ['en','In the evening, please',/evening/i],['ru','Лучше вечером',/вечер/i],
  ['en','No, do not book, just talk',/talk/i],['ru','Нет, не записывай, просто поговорим',/поговор/i],
 ]){
  const nativeSession={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
  const fixture={state:{...emptyNativeDialogueState(),goal:{value:'consultation',confirmed:true,sourceTurnId:'prior'}}};
  const {result}=await execute({locale,message,history:[],mode:'rules',ownedInferenceConsent:false,nativeSession},{nativeEnabled:true,fixture});
  assert.equal(result.status,200,message);assert.match(result.body.reply,expected,message);
  assert.deepEqual(Array.from(result.body.suggestions),[],message);
 }
});
test('a Russian time preference is acknowledged in natural case',async()=>{
 const nativeSession={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 const fixture={state:{...emptyNativeDialogueState(),goal:{value:'consultation',confirmed:true,sourceTurnId:'prior'}}};
 const {result}=await execute({locale:'ru',message:'Мне удобнее вечером',history:[],mode:'rules',ownedInferenceConsent:false,nativeSession},{nativeEnabled:true,fixture});
 assert.equal(result.status,200);assert.match(result.body.reply,/удобнее вечером/i);
});
test('a combined time correction and deferred booking acknowledges both',async()=>{
 for(const [locale,message,time,refusal] of [
  ['ru','Не утром, а вечером, но пока не записывайте меня.',/вечер/i,/не запис/i],
  ['en','Not in the morning, evenings are better, but please do not book anything yet.',/evening/i,/not book/i],
 ]){
  const nativeSession={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
  const fixture={state:{...emptyNativeDialogueState(),goal:{value:'consultation',confirmed:true,sourceTurnId:'prior'}}};
  const {result}=await execute({locale,message,history:[],mode:'rules',ownedInferenceConsent:false,nativeSession},{nativeEnabled:true,fixture});
  assert.equal(result.status,200);assert.match(result.body.reply,time);assert.match(result.body.reply,refusal);
  assert.equal(fixture.state.timePreference?.value,'evening');assert.deepEqual(Array.from(result.body.suggestions),[]);
 }
});
test('a tentative consultation receives one clarification without implying a booking',async()=>{
 for(const [locale,message,term] of [['ru','Я думаю о консультации по работе',/консультац/i],['en','I was thinking about a consultation about work.',/consultation/i]]){
  const nativeSession={id:null,revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
  const {result}=await execute({locale,message,history:[],mode:'rules',ownedInferenceConsent:false,nativeSession},{nativeEnabled:true});
  assert.equal(result.status,200);assert.match(result.body.reply,term);assert.equal((result.body.reply.match(/\?/g)||[]).length,1);
  assert.deepEqual(Array.from(result.body.suggestions),[]);
 }
});
test('unverified hours are not mistaken for a personal work topic on the server route',async()=>{
 for(const [locale,message,uncertain] of [['ru','Когда вы работаете?',/не могу подтвердить/i],['en','When are you open?',/cannot confirm/i]]){
  const {result}=await execute({locale,message,history:[],mode:'rules',ownedInferenceConsent:false},{useRealJudgment:true});
  assert.equal(result.status,200);assert.match(result.body.reply,uncertain);
  assert.equal(result.body.source,'rules');assert.deepEqual(Array.from(result.body.suggestions),[]);
 }
});
test('explicit refusal is not turned into a course or service suggestion on the server route',async()=>{
 for(const [locale,message] of [['ru','Не показывай мне больше курсы'],['en','Please do not recommend any services to me'],['en','Please do not offer me any courses']]){
  const {result}=await execute({locale,message,history:[],mode:'rules',ownedInferenceConsent:false},{useRealJudgment:true});
  assert.equal(result.status,200);assert.equal(result.body.source,'rules');
  assert.deepEqual(Array.from(result.body.suggestions),[]);assert.doesNotMatch(result.body.reply,/выбрать курс|recommend|предлагаю/i);
 }
});
test('mixed refusal and request retain both parts through the server route',async()=>{
 for(const [locale,message,subject] of [
  ['ru','Не записывайте меня, но расскажите о консультации.',/консультац/i],
  ['en','Do not book anything, but tell me about the consultation.',/consultation/i],
  ['ru','Не показывай курсы, просто хочу поговорить о работе.',/работ/i],
  ['en','Do not show courses; I just want to talk about work.',/work/i],
 ]){
  const {result}=await execute({locale,message,history:[],mode:'rules',ownedInferenceConsent:false},{useRealJudgment:true});
  assert.equal(result.status,200,message);
  assert.match(result.body.reply,subject,message);
  assert.deepEqual(Array.from(result.body.suggestions),[],message);
 }
});
test('opt-in dialogue state is server-owned and advances only after authorization and safety checks',async()=>{
 const session={id:null,revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 const request={locale:'en',message:'Hello',history:[],mode:'rules',ownedInferenceConsent:false,nativeSession:session};
 const normal=await execute(request,{nativeEnabled:true});
 assert.equal(normal.result.status,200);assert.equal(normal.result.body.nativeSession?.revision,1);
 assert.ok(normal.calls.indexOf('state-create')>normal.calls.lastIndexOf('rate'));
 assert.equal(normal.calls.filter(x=>x==='state-advance').length,1);
 const forged=await execute({...request,nativeSession:{...session,state:{goal:'consultation'}}},{nativeEnabled:true});
 assert.equal(forged.result.status,400);assert.equal(forged.calls.includes('state-create'),false);
 const signed=await execute({...request,judgmentContext:'synthetic.signature',judgmentChoice:'a'},{nativeEnabled:true});
 assert.equal(signed.result.status,400);assert.equal(signed.calls.includes('state-create'),false);
});
test('verified Judgment continuation preserves the bound state without bypassing signature verification',async()=>{
 const nativeSession={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
 const fixture={state:{...emptyNativeDialogueState(),goal:{value:'consultation',confirmed:true,sourceTurnId:'prior'},pendingJudgmentTurnId:'cccccccc-cccc-4ccc-8ccc-cccccccccccc'}};
 const body={locale:'en',message:'Yes',history:[],mode:'rules',ownedInferenceConsent:false,nativeSession,judgmentContext:'synthetic.signature',judgmentChoice:'a'};
 const valid=await execute(body,{valid:true,nativeEnabled:true,fixture});
 assert.equal(valid.result.status,200);assert.equal(valid.result.body.reply,'synthetic verified continuation');
 assert.equal(valid.result.body.nativeSession?.revision,1);assert.equal(fixture.state.goal.value,'consultation');
 assert.ok(valid.calls.indexOf('verify')<valid.calls.indexOf('state-read'));
 assert.equal(valid.calls.filter(x=>x==='judgment').length,1);
 const bad=await execute(body,{nativeEnabled:true});
 assert.equal(bad.result.status,400);assert.equal(bad.calls.includes('state-read'),false);assert.equal(bad.calls.includes('state-advance'),false);
});
test('an explicit stop reaches Judgment before a fast goodbye rule',async()=>{
 for(const [locale,message] of [['ru','Стоп'],['en','Stop']]){
  const {result,calls}=await execute({locale,message,history:[],mode:'rules',ownedInferenceConsent:false},{useRealJudgment:true});
  assert.equal(result.status,200);assert.equal(result.body.source,'judgment-rules');
  assert.equal(result.body.judgment?.state,'paused');
  assert.equal(calls.filter(x=>x==='judgment').length,1);
 }
});
test('an explicit stop clears the server session even when Judgment owns the response',async()=>{
 for(const [locale,message] of [['ru','Стоп'],['en','Stop']]){
  const nativeSession={id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',revision:0,turnId:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'};
  const fixture={state:{...emptyNativeDialogueState(),goal:{value:'consultation',confirmed:true,sourceTurnId:'prior'},topic:{value:'work',confirmed:true,sourceTurnId:'prior'},lastOfferedChoices:['service:first']}};
  const {result,calls}=await execute({locale,message,history:[],mode:'rules',ownedInferenceConsent:false,nativeSession},{useRealJudgment:true,nativeEnabled:true,fixture});
  assert.equal(result.status,200);assert.equal(result.body.judgment?.state,'paused');
  assert.equal(result.body.nativeSession?.revision,1);
  assert.equal(calls.filter(x=>x==='state-advance').length,1);
  assert.equal(fixture.state.goal,null);assert.equal(fixture.state.topic,null);assert.deepEqual(fixture.state.lastOfferedChoices,[]);
 }
});
