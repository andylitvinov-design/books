'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),
 fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const ROOT=path.resolve(__dirname,'..');
const read=p=>fs.readFileSync(path.join(ROOT,p),'utf8');
const M=require('../pr-completion-mobile-model.js');
const API=require('../api/commander-pr-completion.js').__test;
const SHA='a'.repeat(40),MSHA='b'.repeat(40),ID='123e4567-e89b-42d3-a456-426614174000';
const item={requestId:ID,prNumber:4940,status:'WATCHING',
 headSha:SHA,reasonCode:'AWAIT_EXISTING_CORE_AND_AUTO_MERGE',
 firstAttemptAt:'2026-11-22T14:20:00Z',lastCheckedAt:'2026-11-22T14:25:00Z',
 createdAt:'2026-11-22T14:19:00Z',checkedCount:3,
 dispatchAccepted:false};
test('PR input strictly accepts digits and never infers a URL/command',()=>{
 assert.equal(M.prNumber('4940'),4940);
 assert.equal(M.prNumber('00004940'),null);
 assert.equal(M.prNumber(' 4940 '),4940);
 for(const v of ['#4940','PR 4940','0','999999999','',null,undefined,-1,5.5,'12;42'])
  assert.equal(M.prNumber(v),null,String(v));
 assert.equal(M.prNumber(99999999),99999999);
});
test('only authenticated owner queue schema supplies tracked rows, deduplicated by PR',()=>{
 const r=M.rowsFromStatus({schema:API.SCHEMA,ownerOnly:true,items:[item,item,
  {...item,prNumber:4963,status:'BLOCKED',headSha:'not-sha'},
  {...item,prNumber:0}, {prNumber:10,status:'INVALID'}]});
 assert.equal(r.length,2);
 assert.equal(r[0].prNumber,4940);
 assert.equal(r[1].prNumber,4963);
 assert.equal(r[1].headSha,null);
 assert.equal(M.rowsFromStatus({schema:API.SCHEMA,ownerOnly:false,items:[item]}),null);
 assert.equal(M.rowsFromStatus({schema:'UNKNOWN',ownerOnly:true,items:[item]}),null);
 assert.equal(M.rowsFromStatus({schema:API.SCHEMA,ownerOnly:true,items:'fake'}),null);
});
test('CI failure is exact HEAD only; old red attempts cannot poison current green HEAD',()=>{
 const prior={headSha:'c'.repeat(40),runId:123,conclusion:'failure',recordedAt:'2026-11-22T14:25:00Z'};
 const current={headSha:SHA,runId:456,conclusion:'failure',category:'TEST_FAILURE',
  recordedAt:'2026-11-22T14:22:00Z'};
 const result=M.present(item,[prior,current]);
 assert.equal(result.ciEvent.runId,456);
 assert.equal(result.stages[2].state,'error');
 const updated=M.present({...item,headSha:'d'.repeat(40)},[prior,current]);
 assert.equal(updated.ciEvent,null);
 assert.equal(updated.stages[2].state,'active');
});
test('Merge never marks LIVE green; Watchdog and AI have separate proofs',()=>{
 const row={...item,status:'MERGED',reasonCode:'GITHUB_MERGE_VERIFIED',
  mergeSha:MSHA,firstAttemptAt:null,checkedCount:0,dispatchAccepted:false};
 const v=M.present(row);
 assert.equal(v.stages[0].state,'done');
 assert.equal(v.stages[1].state,'waiting');
 assert.equal(v.stages[3].state,'done');
 assert.equal(v.stages[4].state,'waiting');
 assert.equal(v.hasLiveProof,false);
 assert.match(v.current,/LIVE проверяется отдельно/);
 assert.equal(M.needsAutoRefresh([row]),false);
 assert.equal(M.needsAutoRefresh([item]),true);
});
test('only three owner operations are accepted; no Worker/OIDC routes from UI',()=>{
 assert.deepEqual(API.parseBody({action:'status'}).body,{action:'status'});
 assert.deepEqual(API.parseBody({action:'history',prNumber:4940}).body,
  {action:'history',prNumber:4940,page:1});
 assert.deepEqual(API.parseBody({action:'submit',prNumber:4940,requestId:ID}).body,
  {action:'submit',prNumber:4940,requestId:ID});
 for(const action of ['next','finish','arm_dispatch','repair','dispatch','merge','live'])
  assert.equal(API.parseBody({action,prNumber:4940}).error,'ACTION_NOT_ALLOWED');
 assert.equal(API.parseBody({action:'submit',prNumber:4940,requestId:ID,token:'secret'}).error,'EXTRA_FIELDS_NOT_ALLOWED');
 assert.equal(API.parseBody({action:'submit',prNumber:4940,requestId:'invalid'}).error,'REQUEST_ID_INVALID');
 assert.equal(API.parseBody({action:'history',prNumber:4940,page:2000}).error,'PAGE_INVALID');
 assert.equal(API.parseBody({action:'status',prNumber:-1}).error,'PR_NUMBER_INVALID');
 assert.equal(API.parseBody('{oops').error,'INVALID_JSON');
});
function loadRoute(store,fetcher){
 const sandbox={module:{exports:{}},require:s=>{
   if(s!=='../lib/commander-private-store')throw Error('unexpected requirement '+s);
   return store;
 },process:{env:{HH_PM_SUPABASE_URL:'https://shervdixkaxurnaecioe.supabase.co',
  HH_PM_SUPABASE_PUBLISHABLE_KEY:'sb_publishable_'+'x'.repeat(28)}},
 AbortController,fetch:fetcher,setTimeout,clearTimeout};
 vm.runInNewContext(read('api/commander-pr-completion.js'),sandbox,{filename:'api/commander-pr-completion.js'});
 return sandbox.module.exports;
}
function mockStore({owner=true,origin=true,token=true}={}){
 const calls=[];
 const store={isOriginAllowed:()=>origin,tokenFromRequest:()=>token?'signed.owner.session.jwt':null,
 sendJson:(res,status,data)=>{res.status=status;res.data=data;return res;},
 callStore:async(req,action,body,opt)=>{
   calls.push({action,opt});return owner?{status:200,data:{owner:true,privateStoreConfigured:true}}:
    {status:403,data:{owner:false}};
 }};
 return {store,calls};
}
const req=(body,method='POST')=>({method,headers:{origin:'https://holistic-house-agents-director.vercel.app',
 host:'holistic-house-agents-director.vercel.app','sec-fetch-site':'same-origin'},body});
test('browser cannot call private queue without verified owner and same-origin POST',async()=>{
 for(const opts of [{owner:false},{origin:false},{token:false}]){
  const {store,calls}=mockStore(opts);
  let remoteCalls=0;
  const handler=loadRoute(store,async()=>{remoteCalls++;throw Error('MUST NOT CALL PRIVATE EDGE')});
  const response={setHeader(){}};
  await handler(req({action:'submit',prNumber:4940,requestId:ID}),response);
  assert.equal(remoteCalls,0);
  assert.ok(response.status===401||response.status===403);
 }
});
test('validated owner submit forwards only approved fields to existing Supabase Edge',async()=>{
 const {store,calls}=mockStore(),remote=[];
 const handler=loadRoute(store,async(url,options)=>{
  remote.push({url,options});
  return {status:200,text:async()=>JSON.stringify({schema:API.SCHEMA,
    item:{...item,status:'QUEUED'}})};
 });
 const output={setHeader(){}};
 await handler(req({action:'submit',prNumber:4940,requestId:ID}),output);
 assert.equal(output.status,200);
 assert.equal(remote.length,1);
 assert.equal(remote[0].url,API.EDGE);
 assert.deepEqual(JSON.parse(remote[0].options.body),{action:'submit',prNumber:4940,requestId:ID});
 assert.ok(remote[0].options.headers.Authorization.startsWith('Bearer '));
 assert.ok(!JSON.stringify(output.data).includes('signed.owner.session.jwt'));
 assert.equal(calls.length,1);
});
test('mobile Tasks integrates one module above existing tasks and preserves navigation',()=>{
 const html=read('project-management-public.html');
 const key=html.indexOf('id="pm-pr-completion"');
 assert.ok(key>0&&key<html.indexOf('class="pm-overview"'));
 assert.ok(html.indexOf('pr-completion-mobile-model.js')<html.indexOf('pr-completion-mobile.js'));
 assert.match(html,/id="pm-pr-number"/);
 assert.match(html,/id="pm-pr-submit"/);
 assert.match(html,/id="pm-pr-completion-list"/);
 assert.match(html,/id="pm-root"/);
 assert.match(html,/project-management-nav\.js/);
 assert.match(html,/Остальные задачи/);
 const css=read('pr-completion-mobile.css');
 assert.match(css,/@media\(max-width:360px\)/);
 assert.match(css,/\.pm-pr-progress/);
 assert.match(css,/\.pm-pr-live-form/);
});
test('sign-in retains Tasks return path without exposing Google or Supabase tokens',()=>{
 const auth=read('commander-auth.js');
 const owner=read('owner-google-signin.js');
 assert.match(auth,/hh\.commander\.monitor\.return\.v1/);
 assert.match(auth,/project-management-public\.html/);
 assert.match(owner,/project-management-public\.html/);
 const client=read('pr-completion-mobile.js');
 assert.match(client,/sessionStorage\.setItem\(REMEMBER,AUTH_NEXT\)/);
 assert.match(client,/crypto\?\.randomUUID/);
 assert.match(client,/state\.rows\.find\(row=>row\.prNumber===n\)/);
 assert.match(client,/without tokens|Source of truth/i);
 assert.doesNotMatch(client,/service_role|GITHUB_TOKEN|HH_AUTOMERGE_TOKEN|SUPABASE_ANON_KEY/);
});

test('only exact signed historical LIVE receipt can mark LIVE as historically verified',()=>{
 const row={...item,status:'MERGED',mergeSha:MSHA};
 const evidence={journey:{live_receipt_found:true,live_proof_status:'VERIFIED_HISTORICAL'},
  live_evidence:{merge_sha:MSHA,deployment_id:'dpl_12345678901234',
   receipt_url:'https://github.com/andylitvinov-design/books/pull/4940#issuecomment-123',
   live_at:'2026-11-22T14:26:00Z'}};
 const proof=M.safeHistoricalLiveProof(row,evidence);
 assert.equal(proof.status,'VERIFIED_HISTORICAL');
 assert.equal(M.present(row,[],evidence).stages[4].state,'done');
 for(const bad of [
  {...evidence,stale:true},
  {...evidence,journey:{...evidence.journey,live_receipt_found:false}},
  {...evidence,live_evidence:{...evidence.live_evidence,merge_sha:SHA}},
  {...evidence,live_evidence:{...evidence.live_evidence,receipt_url:'https://evil.example/forged'}},
  {...evidence,live_evidence:{...evidence.live_evidence,deployment_id:'not-a-deployment'}}
 ]){
  assert.equal(M.safeHistoricalLiveProof(row,bad),null);
  assert.equal(M.present(row,[],bad).stages[4].state,'waiting');
 }
 const client=read('pr-completion-mobile.js');
 assert.match(client,/\/api\/pr-attribution\?pr=/);
 assert.match(client,/if\(!item\|\|item\.status!=='MERGED'/);
});
