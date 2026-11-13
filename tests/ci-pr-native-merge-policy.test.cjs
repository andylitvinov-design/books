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
   checks:{listForRef:async()=>({data:{
     total_count:(opts.checkRuns??[]).length,
     check_runs:opts.checkRuns??[]
   }})},
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

test('independent Mandala red on exact HEAD blocks native merge after green Core',async()=>{
 const real={name:'focused-unit-types-build',status:'completed',
   conclusion:'failure',head_sha:HEAD,app:{slug:'github-actions'}};
 assert.equal((await check(makeTestWorld({checkRuns:[real]}))).reason,
   'CRITICAL_CHECK_FAILED:focused-unit-types-build');
 // Unrelated optional failures must not reintroduce blanket CI blocking.
 assert.equal((await check(makeTestWorld({checkRuns:[
   {...real,name:'unrelated-option'}]}))).ok,true);
});
test('critical domain jobs must be current, terminal and passing/skipped',async()=>{
 const job={name:'read-only-mobile',status:'in_progress',
   conclusion:null,head_sha:HEAD,app:{slug:'github-actions'}};
 assert.equal((await check(makeTestWorld({checkRuns:[job]}))).reason,
   'CRITICAL_CHECK_PENDING:read-only-mobile');
 assert.equal((await check(makeTestWorld({checkRuns:[
   {...job,status:'completed',conclusion:'success'}]}))).ok,true);
 assert.equal((await check(makeTestWorld({checkRuns:[
   {...job,status:'completed',conclusion:'skipped'}]}))).ok,true);
 assert.equal((await check(makeTestWorld({checkRuns:[
   {...job,status:'completed',conclusion:'success',head_sha:BASE}]}))).reason,
   'CRITICAL_CHECK_PROOF_UNVERIFIED:read-only-mobile');
 const noApi=makeTestWorld();delete noApi.github.rest.checks;
 assert.equal((await check(noApi)).reason,'CRITICAL_CHECK_API_UNAVAILABLE');
 const workflow=fs.readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
 assert.match(workflow,/^  checks: read$/m);
});

test('isolated repair canaries are denied native auto-merge without blocking the Repair Worker',async()=>{
 const branchWorld=makeTestWorld({pr:{
   title:'test(repair): exact one-line model proof — NEVER MERGE',
   head:{sha:HEAD,ref:'test/pr-repair-json-line-proof-20261110',repo:{full_name:OWNER+'/'+REPO}}}});
 const onlyTitle=makeTestWorld({pr:{
   title:'test(repair): legacy source canary',head:{sha:HEAD,ref:'fix/public-card',repo:{full_name:OWNER+'/'+REPO}}}});
 const results=await Promise.all([check(branchWorld),check(onlyTitle)]);
 for(const result of results){
  assert.equal(result.ok,false);
  assert.equal(result.reason,'REPAIR_CANARY_NEVER_MERGE');
 }
 const normal=makeTestWorld({pr:{
   title:'fix: ordinary verified source repair',head:{sha:HEAD,ref:'fix/public-card',repo:{full_name:OWNER+'/'+REPO}}}});
 assert.equal((await check(normal)).ok,true,'normal verified production PR stays eligible');
});

test('native ARM spends owner PAT only for protected merge, not read-only preflight', () => {
  const source=fs.readFileSync('.github/workflows/hh-native-auto-merge.yml','utf8');
  const start=source.indexOf('      - name: Enable native auto-merge for this exact head');
  const end=source.indexOf('  recover-interrupted-core:',start);
  assert.ok(start>=0&&end>start,'existing native merge stage remains intact');
  const arm=source.slice(start,end);
  const dollar='$';
  assert.ok(arm.includes('GH_TOKEN: '+dollar+'{{ github.token }}'),
    'preflight must use the per-repository read token');
  assert.ok(arm.includes('HH_AUTOMERGE_TOKEN: '+dollar+'{{ secrets.HH_AUTOMERGE_TOKEN }}'),
    'the existing owner token stays available for one protected write');
  assert.ok(!arm.includes('GH_TOKEN: '+dollar+'{{ secrets.HH_AUTOMERGE_TOKEN || github.token }}'),
    'the scarce owner PAT must not fund ordinary gh list/view/api reads');
  assert.ok(arm.includes('gh pr list --repo "$GH_REPO"'));
  assert.ok(arm.includes('gh pr view "$PR_NUMBER"'));
  assert.ok(arm.includes('gh api "repos/$GH_REPO/git/ref/heads/codex/public-book-library"'));
  assert.match(arm,/if GH_TOKEN="\$\{HH_AUTOMERGE_TOKEN:-\$GH_TOKEN\}" gh pr merge "\$PR_NUMBER" --auto "\$merge_option" --match-head-commit "\$PR_HEAD"/,
    'only the native protected --auto mutation may use the owner token');
  assert.ok(!arm.includes('gh pr merge "$PR_NUMBER" --squash') &&
    !arm.includes('gh pr merge "$PR_NUMBER" --merge'),
    'stacked-safe method selector must remain authoritative');
  assert.ok(arm.includes('PR_REQUIRES_CURRENT_BASE')&&
    arm.includes('HH_EXPECTED_MERGE_METHOD')&&arm.includes('CI_AUTO_MERGE_SAFETY:')===false,
    'base freshness and method verification are preserved');
});
