'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {
 isTrustedFailure,validatedJobEvidence,isActualBaseAdvancedLog,
 isVerifiedAdvance,classifyRecentBaseSyncs,ownerProtectedUpdate,recoverBaseAdvanced
}=require('../scripts/ci-pr-base-advanced-recovery.cjs');
const HEAD='a'.repeat(40),OLD='b'.repeat(40),LIVE='c'.repeat(40);
const REPO='andylitvinov-design/books';
const MARKER=[
 '2026-11-04T20:59:47.4536699Z ##[error]BASE_ADVANCED: PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED',
 '2026-11-04T20:59:47.4547714Z CI_SPECIALIST_FAIL_CLOSED: PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED'
].join('\n');
// Actual 2026-11-17 HH PR core release gate (#4811, run 43997841082):
// source Core succeeded; hh-merge-check failed with the exact BASE_ADVANCED
// marker; hh-eslint-repair skipped. There is NO separate hh-specialist job.
const jobs=[
 {id:1,name:'core-lint-types-build',status:'completed',conclusion:'success'},
 {id:2,name:'hh-merge-check',status:'completed',conclusion:'failure'},
 {id:3,name:'hh-eslint-repair',status:'completed',conclusion:'skipped'}
];
const legacyJobs=[
 jobs[0],{id:4,name:'hh-specialist',status:'completed',conclusion:'failure'},
 jobs[1]
];
function world(options={}){
 const event={
  id:100,name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml',
  run_attempt:1,event:'pull_request',status:'completed',conclusion:'failure',
  repository:{full_name:REPO},head_repository:{full_name:REPO},
  head_sha:HEAD,head_branch:'fix/sensitive-crm',
  created_at:'2026-11-04T21:00:00.000Z',
  pull_requests:[{number:3510,base:{ref:'codex/public-book-library',sha:OLD},
    head:{ref:'fix/sensitive-crm',sha:HEAD}}],...options.event
 };
 const context={eventName:'workflow_run',ref:'refs/heads/codex/bootstrap-books',
  repo:{owner:'andylitvinov-design',repo:'books'},payload:{workflow_run:event},
  ...options.context};
 const pr={number:3510,state:'open',draft:false,mergeable:true,mergeable_state:'clean',
  base:{ref:'codex/public-book-library',sha:LIVE},
  head:{ref:'fix/sensitive-crm',sha:HEAD,repo:{full_name:REPO}},
  labels:[],body:'Existing customer PR body',commits:1,...options.pr};
 let updates=0,reads=0,draft=false;
 const mutations=[],comments=options.comments||[];
 const github={
  rest:{
   actions:{
    listWorkflowRuns:async({workflow_id})=>({data:{workflow_runs:
     workflow_id==='holistic-support-mandala.yml'?(options.mediaRuns||[]):[{
     id:options.newerCore?101:100,head_sha:options.latestHeadMismatch?'f'.repeat(40):event.head_sha,
     status:'completed',conclusion:'failure',run_attempt:event.run_attempt
    }]}}),
    getWorkflowRun:async()=>{if(options.read403)throw Object.assign(Error('read denied'),{status:403});return {data:{id:100,run_attempt:1,status:'completed',conclusion:'failure',
     head_sha:HEAD,head_branch:'fix/sensitive-crm',path:'.github/workflows/hh-pr-core-release.yml',
     ...options.run}};},
    listJobsForWorkflowRun:async()=>({data:{total_count:jobs.length,jobs:options.jobs||jobs}})
   },
   pulls:{
    get:async()=>({data:(reads++,options.prAfter&&reads>=2?options.prAfter:pr)}),
    listCommits:async({page})=>({data:options.commitPages?.[page]??options.commitList??[]})
   },
   repos:{
    getBranch:async()=>({data:{protected:true,commit:{sha:LIVE},...options.branch}}),
    getCommit:async()=>({data:options.mergeCommit||{sha:'f'.repeat(40),parents:[]}}),
    compareCommits:async({base,head})=>{
     if(base===LIVE&&head===HEAD){
      if(options.badSourceRelation)throw Error('relative comparison unavailable');
      if(options.sourceAlreadyContainsLive)
       return {data:{status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
        commits:[{sha:HEAD}],base_commit:{sha:LIVE},merge_base_commit:{sha:LIVE},
        ...options.sourceCompare}};
      return {data:{status:'diverged',ahead_by:1,behind_by:1,total_commits:2,
       commits:[{sha:HEAD}],base_commit:{sha:LIVE},merge_base_commit:{sha:OLD}}};
     }
     return {data:{status:'ahead',ahead_by:1,behind_by:0,
      total_commits:1,commits:[{sha:LIVE}],
      base_commit:{sha:OLD},merge_base_commit:{sha:OLD},...options.compare}};
    }
   },
   issues:{listComments:async()=>({data:comments}),
    createComment:async({body})=>{
     if(options.intentDenied)throw Error('intent denied');
     if(options.concurrentClaim&&comments.length===0)comments.push({
      id:1,body:'<!-- HH_SENSITIVE_BASE_CI_REVALIDATE_V1 pr=3510 head='+HEAD+
       ' from='+OLD+' to='+LIVE+' core=99 -->\nOther trusted lane',
      user:{login:'github-actions[bot]',id:41898282,type:'Bot'},
      performed_via_github_app:{id:15368,slug:'github-actions'}
     });
     comments.push({id:comments.length+1,body,
      user:{login:'github-actions[bot]',id:41898282,type:'Bot'},
      performed_via_github_app:{id:15368,slug:'github-actions'}});
     return {data:{id:comments.length}};
    }}
  },
  request:async(path)=>{
   if(path.includes('/logs'))return {data:options.logs??MARKER};
   if(path.includes('/rulesets/')){
    if(!options.looseRuleset&&!options.strictRuleset)throw Error('rules unavailable');
    return {data:{id:26269892,enforcement:'active',
     conditions:{ref_name:{include:['refs/heads/codex/public-book-library']}},
     rules:[{type:'pull_request',parameters:{required_review_thread_resolution:true}},
      {type:'required_status_checks',parameters:{
       strict_required_status_checks_policy:options.strictRuleset===true}}]
    }};
   }
   if(path.startsWith('PUT '))throw Error('Owner source write must not use read-only GitHub client');
   throw Error('Unexpected test API call '+path);
  }
 };
 const ownerCalls=[];
 const fetcher=async(url,request)=>{
  const path=new URL(url).pathname;
  ownerCalls.push({method:request.method,path,usesExpectedHead:request.body?.includes('expected_head_sha')||false});
  const response=(status,data)=>({ok:status>=200&&status<300,status,json:async()=>data});
  if(path==='/user')return response(200,{login:options.ownerLogin||'andylitvinov-design'});
  if(path==='/repos/andylitvinov-design/books/pulls/3510'&&request.method==='GET')
   return response(200,{...pr,draft,...options.ownerPr});
  if(path==='/repos/andylitvinov-design/books/pulls/3510/update-branch'&&request.method==='PUT'){
   updates++;return response(options.updateStatus??202,{message:'mock update accepted'});
  }
  if(path==='/graphql'&&request.method==='POST'){
   const mutation=JSON.parse(request.body).query.includes('convertPullRequestToDraft')?
    'convertPullRequestToDraft':'markPullRequestReadyForReview';
   draft=mutation==='convertPullRequestToDraft';
   mutations.push(mutation);
   return response(200,{data:{[mutation]:{pullRequest:{id:pr.node_id,isDraft:draft}}}});
  }
  throw Error('Unexpected owner-only GitHub API route: '+request.method+' '+path);
 };
 return {context,github,fetcher,updated:()=>updates,reads:()=>reads,ownerCalls:()=>ownerCalls,mutations,comments,getDraft:()=>draft};
}
const run=w=>recoverBaseAdvanced({context:w.context,github:w.github,
 hasOwnerToken:true,ownerToken:'TEST_OWNER_TOKEN_NOT_SECRET',fetcher:w.fetcher,
 now:Date.parse('2026-11-04T21:02:00Z')});
test('accepts only recent trusted failed Core event on exact default branch',()=>{
 const w=world();
 assert.equal(isTrustedFailure(w.context,Date.parse('2026-11-04T21:02:00Z')),true);
 for(const variant of [
  {ref:'refs/heads/codex/public-book-library'},
  {eventName:'pull_request_target'},
  {payload:{workflow_run:{...w.context.payload.workflow_run,head_sha:'wrong'}}},
  {payload:{workflow_run:{...w.context.payload.workflow_run,conclusion:'success'}}},
  {payload:{workflow_run:{...w.context.payload.workflow_run,repository:{full_name:'other/repo'}}}}
 ])assert.equal(isTrustedFailure({...w.context,...variant},Date.parse('2026-11-04T21:02:00Z')),false);
});
test('actual embedded specialist gate recovers BASE_ADVANCED without retired hh-specialist job',()=>{
 const recorded={total_count:3,jobs};
 assert.equal(validatedJobEvidence(recorded),2,'use failing embedded hh-merge-check job log');
 assert.equal(validatedJobEvidence({total_count:3,jobs:legacyJobs}),4,
  'older separate specialist gate is still supported with independent proof');
 for(const altered of [
  {total_count:4,jobs},
  {total_count:4,jobs:[...jobs,{id:5,name:'browser',status:'completed',conclusion:'failure'}]},
  {total_count:3,jobs:jobs.map(x=>x.name==='core-lint-types-build'?{...x,conclusion:'skipped'}:x)},
  {total_count:3,jobs:jobs.map(x=>x.name==='hh-merge-check'?{...x,conclusion:'success'}:x)},
  {total_count:4,jobs:[...jobs,jobs[1]]},
  {total_count:3,jobs:[jobs[0],jobs[2],jobs[2]]},
  {total_count:3,jobs:[jobs[1],jobs[1],jobs[2]]},
  {total_count:4,jobs:[...legacyJobs,legacyJobs[1]]},
  {total_count:3,jobs:legacyJobs.map(x=>x.name==='hh-specialist'?{...x,conclusion:'success'}:x)}
 ])assert.equal(validatedJobEvidence(altered),null,'never accept failed source or ambiguous gate');
 assert.equal(isActualBaseAdvancedLog(MARKER),true);
 assert.equal(isActualBaseAdvancedLog(MARKER.replace('BASE_ADVANCED','GENERIC_FAILURE')),false);
 assert.equal(isActualBaseAdvancedLog('CI_SPECIALIST_FAIL_CLOSED: PR_HEAD_BASE_OR_RELEASE_STATE_CHANGED:PRODUCTION_BASE_CHANGED'),false);
});
test('verified current protected BASE must be an ancestor of the immutable source HEAD',()=>{
 const {verifiedSourceContainsBase}=require('../scripts/ci-pr-base-advanced-recovery.cjs');
 const good={status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
  base_commit:{sha:LIVE},merge_base_commit:{sha:LIVE},commits:[{sha:HEAD}]};
 assert.equal(verifiedSourceContainsBase(good,LIVE,HEAD),true);
 for(const bad of [
  {...good,status:'diverged'},
  {...good,behind_by:1},
  {...good,base_commit:{sha:OLD}},
  {...good,merge_base_commit:{sha:OLD}},
  {...good,total_commits:2},
  {...good,commits:[]},
  {...good,commits:[{sha:OLD}]},
  {...good,ahead_by:101},
 ])
  assert.equal(verifiedSourceContainsBase(bad,LIVE,HEAD),false);
 assert.equal(verifiedSourceContainsBase(good,LIVE,LIVE),false);
});

test('new production must be fully proven descendant, never diverged or incomplete',()=>{
 const d={status:'ahead',ahead_by:1,behind_by:0,total_commits:1,
  base_commit:{sha:OLD},merge_base_commit:{sha:OLD},commits:[{sha:LIVE}]};
 assert.equal(isVerifiedAdvance(d,OLD,LIVE),true);
 for(const bad of [{...d,status:'diverged'},{...d,commits:[]},
  {...d,merge_base_commit:{sha:HEAD}},{...d,ahead_by:101},
  {...d,behind_by:1}]){
  assert.equal(isVerifiedAdvance(bad,OLD,LIVE),false);
 }
});
test('verified failure creates one native non-force base update, never a synthetic PASS',async()=>{
 const w=world();const result=await run(w);
 assert.equal(result.status,'UPDATED');
 assert.equal(result.mergeAuthorized,false);
 assert.equal(w.updated(),1);
 assert.equal(w.comments.length,1,'failed-Core source sync now records a trusted intent');
 assert.match(w.comments[0].body,/HH_SENSITIVE_BASE_CI_REVALIDATE_V1 pr=3510/);
});

test('regression #4594: loose production rules must not recheck stale synthetic merge',async()=>{
 for(const opt of [{looseRuleset:true},{strictRuleset:true},{}]){
  const w=world({...opt,pr:{node_id:'PR_abcdef01'}}),result=await run(w);
  assert.equal(result.status,'UPDATED');
  assert.equal(w.updated(),1);
  assert.deepEqual(w.mutations,[],'no useless Ready on unchanged old merge ref');
  assert.equal(w.comments.length,1,'failed-Core source update owns shared intent');
 }
});
test('verified source containing current protected BASE requests one true same-HEAD Core',async()=>{
 for(const opt of [{looseRuleset:true},{strictRuleset:true},{}]){
  const w=world({...opt,sourceAlreadyContainsLive:true,
   pr:{node_id:'PR_abcdef01',commits:1001}}),result=await run(w);
  assert.equal(result.status,'READY_RECHECK_REQUESTED');
  assert.equal(result.reason,'SAME_HEAD_CURRENT_BASE_CORE_RECHECK_REQUESTED');
  assert.equal(result.mergeAuthorized,false);
  assert.equal(result.ciVerified,false);
  assert.equal(result.sourceHeadPreserved,true);
  assert.equal(w.updated(),0);
  assert.deepEqual(w.mutations,['convertPullRequestToDraft','markPullRequestReadyForReview']);
  assert.equal(w.getDraft(),false);
  assert.equal(w.comments.length,1);
  assert.equal((await run(w)).reason,'ONE_WAKE_ALREADY_RECORDED_FOR_HEAD');
 }
});
test('failed-Core respects a green-Core intent rather than publishing duplicate HEAD',async()=>{
 const marker='<!-- HH_SENSITIVE_BASE_CI_REVALIDATE_V1 pr=3510 head='+HEAD+
  ' from='+OLD+' to='+LIVE+' core=98 -->\nGreen-Core base recovery';
 const prior={id:1000,body:marker,user:{login:'github-actions[bot]',id:41898282,type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'}};
 const w=world({comments:[prior]}),answer=await run(w);
 assert.equal(answer.reason,'ONE_WAKE_ALREADY_RECORDED_FOR_HEAD');
 assert.equal(w.updated(),0);
 assert.equal(w.ownerCalls().length,0);
});
test('failed-Core callback losing concurrent signed claim never calls update-branch',async()=>{
 const w=world({concurrentClaim:true}),answer=await run(w);
 assert.equal(answer.reason,'BASE_REVALIDATION_INTENT_UNVERIFIED');
 assert.equal(w.updated(),0);
 assert.equal(w.comments.length,2);
});
test('manual source ownership forbids automatic Ready even if source contains BASE',async()=>{
 const w=world({looseRuleset:true,sourceAlreadyContainsLive:true,
  pr:{labels:[{name:'hh:repair-manual'}]}});
 assert.equal((await run(w)).status,'UPDATED');
 assert.equal(w.updated(),1);
 assert.deepEqual(w.mutations,[]);
});
test('an older BASE_ADVANCED callback cannot publish a new HEAD after a newer Core exists',async()=>{
 for(const opts of [{newerCore:true},{latestHeadMismatch:true}]){
  const w=world(opts),result=await run(w);
  assert.equal(result.status,'SKIPPED');
  assert.equal(result.reason,'NEWER_OR_UNVERIFIED_CORE_WAVE');
  assert.equal(w.updated(),0);
  assert.deepEqual(w.mutations,[]);
  assert.equal(w.ownerCalls().length,0);
 }
});

test('uncertain / diverged / incomplete relation never authorizes Ready',async()=>{
 for(const bad of [
  {sourceCompare:{status:'diverged'}},
  {sourceCompare:{behind_by:1}},
  {sourceCompare:{commits:[]}},
  {sourceCompare:{base_commit:{sha:OLD}}},
  {badSourceRelation:true}
 ]){
  const w=world({...bad,sourceAlreadyContainsLive:true,
    pr:{node_id:'PR_abcdef01'}}),result=await run(w);
  assert.equal(result.status,'UPDATED');
  assert.equal(w.updated(),1);
  assert.deepEqual(w.mutations,[]);
 }
});
test('newer Core, unverified owner or failed intent never converts Ready PR to Draft',async()=>{
 for(const [opts,reason] of [
  [{sourceAlreadyContainsLive:true,newerCore:true},'NEWER_OR_UNVERIFIED_CORE_WAVE'],
  [{sourceAlreadyContainsLive:true,ownerLogin:'not-owner'},'OWNER_TOKEN_IDENTITY_MISMATCH'],
  [{sourceAlreadyContainsLive:true,intentDenied:true},'OWNER_READY_RECHECK_UNAVAILABLE']
 ]){
  const w=world({pr:{node_id:'PR_abcdef01'},...opts});
  const result=await run(w);
  assert.equal(result.status,'SKIPPED');
  assert.equal(result.reason,reason);
  assert.equal(w.updated(),0);
  assert.deepEqual(w.mutations,[]);
 }
});

test('no owner PAT, real Core failure, unverified log or unsupported ancestry never mutates',async()=>{
 for(const cases of [
  {logs:'Real source assertion failed'},
  {jobs:jobs.map(j=>j.name==='core-lint-types-build'?{...j,conclusion:'failure'}:j)},
  {compare:{status:'diverged'}},
  {branch:{protected:false}},
  {pr:{labels:[{name:'hh:hold'}]}},
  {pr:{draft:true}},
  {pr:{mergeable:false,mergeable_state:'dirty'}},
  {event:{head_sha:'d'.repeat(40)}}
 ]){
  const w=world(cases),result=await run(w);
  assert.equal(result.status,'SKIPPED');
  assert.equal(w.updated(),0,JSON.stringify(cases).slice(0,100));
 }
 const w=world();
 const result=await recoverBaseAdvanced({context:w.context,github:w.github,hasOwnerToken:false,
  now:Date.parse('2026-11-04T21:02:00Z')});
 assert.equal(result.reason,'OWNER_TOKEN_REQUIRED_FOR_NEW_CI');
 assert.equal(w.updated(),0);
});
test('changed HEAD under source lease, code review hold or base movement remains blocked',async()=>{
 for(const cases of [
  {prAfter:{...world().context.payload.workflow_run,number:3510,state:'open',draft:false,
    mergeable:true,mergeable_state:'clean',base:{ref:'codex/public-book-library',sha:LIVE},
    head:{ref:'fix/sensitive-crm',sha:'d'.repeat(40),repo:{full_name:REPO}},labels:[]}},
  {comments:[{id:1,body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n{broken-json'}]},
  {updateStatus:409}
 ]){
  const w=world(cases),r=await run(w);
  assert.equal(r.status,'SKIPPED');
  assert.equal(w.updated()===0||r.reason==='OWNER_BRANCH_UPDATE_HTTP_409',true);
 }
});

test('synthetic Core merge SHA proves source HEAD and historical tested BASE before sync',async()=>{
 const template=world().context.payload.workflow_run;
 const synthetic='d'.repeat(40);
 const w=world({
  event:{head_sha:synthetic,pull_requests:[{...template.pull_requests[0],
   base:{ref:'codex/public-book-library',sha:LIVE}}]},
  run:{head_sha:synthetic},
  mergeCommit:{sha:synthetic,parents:[{sha:OLD},{sha:HEAD}]}
 });
 const r=await run(w);
 assert.equal(r.status,'UPDATED');
 assert.equal(w.updated(),1,'one native update for exact PR source SHA');
});

test('stale manual source-repair marker does not block exact BASE_ADVANCED recovery, but a live lease still does',async()=>{
 const manual=world({pr:{labels:[{name:'hh:repair-manual'}]}});
 const manualResult=await run(manual);
 assert.equal(manualResult.status,'UPDATED');
 assert.equal(manual.updated(),1);
 const activeLease={schema:'HH_PR_SWEEP_LEASE_V1',owner:'another-source-writer',
  lease_id:'active-lease-3948',head_sha:HEAD,state:'claim',
  created_at:'2026-11-04T21:00:00.000Z',expires_at:'2026-11-04T21:10:00.000Z'};
 const held=world({pr:{labels:[{name:'hh:repair-manual'}]},
  comments:[{id:9001,user:{login:'another-owner'},body:
   '<!-- HH_PR_SWEEP_LEASE_V1 -->\n```json\n'+
   JSON.stringify(activeLease)+'\n```'}]});
 const heldResult=await run(held);
 assert.equal(heldResult.status,'SKIPPED');
 assert.equal(heldResult.reason,'ACTIVE_OR_UNVERIFIED_SOURCE_LEASE');
 assert.equal(held.updated(),0);
});

test('synthetic Core association rejects any missing or false merge-parent evidence',async()=>{
 const synthetic='d'.repeat(40);
 for(const bad of [
  {sha:synthetic,parents:[]},
  {sha:synthetic,parents:[{sha:OLD},{sha:'e'.repeat(40)}]},
  {sha:'f'.repeat(40),parents:[{sha:OLD},{sha:HEAD}]},
  {sha:synthetic,parents:[{sha:OLD}]}
 ]){
  const w=world({event:{head_sha:synthetic},run:{head_sha:synthetic},mergeCommit:bad});
  const r=await run(w);
  assert.equal(r.reason,'RUN_MERGE_PARENTS_UNVERIFIED');
  assert.equal(w.updated(),0);
 }
});
test('synthetic Core source lease is checked on PR SHA, never synthetic merge SHA',async()=>{
 const synthetic='d'.repeat(40);
 const lease={user:{login:'existing-source-writer'},body:
  '<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({
   schema:'HH_PR_SWEEP_LEASE_V1',owner:'active-writer',
   lease_id:'w1',head_sha:HEAD,state:'active'
  })};
 const w=world({event:{head_sha:synthetic},run:{head_sha:synthetic},
  mergeCommit:{sha:synthetic,parents:[{sha:OLD},{sha:HEAD}]},
  comments:[lease]});
 const r=await run(w);
 assert.equal(r.reason,'ACTIVE_OR_UNVERIFIED_SOURCE_LEASE');
 assert.equal(w.updated(),0);
});
test('every independent failed-Core intake and writer checkout pins the triggering control SHA',()=>{
 const wf=require('node:fs').readFileSync('.github/workflows/hh-pr-direct-core-failure.yml','utf8');
 const native=require('node:fs').readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
 const checkouts=[...wf.matchAll(/uses: actions\/checkout@v4([\s\S]{0,220})/g)];
 assert.equal(checkouts.length,2,'independent intake and serialized failed-Core writer each pin their trusted SHA');
 const greenSlot=native.split('  core-slot-wakeup:\n')[1]?.split('\n  recover-interrupted-core:\n')[0];
 assert.ok(greenSlot,'same Core-completion subscription owns the successful slot wakeup');
 assert.match(greenSlot,/ref: \$\{\{ github\.sha \}\}/);
 assert.match(greenSlot,/persist-credentials: false/);
 for(const checkout of checkouts){
  assert.match(checkout[1],/ref: \$\{\{ github\.sha \}\}/,
   'each workflow job stays on the exact control SHA that received the event');
  assert.match(checkout[1],/persist-credentials: false/);
 }
 assert.doesNotMatch(wf,/ref: codex\/bootstrap-books/);
});

test('owner-only write proves trusted PAT identity and keeps Actions reads on GITHUB_TOKEN',async()=>{
 const w=world();
 const result=await run(w);
 assert.equal(result.status,'UPDATED');
 const calls=w.ownerCalls();
 assert.deepEqual(calls.map(x=>x.method),['GET','GET','PUT']);
 assert.ok(calls.every(x=>!x.path.includes('/actions/')&&!x.path.includes('/logs')));
 assert.equal(calls[2].usesExpectedHead,true);
 assert.equal(w.updated(),1);
});

test('owner PAT HTTP 403 cannot be confused with a successful BASE update or a failed Core test',async()=>{
 const w=world({updateStatus:403}),result=await run(w);
 assert.equal(result.status,'SKIPPED');
 assert.equal(result.reason,'OWNER_BRANCH_UPDATE_HTTP_403');
 assert.equal(result.mergeAuthorized,false);
 assert.equal(w.updated(),1,'only the verified one-shot PUT was attempted');
});

test('changed owner-view source HEAD or identity blocks update without consuming a CI wave',async()=>{
 for(const options of [
  {ownerLogin:'not-owner'},
  {ownerPr:{head:{ref:'fix/sensitive-crm',sha:'f'.repeat(40),repo:{full_name:REPO}}}},
  {ownerPr:{draft:true}},
  {ownerPr:{body:'changed by another owner'}},
 ]){
  const w=world(options),result=await run(w);
  assert.equal(result.status,'SKIPPED',JSON.stringify(options));
  assert.equal(w.updated(),0);
  assert.equal(result.reason,options.ownerLogin?'OWNER_TOKEN_IDENTITY_MISMATCH':'OWNER_PAT_PR_CHANGED');
 }
});

test('GITHUB_TOKEN read-only API 403 remains distinct from owner source-write denial',async()=>{
 const w=world({read403:true}),result=await run(w);
 assert.equal(result.status,'SKIPPED');
 assert.equal(result.reason,'READ_GITHUB_API_403');
 assert.equal(w.ownerCalls().length,0,'owner PAT must not be used to read workflow history');
 assert.equal(w.updated(),0);
});

test('owner mutation helper rejects incomplete identity without attempting protected write',async()=>{
 const answer=await ownerProtectedUpdate({
  ownerToken:'test',number:3510,head:HEAD,source:'fix/sensitive-crm',body:'body',
  fetcher:async()=>({ok:false,status:403,json:async()=>({})})
 });
 assert.deepEqual(answer,{ok:false,reason:'OWNER_IDENTITY_HTTP_403'});
});


test('real GitHub HEAD-anchored base-merge history counts only bounded repeated production syncs',()=>{
 const now=Date.parse('2026-11-04T21:30:00Z'),head=HEAD;
 const c=(sha,message,date,parents=2)=>({
  sha,parents:Array.from({length:parents},()=>({sha:'d'.repeat(40)})),
  commit:{message,committer:{date}}
 });
 const rows=[
  c('e'.repeat(40),'feat(video): fix actual application bug','2026-11-04T21:10:00Z',1),
  c('f'.repeat(40),"Merge branch 'codex/public-book-library' into fix/foo",'2026-11-04T21:12:00Z'),
  c(head,"Merge branch 'codex/public-book-library' into fix/foo",'2026-11-04T21:18:00Z')
 ];
 const burst=classifyRecentBaseSyncs(rows,head,now);
 assert.equal(burst.verified,true);assert.equal(burst.hold,true);assert.equal(burst.count,2);
 assert.match(burst.retryAt,/2026-11-04T22:42:00/);

 const four=[...rows.slice(0,2),c('1'.repeat(40),
  "Merge branch 'codex/public-book-library' into fix/foo",'2026-11-04T21:23:00Z'),
  c(head,"Merge branch 'codex/public-book-library' into fix/foo",'2026-11-04T21:27:00Z')];
 assert.equal(classifyRecentBaseSyncs(four,head,now).count,3);
 assert.match(classifyRecentBaseSyncs(four,head,now).retryAt,/2026-11-04T22:53:00/,
  'retry deadline must clear enough merges to fall BELOW threshold, not just the oldest');

 const realFix=[...rows.slice(0,2),{...rows[2],commit:{...rows[2].commit,message:'fix: actual failing source code'}}];
 assert.equal(classifyRecentBaseSyncs(realFix,head,now).hold,false);
 assert.equal(classifyRecentBaseSyncs([...rows.slice(0,2),{...rows[2],sha:'1'.repeat(40)}],head,now).verified,false);
 assert.equal(classifyRecentBaseSyncs(rows,head,now+92*60_000).hold,false,
  'a quiet period expires the burst, without declaring old Core green');
});
test('confirmed BASE_ADVANCED with repeated recent base merges must not write another CI HEAD',async()=>{
 const item=(sha,date)=>({sha,parents:[{sha:OLD},{sha:HEAD}],
  commit:{message:"Merge branch 'codex/public-book-library' into fix/sensitive-crm",committer:{date}}});
 const w=world({pr:{commits:3},commitList:[
  {sha:'d'.repeat(40),parents:[{sha:OLD}],commit:{message:'source',committer:{date:'2026-11-04T21:00:00Z'}}},
  item('e'.repeat(40),'2026-11-04T21:00:40Z'),
  item(HEAD,'2026-11-04T21:01:20Z')
 ]});
 const res=await run(w);
 assert.equal(res.status,'SKIPPED');assert.equal(res.reason,'BASE_SYNC_REPEAT_BURST_HOLD');
 assert.equal(res.recentSyncs,2);assert.match(res.retryAt,/2026-11-04T22:30:40/);
 assert.equal(res.mergeAuthorized,false);assert.equal(w.updated(),0);
});
test('incomplete/unverified BASE history cannot silently authorize another source update',async()=>{
 for(const opts of [
  {pr:{commits:3},commitList:[]},
  {pr:{commits:3},commitList:[{sha:HEAD}]},
  {pr:{commits:0}}
 ]){
  const w=world(opts),res=await run(w);
  assert.equal(res.status,'SKIPPED');assert.equal(w.updated(),0);
  assert.match(res.reason,/BASE_SYNC_HISTORY/);
 }
});

test('real #5093 pending macOS workflow cannot be cancelled by failed-Core BASE sync',async()=>{
 const media=(status,conclusion,sha=HEAD)=>({
  id:901,event:'pull_request',head_branch:'fix/sensitive-crm',
  head_sha:sha,status,conclusion,pull_requests:[{number:3510,
   head:{sha,ref:'fix/sensitive-crm'},base:{ref:'codex/public-book-library'}}]
 });
 for(const [status,conclusion,reason] of [
  ['queued',null,'MEDIA_SPECIALIST_STILL_RUNNING'],
  ['in_progress',null,'MEDIA_SPECIALIST_STILL_RUNNING'],
  ['completed','failure','MEDIA_SPECIALIST_FAILED_OR_INTERRUPTED'],
  ['completed','cancelled','MEDIA_SPECIALIST_FAILED_OR_INTERRUPTED'],
 ]){
  const w=world({mediaRuns:[media(status,conclusion)]});
  const result=await run(w);
  assert.equal(result.status,'SKIPPED');
  assert.equal(result.reason,reason);
  assert.equal(w.updated(),0,'macOS evidence cannot be cancelled');
  assert.equal(w.comments.length,0,'a media hold cannot consume the one owner update');
 }
 const successful=world({mediaRuns:[media('completed','success')]});
 assert.equal((await run(successful)).status,'UPDATED');
 assert.equal(successful.updated(),1);
 const old=world({mediaRuns:[media('in_progress',null,'d'.repeat(40))]});
 assert.equal((await run(old)).status,'UPDATED','prior-source media cannot block current HEAD');
});
test('macOS hold reads only trusted exact-source PR workflow evidence',async()=>{
 const {holdPendingExactMedia}=require('../scripts/ci-pr-base-advanced-recovery.cjs');
 const args={owner:'andylitvinov-design',repo:'books',number:3510,head:HEAD,branch:'fix/sensitive-crm'};
 const calls=[];
 const gh={rest:{actions:{listWorkflowRuns:async request=>{
  calls.push(request);
  return {data:{workflow_runs:[{id:7,event:'pull_request',
   head_sha:HEAD,head_branch:args.branch,status:'in_progress',
   pull_requests:[{number:3510,head:{sha:HEAD},base:{ref:'codex/public-book-library'}}]
  }]}};
 }}}};
 assert.equal(await holdPendingExactMedia(gh,args),'MEDIA_SPECIALIST_STILL_RUNNING');
 assert.equal(calls[0].workflow_id,'holistic-support-mandala.yml');
 assert.equal(calls[0].branch,args.branch);
 assert.equal(await holdPendingExactMedia({rest:{actions:{
  listWorkflowRuns:async()=>{throw Error('unavailable');}
 }}},args),'MEDIA_SPECIALIST_INDEX_UNAVAILABLE');
 assert.equal(await holdPendingExactMedia(gh,{...args,head:'malformed'}),'MEDIA_ASSOCIATION_UNVERIFIED');
});

test('owner source sync subjects from #5606, #5609 and #5599 count toward the same existing hold',()=>{
 const now=Date.parse('2026-11-04T21:02:00Z');
 const item=(sha,message,parents=2)=>({sha,parents:Array.from({length:parents},()=>({sha:OLD})),
  commit:{message,committer:{date:'2026-11-04T21:01:00Z'}}});
 const rows=[
  item('d'.repeat(40),'Merge current protected production after Reiki release into CI reduction #5606'),
  item('e'.repeat(40),'Sync protected BASE after verified BASE_ADVANCED (#5609)\n\nPreserve exact two blobs.'),
  item(HEAD,'Merge protected production after verified BASE_ADVANCED (#5599)')
 ];
 const result=classifyRecentBaseSyncs(rows,HEAD,now);
 assert.equal(result.verified,true);assert.equal(result.count,3);assert.equal(result.hold,true);
 assert.equal(classifyRecentBaseSyncs([item(HEAD,rows[2].commit.message,1)],HEAD,now).count,0);
 assert.equal(classifyRecentBaseSyncs([item(HEAD,'fix: repair source after BASE_ADVANCED')],HEAD,now).count,0);
 assert.equal(classifyRecentBaseSyncs([rows[0],rows[0],rows[2]],HEAD,now).verified,false);
});
test('complete bounded PR history detects repeat sync across a 100-commit page boundary',async()=>{
 const item=(sha,message,parents=1)=>({sha,parents:Array.from({length:parents},()=>({sha:OLD})),
  commit:{message,committer:{date:'2026-11-04T21:01:00Z'}}});
 const page1=Array.from({length:99},(_,i)=>item((i+1).toString(16).padStart(40,'0'),'source'));
 page1.push(item('d'.repeat(40),'Sync protected BASE after verified BASE_ADVANCED (#5609)',2));
 const page2=[item(HEAD,'Merge protected production after verified BASE_ADVANCED (#5599)',2)];
 const w=world({pr:{commits:101},commitPages:{1:page1,2:page2}});
 const res=await run(w);
 assert.equal(res.reason,'BASE_SYNC_REPEAT_BURST_HOLD');assert.equal(res.recentSyncs,2);
 assert.equal(w.updated(),0);
 for(const opts of [
  {pr:{commits:101},commitPages:{1:page1.slice(1),2:page2}},
  {pr:{commits:251},commitPages:{1:page1,2:page2}}
 ]){
  const bad=world(opts),result=await run(bad);
  assert.match(result.reason,/BASE_SYNC_HISTORY/);assert.equal(bad.updated(),0);
 }
});
test('two commits can already consume the repeat synchronization budget',async()=>{
 const item=(sha)=>({sha,parents:[{sha:OLD},{sha:LIVE}],
  commit:{message:'Sync protected BASE after verified BASE_ADVANCED (#5609)',committer:{date:'2026-11-04T21:01:00Z'}}});
 const w=world({pr:{commits:2},commitList:[item('d'.repeat(40)),item(HEAD)]});
 const result=await run(w);
 assert.equal(result.reason,'BASE_SYNC_REPEAT_BURST_HOLD');assert.equal(w.updated(),0);
});
