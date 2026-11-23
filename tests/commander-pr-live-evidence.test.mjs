import test from 'node:test';
import assert from 'node:assert/strict';
import {verifyServedPrEvidence,verifyPrLiveReadback} from
 '../lib/agent-director/pr-live-identity.mjs';
const MERGE='a'.repeat(40),SERVED='b'.repeat(40);
const DEPLOY='dpl_A12b34C56d78';
const pr={number:4737,state:'closed',merged:true,merged_at:'2026-11-17T14:55:41Z',
 merge_commit_sha:MERGE,
 head:{repo:{full_name:'andylitvinov-design/books'}},
 base:{ref:'codex/public-book-library',repo:{full_name:'andylitvinov-design/books'}}};
const proof={schema:'HH_PUBLIC_RELEASE_EVIDENCE_V1',available:true,
 sha:SERVED,deployment_id:DEPLOY,project_id:'prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b',
 environment:'production',branch:'codex/public-book-library',repo:'andylitvinov-design/books'};
const status={total_count:1,statuses:[{context:'Vercel – codex-public-book-library',state:'success',
 updated_at:'2026-11-17T16:20:00Z',
 target_url:'https://vercel.com/super10/codex-public-book-library/'+DEPLOY.slice(4)}]};
const comparison={status:'ahead',behind_by:0,base_commit:{sha:MERGE},merge_base_commit:{sha:MERGE}};
const site={status:200,host:'holistichouse.vercel.app',contentType:'text/html',html:true};
const sample={pr,proof,statuses:status,comparison,site};
const verified=x=>verifyServedPrEvidence(x).verified_live;
test('LIVE requires a canonical deployed descendant of the exact GitHub merge',()=>{
 const result=verifyServedPrEvidence(sample);
 assert.equal(result.verified_live,true);
 assert.equal(result.production_sha,SERVED);
 assert.equal(result.merge_sha,MERGE);
 assert.equal(result.deployment_id,DEPLOY);
 assert.equal(result.alias,'holistichouse.vercel.app');
 assert.equal(verified({...sample,comparison:{status:'identical',base_commit:{sha:MERGE}}, 
   proof:{...proof,sha:MERGE}}),true);
});
test('GitHub merge alone, unrelated READY or changed alias cannot imply LIVE',()=>{
 const failures=[
  {...sample,proof:{...proof,sha:'c'.repeat(40)},comparison:{status:'diverged'}},
  {...sample,proof:{...proof,available:false}},
  {...sample,proof:{...proof,environment:'preview'}},
  {...sample,proof:{...proof,project_id:'wrong-project'}},
  {...sample,proof:{...proof,branch:'main'}},
  {...sample,proof:{...proof,repo:'other/repository'}},
  {...sample,statuses:{...status,statuses:[{...status.statuses[0],state:'failure'}]}},
  {...sample,statuses:{...status,statuses:[{...status.statuses[0],context:'Vercel – another-project'}]}},
  {...sample,statuses:{...status,statuses:[{...status.statuses[0],target_url:'https://example.net/fake'}]}},
  {...sample,comparison:{status:'behind'}},
  {...sample,comparison:{status:'ahead',behind_by:0,merge_base_commit:{sha:'c'.repeat(40)}}},
  {...sample,site:{...site,status:500}},
  {...sample,site:{...site,host:'fake.vercel.app'}},
  {...sample,pr:{...pr,merged:false}},
  {...sample,pr:{...pr,merge_commit_sha:null}},
 ];
 for(const entry of failures)
  assert.equal(verified(entry),false,JSON.stringify(entry).slice(0,200));
});
test('the newest Vercel status outranks historical success',()=>{
 const newer={...status.statuses[0],state:'failure',updated_at:'2026-11-17T16:30:00Z'};
 assert.equal(verified({...sample,statuses:{total_count:2,
   statuses:[status.statuses[0],newer]}}),false);
});
test('on-demand public readback never sends secrets or creates a deployment',async()=>{
 const calls=[];
 const fetchImpl=async(url,init={})=>{
  calls.push({url,method:init.method,redirect:init.redirect,hasAuth:!!init.headers?.Authorization});
  if(url==='https://holistichouse.vercel.app/api/public/release-evidence')
   return new Response(JSON.stringify(proof),{status:200,
    headers:{'Content-Type':'application/json'}});
  if(url==='https://holistichouse.vercel.app/en')
   return new Response('<!doctype html><html lang="en"><body>Site</body></html>',{
    status:200,headers:{'Content-Type':'text/html'}});
  if(url.includes('/commits/'+SERVED+'/status?'))
   return new Response(JSON.stringify(status),{status:200,
    headers:{'Content-Type':'application/json'}});
  if(url.includes('/compare/'+MERGE+'...'+SERVED+'?'))
   return new Response(JSON.stringify(comparison),{status:200,
    headers:{'Content-Type':'application/json'}});
  throw Error('unexpected URL');
 };
 const result=await verifyPrLiveReadback(pr,{fetchImpl});
 assert.equal(result.verified_live,true);
 assert.equal(calls.length,4);
 assert.ok(calls.every(c=>c.method==='GET'&&!c.hasAuth));
 assert.equal(calls[0].redirect,'error');
 const noMerge=await verifyPrLiveReadback({...pr,merged:false},{fetchImpl});
 assert.equal(noMerge.verified_live,false);
 assert.equal(calls.length,4,'unmerged PR never contacts Vercel');
});
test('network outage or incomplete served proof remains unknown',async()=>{
 const missing=await verifyPrLiveReadback(pr,{fetchImpl:async()=>{throw Error('offline')}});
 assert.equal(missing.verified_live,false);
 const unavailable=await verifyPrLiveReadback(pr,{fetchImpl:async()=>new Response(
  JSON.stringify({schema:proof.schema,available:false}),{
   status:200,headers:{'Content-Type':'application/json'}})});
 assert.equal(unavailable.verified_live,false);
});
