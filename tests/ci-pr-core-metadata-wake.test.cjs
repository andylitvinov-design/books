'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {run,eligible,signedReservation,WAKE_MARKER}=
  require('../scripts/ci-pr-core-metadata-wake.cjs');
const {taskFor,commentBody,reservation}=require('../scripts/ci-pr-task-state.cjs');
const SHA='a'.repeat(40),TOKEN='secret-test-token',NOW=Date.parse('2026-11-02T15:00:00Z');
const repo='andylitvinov-design/books';
const context={repo:{owner:'andylitvinov-design',repo:'books'},
  eventName:'workflow_dispatch',ref:'refs/heads/codex/bootstrap-books',runId:900};
const fakePR=(changes={})=>({
  number:10,state:'open',draft:false,node_id:'PR_NODE_10',body:'## Approved original PR body',
  user:{login:'andylitvinov-design'},mergeable:true,mergeable_state:'blocked',
  base:{ref:'codex/public-book-library'},
  head:{ref:'fix/source-10',sha:SHA,repo:{full_name:repo}},
  labels:[{name:'hh:ci-needed'}],...changes
});
const bot={id:41898282,login:'github-actions[bot]',type:'Bot'};
const app={id:15368,slug:'github-actions'};
function fixture(opts={}){
  let pr=opts.pr||fakePR(),patched=0;
  const key=taskFor(pr,{})?.task_key||'b'.repeat(32);
  const res=reservation({schema:'HH_PR_TASK_V1',task_key:key,pr_number:10,
    head_sha:SHA,head_ref:'fix/source-10',base_ref:'codex/public-book-library',
    lane:'ci',reason_code:'missing-core'},NOW-10000,42);
  const signed={id:501,user:bot,performed_via_github_app:app,body:commentBody(res)};
  const comments=opts.comments||[signed],calls=[],receipts=[];
  const github={rest:{
    pulls:{get:async()=>({data:pr}),list:async()=>({data:opts.children||[]})},
    issues:{listComments:async()=>({data:comments}),
      createComment:async x=>{
        if(opts.receiptDenied)throw Error('denied');
        receipts.push(x.body);
        return {data:{id:800+receipts.length}};
      }}
  },request:async()=>({data:{total_count:opts.coreHistory??0,
    workflow_runs:opts.coreHistory?[{id:999}]:[]}})};
  const fetcher=async(url,settings)=>{
    calls.push(settings.method+':'+url.slice('https://api.github.com'.length));
    assert.equal(settings.headers.Authorization,'Bearer '+TOKEN);
    if(url.endsWith('/user'))
      return {ok:true,status:200,json:async()=>({login:opts.wrongOwner?'stranger':'andylitvinov-design'})};
    if(settings.method==='GET')
      return {ok:true,status:200,json:async()=>({...pr})};
    assert.equal(settings.method,'POST');
    assert.ok(url.endsWith('/graphql'));
    const {query,variables}=JSON.parse(settings.body);
    assert.equal(variables.id,'PR_NODE_10');
    const draft=query.includes('convertPullRequestToDraft');
    const ready=query.includes('markPullRequestReadyForReview');
    assert.ok(draft||ready);
    patched++;
    if(draft&&opts.draftDenied)return {ok:false,status:403,json:async()=>({message:'denied'})};
    if(ready&&opts.readyDenied)return {ok:false,status:403,json:async()=>({message:'denied'})};
    pr={...pr,draft:!ready};
    const field=draft?'convertPullRequestToDraft':'markPullRequestReadyForReview';
    return {ok:true,status:200,json:async()=>({data:{[field]:{
      pullRequest:{id:pr.node_id,isDraft:pr.draft}}}})};
  };
  const execute=(over={})=>run({github,context,token:TOKEN,number:10,expectedSha:SHA,
    taskKey:key,reservationRunId:'42',fetcher,now:NOW,...over});
  return {execute,calls,receipts,get patched(){return patched},get pr(){return pr},key,signed};
}
test('metadata CI wake requires exact authenticated reservation and changes no source SHA',async()=>{
 const f=fixture();const r=await f.execute();
 assert.equal(r.status,'CI_WAKE_REQUESTED');
 assert.equal(r.metadataEditAccepted,true);
 assert.equal(r.claimed,true);
 assert.equal(r.sourceChanged,false);
 assert.equal(r.coreRunVerified,false);
 assert.equal(f.patched,2,'both Draft and Ready GraphQL transitions were accepted');
 assert.equal(f.pr.body,'## Approved original PR body');
 assert.equal(f.pr.draft,false);
 assert.deepEqual(f.calls.filter(x=>x.includes('/graphql')),
   ['POST:/graphql','POST:/graphql']);
 assert.ok(f.receipts.some(x=>x.includes(WAKE_MARKER)));
 assert.ok(f.receipts.some(x=>x.includes('"state":"CLAIMED"')));
 assert.ok(f.receipts.some(x=>x.includes('"state":"CI_WAKE_REQUESTED"')));
 assert.ok(!JSON.stringify(r).includes(TOKEN));
 assert.ok(f.calls.every(x=>!x.includes('/git/refs')&&!x.includes('/git/commits')));
});
test('missing or foreign dispatcher reservation cannot authorize a PAT request',async()=>{
 const f=fixture({comments:[]});
 const r=await f.execute();
 assert.equal(r.reason,'SIGNED_RESERVATION_MISSING_OR_SUPERSEDED');
 assert.equal(f.calls.length,0);
 assert.equal(f.patched,0);
 const g=fixture();
 const s=await g.execute({reservationRunId:'24'});
 assert.equal(s.reason,'SIGNED_RESERVATION_MISSING_OR_SUPERSEDED');
 assert.equal(g.patched,0);
});
test('unsigned or mismatched owner reservation is rejected',async()=>{
 const f=fixture(),bad={...f.signed,user:{login:'stranger',id:5,type:'User'}};
 const g=fixture({comments:[bad]});
 assert.equal((await g.execute()).reason,'SIGNED_RESERVATION_MISSING_OR_SUPERSEDED');
 assert.equal(g.patched,0);
});
test('already attempted historical source commit blocks CI metadata retry until reconciliation',async()=>{
 const pr=fakePR({labels:[{name:'hh:ci-needed'},{name:'hh:ci-bootstrap-attempted'}]});
 const f=fixture({pr});
 assert.equal((await f.execute()).reason,'PR_STATE_OR_ATTEMPT_UNSAFE');
 assert.equal(f.patched,0);
});
test('wrong HEAD, draft, dirty, fork, hold and wrong repo are fail-closed',async()=>{
 for(const changed of [
   {head:{ref:'fix/source-10',sha:'b'.repeat(40),repo:{full_name:repo}}},
   {draft:true},{mergeable:false,mergeable_state:'dirty'},
   {head:{ref:'fix/source-10',sha:SHA,repo:{full_name:'stranger/repo'}}},
   {labels:[{name:'hh:ci-needed'},{name:'hh:hold'}]},
   {base:{ref:'codex/bootstrap-books'}}
 ]){
   const f=fixture({pr:fakePR(changed)});
   assert.equal((await f.execute()).reason,'PR_STATE_OR_ATTEMPT_UNSAFE');
   assert.equal(f.patched,0);
 }
});
test('existing Core history, stacked children and invalid owner never write',async()=>{
 const a=fixture({coreHistory:1});
 assert.equal((await a.execute()).reason,'CORE_HISTORY_EXISTS_OR_UNKNOWN');
 assert.equal(a.patched,0);
 const b=fixture({children:[{number:12}]});
 assert.equal((await b.execute()).reason,'STACKED_PARENT');
 assert.equal(b.patched,0);
 const c=fixture({wrongOwner:true});
 assert.equal((await c.execute()).reason,'TOKEN_OWNER_MISMATCH');
 assert.equal(c.patched,0);
});
test('403 during PAT draft conversion does not claim Core activation',async()=>{
 const f=fixture({draftDenied:true});
 const r=await f.execute();
 assert.equal(r.reason,'PAT_DRAFT_TRANSITION_UNVERIFIED');
 assert.equal(r.terminalFailure,true);
 assert.equal(r.metadataEditAccepted,false);
 assert.equal(r.sourceChanged,false);
 assert.equal(f.patched,1);
 assert.ok(f.receipts.some(x=>x.includes('"state":"CLAIMED"')));
 assert.ok(!JSON.stringify(r).includes(TOKEN));
});
test('failed PAT Ready transition is terminal and never marked as an accepted CI wake',async()=>{
 const f=fixture({readyDenied:true});
 const r=await f.execute();
 assert.equal(r.reason,'PAT_READY_RESTORE_REQUIRED');
 assert.equal(r.terminalFailure,true);
 assert.equal(r.metadataEditAccepted,false);
 assert.equal(r.sourceChanged,false);
 assert.equal(f.patched,3,'one Draft followed by at most two recovery attempts');
 assert.equal(f.pr.draft,true,'operator-visible recovery required; never fake Ready');
 assert.ok(!f.receipts.some(x=>x.includes('"state":"CI_WAKE_REQUESTED"')));
});
test('an already armed PR is never converted to Draft',async()=>{
 const f=fixture({pr:fakePR({auto_merge:{merge_method:'squash'}})});
 assert.equal((await f.execute()).reason,'PR_STATE_OR_ATTEMPT_UNSAFE');
 assert.equal(f.patched,0);
});
test('read-only cron and untrusted dispatch cannot write',async()=>{
 const f=fixture();
 assert.equal((await f.execute({dryRun:true})).reason,'DRY_RUN_NO_WRITES');
 assert.equal(f.patched,0);
 assert.equal((await f.execute({context:{...context,eventName:'schedule'}})).reason,'UNTRUSTED_DISPATCH_EVENT');
 assert.equal(f.patched,0);
});
test('claim receipt denied blocks before PAT edit',async()=>{
 const f=fixture({receiptDenied:true});
 const r=await f.execute();
 assert.equal(r.reason,'AUTHENTICATED_CLAIM_WRITE_FAILED');
 assert.equal(f.patched,0);
});
test('worker workflow does not contain any no-op Git commit or ref mutation',()=>{
 const yaml=fs.readFileSync('.github/workflows/hh-pr-ci-worker.yml','utf8');
 assert.ok(yaml.includes("scripts/ci-pr-core-metadata-wake.cjs"));
 assert.ok(yaml.includes("reservationRunId:String(context.payload.inputs?.reservation_run_id || '')"));
 assert.doesNotMatch(yaml,/git\/commits|git\/refs|force:false|sourceGit\.bootstrap/);
 assert.ok(yaml.includes('if(result.terminalFailure)'));
 assert.ok(yaml.includes('core.setFailed'));
});
