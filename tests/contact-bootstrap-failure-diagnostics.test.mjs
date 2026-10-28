import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createAnonymousAcademyBootstrapFixture,bootstrapFixtureFailureDetails,appendBootstrapFixtureFailure} from '../scripts/helpers/anonymous-bootstrap-fixture.mjs';
const origin='http://127.0.0.1:3100',read=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const blob=source=>{const b=Buffer.from(source);return createHash('sha1').update('blob '+b.length+'\0').update(b).digest('hex')};
function route(overrides={}) {
 const actions=[];const request={url:()=>origin+'/api/app/bootstrap',method:()=> 'GET',resourceType:()=> 'fetch',isNavigationRequest:()=>false,postData:()=>null,
  frame:()=>({url:()=>origin+'/en/academy'}),allHeaders:async()=>({accept:'*/*',referer:origin+'/en/academy','sec-fetch-site':'same-origin'}),...overrides};
 return{actions,request:()=>request,fulfill:async result=>actions.push({kind:'fulfill',result}),abort:()=>assert.fail('Fixture never decides the outer abort'),continue:()=>assert.fail('Fixture never permits real API access')};
}

test('exact candidate rejection reasons are fixed, bounded observations without changing any denial decision',async()=>{
 const cases=[
  [{method:()=> 'POST'},'method'],[{resourceType:()=> 'xhr'},'resource'],[{isNavigationRequest:()=>true},'navigation'],[{postData:()=> 'SYNTHETIC_PRIVATE'},'body'],
  [{frame:()=>({url:()=>origin+'/en/services/dao-health-profile'})},'frame'],
  [{allHeaders:async()=>null},'headers-unavailable'],[{allHeaders:async()=>({accept:'*/*',Accept:'SYNTHETIC_PRIVATE'})},'duplicate-header'],
  ...['authorization','cookie','x-hh-account-id','x-api-key','x-session'].map(name=>[{allHeaders:async()=>({[name]:'SYNTHETIC_PRIVATE'})},'auth-session-header']),
  ...['purpose','sec-purpose','next-router-prefetch','rsc'].map(name=>[{allHeaders:async()=>({[name]:'SYNTHETIC_PRIVATE'})},'prefetch-header']),
  [{allHeaders:async()=>({'x-unknown-private-header':'SYNTHETIC_PRIVATE'})},'unrecognized-header'],
  [{allHeaders:async()=>({host:'SYNTHETIC_PRIVATE'})},'host'],[{allHeaders:async()=>({referer:origin+'/en/academy?token=SYNTHETIC_PRIVATE'})},'referer'],
  [{allHeaders:async()=>({origin:'https://SYNTHETIC_PRIVATE.test'})},'origin'],[{allHeaders:async()=>({'sec-fetch-site':'cross-site'})},'fetch-site'],
  [{allHeaders:async()=>{throw Error('SYNTHETIC_PRIVATE')}},'request-unavailable'],[{frame:()=>{throw Error('SYNTHETIC_PRIVATE')}},'request-unavailable'],
 ];
 for(const [overrides,reason] of cases){
  const fixture=createAnonymousAcademyBootstrapFixture(origin,'en'),request=route(overrides);
  assert.equal(await fixture.tryFulfill(request,'academy'),false);assert.equal(fixture.denials,0);assert.deepEqual(request.actions,[]);
  assert.equal(fixture.observations.length,1);assert.equal(fixture.observations[0].reason,reason);
  for(const entry of fixture.observations)assert.ok(['none','authorization','cookie','account-id','api-key','session','multiple','unclassified'].includes(entry.credentialClass));
  assert.doesNotMatch(JSON.stringify(fixture.observations.map(({credentialClass,...rest})=>rest)),/SYNTHETIC_PRIVATE|x-unknown|token=|127\.0\.0\.1|authorization|cookie/);
 }
 const unused=createAnonymousAcademyBootstrapFixture(origin,'en');assert.deepEqual(unused.observations,[]);
 assert.equal(await unused.tryFulfill(route(),'dao-save'),false);assert.deepEqual(unused.observations,[{reason:'phase',credentialClass:'none',scenarioPhase:'dao-save',framePageAtDecision:'academy',denialState:'unused'}]);
});

test('observations never promote URL variants and cap independently of the unchanged per-fixture allowance',async()=>{
 const fixture=createAnonymousAcademyBootstrapFixture(origin,'en');
 for(const url of [origin+'/api/app/bootstrap?view=portrait',origin+'/api/app/bootstrap?token=SYNTHETIC_PRIVATE','https://example.test/api/app/bootstrap',origin+'/api/app/bootstrap?',origin+'/wrong/../api/app/bootstrap']) {
  const request=route({url:()=>url});assert.equal(await fixture.tryFulfill(request,'academy'),false);assert.deepEqual(request.actions,[]);
 }
 assert.deepEqual(fixture.observations,[]);
 for(let i=0;i<30;i++)assert.equal(await fixture.tryFulfill(route({method:()=> 'POST'}),'academy'),false);
 assert.equal(fixture.observations.length,16);assert.equal(fixture.denials,0);
 const allowed=route();assert.equal(await fixture.tryFulfill(allowed,'academy'),true);assert.equal(fixture.denials,1);assert.equal(allowed.actions[0].result.status,401);
 assert.equal(await fixture.tryFulfill(route(),'academy'),false);assert.equal(fixture.observations.length,16);
 fixture.observations[0].reason='SYNTHETIC_PRIVATE';assert.equal(fixture.observations[0].reason,'method');
 const concurrent=createAnonymousAcademyBootstrapFixture(origin,'en');assert.deepEqual((await Promise.all([concurrent.tryFulfill(route(),'academy'),concurrent.tryFulfill(route(),'academy')])).sort(),[false,true]);assert.equal(concurrent.denials,1);
 assert.deepEqual(concurrent.observations.map(x=>x.reason).sort(),['already-denied','fulfilled']);
});

test('failure snapshot preserves fixed blocked aliases but strips arbitrary fields and all raw input',()=>{
 const fixture={denials:0,observations:[{reason:'auth-session-header',scenarioPhase:'academy',framePageAtDecision:'academy',denialState:'unused'},{reason:'SYNTHETIC_PRIVATE',scenarioPhase:'SYNTHETIC_PRIVATE',framePageAtDecision:'SYNTHETIC_PRIVATE',denialState:'SYNTHETIC_PRIVATE',raw:'SYNTHETIC_PRIVATE'}]};
 const blocked=[{category:'unexpected-api',method:'GET',apiKind:'tantra-guide',scenarioPhase:'tantra',framePageAtBlock:'tantra',resourceType:'fetch',navigation:false,raw:'SYNTHETIC_PRIVATE'},
  {category:'SYNTHETIC_PRIVATE',method:'SYNTHETIC_PRIVATE',apiKind:'SYNTHETIC_PRIVATE',scenarioPhase:'SYNTHETIC_PRIVATE',framePageAtBlock:'SYNTHETIC_PRIVATE',resourceType:'SYNTHETIC_PRIVATE',navigation:'SYNTHETIC_PRIVATE'}];
 const snapshot=bootstrapFixtureFailureDetails(fixture,blocked,'dao-receipt');assert.equal(snapshot.denialState,'unused');assert.equal(snapshot.scenarioPhase,'dao-receipt');assert.equal(snapshot.blocked[0].apiKind,'tantra-guide');assert.equal(snapshot.blocked[1].category,'unclassified');assert.equal(snapshot.blocked[1].navigation,false);assert.doesNotMatch(JSON.stringify(snapshot),/SYNTHETIC_PRIVATE|raw/);
 const capped=bootstrapFixtureFailureDetails({denials:2,observations:Array(40).fill(fixture.observations[0])},Array(40).fill(blocked[0]),'SYNTHETIC_PRIVATE');assert.equal(capped.decisions.length,16);assert.equal(capped.blocked.length,16);assert.equal(capped.blockedTruncated,true);assert.equal(capped.denialState,'unexpected');assert.equal(capped.scenarioPhase,'unclassified');
});

test('actual final gates save diagnostics before unchanged count or blocked failures and never emit a success-only snapshot',()=>{
 const script=read('scripts/verify-contact-channel-chooser-browser.mjs');const start=script.indexOf('          try {\n          appendBootstrapFixtureFailure(');const end=script.indexOf('\n        } finally {',start);assert.ok(start>0&&end>start);const gate=script.slice(start,end);
 for(const [denials,blocked,throws] of [[0,[{category:'unexpected-api',method:'GET',apiKind:'account-bootstrap',scenarioPhase:'academy',framePageAtBlock:'academy',resourceType:'fetch',navigation:false}],true],[0,[],true],[1,[{category:'private-text'}],true],[1,[],false]]) {
  const fixtureFailures=[],bootstrapFixture={denials,observations:[]};const run=()=>new Function('fixtureFailures','bootstrapFixture','blocked','requestPhase','appendBootstrapFixtureFailure','assert',gate)(fixtureFailures,bootstrapFixture,blocked,'dao-receipt',appendBootstrapFixtureFailure,assert);
  if(throws){assert.throws(run);assert.equal(fixtureFailures.length,1);assert.equal(fixtureFailures[0].blocked.length,blocked.length)}else{run();assert.deepEqual(fixtureFailures,[])}
 }
 assert.match(script,/results,errors,fixtureFailures,failure:failure\?\.message\|\|null/);
 let original=script.replace('import { createAnonymousAcademyBootstrapFixture, appendBootstrapFixtureFailure }','import { createAnonymousAcademyBootstrapFixture }')
  .replace('const fixtureFailures = [];\n','')
  .replace('          try {\n          appendBootstrapFixtureFailure(fixtureFailures,bootstrapFixture,blocked,requestPhase);\n          } catch { /* Diagnostics cannot replace either original final assertion. */ }\n','')
  .replace('results,errors,fixtureFailures,failure:','results,errors,failure:')
  .replace('  try {\n  await writeFile(', '  await writeFile(')
  .replace('\n  } catch { if (!failure) failure = new Error("CONTACT_DIAGNOSTIC_WRITE_FAILED"); }','')
  .replace('try { console.log("PASS browser messenger handoff on Chromium and WebKit",results.length); } catch { throw new Error("CONTACT_DIAGNOSTIC_LOG_FAILED"); }','console.log("PASS browser messenger handoff on Chromium and WebKit",results.length);');
 assert.equal(blob(original),'4d41127036fce60620361c09cce6fb1df7c2c231');
});

test('erasing every passive fixture addition recovers the exact current policy preimage',()=>{
 let source=read('scripts/helpers/anonymous-bootstrap-fixture.mjs').replace("import { types as nodeTypes } from 'node:util';\n",'');
 const declarations=source.indexOf('const credentialClasses = '),factory=source.indexOf('export function createAnonymousAcademyBootstrapFixture');assert.ok(declarations>0&&factory>declarations);source=source.slice(0,declarations)+source.slice(factory);
 const observations=source.indexOf('  const observations = [];'),returned=source.indexOf('  const fixture = {\n    get denials()',observations);assert.ok(observations>0&&returned>observations);source=source.slice(0,observations)+source.slice(returned);source=source.replace('  const fixture = {\n    get denials()','  return {\n    get denials()').replace('      diagnosticState.denials = denials;\n','').replace('  weakSet(diagnosticStates,fixture,diagnosticState);\n  return fixture;\n','');
 source=source.replace('    get observations() { return observations.map(entry => ({...entry})); },\n','')
  .replace("      if (denials !== 0) return reject('already-denied',phase,route);\n      if (phase !== 'academy') return reject('phase',phase,route);","      if (denials !== 0 || phase !== 'academy') return false;");
 const start=source.indexOf("        if (request.url() !== origin + '/api/app/bootstrap') return false;"),end=source.indexOf('        // Full header observation',start);assert.ok(start>0&&end>start);
 source=source.slice(0,start)+"        if (request.url() !== origin + '/api/app/bootstrap' || request.method() !== 'GET' ||\n            request.resourceType() !== 'fetch' || request.isNavigationRequest() !== false ||\n            ![null, ''].includes(request.postData()) || request.frame().url() !== origin + '/' + locale + '/academy') return false;\n"+source.slice(end);
 const headerStart=source.indexOf('        if (new Set(names.map('),headerEnd=source.indexOf('        const value = ',headerStart);assert.ok(headerStart>0&&headerEnd>headerStart);
 source=source.slice(0,headerStart)+"        if (new Set(names.map(name => name.toLowerCase())).size !== names.length || names.some(name => !browserHeaders.has(name.toLowerCase()))) return false;\n"+source.slice(headerEnd);
 source=source.replace(/return reject\('[a-z-]+',phase,route\);/g,'return false;').replace("      record('fulfilled',phase,route);\n",'');
 assert.equal(blob(source),'6980fb276b179d65f620d805b0893847512c96e9');
});

test('snapshot rejects accessors/proxies and copies only bounded own data without input methods or coercion',()=>{
 let touched=0;const poison=()=>{touched++;throw Error('SYNTHETIC_PRIVATE')};
 const proxy=new Proxy({},{get:poison,getOwnPropertyDescriptor:poison,ownKeys:poison,getPrototypeOf:poison});
 const revoked=Proxy.revocable([],{});revoked.revoke();
 const phase={toString:poison,[Symbol.toPrimitive]:poison};
 const observations=Array.from({length:100},()=>({reason:'method',scenarioPhase:'academy',framePageAtDecision:'academy',denialState:'unused'}));
 observations.slice=poison;Object.defineProperty(observations,'map',{get:poison});
 const blocked=Array.from({length:100},()=>({category:'unexpected-api',method:'GET',apiKind:'account-bootstrap',scenarioPhase:'academy',framePageAtBlock:'academy',resourceType:'fetch',navigation:false}));
 blocked.slice=()=>Array(100).fill('SYNTHETIC_PRIVATE');blocked.map=poison;
 const normal=bootstrapFixtureFailureDetails({denials:0,observations},blocked,phase);assert.equal(normal.decisions.length,16);assert.equal(normal.blocked.length,16);assert.equal(normal.scenarioPhase,'unclassified');assert.equal(normal.blockedTruncated,true);
 assert.doesNotMatch(JSON.stringify(normal),/SYNTHETIC_PRIVATE/);assert.equal(touched,0);
 const getterEntry={};Object.defineProperty(getterEntry,'category',{get:poison});
 const coercionEntry={category:phase,method:phase,apiKind:phase,navigation:phase};
 const indexGetter=[];Object.defineProperty(indexGetter,'0',{get:poison});
 const cases=[
  [null,[]],[proxy,[]],[revoked.proxy,[]],[{denials:0,get observations(){return poison()}},[]],
  [{get denials(){return poison()},observations:[]},[]],[{denials:0,observations:proxy},[]],[{denials:0,observations:revoked.proxy},[]],
  [{denials:0,observations:[]},null],[{denials:0,observations:[]},proxy],[{denials:0,observations:[]},revoked.proxy],
  [{denials:0,observations:[]},[null,getterEntry,proxy,revoked.proxy,coercionEntry]],
  [{denials:0,observations:[]},indexGetter],[{denials:0,observations:indexGetter},[]],
  [{denials:0,observations:[]},{get length(){return poison()}}],
 ];
 for(const [fixture,entries] of cases){const snapshot=bootstrapFixtureFailureDetails(fixture,entries,phase);assert.ok(snapshot.decisions.length<=16&&snapshot.blocked.length<=16);assert.doesNotMatch(JSON.stringify(snapshot),/SYNTHETIC_PRIVATE/)}
 assert.equal(touched,0,'No getter, proxy trap, input method or coercion runs');
 const actual=createAnonymousAcademyBootstrapFixture(origin,'en');Object.defineProperty(actual,'observations',{get:poison});
 assert.equal(bootstrapFixtureFailureDetails(actual,[],'academy').denialState,'unused');assert.equal(touched,0,'Known actual fixture uses private data, never public getters');
});

test('actual final gates preserve the original assertion despite poisoned snapshot inputs or capture methods',()=>{
 const script=read('scripts/verify-contact-channel-chooser-browser.mjs');const start=script.indexOf('          try {\n          appendBootstrapFixtureFailure(');const end=script.indexOf('\n        } finally {',start);const gate=script.slice(start,end);assert.ok(start>0&&end>start);
 const poison=()=>{throw Error('SYNTHETIC_PRIVATE')};const proxy=new Proxy({},{get:poison,getOwnPropertyDescriptor:poison});const revoked=Proxy.revocable({},{});revoked.revoke();
 const getter={};Object.defineProperty(getter,'category',{get:poison});const originalMessage='Exactly one observed anonymous Academy probe receives the explicit auth denial';
 for(const blocked of [[null],[getter],[proxy],[revoked.proxy]])for(const poisonedSink of [false,true]) {
  const fixtureFailures=[];if(poisonedSink)fixtureFailures.push=poison;
  const fixture={denials:0,get observations(){return poison()}};
  const run=()=>new Function('fixtureFailures','bootstrapFixture','blocked','requestPhase','appendBootstrapFixtureFailure','assert',gate)(fixtureFailures,fixture,blocked,'academy',appendBootstrapFixtureFailure,assert);
  assert.throws(run,error=>error.code==='ERR_ASSERTION'&&error.message.includes(originalMessage)&&!error.message.includes('SYNTHETIC_PRIVATE'));
 }
 for(const snapshot of [appendBootstrapFixtureFailure,poison]) {
  const fixtureFailures=[],fixture={denials:1,observations:[]},blocked=[{category:'private-text'}];
  const run=()=>new Function('fixtureFailures','bootstrapFixture','blocked','requestPhase','appendBootstrapFixtureFailure','assert',gate)(fixtureFailures,fixture,blocked,'academy',snapshot,assert);
  assert.throws(run,error=>error.code==='ERR_ASSERTION'&&error.message.includes('No real API/write/provider operation attempted')&&!error.message.includes('SYNTHETIC_PRIVATE'));
 }
});

test('existing sole artifact write and PASS log cannot replace a primary assertion or emit raw diagnostic exceptions',async()=>{
 const script=read('scripts/verify-contact-channel-chooser-browser.mjs');const tail=script.slice(script.indexOf('let failure = null;'));const AsyncFunction=Object.getPrototypeOf(async()=>{}).constructor;
 assert.equal((tail.match(/await writeFile\(/g)||[]).length,1);assert.equal((tail.match(/console\.log\(/g)||[]).length,1);
 const primaryErrors=[(()=>{try{assert.equal(0,1,'ORIGINAL_COUNT_ASSERTION')}catch(error){return error}})(),(()=>{try{assert.deepEqual([{category:'private-text'}],[],'ORIGINAL_BLOCKED_ASSERTION')}catch(error){return error}})()];
 for(const primary of primaryErrors)for(const serializeFails of [false,true])for(const writeFails of [false,true]) {
  let writes=0,logs=0;const run=new AsyncFunction('runEngine','chromium','webkit','assert','errors','results','fixtureFailures','writeFile','output','origin','live','console','JSON',tail);
  await assert.rejects(run(async()=>{throw primary},{},{},assert,[],Array(30).fill({}),[],async()=>{writes++;if(writeFails)throw Error('SYNTHETIC_PRIVATE_WRITE')},'unused',origin,false,{log:()=>{logs++;throw Error('SYNTHETIC_PRIVATE_LOG')}},serializeFails?{stringify:()=>{throw Error('SYNTHETIC_PRIVATE_JSON')}}:JSON),error=>error===primary);
  assert.equal(writes,serializeFails?0:1);assert.equal(logs,0);
 }
 for(const kind of ['write','log','json']) {
  const run=new AsyncFunction('runEngine','chromium','webkit','assert','errors','results','fixtureFailures','writeFile','output','origin','live','console','JSON',tail);
  await assert.rejects(run(async()=>{},{},{},assert,[],Array(30).fill({}),[],async()=>{if(kind==='write')throw Error('SYNTHETIC_PRIVATE_WRITE')},'unused',origin,false,{log:()=>{if(kind==='log')throw Error('SYNTHETIC_PRIVATE_LOG')}},kind==='json'?{stringify:()=>{throw Error('SYNTHETIC_PRIVATE_JSON')}}:JSON),error=>error.message===(kind==='log'?'CONTACT_DIAGNOSTIC_LOG_FAILED':'CONTACT_DIAGNOSTIC_WRITE_FAILED'));
 }
});

test('capture reads neither public fixture getters nor mutable sink methods before the original count assertion',()=>{
 const script=read('scripts/verify-contact-channel-chooser-browser.mjs');const start=script.indexOf('          try {\n          appendBootstrapFixtureFailure(');const end=script.indexOf('\n        } finally {',start);assert.ok(start>0&&end>start);const gate=script.slice(start,end);
 let reads=0,methods=0;const fixture={get denials(){reads++;return reads===1?0:1},observations:[]};const sink=[];sink.push=()=>{methods++;fixture.denials=1;throw Error('SYNTHETIC_PRIVATE')};
 const run=()=>new Function('fixtureFailures','bootstrapFixture','blocked','requestPhase','appendBootstrapFixtureFailure','assert',gate)(sink,fixture,[],'academy',appendBootstrapFixtureFailure,assert);
 assert.throws(run,error=>error.code==='ERR_ASSERTION'&&error.actual===0&&error.expected===1);assert.equal(reads,1,'Only the unchanged primary assertion reads its public getter');assert.equal(methods,0);assert.equal(sink.length,1);
 const revoked=Proxy.revocable([],{});revoked.revoke();const poison=new Proxy([],{get(){throw Error('SYNTHETIC_PRIVATE')},defineProperty(){throw Error('SYNTHETIC_PRIVATE')}});
 for(const badSink of [null,revoked.proxy,poison,Object.freeze([])])assert.doesNotThrow(()=>appendBootstrapFixtureFailure(badSink,{denials:0,observations:[]},[],'academy'));
 let blockedReads=0;const blockedProxy=new Proxy([],{get(){blockedReads++;throw Error('SYNTHETIC_PRIVATE_LENGTH')}});appendBootstrapFixtureFailure([],{denials:0,observations:[]},blockedProxy,'academy');assert.equal(blockedReads,0,'Capture never reads input blocked.length');
 const capped=Array(16).fill(null);appendBootstrapFixtureFailure(capped,{denials:0,observations:[]},[],'academy');assert.equal(capped.length,16);
});
