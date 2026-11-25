import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHomeRouteSupervisor} from '../scripts/home-route-supervisor.mjs';
const origin='http://127.0.0.1:3129';
const make=()=>createHomeRouteSupervisor({origin,engine:'webkit',width:390,stage:()=> 'ru-to-en',pageUrl:()=>origin+'/ru'});
const route=(abort=async()=>{})=>({request:()=>({url:()=>origin+'/?_rsc=secret'}),abort});
test('active fetch rejection is contained but fatal with original cause; abort is attempted',async()=>{
 const supervisor=make();const error=new Error('ECONNRESET secret');let aborted=0;
 await supervisor.handle(route(async reason=>{assert.equal(reason,'failed');aborted++;}),async()=>{throw error;});
 assert.equal(aborted,1);assert.equal(supervisor.failure.cause,error);assert.throws(()=>supervisor.assertHealthy(),/transport failed/);assert.equal(supervisor.pending,0);assert.ok(!JSON.stringify(supervisor.events).includes('secret'));
});
test('normal routing action/result ordering is untouched and cases are independent',async()=>{
 const bad=make(),good=make();const events=[];
 await Promise.all([bad.handle(route(),async()=>{throw Error('reset');}),good.handle(route(),async()=>events.push('real-action'))]);
 assert.deepEqual(events,['real-action']);assert.doesNotThrow(()=>good.assertHealthy());assert.throws(()=>bad.assertHealthy());
});
test('abort failure cannot replace original fatal transport cause',async()=>{
 const supervisor=make();const original=Error('original');
 await supervisor.handle(route(async()=>{throw Error('closed');}),async()=>{throw original;});
 assert.equal(supervisor.failure.cause,original);assert.ok(supervisor.events.some(e=>e.kind==='abort-failed'));
});
test('released gated task drains before cleanup; stuck task gets bounded fatal timeout',async()=>{
 const supervisor=make();let release;const gate=new Promise(r=>release=r);
 const task=supervisor.handle(route(),async()=>gate);assert.equal(supervisor.pending,1);release();await supervisor.drain(100);await task;assert.equal(supervisor.pending,0);supervisor.assertHealthy();
 const stuck=make();let unstuck;const pending=stuck.handle(route(),()=>new Promise(r=>unstuck=r));await stuck.drain(1);assert.throws(()=>stuck.assertHealthy());unstuck();await pending;
});
test('bounded metadata excludes private paths/query and retains fatal records beyond normal cap',async()=>{
 const s=createHomeRouteSupervisor({origin,engine:'webkit',width:1365,stage:()=>'/private/secret',pageUrl:()=>origin+'/en/client/secret'},1);
 const r={request:()=>({url:()=>origin+'/en/client/secret?token=secret'}),abort:async()=>{}};
 await s.handle(r,async()=>{});await s.handle(r,async()=>{throw Error('secret');});
 assert.equal(s.events.length,1);assert.ok(s.dropped>0);assert.equal(s.failures.length,1);assert.ok(!JSON.stringify(s.events).includes('secret'));assert.throws(()=>s.assertHealthy());
});
test('integration preserves totals, fatal gates and ordered cleanup with original error priority',()=>{
 const s=readFileSync(new URL('../scripts/verify-home-locale-switch.mjs',import.meta.url),'utf8');
 assert.match(s,/firstClickRetained\)\.length, 8/);assert.match(s,/freeJourney\)\.length, 24/);assert.match(s,/assert\.deepEqual\(errors, \[\]\)/);
 assert.ok(s.lastIndexOf('releaseHeldRsc();')<s.indexOf('await transport.drain();'));
 assert.ok(s.indexOf('await transport.drain();')<s.indexOf('await context.close();'));
 assert.match(s,/caseFailure = transport.failure \?\? error/);assert.match(s,/if \(caseFailure\) throw caseFailure/);assert.ok(!s.includes('Promise.race'));
});
test('actual cleanup drains and serializes original transport failure despite both close failures',async()=>{
 const s=readFileSync(new URL('../scripts/verify-home-locale-switch.mjs',import.meta.url),'utf8');
 const start=s.indexOf('    delayedLocale = null;\n    releaseHeldRsc();');
 const end=s.indexOf('\n  }\n  if (caseFailure)',start);
 const block=s.slice(start,end);
 const transport=make();const original=Error('private transport detail');
 await transport.handle(route(),async()=>{throw original;});
 const order=[];let artifact;
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 const run=new AsyncFunction('transport','page','context','browser','writeFile','releaseHeldRsc',`
 let delayedLocale='en',phase='ru-to-en',caseFailure;const cleanupErrors=[];
 const navigationTraceKey='key',evidence='evidence',live=false,engine='webkit',width=390,navigationRequests=[],errors=[],serverLifecycle=[];
 ${block}
 if(caseFailure) throw caseFailure;
 `);
 await assert.rejects(run(transport,{evaluate:async()=>[]},{close:async()=>{order.push('context');throw Error('close');}},{close:async()=>{order.push('browser');throw Error('close');}},async(_,text)=>artifact=JSON.parse(text),()=>order.push('release')),error=>error.cause===original);
 assert.deepEqual(order,['release','context','browser']);assert.deepEqual(artifact.cleanupErrors,['context-close-failed','browser-close-failed']);assert.equal(artifact.failure,'route-transport-failed');assert.equal(artifact.transportFailures.length,1);assert.ok(!JSON.stringify(artifact).includes('private transport detail'));
});
test('late Home RSC retains correlated start/failure after unrelated event saturation',async()=>{
 let page=origin+'/ru';const s=createHomeRouteSupervisor({origin,engine:'webkit',width:390,stage:()=> 'ru-to-en',pageUrl:()=>page},2);
 for(let i=0;i<5;i++) await s.handle({request:()=>({url:()=>origin+'/asset.js'}),abort:async()=>{}},async()=>{});
 const r={request:()=>({url:()=>origin+'/?_rsc=secret',headers:()=>({rsc:'1',authorization:'secret'})}),abort:async()=>{}};
 await s.handle(r,async perform=>perform('fetch',async()=>{page=origin+'/';throw Object.assign(Error('secret'),{code:'ECONNRESET'});}));
 assert.equal(s.homeRscEvents[0].kind,'route-start');assert.equal(s.failures[0].rsc,true);assert.equal(s.failures[0].operation,'fetch');assert.equal(s.failures[0].category,'connection-reset');assert.equal(s.failures[0].start.observedPagePath,'/ru');assert.equal(s.failures[0].observedPagePath,'/');assert.equal(s.failures[0].start.id,s.failures[0].id);assert.ok(!JSON.stringify(s.failures).includes('secret'));
});
test('fetch versus fulfill failure remains distinguished and fatal without retry',async()=>{
 for(const operation of ['fetch','fulfill']){
  const s=make();let calls=0;
  await s.handle(route(),async perform=>perform(operation,async()=>{calls++;throw Error('Target closed');}));
  assert.equal(calls,1);assert.equal(s.failures[0].operation,operation);assert.equal(s.failures[0].category,'target-closed');assert.throws(()=>s.assertHealthy());
 }
});
test('rejected drains still close and serialize; failed evidence write cannot mask original failure',async()=>{
 const s=readFileSync(new URL('../scripts/verify-home-locale-switch.mjs',import.meta.url),'utf8');const start=s.indexOf('    delayedLocale = null;\n    releaseHeldRsc();');const end=s.indexOf('\n  }\n  if (caseFailure)',start);const block=s.slice(start,end);
 const AsyncFunction=Object.getPrototypeOf(async function(){}).constructor;
 const run=new AsyncFunction('transport','page','context','browser','writeFile','prior',`
 let delayedLocale='en',phase='ru-to-en',caseFailure=prior;const cleanupErrors=[];const releaseHeldRsc=()=>{};
 const navigationTraceKey='key',evidence='evidence',live=false,engine='webkit',width=390,navigationRequests=[],errors=[],serverLifecycle=[];
 ${block}
 if(caseFailure) throw caseFailure;
 `);
 for(const failingDrain of [1,2]) for(const hasPrior of [false,true]) {
  const prior=hasPrior?Error('original'):undefined;let drains=0;const actions=[];let artifact;
  const transport={events:[],homeRscEvents:[],failures:[],dropped:0,async drain(){if(++drains===failingDrain)throw Error('drain secret');}};
  await assert.rejects(run(transport,{evaluate:async()=>[]},{close:async()=>actions.push('context')},{close:async()=>actions.push('browser')},async(_,text)=>{actions.push('write');artifact=JSON.parse(text);},prior),error=>hasPrior?error===prior:/cleanup failed/.test(error.message));
  assert.deepEqual(actions,['context','browser','write']);assert.equal(drains,2);assert.ok(artifact.cleanupErrors.includes(failingDrain===1?'initial-drain-failed':'final-drain-failed'));assert.ok(!JSON.stringify(artifact).includes('secret'));
 }
 const prior=Error('original');
 await assert.rejects(run({events:[],failures:[],drain:async()=>{}},{evaluate:async()=>[]},{close:async()=>{}},{close:async()=>{}},async()=>{throw Error('write failure');},prior),error=>error===prior);
});
