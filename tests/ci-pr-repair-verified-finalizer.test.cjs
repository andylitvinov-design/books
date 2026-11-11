'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {run,trustedCoreSuccess,eligiblePR,latestGreenRequired,verifiedReceipt,REQUIRED}=
 require('../scripts/ci-pr-repair-verified-finalizer.cjs');
const OLD='a'.repeat(40),NEW='b'.repeat(40),BASE='c'.repeat(40),MERGE='d'.repeat(40);
const TASK='e'.repeat(32),REPO='andylitvinov-design/books';
const stamp='2026-11-10T03:30:00.000Z';
const after='2026-11-10T03:32:00.000Z';
const signed={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
 performed_via_github_app:{id:15368,slug:'github-actions'},
 created_at:stamp,updated_at:stamp};
function published(){
 const row={schema:'HH_PR_TASK_V1',state:'PUBLISHED',reason_code:'SOURCE_COMMIT_VERIFIED_ON_PR_HEAD',
  source_published:true,verified_source_fix:true,pr_number:42,
  head_sha:OLD,new_sha:NEW,task_key:TASK,owner_run_id:'123',
  created_at:stamp,strategy:'code',repair_kind:'free_ai',
  run_url:'https://github.com/'+REPO+'/actions/runs/123'};
 return {...signed,body:'<!-- HH_PR_REPAIR_OUTCOME_V1 '+OLD+' 123 -->\n'+
  '<!-- HH_PR_TASK_V1 -->\n```json\n'+JSON.stringify(row)+'\n```'};
}
function make({linked=true,eventSha=MERGE,source=NEW,green=true,comments=[published()]}={}){
 const event={id:444,run_attempt:1,name:'HH PR core release gate',
  path:'.github/workflows/hh-pr-core-release.yml@refs/heads/codex/bootstrap-books',
  event:'pull_request',status:'completed',conclusion:'success',
  head_branch:'feature/fix',head_sha:eventSha,created_at:after,
  repository:{full_name:REPO},head_repository:{full_name:REPO},
  pull_requests:linked?[{number:42,head:{sha:NEW,ref:'feature/fix'},
    base:{ref:'codex/public-book-library',sha:BASE}}]:[]};
 const pr={number:42,state:'open',draft:false,user:{login:'andylitvinov-design'},
  base:{ref:'codex/public-book-library',sha:BASE},
  head:{ref:'feature/fix',sha:source,repo:{full_name:REPO}}};
 const context={repo:{owner:'andylitvinov-design',repo:'books'},ref:'refs/heads/codex/bootstrap-books',
  eventName:'workflow_run',payload:{workflow_run:event}};
 const checks={total_count:REQUIRED.length,check_runs:REQUIRED.map((name,i)=>({
   name,head_sha:NEW,app:{id:15368},status:'completed',
   conclusion:green?'success':'failure',id:100+i,completed_at:after}))};
 const log={written:[],calls:[],comments,pr,checks};
 const gh={rest:{
  pulls:{list:async()=>({data:[{number:42}]}),get:async()=>({data:log.pr})},
  git:{getCommit:async({commit_sha})=>({data:{parents:commit_sha===MERGE
    ?[{sha:BASE},{sha:NEW}]:commit_sha===NEW?[{sha:OLD}]:[]}})},
  checks:{listForRef:async()=>({data:log.checks})},
  issues:{listComments:async()=>({data:log.comments}),
    createComment:async(args)=>{log.written.push(args.body);return {data:{id:654}};}}
 }};
 return {context,event,pr,log,gh};
}
async function verify(fx){return run({github:fx.gh,context:fx.context,now:Date.parse(after)+1000,
 core:{info(){}}});}
test('full independent proof signs one terminal VERIFIED receipt for exact new HEAD',async()=>{
 const f=make(),r=await verify(f);
 assert.equal(r.status,'VERIFIED');
 assert.equal(r.pr_number,42);
 assert.equal(f.log.written.length,1);
 const body=f.log.written[0];
 assert.match(body,/HH_PR_REPAIR_VERIFIED_V1/);
 const row=JSON.parse(body.match(/```json\n(.*?)\n```/s)[1]);
 assert.equal(row.status,'VERIFIED');
 assert.equal(row.terminal,true);
 assert.equal(row.head_sha,OLD);
 assert.equal(row.new_sha,NEW);
 assert.equal(row.owner_run_id,'123');
 assert.equal(row.core_run_id,444);
 assert.equal(Object.keys(row.required_checks).length,3);
 assert.equal(row.next_check_at,null);
 assert.equal(row.next_action,'NO_FURTHER_REPAIR_REQUIRED');
});
test('duplicate callback never writes second verified receipt',async()=>{
 const f=make();await verify(f);
 f.log.comments.push({...signed,body:f.log.written[0]});
 assert.equal((await verify(f)).status,'ALREADY_VERIFIED');
 assert.equal(f.log.written.length,1);
});
test('empty upstream PR association requires unique live branch and synthetic merge parents',async()=>{
 const f=make({linked:false});
 assert.equal((await verify(f)).status,'VERIFIED');
 assert.equal(f.log.written.length,1);
});
test('ambiguous, stale or foreign identity never verifies',async()=>{
 const f=make();
 for(const mutation of [
  ()=>{f.context.eventName='schedule';},
  ()=>{f.context.payload.workflow_run.path='.github/workflows/unknown.yml';},
  ()=>{f.context.payload.workflow_run.repository.full_name='other/repo';},
  ()=>{f.context.payload.workflow_run.pull_requests.push({number:90});},
  ()=>{f.context.payload.workflow_run.conclusion='failure';}
 ]){
  const orig=JSON.parse(JSON.stringify(f.context));
  mutation();assert.equal(trustedCoreSuccess(f.context),false);
  Object.assign(f.context,orig);f.context.payload=orig.payload;
 }
 assert.equal(f.log.written.length,0);
});
test('wrong source ref, linked HEAD or production base cannot be verified',async()=>{
 const f=make();
 f.pr.head.sha=OLD;
 assert.equal(eligiblePR(f.pr,f.event),false);
 f.pr.head.sha=NEW;
 f.event.pull_requests[0].head.sha=OLD;
 assert.equal(eligiblePR(f.pr,f.event),false);
 f.event.pull_requests[0].head.sha=NEW;
 f.pr.base.ref='codex/bootstrap-books';
 assert.equal(eligiblePR(f.pr,f.event),false);
});
test('different upstream synthetic merge ancestry fails closed',async()=>{
 const f=make();
 f.gh.rest.git.getCommit=async()=>({data:{parents:[{sha:OLD},{sha:NEW}]}});
 assert.equal((await verify(f)).status,'CORE_EVENT_MERGE_ANCESTRY_UNVERIFIED');
 assert.equal(f.log.written.length,0);
});
test('old source SHA without a signed published case never verifies',async()=>{
 const f=make({comments:[]});
 assert.equal((await verify(f)).status,'NO_SIGNED_PUBLISHED_SOURCE');
});
test('missing and newer failing required checks prevent VERIFIED',async()=>{
 const f=make();f.log.checks.check_runs.pop();f.log.checks.total_count--;
 assert.equal((await verify(f)).status,'REQUIRED_EXACT_HEAD_CHECKS_NOT_GREEN');
 const g=make();
 g.log.checks.check_runs.push({...g.log.checks.check_runs[2],id:999,conclusion:'failure'});
 g.log.checks.total_count++;
 assert.equal((await verify(g)).status,'REQUIRED_EXACT_HEAD_CHECKS_NOT_GREEN');
 assert.equal(g.log.written.length,0);
});
test('untrusted, wrong SHA, partial or unavailable check history fails closed',async()=>{
 const f=make();
 const wrong=f.log.checks.check_runs[0];
 wrong.app.id=0;
 assert.equal((await verify(f)).status,'REQUIRED_EXACT_HEAD_CHECKS_NOT_GREEN');
 assert.equal(latestGreenRequired({total_count:101,check_runs:[]},NEW),null);
 assert.equal(latestGreenRequired({total_count:4,check_runs:[]},NEW),null);
});
test('source commit is not FIXED without independent direct parent',async()=>{
 const f=make({eventSha:NEW});
 f.gh.rest.git.getCommit=async()=>({data:{parents:[{sha:BASE}]}});
 assert.equal((await verify(f)).status,'SOURCE_COMMIT_PARENT_UNVERIFIED');
 assert.equal(f.log.written.length,0);
});
test('HEAD moves after successful check read, so finalization cannot publish',async()=>{
 const f=make(),get=f.gh.rest.pulls.get;let count=0;
 f.gh.rest.pulls.get=async(...args)=>{count++;return count===2
  ?{data:{...f.pr,head:{...f.pr.head,sha:OLD}}}:get(...args)};
 assert.equal((await verify(f)).status,'PR_HEAD_CHANGED_DURING_VERIFICATION');
 assert.equal(f.log.written.length,0);
});
test('a forged or edited terminal receipt never suppresses legitimate verification',()=>{
 const f=make(),row={schema:'HH_PR_REPAIR_VERIFIED_V1',status:'VERIFIED',
  pr_number:42,task_key:TASK,new_sha:NEW,terminal:true};
 const body='<!-- HH_PR_REPAIR_VERIFIED_V1 -->\n```json\n'+JSON.stringify(row)+'\n```';
 assert.equal(verifiedReceipt([{...signed,body,updated_at:after}],42,TASK,NEW),false);
 assert.equal(verifiedReceipt([{...signed,body,user:{login:'hacker'}}],42,TASK,NEW),false);
 assert.equal(verifiedReceipt([{...signed,body}],42,TASK,NEW),true);
});
test('no extra workflow or privileged source action is introduced',()=>{
 const fs=require('node:fs');
 const yaml=fs.readFileSync('.github/workflows/hh-pr-direct-core-failure.yml','utf8');
 assert.match(yaml,/core-slot-wakeup:[\s\S]*Record independently verified repair outcome on real new HEAD/);
 assert.match(yaml,/ci-pr-repair-verified-finalizer\.cjs/);
 assert.doesNotMatch(yaml,/HH_AUTOMERGE_TOKEN:[^\n]*core-slot-wakeup/);
});


test('terminal receipt job has PR write but cannot write source; real 403 requires separate permission',()=>{
 const fs=require('node:fs');
 const yaml=fs.readFileSync('.github/workflows/hh-pr-direct-core-failure.yml','utf8');
 const slot=yaml.split('\n  core-slot-wakeup:\n')[1];
 assert.ok(slot,'reuse the existing successful Core completion job, no new runner');
 assert.match(slot,/name: core-ci-freed-slot-wakeup/);
 assert.match(slot,/github\.event\.workflow_run\.conclusion == 'success'/);
 assert.match(slot,/permissions:\s*\n\s*contents: read/);
 assert.match(slot,/pull-requests: write/);
 assert.match(slot,/issues: write/);
 assert.match(slot,/checks: read/);
 assert.match(slot,/Record independently verified repair outcome on real new HEAD/);
 assert.match(slot,/ci-pr-repair-verified-finalizer\.cjs/);
 assert.doesNotMatch(slot,/contents: write|HH_AUTOMERGE_TOKEN|HH_OPENROUTER_FREE_API_KEY|HH_REPAIR_JOB_TOKEN/);
 const source=fs.readFileSync('scripts/ci-pr-repair-verified-finalizer.cjs','utf8');
 assert.match(source,/HH_PR_REPAIR_VERIFIED_V1/);
 assert.match(source,/latestGreenRequired\(checks,c\.published_head\)/);
 assert.match(source,/HH_PR_REPAIR_VERIFIED_V1/);
 assert.match(source,/github\.rest\.issues\.createComment/);
 // This is still a protected status receipt, NOT a source merge or proof of
 // a successful POST merely because its token's permissions were changed.
 assert.doesNotMatch(source,/git\.updateRef|createCommitOnBranch|pulls\.merge/);
});
