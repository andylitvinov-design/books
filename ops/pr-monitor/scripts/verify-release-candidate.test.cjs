'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const {verifyCandidate,verifySourceAssets,normalizeOrigin,assetsFrom,CHECKS}=require('./verify-release-candidate.cjs');
const origin='https://holistic-house-pr-monitor-example-super10.vercel.app';
function fixture(overrides={}){
 const data={
  '/':'<!doctype html><html><head></head><body><a href="/pr-monitor.html">Monitor</a></body></html>',
  '/pr-monitor.html':'<!doctype html><html><head><script src="/pr-two-screen-boot.js"></script></head><body><a href="/legacy.html">Fallback</a></body></html>',
  '/legacy.html':'<!doctype html><html><head><link rel="stylesheet" href="/compact.css"></head><body><main><script src="/monitor-core.js"></script></main></body></html>',
  '/pr-two-screen-boot.js':`'use strict';fetch('/legacy.html');const s='<script src="/pr-velocity-three-lines.js"></script>';`,
  '/compact.css':'.a{color:navy;}',
  '/pr-velocity-three-lines.js':"'use strict';function createChart(){return true;}",
  ...overrides
 };
 return async url=>{
  const p=new URL(url).pathname;
  if(p in data&&data[p]===null)return {status:404,headers:{get:()=> 'text/plain'},text:async()=> 'NOT_FOUND'};
  const kind=CHECKS[p]||(p.endsWith('.css')?'css':p.endsWith('.js')?'js':'html');
  const type=kind.startsWith('HH_')?'application/json':kind==='html'?'text/html':kind==='css'?'text/css':'application/javascript';
  const body=p in data?data[p]:kind.startsWith('HH_')?JSON.stringify({schema:kind,ok:true}):kind==='css'?'.a{display:block;}':"'use strict';const marker = true;";
  return {status:200,headers:{get:()=>type},text:async()=>body};
 };
}
test('reject non-deployment HTTP, credentials, ports, query, or arbitrary hosts',()=>{
 for(const url of ['http://example.vercel.app','https://evil.com',
  'https://a.vercel.app:444','https://u:p@a.vercel.app',
  'https://a.vercel.app/api','https://a.vercel.app/?token=x'])
  assert.throws(()=>normalizeOrigin(url));
});
test('discover assets in legacy HTML and dynamically injected boot JS',()=>{
 assert.deepEqual(assetsFrom('<script src="/a.js?v=1"></script><link href="/b.css">'),['/a.js','/b.css']);
});
test('complete candidate accepts real HTML, JS, CSS and typed API',async()=>{
 const r=await verifyCandidate(origin,fixture());
 assert.equal(r.ok,true,r.errors.join('; '));assert.equal(r.checked,r.expected);
 assert.ok(r.checked>=Object.keys(CHECKS).length);
 assert.equal(r.digests['/legacy.html'].length,64);
});
test('404 on monitor entry or dynamically referenced asset fails CLOSED',async()=>{
 for(const path of ['/legacy.html','/monitor-core.js','/pr-velocity-three-lines.js']){
  const r=await verifyCandidate(origin,fixture({[path]:null}));
  assert.equal(r.ok,false,path);assert.ok(r.errors.some(e=>e.includes(path)),r.errors.join('; '));
 }
});
test('200 HTML instead of JS or wrong JSON schema fails CLOSED',async()=>{
 const fetch=fixture({'/api/pr-three-kpis':'{"schema":"WRONG"}'});
 const r=await verifyCandidate(origin,fetch);
 assert.equal(r.ok,false);assert.ok(r.errors.some(e=>e.includes('WRONG_API_SCHEMA')));
});
test('soft 200 monitor placeholder without real boot fails CLOSED',async()=>{
 const r=await verifyCandidate(origin,fixture({'/pr-monitor.html':'<html><body>empty page but valid HTML</body></html>'}));
 assert.equal(r.ok,false);assert.ok(r.errors.some(e=>e.includes('MONITOR_ENTRY_NOT_WIRED')));
});

test('incomplete source archive fails closed even when entry HTML exists',t=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'hh-monitor-release-'));
 t.after(()=>fs.rmSync(root,{recursive:true,force:true}));
 const files={
  'index.html':'<html><head></head><body><a href="/pr-monitor.html">go</a></body></html>',
  'pr-monitor.html':'<html><head><script src="/pr-two-screen-boot.js"></script></head><body>boot</body></html>',
  'legacy.html':'<html><head><script src="/monitor-core.js"></script></head><body><main>old</main></body></html>',
  'pr-two-screen-boot.js':"'use strict';let s='/pr-lifecycle-ribbon.js';fetch('/legacy.html');"
 };
 for(const [f,body]of Object.entries(files))fs.writeFileSync(path.join(root,f),body);
 const bad=verifySourceAssets(root);assert.equal(bad.ok,false);
 assert.ok(bad.errors.some(e=>e.includes('monitor-core.js')));
 assert.ok(bad.errors.some(e=>e.includes('pr-lifecycle-ribbon.js')));
 fs.writeFileSync(path.join(root,'monitor-core.js'),"'use strict';const r = true;");
 fs.writeFileSync(path.join(root,'pr-lifecycle-ribbon.js'),"'use strict';const r = true;");
 assert.equal(verifySourceAssets(root).ok,true);
});
