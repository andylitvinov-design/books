'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {trustedContext,latestVercelStatus,evidenceDecision,run,ALIAS,PROJECT_ID}=require('../scripts/ci-pr-live-verifier.cjs');
const sha='a'.repeat(40),id='dpl_6fNgUY64EQdmMK9baHvgxc7K32oU';
const status={context:'Vercel',state:'success',
 target_url:'https://vercel.com/super10/codex-public-book-library/6fNgUY64EQdmMK9baHvgxc7K32oU',
 created_at:'2026-11-01T22:23:22Z'};
const deployment={id,projectId:PROJECT_ID,readyState:'READY',target:'production',
 alias:[ALIAS],meta:{githubCommitSha:sha,githubCommitRef:'codex/public-book-library',
 githubOrg:'andylitvinov-design',githubRepo:'books'}};
const alias={alias:ALIAS,projectId:PROJECT_ID,deploymentId:id};
const publicSite={status:200,contentType:'text/html; charset=utf-8',host:ALIAS,html:true};
const ctx={repo:{owner:'andylitvinov-design',repo:'books'},
 ref:'refs/heads/codex/bootstrap-books',eventName:'schedule'};
const core=()=>({info(){},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}});
function fixture(){
 let reads=[];
 const github={rest:{repos:{
  getBranch:async()=>({data:{commit:{sha}}}),
  getCombinedStatusForRef:async()=>({data:{total_count:1,statuses:[status]}})
 }}};
 const fetchImpl=async url=>{
  reads.push(url);
  if(url.includes('/v13/deployments/'))return {status:200,async json(){return deployment}};
  if(url.includes('/v4/aliases/'))return {status:200,async json(){return alias}};
  return {status:200,url:'https://'+ALIAS+'/en',
   headers:{get:()=> 'text/html; charset=utf-8'},
   async text(){return '<!doctype html><html lang="en"></html>'}};
 };
 return {github,fetchImpl,reads};
}
test('only trusted control-plane event can query live production evidence',()=>{
 assert.equal(trustedContext(ctx),true);
 assert.equal(trustedContext({...ctx,ref:'refs/heads/codex/public-book-library'}),false);
 assert.equal(trustedContext({...ctx,eventName:'pull_request'}),false);
 assert.equal(trustedContext({...ctx,repo:{owner:'outsider',repo:'books'}}),false);
 const event={...ctx,eventName:'repository_dispatch',payload:{
  action:'vercel.deployment.success',client_payload:{environment:'production',
   git:{sha},project:{id:PROJECT_ID}}}};
 assert.equal(trustedContext(event),true);
 assert.equal(trustedContext({...event,payload:{...event.payload,
  client_payload:{...event.payload.client_payload,environment:'preview'}}}),false);
 assert.equal(trustedContext({...event,payload:{...event.payload,
  client_payload:{...event.payload.client_payload,git:{sha:'invalid'}}}}),false);
 assert.equal(trustedContext({...event,payload:{...event.payload,action:'vercel.deployment.pending'}}),false);
});
test('latest Vercel status cannot be substituted by an older green result',()=>{
 const fresh={...status,state:'failure',updated_at:'2026-11-02T00:00:00Z'};
 assert.equal(latestVercelStatus([status,fresh]),fresh);
 assert.equal(latestVercelStatus([]),null);
});
test('only exact SHA, production READY, current alias ID and working HTML prove LIVE',()=>{
 assert.equal(evidenceDecision({sha,status,deployment,alias,publicSite}).reason,'LIVE_VERIFIED');
 for(const changed of [
  {sha:'b'.repeat(40)}, {deployment:{...deployment,readyState:'BUILDING'}},
  {deployment:{...deployment,meta:{...deployment.meta,githubCommitSha:'b'.repeat(40)}}},
  {deployment:{...deployment,target:'preview'}},
  {deployment:{...deployment,id:'dpl_other'}},
  {deployment:{...deployment,alias:[]}},
  {alias:{...alias,deploymentId:'dpl_old'}},
  {alias:{...alias,projectId:'prj_other'}},
  {publicSite:{...publicSite,status:503}},
  {publicSite:{...publicSite,host:'another.vercel.app'}},
  {publicSite:{...publicSite,html:false}},
  {status:{...status,state:'pending'}}
 ]){
  const outcome=evidenceDecision({sha,status,deployment,alias,publicSite,...changed});
  assert.equal(outcome.verified_live,false,JSON.stringify(changed));
 }
});
test('missing Vercel credential reports partial evidence and never claims LIVE',async()=>{
 const f=fixture();
 const r=await run({github:f.github,core:core(),context:ctx,vercelToken:'',
  fetchImpl:f.fetchImpl,now:Date.parse('2026-11-01T22:30:00Z')});
 assert.equal(r.verified_live,false);
 assert.equal(r.reason,'VERCEL_READ_CREDENTIAL_UNAVAILABLE');
 assert.equal(r.production_sha,sha);
 assert.equal(f.reads.length,0);
});
test('read-only verifier confirms exact Vercel READY and live alias for GitHub HEAD',async()=>{
 const f=fixture();
 const r=await run({github:f.github,core:core(),context:ctx,vercelToken:'synthetic',
  fetchImpl:f.fetchImpl,now:Date.parse('2026-11-01T22:30:00Z')});
 assert.equal(r.reason,'LIVE_VERIFIED');assert.equal(r.verified_live,true);
 assert.equal(r.production_sha,sha);assert.equal(r.deployment_id,id);
 assert.equal(f.reads.length,3);
 assert.ok(r.evidence_urls.includes('https://'+ALIAS+'/en'));
});
test('HTTP 403 or Vercel API failure never triggers further attempts or declares LIVE',async()=>{
 const f=fixture();
 f.fetchImpl=async()=>({status:403,async json(){return {message:'denied'}}});
 const r=await run({github:f.github,core:core(),context:ctx,vercelToken:'synthetic',
  fetchImpl:f.fetchImpl});
 assert.equal(r.verified_live,false);assert.equal(r.reason,'LIVE_EVIDENCE_READ_FAILED');
 assert.equal(r.error_code,'VERCEL_API_HTTP_403');
});
test('no GitHub status or bad status pagination cannot prove a deployment',async()=>{
 const f=fixture();
 f.github.rest.repos.getCombinedStatusForRef=async()=>({data:{total_count:101,statuses:[status]}});
 const r=await run({github:f.github,core:core(),context:ctx,vercelToken:'synthetic',
  fetchImpl:f.fetchImpl});
 assert.equal(r.verified_live,false);assert.equal(r.reason,'INCOMPLETE_GITHUB_STATUS_HISTORY');
 assert.equal(f.reads.length,0);
});

test('outdated Vercel completion event cannot certify newer production HEAD',async()=>{
 const f=fixture();
 const event={...ctx,eventName:'repository_dispatch',payload:{
  action:'vercel.deployment.success',client_payload:{environment:'production',
   git:{sha:'b'.repeat(40)},project:{id:PROJECT_ID}}}};
 const result=await run({github:f.github,core:core(),context:event,
  vercelToken:'synthetic',fetchImpl:f.fetchImpl});
 assert.equal(result.verified_live,false);
 assert.equal(result.reason,'EVENT_SHA_NOT_CURRENT_PRODUCTION');
 assert.equal(f.reads.length,0);
});
test('hourly conflict diagnostics reuse the read-only LIVE job and pinned production code',()=>{
 const s=require('node:fs').readFileSync('.github/workflows/hh-pr-full-inventory.yml','utf8');
 const start=s.indexOf('      - name: Resolve production SHA for hourly conflict diagnostics');
 assert.ok(start>0);const part=s.slice(start);
 assert.match(part,/if: github\.event_name == 'schedule'/);
 assert.match(part,/ref: \$\{\{ steps\.conflict_base\.outputs\.sha \}\}/);
 assert.match(part,/persist-credentials: false/);
 assert.match(part,/node scripts\/pr-sweep-guard\.mjs route-conflicts/);
 assert.doesNotMatch(part,/HH_AUTOMERGE_TOKEN|HH_VERCEL_READ_TOKEN/);
});
