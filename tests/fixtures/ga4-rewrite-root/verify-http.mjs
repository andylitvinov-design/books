import assert from 'node:assert/strict';
import {spawn} from 'node:child_process';
import {writeFileSync} from 'node:fs';
const base='http://127.0.0.1:3241',results=[];
const server=spawn(process.execPath,['node_modules/next/dist/bin/next','start','--hostname','127.0.0.1','--port','3241'],{cwd:process.cwd(),env:{PATH:process.env.PATH,HOME:'/tmp',NODE_ENV:'production',NEXT_TELEMETRY_DISABLED:'1'},stdio:['ignore','pipe','pipe']});
let log='';server.stdout.on('data',x=>log+=x);server.stderr.on('data',x=>log+=x);
try {
 const deadline=Date.now()+30000;
 while(true){try{if((await fetch(base)).ok)break;}catch{}assert.ok(Date.now()<deadline,'Next startup');await new Promise(r=>setTimeout(r,100));}
 for(const path of ['/','/books/known-public','/books/SYNTHETIC_PRIVATE_TOKEN?secret=SYNTHETIC_PRIVATE_QUERY','/books/unknown/extra','/analytics-excluded-not-found']){
  const response=await fetch(base+path,{redirect:'manual'}),body=await response.text();
  const missing=!['/','/books/known-public'].includes(path);
  writeFileSync(missing?'last-missing.html':'last-public.html',body);
  assert.equal(response.status,missing?404:200,path);assert.equal(response.headers.get('location'),null,'rewrite must not redirect visible URL');
  if(missing){assert.ok(body.includes('data-proof-root\\\":\\\"excluded'),'excluded root in server flight');assert.ok(body.includes('<html id="__next_error__">'),'Next error document shell');}else assert.ok(body.includes('data-proof-root="public"'),path);
  if(missing){assert.match(body,/<meta name="robots" content="noindex(?:, nofollow)?"\/>/);assert.doesNotMatch(body,/data-proof-root="public"/);}
  results.push({kind:'document',path,status:response.status,root:missing?'excluded':'public',urlUnredirected:response.url===base+path,noindex:missing});
 }
 const state=encodeURIComponent(JSON.stringify(['',{children:['(public)',{children:['__PAGE__',{}]},null,null,true]}]));
 for(const path of ['/books/known-public','/books/SYNTHETIC_PRIVATE_TOKEN?secret=SYNTHETIC_PRIVATE_QUERY']){
  const response=await fetch(base+path,{headers:{rsc:'1','next-router-state-tree':state,'next-url':'/'},redirect:'manual'}),body=await response.text();
  writeFileSync(path.includes('SYNTHETIC')?'rsc-unknown.txt':'rsc-known.txt',body);
  const missing=path.includes('SYNTHETIC');
  assert.equal(response.headers.get('location'),null);assert.match(response.headers.get('content-type'),/text\/x-component/);
  assert.ok(body.includes(missing?'(excluded)':'(public)'),'flight selects expected independent root');
  results.push({kind:'RSC',path,status:response.status,selectedRoot:missing?'excluded':'public',clientNavigationExecuted:false});
 }
 writeFileSync('../rewrite-404-mini-http-results.json',JSON.stringify({passed:true,next:'15.5.21',results,limits:['HTTP/RSC only; browser Link/push/replace before-history document boundary not executed','HTTP-only verifier does not execute the fixture SDK loader','No claim of full application, BFCache or withdrawal coverage']},null,2));
 console.log(JSON.stringify(results,null,2));
} finally {server.kill('SIGTERM');writeFileSync('../rewrite-404-mini-server.log',log);}
