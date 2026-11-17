'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {eligibleMachineTruncation,signedOwnerResume}=
 require('../scripts/ci-pr-manual-resume.cjs');
const SHA='a'.repeat(40),REPO='andylitvinov-design/books';
const base={
 number:4737,state:'open',draft:false,mergeable:true,mergeable_state:'blocked',
 user:{login:'andylitvinov-design'},
 head:{sha:SHA,repo:{full_name:REPO}},
 base:{ref:'codex/public-book-library'},
 labels:[{name:'hh:repair-manual'}]
};
const old={
 schema:'HH_PR_TASK_V1',pr_number:4737,head_sha:SHA,
 lane:'repair',state:'MANUAL',new_sha:null,source_published:false,
 detail_code:'FREE_AI_OPENROUTER_PATCH_RESPONSE_TRUNCATED',
 ai_execution:{model_response_confirmed:true,patch_received:false,source_published_sha:null},
 model_run:{model_call_started_at:'2026-11-16T00:03:00Z',
  response_shape:{finish_reason:'length'},patch_present:false}
};
const grant={
 schema:'HH_PR_TASK_V1',pr_number:4737,head_sha:SHA,
 lane:'legacy',state:'RESERVED',
 owner_retry_kind:'TRUNCATED_FREE_MODEL',
 owner_retry_source:'OIDC_SIGNED_QUEUE',
 owner_retry_request_id:'123e4567-e89b-42d3-a456-426614174000',
 owner_run_id:'44109999999'
};
function signed(record){
 return {user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  body:'<!-- HH_PR_TASK_V1 -->\n'+'\x60\x60\x60json\n'+JSON.stringify(record)+'\n\x60\x60\x60'};
}
test('machine truncation is a verifiable narrow owner-retry candidate only',()=>{
 assert.equal(eligibleMachineTruncation(base,[signed(old)]),true);
 assert.equal(signedOwnerResume(base,[signed(old)]),false,'no signed new grant');
 assert.equal(signedOwnerResume(base,[signed(old),signed(grant)]),true);
 assert.equal(signedOwnerResume(base,[signed(old),signed(grant),signed(grant)]),false,
  'no duplicate accepted owner grants on this HEAD');
});
test('foreign, unverified and missing provider outcome cannot authorize source',()=>{
 const cases=[
  {...old,detail_code:'FREE_AI_UNSAFE_SOURCE_SCOPE'},
  {...old,source_published:true},
  {...old,model_run:{...old.model_run,response_shape:{finish_reason:'stop'}}},
  {...old,ai_execution:{...old.ai_execution,model_response_confirmed:false}},
  {...old,head_sha:'b'.repeat(40)}
 ];
 for(const record of cases)
  assert.equal(eligibleMachineTruncation(base,[signed(record)]),false);
 const forged={...signed(old),user:{id:42,login:'foreign',type:'User'}};
 assert.equal(eligibleMachineTruncation(base,[forged]),false);
});
test('hard owner/security holds, stale heads, conflicts and drafts remain closed',()=>{
 const guarded=[
  {...base,labels:[...base.labels,{name:'hh:hold'}]},
  {...base,labels:[...base.labels,{name:'hh:blocked'}]},
  {...base,labels:[...base.labels,{name:'hh:worker-claimed'}]},
  {...base,labels:[...base.labels,{name:'hh:conflict-repair-needed'}]},
  {...base,mergeable:false,mergeable_state:'dirty'},
  {...base,draft:true},
  {...base,head:{...base.head,sha:'b'.repeat(40)}},
  {...base,user:{login:'stranger'}}
 ];
 for(const p of guarded)
  assert.equal(signedOwnerResume(p,[signed(old),signed(grant)]),false);
});
test('wrong grant source or expired different task cannot be inferred from owner intent',()=>{
 for(const grantRecord of [
  {...grant,owner_retry_source:'OWNER_ISSUE_3890'},
  {...grant,owner_retry_request_id:'unknown'},
  {...grant,lane:'repair'},
  {...grant,owner_run_id:'0'},
  {...grant,head_sha:'b'.repeat(40)}
 ])assert.equal(signedOwnerResume(base,[signed(old),signed(grantRecord)]),false);
});
