'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const {auditNativeMerge,inspectReviews}=require('../scripts/ci-pr-native-merge-policy.cjs');
const HEAD='a'.repeat(40),BASE='b'.repeat(40),OWNER='andylitvinov-design',REPO='books';
function makeTestWorld(opts={}){
 const pr={number:42,state:'open',draft:false,mergeable:true,mergeable_state:'clean',
  base:{ref:'codex/public-book-library',sha:BASE},
  head:{sha:HEAD,repo:{full_name:OWNER+'/'+REPO}},
  labels:[],...opts.pr};
 const ruleset={enforcement:'active',rules:[{type:'pull_request',
  parameters:{required_approving_review_count:0,
    required_review_thread_resolution:true,allowed_merge_methods:['squash','merge'],
    ...opts.parameters}}],...opts.ruleset};
 const threads=opts.threads??[];
 const comments=opts.comments??[];
 const github={
  rest:{
   pulls:{get:async()=>({data:pr})},
   issues:{listComments:async({page,per_page})=>({data:
     comments.slice((page-1)*per_page,page*per_page)})}
  },
  request:async()=>({data:ruleset}),
  graphql:async(_query,vars)=>({repository:{pullRequest:{
   headRefOid:opts.graphHead??HEAD,
   baseRefName:'codex/public-book-library',
   reviewDecision:opts.reviewDecision??null,
   reviewThreads:{nodes:threads,
    pageInfo:{hasNextPage:false,endCursor:null}}
  }}})
 };
 return {github,pr};
}
async function check(world){
 return auditNativeMerge({github:world.github,owner:OWNER,repo:REPO,
  number:42,expectedHead:HEAD,expectedBase:BASE});
}
const modern=(state,actor='trusted-editor')=>({
 id:1,user:{login:actor},body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n```json\n'+
 JSON.stringify({schema:'HH_PR_SWEEP_LEASE_V1',owner:'repair-agent',
   lease_id:'current-head-writer',head_sha:HEAD,state,
   expires_at:'2100-01-01T00:00:00.000Z'})+'\n```'
});
test('Green with zero mandatory approvals and resolved discussions is eligible',async()=>{
 assert.deepEqual(await check(makeTestWorld()),
  {ok:true,reason:'REVIEW_LEASE_CONFLICT_HEAD_VERIFIED'});
});
test('required approval is enforced without inventing an approval when count is zero',async()=>{
 assert.equal((await check(makeTestWorld({parameters:{required_approving_review_count:1}}))).reason,
  'MANDATORY_APPROVAL_MISSING');
 assert.equal((await check(makeTestWorld({parameters:{required_approving_review_count:1},
  reviewDecision:'APPROVED'}))).ok,true);
});
test('change requests and unresolved review threads cannot be auto-armed',async()=>{
 assert.equal((await check(makeTestWorld({reviewDecision:'CHANGES_REQUESTED'}))).reason,
  'REVIEW_NOT_APPROVED');
 assert.equal((await check(makeTestWorld({reviewDecision:'REVIEW_REQUIRED'}))).reason,
  'REVIEW_NOT_APPROVED');
 assert.equal((await check(makeTestWorld({threads:[{isResolved:false}]}))).reason,
  'UNRESOLVED_REVIEW_THREAD');
});
test('active owner lease blocks, and authenticated same-actor release frees it',async()=>{
 const active=modern('active'),released={...modern('released'),id:2};
 assert.equal((await check(makeTestWorld({comments:[active]}))).reason,'OWNER_LEASE_ACTIVE');
 assert.equal((await check(makeTestWorld({comments:[active,released]}))).ok,true);
 assert.equal((await check(makeTestWorld({comments:[active,{...released,user:{login:'stranger'}}]}))).reason,
  'OWNER_LEASE_ACTIVE');
});
test('malformed current-head lease never unlocks by expiry or parsing failure',async()=>{
 const broken={id:5,user:{login:'trusted-editor'},
  body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n```json\n{"head_sha":"'+HEAD+'"}\n```'};
 assert.equal((await check(makeTestWorld({comments:[broken]}))).reason,'OWNER_LEASE_UNVERIFIED');
});
test('conflicts, manual holds, changed heads and unverified mergeability fail closed',async()=>{
 for(const [pr,reason] of [
   [{mergeable:false,mergeable_state:'dirty'},'MERGE_CONFLICT'],
   [{mergeable:null,mergeable_state:'unknown'},'MERGEABILITY_NOT_READY'],
   [{draft:true},'PR_HEAD_BASE_OR_STATE_CHANGED'],
   [{head:{sha:'c'.repeat(40),repo:{full_name:OWNER+'/'+REPO}}},'PR_HEAD_BASE_OR_STATE_CHANGED'],
   [{labels:[{name:'hh:hold'}]},'MANUAL_OR_OWNER_HOLD'],
   [{labels:[{name:'hh:worker-claimed'}]},'MANUAL_OR_OWNER_HOLD']
  ])assert.equal((await check(makeTestWorld({pr}))).reason,reason);
 assert.equal((await check(makeTestWorld({pr:{mergeable_state:'unstable'}}))).ok,true,
   'optional red checks do not override proven mandatory CI');
 assert.equal((await check(makeTestWorld({pr:{mergeable_state:'blocked'}}))).ok,true,
   'GitHub blocked is not a conflict; the coordinators prove required CI before native ARM');
 assert.equal((await check(makeTestWorld({pr:{mergeable:false,mergeable_state:'blocked'}}))).ok,false,
   'actual non-mergeability still blocks');
});
test('missing authoritative review policy or GraphQL evidence cannot authorize merge',async()=>{
 assert.equal((await check(makeTestWorld({ruleset:{enforcement:'disabled'}}))).reason,
  'PRODUCTION_REVIEW_RULESET_UNVERIFIED');
 assert.equal((await check(makeTestWorld({parameters:{required_review_thread_resolution:false}}))).reason,
  'PRODUCTION_REVIEW_RULESET_UNVERIFIED');
 assert.equal((await check(makeTestWorld({graphHead:'c'.repeat(40)}))).reason,
  'REVIEW_EVIDENCE_INCOMPLETE');
});
test('incomplete owner lease pagination cannot produce green',async()=>{
 const world=makeTestWorld();
 world.github.rest.issues.listComments=async()=>({data:Array.from({length:100},()=>({body:''}))});
 assert.equal((await check(world)).ok,false);
});
test('hourly and event-driven coordinators share the guard and never direct merge',()=>{
 const native=fs.readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
 const hourly=fs.readFileSync('.github/workflows/hh-pr-full-inventory.yml','utf8');
 assert.ok(native.includes('pull_request_review:'));
 assert.ok(native.includes('CI_AUTO_MERGE_SAFETY:'));
 assert.ok(native.includes("steps.safety.outputs.eligible == 'true'"));
 assert.ok(native.includes("hh-native-merge-"));
 assert.ok(native.includes('--auto "$merge_option" --match-head-commit "$PR_HEAD"'));
 assert.ok(hourly.includes('mergeSafety.auditNativeMerge({'));
 assert.ok(hourly.includes('MERGE_SAFETY_'));
 assert.ok(hourly.includes('"--auto"'));
});
