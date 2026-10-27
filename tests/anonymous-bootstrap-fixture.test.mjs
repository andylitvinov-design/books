import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import ts from 'typescript';
import {anonymousBootstrapDenial, createAnonymousAcademyBootstrapFixture} from '../scripts/helpers/anonymous-bootstrap-fixture.mjs';
import {publicJourneyRequestDecision} from '../scripts/helpers/public-journey-verifier.mjs';
const origin='http://127.0.0.1:3100',read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const ast=s=>ts.createSourceFile('actual.tsx',s,ts.ScriptTarget.Latest,true,ts.ScriptKind.TSX);
function node(source,predicate){const result=[];function walk(n){if(predicate(n))result.push(n);ts.forEachChild(n,walk)}walk(ast(source));assert.equal(result.length,1);return result[0]}
function compile(source,imports={},globals={}){
 const exports={};runInNewContext(ts.transpileModule(source,{compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText,
  {exports,require:name=>{assert.ok(Object.hasOwn(imports,name),'Known source import');return imports[name]},process:{env:{}},...globals});return exports;
}
function requestRoute(locale='en',overrides={}){
 const actions=[];const request={url:()=>origin+'/api/app/bootstrap',method:()=> 'GET',resourceType:()=> 'fetch',isNavigationRequest:()=>false,
  postData:()=>null,frame:()=>({url:()=>origin+'/'+locale+'/academy'}),allHeaders:async()=>({accept:'*/*',referer:origin+'/'+locale+'/academy','sec-fetch-site':'same-origin'}),...overrides};
 return {actions,request:()=>request,fulfill:async value=>actions.push(['fulfill',value]),abort:async()=>actions.push(['abort']),continue:async()=>actions.push(['continue'])};
}

test('only one exact anonymous Academy fetch per locale gets the real denial shape, never data or forwarding',async()=>{
 for(const locale of ['en','ru','es']){
  const fixture=createAnonymousAcademyBootstrapFixture(origin,locale),route=requestRoute(locale);
  assert.equal(await fixture.tryFulfill(route,'academy'),true);assert.equal(fixture.denials,1);
  assert.equal(route.actions.length,1);assert.equal(route.actions[0][0],'fulfill');assert.deepEqual(route.actions[0][1],anonymousBootstrapDenial);
  assert.deepEqual(JSON.parse(route.actions[0][1].body),{error:'SIGN_IN_REQUIRED'});assert.equal(route.actions[0][1].status,401);
  assert.equal(await fixture.tryFulfill(requestRoute(locale),'academy'),false);assert.equal(fixture.denials,1);
 }
 const fixture=createAnonymousAcademyBootstrapFixture(origin,'en');
 const outcomes=await Promise.all([fixture.tryFulfill(requestRoute(),'academy'),fixture.tryFulfill(requestRoute(),'academy')]);
 assert.deepEqual(outcomes.sort(),[false,true]);assert.equal(fixture.denials,1);
});

test('method, URL, frame, header, body and phase variants remain outside the fixture',async()=>{
 for(const overrides of [
  ...['POST','HEAD','OPTIONS'].map(value=>({method:()=>value})),
  ...['?view=portrait','?','?token=SYNTHETIC','#private','/'].map(suffix=>({url:()=>origin+'/api/app/bootstrap'+suffix})),
  ...['/api/app/course','/api/app/academy-energywork','/api/app/auth/contact-profile','/api/private'].map(path=>({url:()=>origin+path})),
  ...['https://example.test/api/app/bootstrap','http://SYNTHETIC@127.0.0.1:3100/api/app/bootstrap',origin+'/wrong/../api/app/bootstrap'].map(url=>({url:()=>url})),
  {resourceType:()=> 'document'},{resourceType:()=> 'xhr'},{isNavigationRequest:()=>true},{postData:()=> 'PRIVATE_QA_NOTE_NOT_FOR_MESSENGER'},
  ...['/en/academy?token=SYNTHETIC','/ru/academy','/en/services/dao-health-profile'].map(path=>({frame:()=>({url:()=>origin+path})})),
  {frame:()=>{throw Error('detached')}},{allHeaders:undefined},{allHeaders:async()=>null},{allHeaders:async()=>[]},{allHeaders:async()=>{throw Error('unavailable')}},
  ...['authorization','cookie','Cookie','x-hh-account-id','x-api-key','x-session','x-private-marker','purpose','sec-purpose','next-router-prefetch','rsc'].map(name=>({allHeaders:async()=>({[name]:'SYNTHETIC'})})),
  {allHeaders:async()=>({host:'example.test'})},{allHeaders:async()=>({referer:origin+'/en/academy',Referer:origin+'/en/app/portrait'})},{allHeaders:async()=>({referer:origin+'/en/app/portrait'})},{allHeaders:async()=>({origin:'https://example.test'})},{allHeaders:async()=>({'sec-fetch-site':'cross-site'})},
 ]){
  const fixture=createAnonymousAcademyBootstrapFixture(origin,'en'),route=requestRoute('en',overrides);
  assert.equal(await fixture.tryFulfill(route,'academy'),false);assert.equal(fixture.denials,0);assert.deepEqual(route.actions,[]);
 }
 for(const phase of ['setup','tantra','yggdrasil','dao-entry','dao-save','dao-receipt','temple','unknown'])assert.equal(await createAnonymousAcademyBootstrapFixture(origin,'en').tryFulfill(requestRoute(),phase),false);
 for(const bad of ['https://holistichouse.vercel.app',origin+'/path','http://127.0.0.1:3100?query','http://user@127.0.0.1:3100'])assert.throws(()=>createAnonymousAcademyBootstrapFixture(bad,'en'));
});

const routeSource=read('app/api/app/[...path]/route.js'),sessionSource=read('lib/app/session.js');
async function actualMissingSession({routeText=routeSource,sessionText=sessionSource,missingConfig=false}={}){
 const contracts=compile(read('lib/assessments/contracts.js'));
 const http=compile(read('lib/app/http.js'),{'../assessments/contracts.js':contracts});
 const config=compile(read('lib/app/config.js'),{'../assessments/contracts.js':contracts,
  '../billing/config.js':{getBillingConfig:()=>assert.fail('No billing')},'../billing/manual-config.js':{manualBillingConfig:()=>assert.fail('No billing')}},{URL,Buffer});
 const calls={getUser:0,getSession:0,guestFactories:0,guestOperations:0,pools:0,database:0,repository:0,rate:0};
 const database=compile(read('lib/app/database.js'),{
  'server-only':{},pg:{default:{Pool:class{constructor(){calls.pools++;throw Error('NO_POOL')}}}},'../assessments/contracts.js':contracts,
  './crypto.js':{operationHash:()=>assert.fail('No DB crypto')},'./database-url.js':{resolveDatabaseUrl:()=>{calls.database++;throw Error('NO_DATABASE')}},
  './supabase-ca.js':{SUPABASE_ROOT_2021_CA:'synthetic-not-used'},'./timestamps.js':{databaseTimestamp:()=>assert.fail('No DB timestamp')},
 },{URL});
 const factory=node(read('lib/app/guest-repository.js'),n=>ts.isFunctionDeclaration(n)&&n.name?.text==='createGuestRepository');
 assert.equal(factory.body.statements.length,1);const returned=factory.body.statements[0];assert.ok(ts.isReturnStatement(returned)&&ts.isObjectLiteralExpression(returned.expression));
 assert.ok(returned.expression.properties.every(n=>ts.isMethodDeclaration(n)&&n.modifiers?.some(m=>m.kind===ts.SyntaxKind.AsyncKeyword)));
 const guest=compile(factory.getText(),{}, {transaction:database.transaction});
 const sdk={createServerClient:()=>({auth:{getUser:async()=>{calls.getUser++;return{data:{user:null},error:null}},getSession:async()=>{calls.getSession++;throw Error('NO_SESSION_READ')}}})};
 const session=compile(sessionText,{'server-only':{},'@supabase/ssr':sdk,'../assessments/contracts.js':contracts});
 const handle=node(routeText,n=>ts.isFunctionDeclaration(n)&&n.name?.text==='handle').getText();
 const trip=()=>{calls.repository++;throw Error('NO_REPOSITORY')};
 const globals={...contracts,...http,URL,Buffer,
  createGuestRepository:cfg=>{calls.guestFactories++;const value=guest.createGuestRepository(cfg);return new Proxy(value,{get:(target,key)=>{const entry=target[key];return typeof entry==='function'?()=>{calls.guestOperations++;throw Error('NO_GUEST_OPERATION')}:entry}})},
  createRequestAuth:session.createRequestAuth,getAppConfig:()=>missingConfig?config.getAppConfig({}):({test:true,supabaseUrl:'http://127.0.0.1:54321',publishableKey:'synthetic',origins:[origin]}),
  requestOrigin:config.requestOrigin,requireSameOrigin:()=>assert.fail('No write'),createAppRepository:trip,createPractitionerRepository:trip,createArticleRepository:trip,createPractitionerEventsRepository:trip,
  consumeRate:()=>{calls.rate++;throw Error('NO_RATE_DB')},NextResponse:{json:(body,options)=>({body,...options,cookies:{set:()=>assert.fail('No cookie write')}})}};
 const loaded=compile(handle+'\nexports.handle=handle;',{},globals);
 const response=await loaded.handle({url:origin+'/api/app/bootstrap',method:'GET',headers:new Headers({host:'127.0.0.1:3100'}),cookies:{getAll:()=>[]}},{params:Promise.resolve({path:['bootstrap']})});
 return {response,calls};
}
test('extracted real API/session denial follows pure guest-factory construction but precedes all DB/account operations',async()=>{
 const {response,calls}=await actualMissingSession();
 assert.equal(response.status,401);assert.equal(JSON.stringify(response.body),anonymousBootstrapDenial.body);
 assert.deepEqual({...response.headers},anonymousBootstrapDenial.headers);assert.deepEqual(calls,{getUser:1,getSession:0,guestFactories:1,guestOperations:0,pools:0,database:0,repository:0,rate:0});
});
test('real missing-config503 remains distinct and auth-gate mutations fail the denial proof',async()=>{
 const denied=await actualMissingSession({missingConfig:true});assert.equal(denied.response.status,503);assert.equal(denied.response.body.error,'APP_UNAVAILABLE');assert.equal(denied.calls.getUser,0);
 assert.notEqual(JSON.stringify(denied.response.body),anonymousBootstrapDenial.body);
 const bypass=await actualMissingSession({routeText:routeSource.replace('const actor = await auth.verified(),','const actor = {id:"synthetic-owner"},')});
 assert.equal(bypass.calls.repository,1);assert.notEqual(bypass.response.status,401);
 const missing=await actualMissingSession({sessionText:sessionSource.replace('if (userError || !userData.user)','if (false)')});
 assert.equal(missing.calls.getSession,1);assert.notEqual(missing.response.status,401);
 const earlyRate=await actualMissingSession({routeText:routeSource.replace('const actor = await auth.verified(),','await consumeRate(config, {}); const actor = await auth.verified(),')});
 assert.equal(earlyRate.calls.rate,1);assert.notEqual(earlyRate.response.status,401);
 const earlyRead=await actualMissingSession({routeText:routeSource.replace('const actor = await auth.verified(),','await guestRepo.bootstrap({}); const actor = await auth.verified(),')});
 assert.equal(earlyRead.calls.guestOperations,1);assert.notEqual(earlyRead.response.status,401);
});

test('actual client and Academy effect consume denial as hidden UI, without courses or claimed account success',async()=>{
 const calls=[],states=[],effects=[];
 const client=compile(read('lib/app/client-fetch.js'),{}, {fetch:async(url,options)=>{calls.push({url,options});return{ok:false,status:401,json:async()=>JSON.parse(anonymousBootstrapDenial.body)}}});
 const imports={react:{useState:()=>[null,value=>states.push(value)],useEffect:fn=>effects.push(fn)},'react/jsx-runtime':{},'next/image':{},'next/link':{},'lucide-react':{},
  '@/lib/app/client-fetch':client,'@/lib/inner-growth/course-presets':{getCoursePreset:()=>null},'@/data/academy/energywork-ai-schema':{energyworkSequence:()=>[],energyworkLessonRanges:()=>[]},'./academy-my-courses.module.css':{}};
 const ui=compile(read('components/academy-my-courses.tsx'),imports,{AbortController,window:{addEventListener:()=>{},removeEventListener:()=>{}},document:{visibilityState:'visible',addEventListener:()=>{},removeEventListener:()=>{}}});
 assert.equal(ui.AcademyMyCourses({locale:'en'}),null);const cleanup=effects[0]();for(let i=0;i<6;i++)await Promise.resolve();
 assert.deepEqual(calls.map(row=>row.url),['/api/app/bootstrap']);assert.ok(states.every(value=>value===null));cleanup();
});

test('actual contact fence consumes only the explicit denial and keeps every other API blocked',async()=>{
 const script=read('scripts/verify-contact-channel-chooser-browser.mjs');
 const callback=node(script,n=>ts.isCallExpression(n)&&n.expression.getText()==='context.route').arguments[1];
 const body=callback.body.getText().slice(1,-1),fixture=createAnonymousAcademyBootstrapFixture(origin,'en'),blocked=[],submissions=[];
 const fn=new (Object.getPrototypeOf(async()=>{}).constructor)('route','origin','bootstrapFixture','requestPhase','blocked','submissions','publicJourneyRequestDecision','blockedApiDetails',body);
 const diagnostic=()=>({apiKind:'unclassified'});
 const good=requestRoute();await fn(good,origin,fixture,'academy',blocked,submissions,publicJourneyRequestDecision,diagnostic);
 assert.equal(good.actions[0][1].status,401);assert.deepEqual(blocked,[]);assert.deepEqual(submissions,[]);
 for(const route of [requestRoute(),requestRoute('en',{url:()=>origin+'/api/app/course'}),requestRoute('en',{url:()=>origin+'/api/app/bootstrap?view=portrait'})]) {
  await fn(route,origin,fixture,'academy',blocked,submissions,publicJourneyRequestDecision,diagnostic);assert.deepEqual(route.actions,[['abort']]);
 }
 assert.equal(blocked.length,3);assert.equal(fixture.denials,1);
 assert.match(script,/assert.equal\(bootstrapFixture.denials,1,/);assert.match(script,/assert.deepEqual\(blocked,\[\]/);
 assert.doesNotMatch(script,/console\.filter|console.*SIGN_IN_REQUIRED/);
});
