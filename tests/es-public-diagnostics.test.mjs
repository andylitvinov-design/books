import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import { publicRoute, createPublicDiagnostics, installPublicLifecycle } from '../scripts/es-public-diagnostics.mjs';
const origin='https://127.0.0.1:3443';
test('public routes emit only path and RSC flag; private, external and credentials excluded',()=>{
 assert.deepEqual(publicRoute('/es/masters?_rsc=secret&token=secret#secret',origin),{path:'/es/masters',rsc:true});
 for(const path of ['/es/client','/en/app','/api/client/secret','/es/unknown','https://outside.test/es','https://user:secret@127.0.0.1:3443/es']) assert.equal(publicRoute(path,origin),null);
 assert.equal(publicRoute('/es','file://127.0.0.1'),null);
});
test('bounded metadata ignores arbitrary values and private stage paths',()=>{
 const d=createPublicDiagnostics(origin,2);
 d.record('request-start','/es?_rsc=secret',{stage:'webkit 1365 /es/client',request:1,body:'secret',headers:{secret:1},status:200});
 d.record('pageerror','/es',{error:'other',stage:'webkit 1365 remembered language'});
 d.record('pageerror','/es',{stage:'webkit 1365 search'});
 d.record('pageerror','/es',{stage:'webkit 1365 search'});
 assert.equal(d.events.length,3);assert.equal(d.events[0].stage,'unlisted');assert.equal(d.events[1].stage,'remembered language');
 assert.ok(!JSON.stringify(d.events).includes('secret'));assert.ok(!JSON.stringify(d.events).includes('/es/client'));
});
test('request lifecycle retains IDs, responses and failures without changing event objects',()=>{
 const p=new EventEmitter();p.url=()=>origin+'/es';p.mainFrame=()=>null;
 const d=createPublicDiagnostics(origin);d.observePage(p,()=> 'webkit 1365 search');
 const r={url:()=>origin+'/es/masters?_rsc=secret'};
 p.emit('request',r);p.emit('response',{url:r.url,request:()=>r,status:()=>200});p.emit('requestfailed',r);
 p.emit('pageerror',new Error('secret due to access control checks.'));
 assert.deepEqual(d.events.map(e=>e.kind),['request-start','response','request-failed','pageerror']);
 assert.equal(d.events[0].request,d.events[2].request);assert.equal(d.events[1].status,200);assert.equal(d.events[3].error,'access-control');assert.ok(!JSON.stringify(d.events).includes('secret'));
 assert.doesNotThrow(()=>p.emit('request',{url(){throw Error('observer');}}));
});
test('proxy observes outcomes without handling errors or writing responses',()=>{
 const d=createPublicDiagnostics(origin); const incoming={url:'/es?_rsc=secret'};
 const outgoing=new EventEmitter();outgoing.statusCode=200;const upstream=new EventEmitter();
 d.observeProxy(incoming,outgoing,upstream);upstream.emit('response',{statusCode:200});outgoing.emit('finish');outgoing.emit('close');upstream.emit('error',new Error('secret'));
 assert.deepEqual(d.events.map(e=>e.kind),['proxy-start','proxy-response','proxy-finish','proxy-close','proxy-error']);
 assert.equal(new Set(d.events.map(e=>e.request)).size,1);assert.ok(!JSON.stringify(d.events).includes('secret'));
});
test('browser lifecycle does not replace fetch/history or cancel errors',async()=>{
 const handlers={}; const records=[];const fetch=()=>Promise.resolve();const history={};
 const window={fetch,history,__esPublicEvidence:async e=>records.push(e),addEventListener:(k,f)=>handlers[k]=f};
 vm.runInNewContext(`(${installPublicLifecycle})()`,{window,location:{origin,pathname:'/es'},Math,Date});
 handlers.pagehide();handlers.error();handlers.unhandledrejection();
 assert.equal(window.fetch,fetch);assert.equal(window.history,history);assert.equal(records.length,4);assert.equal(new Set(records.map(e=>e.document)).size,1);
 window.__esPublicEvidence=()=>{throw Error('unavailable');};assert.doesNotThrow(()=>handlers.load());
});
test('integration retains fatal gate, original checks and navigation sequence exactly',()=>{
 let source=readFileSync(new URL('../scripts/verify-es-public-site.mjs',import.meta.url),'utf8');
 assert.match(source,/page\.on\('pageerror', error => errors\.push\(error\.message\)\)/);
 assert.match(source,/assert\.deepEqual\(errors,\[\]\)/);
 assert.ok(!source.includes('errors.filter'));assert.ok(!source.includes('errors.length ='));
 const start=source.indexOf('        // Do not abort');const end=source.indexOf('        results.push',start);
 assert.equal(createHash('sha256').update(source.slice(start,end)).digest('hex'),'c7de0338d185c732f43a2c0503d4615edffc3d138318117d100b2995df64a4b4','Frozen published action/assertion block');
});

test('each exact browser group retains reserved capacity and reports drops; kinds and source paths are bounded',()=>{
 const d=createPublicDiagnostics(origin,1);
 for(const engine of ['chromium','webkit']) for(const width of [390,1365]) {
  d.record('request-start','/es',{stage:`${engine} ${width} search`,source:'/es/services?secret=value'});
  d.record('request-start','/es',{stage:`${engine} ${width} search`});
 }
 d.record('secret-malicious-kind','/es');
 assert.equal(d.events.length,4);assert.equal(Object.values(d.dropped).reduce((a,b)=>a+b,0),4);
 assert.equal(d.events[3].engine,'webkit');assert.equal(d.events[3].width,1365);assert.equal(d.events[3].observedFramePath,'/es/services');
 const p=createPublicDiagnostics(origin);p.record('request-start','/es',{source:'/es/client?id=secret'});assert.ok(!('observedFramePath' in p.events[0]));
 assert.ok(!JSON.stringify(d.events).includes('secret'));
});

test('proxy and ordinary requests cannot exhaust error or lifecycle evidence',()=>{
 const d=createPublicDiagnostics(origin,1);const fields={stage:'webkit 1365 search'};
 for(const kind of ['proxy-start','proxy-finish','request-start','request-finished','pageerror','pagehide']) d.record(kind,'/es',fields);
 assert.deepEqual(d.events.map(e=>e.kind),['proxy-start','request-start','pageerror','pagehide']);
 assert.equal(d.dropped['webkit-1365:proxy'],1);assert.equal(d.dropped['webkit-1365:requests'],1);
});

test('private observer location retains redacted error and lifecycle evidence but no requests',()=>{
 const d=createPublicDiagnostics(origin);const fields={stage:'webkit 1365 /es/client',document:123};
 for(const kind of ['request-start','pageerror','pagehide','error']) d.record(kind,'/es/client/private-id?token=secret',fields);
 assert.deepEqual(d.events.map(e=>e.kind),['pageerror','pagehide','error']);
 assert.ok(d.events.every(e=>e.path===null && e.document===123));
 assert.ok(!/client|private-id|token|secret/.test(JSON.stringify(d.events)));
 d.record('pageerror','https://outside.test/es',fields);assert.equal(d.events.length,3);
});

test('diagnostic write failure cannot prevent original proxy and app cleanup',()=>{
 const source=readFileSync(new URL('../scripts/verify-es-public-site.mjs',import.meta.url),'utf8');
 const cleanup=source.slice(source.lastIndexOf('  try {saveDiagnostics();}'));
 const calls=[];const failure=new Error('disk unavailable');
 const run=new Function('saveDiagnostics','proxy','app',cleanup.slice(0,cleanup.lastIndexOf('}')));
 assert.throws(()=>run(()=>{throw failure;},{closeAllConnections(){calls.push('connections');},close(){calls.push('proxy');}},{kill(signal){calls.push(signal);}}),error=>error===failure);
 assert.deepEqual(calls,['connections','proxy','SIGTERM']);
});
