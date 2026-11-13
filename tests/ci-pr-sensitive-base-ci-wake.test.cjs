'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {run,candidate,MARKER}=require('../scripts/ci-pr-sensitive-base-ci-wake.cjs');
const HEAD='e'.repeat(40),OLD='9e84af6e730328ab34099f97b98cb14211bc08af';
const NEW='ea9a8e571dfc597d50a91fa369ebde1cecd79441';
function world(opts={}){
 let draft=false,comments=[],mutations=[],updates=[],prReads=0;
 const pr={number:4303,state:'open',draft:false,
  user:{login:'andylitvinov-design'},
  base:{ref:'codex/public-book-library',sha:OLD},
  head:{sha:HEAD,ref:'codex/reasoning-mind-20261110',
   repo:{full_name:'andylitvinov-design/books'}},
  mergeable:true,mergeable_state:'blocked',auto_merge:null,
  labels:[],body:'existing public PR body',node_id:'PR_abcdef01'};
 const diff=(status,base,mergeBase,extra={})=>({
  status,base_commit:{sha:base},merge_base_commit:{sha:mergeBase},...extra});
 const github={rest:{
  pulls:{get:async()=>{prReads++;return {data:opts.changeAfterIntent&&prReads>=3?
   {...pr,head:{...pr.head,sha:'f'.repeat(40)}}:{...pr,draft}};},
   list:async()=>({data:[]})},
  repos:{getBranch:async()=>({data:{protected:true,commit:{sha:opts.movedBase?'f'.repeat(40):NEW}}}),
   compareCommits:async ({base,head})=>{
    if(base===OLD&&head===NEW)return {data:diff('ahead',OLD,OLD,{behind_by:0})};
    if(base===OLD&&head===HEAD)return {data:opts.badSource?
     diff('diverged',OLD,'a'.repeat(40),{ahead_by:1}):
     diff('ahead',OLD,OLD,{ahead_by:2})};
    if(base===NEW&&head===HEAD)return {data:opts.badRelation?
     diff('behind',NEW,OLD,{ahead_by:0,behind_by:1}):
     opts.alreadyCurrent?diff('ahead',NEW,NEW,{ahead_by:1,behind_by:0}):
     diff('diverged',NEW,OLD,{ahead_by:2,behind_by:1})};
    throw Error('Unexpected compare '+base+'...'+head);
   }},
  actions:{listWorkflowRuns:async()=>({data:{workflow_runs:[{
   id:opts.newerCore?45:44,head_sha:HEAD,status:'completed',conclusion:'success'}]}})},
  issues:{listComments:async()=>({data:comments}),
   createComment:async({body})=>{
    comments.push({id:comments.length+1,body,user:{
     login:'github-actions[bot]',id:41898282,type:'Bot'},
     performed_via_github_app:{id:15368,slug:'github-actions'}});
    return {data:{id:comments.length}};
   }}
 }};
 const fetcher=async(url,request)=>{
  if(url.endsWith('/user'))return {ok:true,json:async()=>({login:'andylitvinov-design'})};
  if(url.endsWith('/pulls/4303'))return {ok:true,json:async()=>({...pr,draft})};
  if(url.endsWith('/pulls/4303/update-branch')){
   updates.push(JSON.parse(request.body));
   if(opts.denyUpdate)return {ok:false,status:403,json:async()=>({message:'denied'})};
   return {ok:true,status:202,json:async()=>({message:'Updating pull request branch'})};
  }
  if(url.endsWith('/graphql')){
   const raw=JSON.parse(request.body);
   const action=raw.query.includes('convertPullRequestToDraft')?
    'convertPullRequestToDraft':'markPullRequestReadyForReview';
   draft=action==='convertPullRequestToDraft';
   mutations.push(action);
   return {ok:true,json:async()=>({data:{[action]:{pullRequest:{
    id:pr.node_id,isDraft:draft}}}})};
  }
  throw Error('unexpected PAT endpoint '+url);
 };
 const context={eventName:'workflow_run',repo:{owner:'andylitvinov-design',repo:'books'},
  payload:{workflow_run:{id:44,name:'HH PR core release gate',
   event:'pull_request',conclusion:'success'}}};
 const args={github,context,token:'mock-owner-token',number:4303,
  head:HEAD,oldBase:OLD,newBase:NEW,coreRunId:44,
  now:Date.parse('2026-11-11T01:00:00Z'),fetcher};
 return {args,pr,comments,mutations,updates,getDraft:()=>draft};
}
test('only owner Ready, free-lease clean HEAD is an admissible candidate',()=>{
 const w=world();assert.equal(candidate(w.pr,HEAD),true);
 assert.equal(candidate({...w.pr,draft:true},HEAD),false);
 assert.equal(candidate({...w.pr,labels:[{name:'hh:hold'}]},HEAD),false);
 assert.equal(candidate({...w.pr,mergeable:false},HEAD),false);
 assert.equal(candidate({...w.pr,head:{...w.pr.head,sha:'f'.repeat(40)}},HEAD),false);
});
test('one signed stale BASE update requests native protected branch sync, not duplicate Ready',async()=>{
 const w=world(),result=await run(w.args);
 assert.equal(result.status,'BASE_SYNC_REQUESTED');
 assert.equal(result.headUpdateRequested,true);
 assert.equal(result.metadataEventRequested,false);
 assert.equal(result.ciVerified,false);
 assert.equal(result.sourceChanged,false,'202 accepted is not proof that HEAD already moved');
 assert.equal(w.getDraft(),false);
 assert.deepEqual(w.mutations,[],'no preliminary Ready CI wave');
 assert.deepEqual(w.updates,[{expected_head_sha:HEAD}],'native non-force compare-and-swap');
 assert.equal(w.comments.length,1);
 assert.ok(w.comments[0].body.includes(MARKER+' pr=4303 head='+HEAD));
 const repeat=await run(w.args);
 assert.equal(repeat.reason,'ONE_WAKE_ALREADY_RECORDED_FOR_HEAD');
 assert.equal(w.updates.length,1);
});
test('HEAD already containing live BASE retains source and requests signed Ready once',async()=>{
 const w=world({alreadyCurrent:true}),result=await run(w.args);
 assert.equal(result.status,'WAKE_REQUESTED');
 assert.equal(result.metadataEventRequested,true);
 assert.equal(result.headUpdateRequested,false);
 assert.deepEqual(w.updates,[]);
 assert.deepEqual(w.mutations,['convertPullRequestToDraft','markPullRequestReadyForReview']);
 assert.equal(w.getDraft(),false);
});
test('unknown/divergent ancestral source and concurrent writer states fail closed',async()=>{
 for(const options of [{badSource:true},{badRelation:true},{movedBase:true},
  {changeAfterIntent:true},{denyUpdate:true}]){
  const w=world(options),result=await run(w.args);
  assert.equal(result.status,'HOLD',JSON.stringify(options));
  assert.equal(w.updates.length,options.denyUpdate?1:0);
  assert.deepEqual(w.mutations,[]);
  assert.equal(result.ciVerified,false);
  assert.equal(result.sourceChanged,false);
 }
});
test('wrong event, no PAT, hold, unchanged BASE or stale run never writes',async()=>{
 const w=world();
 assert.equal((await run({...w.args,token:''})).reason,'OWNER_TOKEN_NOT_CONFIGURED');
 assert.equal((await run({...w.args,oldBase:NEW})).reason,'UNTRUSTED_OR_NOT_STALE');
 assert.equal((await run({...w.args,coreRunId:45})).reason,'UNTRUSTED_OR_NOT_STALE');
 w.pr.labels.push({name:'hh:repair-manual'});
 assert.equal((await run(w.args)).reason,'PR_HOLD_OR_CHANGED_HEAD');
 assert.deepEqual(w.updates,[]);
 assert.deepEqual(w.mutations,[]);
 assert.equal(w.comments.length,0);
});
test('newer exact HEAD Core run blocks double wake and source update',async()=>{
 const w=world({newerCore:true});
 assert.equal((await run(w.args)).reason,'NEWER_OR_INCOMPLETE_CORE_WAVE');
 assert.equal(w.comments.length,0);
 assert.equal(w.updates.length,0);
});
test('BASE advance record and code keep exact required gate; no force or fake green',()=>{
 const workflow=require('node:fs').readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
 const code=require('node:fs').readFileSync('scripts/ci-pr-sensitive-base-ci-wake.cjs','utf8');
 assert.match(workflow,/steps.freshness.outputs.needs_revalidation == 'true'/);
 assert.match(workflow,/BASE_SYNC_REQUESTED/);
 assert.match(workflow,/WAKE_REQUESTED/);
 assert.match(workflow,/Verify effective review, resolved threads and free owner lease/);
 assert.match(code,/expected_head_sha:head/);
 assert.doesNotMatch(code,/force:true|createCheckRun|check-runs\/|\/merges/);
});
