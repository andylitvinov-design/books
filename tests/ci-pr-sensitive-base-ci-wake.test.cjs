'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {run,candidate,MARKER}=require('../scripts/ci-pr-sensitive-base-ci-wake.cjs');
const HEAD='e'.repeat(40),OLD='9e84af6e730328ab34099f97b98cb14211bc08af';
const NEW='ea9a8e571dfc597d50a91fa369ebde1cecd79441';
function world(){
 let draft=false,comments=[],mutations=[];
 const pr={number:4303,state:'open',draft:false,
  user:{login:'andylitvinov-design'},
  base:{ref:'codex/public-book-library',sha:OLD},
  head:{sha:HEAD,ref:'codex/reasoning-mind-20261110',
   repo:{full_name:'andylitvinov-design/books'}},
  mergeable:true,mergeable_state:'blocked',auto_merge:null,
  labels:[],body:'existing public PR body',node_id:'PR_abcdef01'};
 const github={rest:{
  pulls:{get:async()=>({data:{...pr,draft}}),list:async()=>({data:[]})},
  repos:{getBranch:async()=>({data:{protected:true,commit:{sha:NEW}}}),
   compareCommits:async()=>({data:{status:'ahead',behind_by:0,
    base_commit:{sha:OLD},merge_base_commit:{sha:OLD}}})},
  actions:{listWorkflowRuns:async()=>({data:{workflow_runs:[{
   id:44,head_sha:HEAD,status:'completed',conclusion:'success'}]}})},
  issues:{listComments:async()=>({data:comments}),
   createComment:async({body})=>{
    comments.push({id:comments.length+1,body,user:{
     login:'github-actions[bot]',id:41898282,type:'Bot'},
     performed_via_github_app:{id:15368,slug:'github-actions'}});
    return {data:{id:comments.length}};
   }}
 }};
 const fetcher=async(url,opts)=>{
  if(url.endsWith('/user'))return {ok:true,json:async()=>({login:'andylitvinov-design'})};
  if(url.endsWith('/pulls/4303'))return {ok:true,json:async()=>({...pr,draft})};
  if(url.endsWith('/graphql')){
   const raw=JSON.parse(opts.body);
   const mutation=raw.query.includes('convertPullRequestToDraft')?
    'convertPullRequestToDraft':'markPullRequestReadyForReview';
   draft=mutation==='convertPullRequestToDraft';mutations.push(mutation);
   return {ok:true,json:async()=>({data:{[mutation]:{pullRequest:{
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
 return {args,pr,comments,mutations,getDraft:()=>draft};
}
test('only the owner Ready PR with same head and no active hold is eligible',()=>{
 const w=world();assert.equal(candidate(w.pr,HEAD),true);
 assert.equal(candidate({...w.pr,draft:true},HEAD),false);
 assert.equal(candidate({...w.pr,labels:[{name:'hh:hold'}]},HEAD),false);
 assert.equal(candidate({...w.pr,mergeable:false},HEAD),false);
 assert.equal(candidate({...w.pr,head:{...w.pr.head,sha:'f'.repeat(40)}},HEAD),false);
});
test('one signed stale-base wake restores Ready without changing HEAD/source',async()=>{
 const w=world(),result=await run(w.args);
 assert.equal(result.status,'WAKE_REQUESTED');
 assert.equal(result.metadataEventRequested,true);
 assert.equal(result.ciVerified,false);
 assert.equal(result.sourceChanged,false);
 assert.equal(w.getDraft(),false);
 assert.deepEqual(w.mutations,['convertPullRequestToDraft','markPullRequestReadyForReview']);
 assert.equal(w.comments.length,1);
 assert.ok(w.comments[0].body.includes(MARKER+' pr=4303 head='+HEAD));
 const repeat=await run(w.args);
 assert.equal(repeat.reason,'ONE_WAKE_ALREADY_RECORDED_FOR_HEAD');
 assert.equal(w.mutations.length,2);
});
test('no wake for unverified state, no token, hold, stale event or unchanged base',async()=>{
 const w=world();
 assert.equal((await run({...w.args,token:''})).reason,'OWNER_TOKEN_NOT_CONFIGURED');
 assert.equal((await run({...w.args,oldBase:NEW})).reason,'UNTRUSTED_OR_NOT_STALE');
 assert.equal((await run({...w.args,coreRunId:45})).reason,'UNTRUSTED_OR_NOT_STALE');
 w.pr.labels.push({name:'hh:repair-manual'});
 assert.equal((await run(w.args)).reason,'PR_HOLD_OR_CHANGED_HEAD');
 assert.equal(w.comments.length,0);
});
test('newer successful Core run stops wake and preserves zero comments',async()=>{
 const w=world();
 w.args.github.rest.actions.listWorkflowRuns=async()=>({data:{workflow_runs:[{
  id:45,head_sha:HEAD,status:'completed',conclusion:'success'}]}});
 assert.equal((await run(w.args)).reason,'NEWER_OR_INCOMPLETE_CORE_WAVE');
 assert.equal(w.comments.length,0);
});
test('base moved again before mutation means no Draft and no comment',async()=>{
 const w=world();
 w.args.github.rest.repos.getBranch=async()=>({data:{protected:true,commit:{sha:'f'.repeat(40)}}});
 assert.equal((await run(w.args)).reason,'PROTECTED_BASE_MOVED');
 assert.equal(w.comments.length,0);
});
