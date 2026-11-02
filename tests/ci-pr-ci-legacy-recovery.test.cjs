'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {run,taskForAttempt,signedTaskEvents,denialReceipt}=
  require('../scripts/ci-pr-ci-legacy-recovery.cjs');
const {commentBody,reservation,reservationStatus}=require('../scripts/ci-pr-task-state.cjs');
const NOW=Date.parse('2026-11-02T16:00:00Z');
const OLD=NOW-65*60000,SHA='a'.repeat(40),REPO='andylitvinov-design/books';
const WORKER_RUN=41451105614,OWNER_RUN='41451067261';
const bot={id:41898282,login:'github-actions[bot]',type:'Bot'};
const app={id:15368,slug:'github-actions'};
const context={repo:{owner:'andylitvinov-design',repo:'books'},
  ref:'refs/heads/codex/bootstrap-books',eventName:'workflow_dispatch',runId:41500000000};
function pr(extra={}){
 return {number:2169,state:'open',draft:false,title:'fix(coaching): one CRM send',
   user:{login:'andylitvinov-design'},
   base:{ref:'codex/public-book-library'},
   head:{ref:'fix/coaching-intake-crm-one-submit-20261026',sha:SHA,repo:{full_name:REPO}},
   labels:[{name:'hh:ci-needed'},{name:'hh:ci-bootstrap-attempted'},
     {name:'hh:priority:3'},{name:'hh:direction:messenger-crm'}],
   mergeable:true,mergeable_state:'blocked',...extra};
}
function fixture(options={}){
 let p=options.pr||pr(),comments=[],labelRemovals=0,writes=0,reads=0;
 const task=taskForAttempt(p,NOW);
 const reserve=reservation(task,OLD,OWNER_RUN);
 comments.push({id:500,user:bot,performed_via_github_app:app,
   created_at:new Date(OLD).toISOString(),body:commentBody(reserve)});
 comments.push({id:501,user:bot,performed_via_github_app:app,
   created_at:new Date(OLD+15000).toISOString(),
   body:'<!-- HH_CI_BOOTSTRAP_TOKEN_DENIED_V1 '+SHA+' -->\n'+
   'CI bootstrap was NOT started; No source commit or Core check was created. '+
   'Actions run: https://github.com/andylitvinov-design/books/actions/runs/'+WORKER_RUN});
 if(options.noDenial)comments.pop();
 if(options.foreignDenial)comments[1].user={login:'stranger'};
 const activity={rest:{
   repos:{getContent:async()=>({data:{type:'file',encoding:'base64',content:Buffer.from(
     options.oldWorker?'old sourceGit.bootstrap to /git/commits':
       'const marker="ci-pr-core-metadata-wake.cjs";'
   ).toString('base64')}})},
   pulls:{get:async()=>({data:p})},
   issues:{
     listComments:async()=>({data:comments}),
     createComment:async x=>{
       writes++;if(options.commentDenied)throw Error('write denied');
       comments.push({id:500+comments.length,user:bot,performed_via_github_app:app,
         created_at:new Date(NOW).toISOString(),body:x.body});
       return {data:{id:500+comments.length}};
     },
     removeLabel:async x=>{
       if(options.removeDenied)throw Error('remove denied');
       labelRemovals++;p={...p,labels:p.labels.filter(x=>x.name!=='hh:ci-bootstrap-attempted')};
       return {data:[]};
     }
   },
   actions:{
     getWorkflowRun:async()=>({data:{id:WORKER_RUN,name:'HH zero-cost PR CI worker',
       event:'workflow_dispatch',head_branch:'codex/bootstrap-books',status:'completed',
       conclusion:options.successRun?'success':'failure',actor:{login:'github-actions[bot]'},
       repository:{full_name:REPO},created_at:new Date(OLD+10000).toISOString()}}),
     listWorkflowRuns:async()=>({data:{workflow_runs:options.activeWorker?[{id:20}]:[],
       total_count:options.activeWorker?1:0}})
   }
 }};
 const github={...activity,request:async()=>({data:[]})};
 const call=(extra={})=>run({github,context,prs:[p],now:NOW,
   limited:async(_,fn)=>{reads++;return fn()},...extra});
 return {call,comments,task,pr:()=>p,counts:()=>({writes,labelRemovals,reads}),github};
}
test('verified old PAT failure writes signed NO_CLAIM_RETRYABLE, clears attempt, preserves SHA',async()=>{
 const f=fixture();const v=await f.call();
 assert.equal(v.status,'RECOVERED_QUEUE_BACKOFF');
 assert.equal(v.receiptWritten,true);assert.equal(v.attemptLabelCleared,true);
 assert.equal(v.sourceChanged,false);assert.equal(f.pr().head.sha,SHA);
 assert.equal(f.counts().writes,1);assert.equal(f.counts().labelRemovals,1);
 assert.equal(f.pr().labels.some(x=>x.name==='hh:ci-bootstrap-attempted'),false);
 const rec=f.comments.at(-1);assert.ok(rec.body.includes('"state":"NO_CLAIM_RETRYABLE"'));
 assert.equal(rec.user.login,'github-actions[bot]');
 assert.equal(reservationStatus(f.task,f.comments,NOW),'NO_CLAIM_RETRY_BACKOFF');
 assert.equal(reservationStatus(f.task,f.comments,NOW+121000),'FREE');
});
test('old no-op bootstrap cannot be re-enabled by reconciliation',async()=>{
 const f=fixture({oldWorker:true});const r=await f.call();
 assert.equal(r.reason,'WAITING_FOR_NO_COMMIT_WORKER');
 assert.deepEqual(f.counts().writes,0);assert.equal(f.counts().labelRemovals,0);
});
test('bot denial and actual failed run must both be verified',async()=>{
 for(const opt of [{noDenial:true},{foreignDenial:true},{successRun:true}]){
   const f=fixture(opt);const r=await f.call();
   assert.ok(['TRUSTED_TOKEN_DENIAL_MISSING','FAILED_RUN_NOT_AUTHENTICATED'].includes(r.reason));
   assert.equal(f.counts().writes,0);
 }
});
test('no label release when active worker or wrong HEAD/hold',async()=>{
 const a=fixture({activeWorker:true});const r=await a.call();
 assert.equal(r.reason,'WORKER_ACTIVE_OR_UNVERIFIED');assert.equal(a.counts().labelRemovals,0);
 for(const change of [
  {head:{ref:'fix/another',sha:'b'.repeat(40),repo:{full_name:REPO}}},
  {labels:[{name:'hh:ci-needed'},{name:'hh:hold'},{name:'hh:ci-bootstrap-attempted'}]},
  {mergeable:false,mergeable_state:'dirty'}
 ]){
   const f=fixture({pr:pr(change)});const v=await f.call();
   assert.notEqual(v.status,'RECOVERED_QUEUE_BACKOFF');
   assert.equal(f.counts().writes,0);
 }
});
test('source Repair Worker claim prevents CI failure recovery',async()=>{
 const f=fixture();
 f.comments.push({id:710,user:bot,performed_via_github_app:app,
   body:'<!-- HH_PR_REPAIR_WORKER_V1 '+SHA+' -->'});
 const r=await f.call();
 assert.equal(r.reason,'SOURCE_REPAIR_CLAIMED');
 assert.equal(f.counts().writes,0);
 assert.equal(f.counts().labelRemovals,0);
});
test('dry run is diagnostic only',async()=>{
 const f=fixture();const r=await f.call({dryRun:true});
 assert.equal(r.status,'WOULD_RECOVER');
 assert.equal(f.counts().writes,0);
 assert.equal(f.counts().labelRemovals,0);
});
test('failed receipt retains attempt label; no false recovery',async()=>{
 const f=fixture({commentDenied:true});const r=await f.call();
 assert.equal(r.reason,'RECOVERY_RECEIPT_WRITE_FAILED');
 assert.equal(r.attemptLabelCleared,false);
 assert.equal(f.counts().labelRemovals,0);
});
test('crash after signed receipt can resume label cleanup without repost',async()=>{
 const f=fixture({removeDenied:true});const a=await f.call();
 assert.equal(a.reason,'ATTEMPT_LABEL_CLEAR_UNVERIFIED');
 assert.equal(f.counts().writes,1);
 // Inject same underlying comments with recovered receipt and replace the label remover.
 f.github.rest.issues.removeLabel=async()=>{
   f.pr().labels=f.pr().labels.filter(x=>x.name!=='hh:ci-bootstrap-attempted');
   return {data:[]};
 };
 const b=await f.call();
 assert.equal(b.receiptWritten,false);
 assert.equal(b.attemptLabelCleared,true);
 assert.equal(f.counts().writes,1);
});
test('malformed or untrusted context never produces a write',async()=>{
 for(const changes of [
  {context:{...context,ref:'refs/heads/codex/public-book-library'}},
  {context:{...context,eventName:'pull_request'}},
  {prs:null},
  {now:NaN}
 ]){
  const f=fixture(),r=await f.call(changes);
  assert.notEqual(r.status,'RECOVERED_QUEUE_BACKOFF');
  assert.equal(f.counts().writes,0);
 }
});
