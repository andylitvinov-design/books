'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {eligible,safeFiles,claim,publish,finalize,finalizeFailedFix,prioritizedRepairCandidates,currentRepairHead,validBranch,validCandidate,activeSweepLease,repairMode,hasVerifiedSourceHandoff,verifiedCoreCodeFailure,MARKER}=require('../scripts/ci-pr-repair-worker.cjs');
const {taskFor,commentBody,reservation,reservationStatus,externalOwnerLeaseStatus}=require('../scripts/ci-pr-task-state.cjs');
const {stageLine,parseComment,timelineStages}=require('../scripts/ci-pr-stage-receipts.cjs');
const {buildTaskOutcome,validateTaskOutcome}=require('../scripts/ci-pr-task-outcome.cjs');
const sha='a'.repeat(40), newSha='b'.repeat(40), owner='andylitvinov-design', repo='books';
const context={repo:{owner,repo}};
const core={info:()=>{},outputs:{},setOutput(k,v){this.outputs[k]=v;}};
const pr=(extra={})=>({number:11,state:'open',draft:false,user:{login:owner},
  mergeable:true,mergeable_state:'blocked',
  base:{ref:'codex/public-book-library'},head:{ref:'fix/pr-11',sha,
    repo:{full_name:owner+'/'+repo}},labels:[{name:'hh:repair-needed'}],...extra});
const sourceFiles=[{filename:'lib/a.ts',status:'modified'}];
function fixture(options={}){
  const p=options.pr||pr(), log={comments:0,commentBodies:[],assigned:0,labels:0,removed:[],read:0,commit:0};
  const github={rest:{pulls:{
    get:async()=>({data:options.fresh||p}),list:async()=>({data:options.children||[]}),
    listFiles:async()=>({data:sourceFiles})},
    issues:{listForRepo:async()=>({data:[{number:11,pull_request:{}}]}),
      listComments:async()=>({data:options.comments ?? [{user:{id:41898282,login:'github-actions[bot]',type:'Bot'},performed_via_github_app:{id:15368,slug:'github-actions'},body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+p.head.sha+' -->\nFailed jobs: core-lint-types-build.\n'}]}),
      createComment:async({body})=>{log.comments++;log.commentBodies.push(body)},
      addAssignees:async()=>{log.assigned++},
      addLabels:async()=>{log.labels++},removeLabel:async({name})=>{log.removed.push(name)}},
    repos:{getContent:async()=>{log.read++;return {data:{type:'file',sha:newSha}}}},
    git:{getCommit:async()=>({data:{tree:{sha:'c'.repeat(40)},parents:[{sha}]}}),
      getRef:async()=>({data:{ref:'refs/heads/fix/pr-11',object:{sha:'d'.repeat(40)}}})}
  }};
  const writer={commit:async()=>{log.commit++;return {sha:'d'.repeat(40)}}};
  return {github,writer,log};
}
test('owner-only and exact repository/branch validation',()=>{
  assert.equal(eligible(pr(),owner+'/'+repo),true);
  for(const p of [pr({user:{login:'outsider'}}),pr({draft:true}),
    pr({head:{ref:'fix/one',sha,repo:{full_name:'other/repo'}}}),
    pr({base:{ref:'codex/bootstrap-books'}})])
    assert.equal(eligible(p,owner+'/'+repo),false);
  for(const b of ['../../etc','codex/bootstrap-books','a//b','a@{b',''])
    assert.equal(validBranch(b),false);
});
test('autofix scope excludes workflow/config, tests, and invalid file paths',()=>{
  assert.deepEqual(safeFiles([{filename:'src/page.tsx',status:'modified'},
    {filename:'tests/test.ts',status:'modified'},
    {filename:'.github/workflows/attack.mjs',status:'added'},
    {filename:'foo/../../secrets.js',status:'modified'}]),['src/page.tsx']);
});
test('a repair is claimed only once per exact HEAD; author assigned',async()=>{
  const f=fixture();core.outputs={};
  const r=await claim({github:f.github,core,context,hasToken:true,number:11});
  assert.equal(r.status,'claimed');
  assert.equal(core.outputs.strategy,'code');
  assert.equal(f.log.comments,1);
  assert.equal(f.log.assigned,1);
  const already=fixture({comments:[{body:'<!-- '+MARKER+' '+sha+' -->'}]});
  const second=await claim({github:already.github,core,context,hasToken:true,number:11});
  assert.equal(second.status,'skipped');
  assert.equal(already.log.comments,0);
});
test('Repair Worker reads owner lease and exact-head source receipt beyond page 1',async()=>{
 const f=fixture();
 let pages=[];
 f.github.rest.issues.listComments=async({page,per_page})=>{
  assert.equal(per_page,100);pages.push(page);
  return {data:page===1?Array.from({length:100},()=>({body:'historical note'})):
   [{user:{id:41898282,login:'github-actions[bot]',type:'Bot'},performed_via_github_app:{id:15368,slug:'github-actions'},body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->\nFailed jobs: core-lint-types-build.\n'}]};
 };
 core.outputs={};
 const result=await claim({github:f.github,core,context,hasToken:true,number:11});
 assert.deepEqual(pages,[1,2]);
 assert.equal(result.status,'claimed');assert.equal(f.log.comments,1);
});
test('Repair Worker reads source receipt beyond 300 comments',async()=>{
 const f=fixture();const pages=[];
 f.github.rest.issues.listComments=async({page})=>{
  pages.push(page);return {data:page<=3?Array.from({length:100},()=>({body:'old'})):
   [{user:{id:41898282,login:'github-actions[bot]',type:'Bot'},performed_via_github_app:{id:15368,slug:'github-actions'},body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->\nFailed jobs: core-lint-types-build.\n'}]};
 };
 const result=await claim({github:f.github,core,context,hasToken:true,number:11});
 assert.deepEqual(pages,[1,2,3,4]);assert.equal(result.status,'claimed');
});
test('Repair Worker fails closed when comment history exhausts the API budget',async()=>{
 const f=fixture();
 f.github.rest.issues.listComments=async()=>({data:Array.from({length:100},()=>({body:'old'}))});
 const result=await claim({github:f.github,core,context,hasToken:true,number:11});
 assert.equal(result.status,'skipped');assert.equal(f.log.comments,0);
});
test('dry run and absent owner token never claim or modify source',async()=>{
  for(const params of [{dryRun:true},{hasToken:false}]){
    const f=fixture();const r=await claim({github:f.github,core,context,number:11,...params});
    assert.equal(f.log.comments,0);
    assert.ok(['dry_run','skipped'].includes(r.status));
  }
});
test('conflicting source is assigned to owner but never unsafe-merged',async()=>{
  const f=fixture({pr:pr({mergeable:false,mergeable_state:'dirty',labels:[{name:'hh:conflict-repair-needed'}]})});
  const r=await claim({github:f.github,core,context,hasToken:true,number:11});
  assert.equal(r.status,'manual_conflict');
  assert.equal(f.log.comments,2);
  assert.equal(f.log.labels,1);
  assert.deepEqual(f.log.removed,['hh:conflict-repair-needed']);
  assert.equal(f.log.commit,0);
});
test('active external lease blocks concurrent worker',async()=>{
  // A real ownership receipt starts with the canonical header; incidental
  // embedded mention must not be used as exclusive source-writer evidence.
  const lease={body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({
    schema:'HH_PR_SWEEP_LEASE_V1',owner:'verified-owner',head_sha:sha,
    state:'active',expires_at:'2099-01-01T00:00:00Z'}),user:{login:'andylitvinov-design'}};
  assert.equal(activeSweepLease([lease],sha,Date.now()),true);
  const f=fixture({comments:[{body:'HH_PR_SWEEP_LEASE_V1 no json'}]});
  const r=await claim({github:f.github,core,context,hasToken:true,number:11});
  assert.equal(r.status,'skipped');
});
test('state=release clears only the same authenticated owner lease on the exact HEAD',()=>{
 const now=Date.parse('2026-11-08T18:30:00Z');
 const ownerName='chat-live-pr3823-conversational-tests-20261107';
 const leaseId='pr3823-owner-lease';
 const record={schema:'HH_PR_SWEEP_LEASE_V1',owner:ownerName,lease_id:leaseId,
  head_sha:sha,base_ref:'codex/public-book-library',state:'claim',
  created_at:'2026-11-08T00:29:07.537Z',expires_at:'2026-11-08T00:59:07.537Z'};
 const release={...record,state:'release',released_at:'2026-11-08T00:30:41.261Z'};
 const comment=(id,doc,login=owner)=>({id,user:{login},body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify(doc)});
 assert.equal(externalOwnerLeaseStatus([comment(1,record),comment(2,release)],sha,now),'FREE');
 assert.equal(externalOwnerLeaseStatus([comment(1,record)],sha,now),'OWNER_LEASE_ACTIVE');
 assert.equal(externalOwnerLeaseStatus([comment(1,record),comment(2,release,'other-owner')],sha,now),'OWNER_LEASE_ACTIVE');
 assert.equal(externalOwnerLeaseStatus([comment(2,release)],sha,now),'FREE');
 assert.equal(externalOwnerLeaseStatus([comment(2,{...release,head_sha:'f'.repeat(40)})],sha,now),'FREE');
});
test('publisher verifies owner, SHA, changed file blob and commits exactly once',async()=>{
  const f=fixture(), candidate={head_sha:sha,files:[{path:'lib/a.ts',original_sha:newSha,
    base64:Buffer.from('const a=1;\n').toString('base64')}]};
  assert.equal(validCandidate(candidate,sha),true);
  const r=await publish({github:f.github,core,context,prNumber:11,expectedSha:sha,candidate,writer:f.writer});
  assert.equal(r.status,'committed');
  assert.equal(f.log.commit,1);
  assert.equal(f.log.read,1);
});

test('publisher blocks a foreign source writer who claims the same HEAD during isolated repair',async()=>{
  const lease={body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({
    schema:'HH_PR_SWEEP_LEASE_V1',owner:'independent-codex-writer',
    head_sha:sha,state:'active',expires_at:'2099-01-01T00:00:00Z'
  }),user:{login:owner}};
  const f=fixture({comments:[lease]});
  const candidate={head_sha:sha,files:[{path:'lib/a.ts',original_sha:newSha,
    base64:'Y29uc3QgYT0xOwo='}]};
  await assert.rejects(publish({github:f.github,core,context,prNumber:11,
    expectedSha:sha,candidate,writer:f.writer}),
    /HH_REPAIR_PUBLISH_OWNER_LEASE_CHANGED_OR_UNVERIFIED/);
  assert.equal(f.log.commit,0,'foreign lease must prevent remote publication');
});

test('publisher fails closed on malformed or incomplete source lease history',async()=>{
  const candidate={head_sha:sha,files:[{path:'lib/a.ts',original_sha:newSha,
    base64:'Y29uc3QgYT0xOwo='}]};
  for(const lease of [
    {body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n{broken-json'},
    {body:'HH_PR_SWEEP_LEASE_V1 no json'}
  ]){
    const f=fixture({comments:[lease]});
    await assert.rejects(publish({github:f.github,core,context,prNumber:11,
      expectedSha:sha,candidate,writer:f.writer}),
      /HH_REPAIR_PUBLISH_OWNER_LEASE_CHANGED_OR_UNVERIFIED/);
    assert.equal(f.log.commit,0);
  }
});

test('publisher reads all comment pages before publication and rejects late foreign lease',async()=>{
  const lease={body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify({
    schema:'HH_PR_SWEEP_LEASE_V1',owner:'work-source-owner',
    head_sha:sha,state:'active',expires_at:'2099-01-01T00:00:00Z'
  }),user:{login:owner}};
  const f=fixture(), pages=[];
  f.github.rest.issues.listComments=async({page,per_page})=>{
    assert.equal(per_page,100);
    pages.push(page);
    return {data:page===1?Array.from({length:100},()=>({body:'historical note'})):[lease]};
  };
  await assert.rejects(publish({github:f.github,core,context,prNumber:11,
    expectedSha:sha,candidate:{head_sha:sha,files:[{path:'lib/a.ts',original_sha:newSha,
    base64:'Y29uc3QgYT0xOwo='}]},writer:f.writer}),
    /HH_REPAIR_PUBLISH_OWNER_LEASE_CHANGED_OR_UNVERIFIED/);
  assert.deepEqual(pages,[1,2]);
  assert.equal(f.log.commit,0);
});

test('publisher refuses to claim SHA publication without remote ref and parent proof',async()=>{
 const candidate={head_sha:sha,files:[{path:'lib/a.ts',original_sha:newSha,
   base64:Buffer.from('const a=1;\n').toString('base64')}]};
 const wrongRef=fixture();
 wrongRef.github.rest.git.getRef=async()=>({data:{
   ref:'refs/heads/fix/pr-11',object:{sha:'e'.repeat(40)}}});
 await assert.rejects(publish({github:wrongRef.github,core,context,prNumber:11,
   expectedSha:sha,candidate,writer:wrongRef.writer}),
   /HH_REPAIR_PUBLISH_REMOTE_REF_UNVERIFIED/);
 assert.equal(wrongRef.log.commit,1);
 assert.equal(wrongRef.log.comments,0,'no false PUBLISHED receipt');
 const wrongParent=fixture();
 wrongParent.github.rest.git.getCommit=async({commit_sha})=>({data:
   commit_sha===sha ? {tree:{sha:'c'.repeat(40)},parents:[{sha:'f'.repeat(40)}]} :
   {parents:[{sha:'f'.repeat(40)}]}});
 await assert.rejects(publish({github:wrongParent.github,core,context,prNumber:11,
   expectedSha:sha,candidate,writer:wrongParent.writer}),
   /HH_REPAIR_PUBLISH_PARENT_UNVERIFIED/);
 assert.equal(wrongParent.log.commit,1);
 assert.equal(wrongParent.log.comments,0,'no false PUBLISHED receipt');
});
test('publisher refuses changed SHA, unauthorized owner and forged patch path',async()=>{
  const c={head_sha:sha,files:[{path:'lib/a.ts',original_sha:newSha,base64:'YQ=='}]};
  let f=fixture({fresh:pr({head:{ref:'fix/pr-11',sha:'e'.repeat(40),repo:{full_name:owner+'/'+repo}}})});
  await assert.rejects(publish({github:f.github,core,context,prNumber:11,expectedSha:sha,candidate:c,writer:f.writer}),/STALE_HEAD/);
  assert.equal(f.log.commit,0);
  f=fixture();const forbidden={head_sha:sha,files:[{...c.files[0],path:'scripts/outside.js'}]};
  await assert.rejects(publish({github:f.github,core,context,prNumber:11,expectedSha:sha,candidate:forbidden,writer:f.writer}),/UNSAFE_PATH/);
  assert.equal(f.log.commit,0);
});
test('no safe patch sends owner to manual repair without source push',async()=>{
  const f=fixture();const r=await publish({github:f.github,core,context,prNumber:11,expectedSha:sha,
    candidate:{head_sha:sha,files:[]},writer:f.writer});
  assert.equal(r.status,'manual_required');
  assert.equal(f.log.labels,1);assert.equal(f.log.commit,0);
  assert.deepEqual(f.log.removed,['hh:repair-needed']);
});

test('low API quota pauses repair without a source claim',async()=>{
  const f=fixture();
  f.github.rest.issues.listForRepo=async()=>({
    headers:{'x-ratelimit-remaining':'72'},
    data:[{number:11,pull_request:{}}]});
  const r=await claim({github:f.github,core,context,hasToken:true,number:0});
  assert.equal(r.reason,'GITHUB_API_BUDGET_PAUSE');
  assert.equal(f.log.comments,0);
  assert.equal(f.log.commit,0);
});

test('missing manual-repair label is created before returning owner status',async()=>{
  const f=fixture();
  let created=0, calls=0;
  f.github.rest.issues.addLabels=async()=>{
    calls++;
    if(calls===1)throw Object.assign(Error('Unknown label'),{status:422});
  };
  f.github.rest.issues.createLabel=async()=>{created++;};
  const r=await publish({github:f.github,core,context,prNumber:11,expectedSha:sha,
    candidate:{head_sha:sha,files:[]},writer:f.writer});
  assert.equal(r.status,'manual_required');
  assert.equal(created,1);
  assert.equal(calls,2);
  assert.equal(f.log.comments,1);
  assert.equal(f.log.commit,0);
});


test('expired historical sweep comments cannot permanently suppress real Repair Worker',async()=>{
  const now=Date.parse('2026-11-01T18:10:00Z');
  const wrap=lease=>'<!-- HH_PR_SWEEP_LEASE_V1 -->\n\`\`\`json\n'+JSON.stringify(lease)+'\n\`\`\`';
  const old={owner:'Codex / video',run_id:'video-2606-20261030',head_sha:sha,
    lease_expires:'2026-10-30T16:45:00Z',last_action:'verify'};
  assert.equal(activeSweepLease([{body:wrap(old)}],sha,now),false);
  assert.equal(activeSweepLease([{body:wrap({...old,lease_expires:'2026-11-02T00:00:00Z'})}],sha,now),true);
  assert.equal(activeSweepLease([{body:wrap({...old,head_sha:'f'.repeat(40),
    lease_expires:'2026-11-02T00:00:00Z'})}],sha,now),false);
  assert.equal(activeSweepLease([{body:wrap({...old,lease_expires:'unknown'})}],sha,now),true);
  const f=fixture({comments:[{body:wrap(old)},{user:{id:41898282,login:'github-actions[bot]',type:'Bot'},performed_via_github_app:{id:15368,slug:'github-actions'},body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->\nFailed jobs: core-lint-types-build.\n'}]});
  const claimResult=await claim({github:f.github,core,context,hasToken:true,number:11,now});
  assert.equal(claimResult.status,'claimed');
  assert.equal(f.log.comments,1);
});

test('source repairs take priority over historical manual-only conflicts',()=>{
  const source=[{number:2606,pull_request:{}}];
  const conflicts=Array.from({length:30},(_,i)=>({number:1400+i,pull_request:{}}));
  for(let i=0;i<12;i++){
    const selected=prioritizedRepairCandidates(source,conflicts,1800000000000+i*600000);
    assert.equal(selected[0].number,2606);
    assert.ok(selected.length<=4);
    assert.ok(selected.slice(1).every(x=>x.number>=1400&&x.number<1430));
  }
});
test('conflict queue rotates fairly even when no source repairs exist',()=>{
  const conflicts=Array.from({length:23},(_,i)=>({number:1400+i,pull_request:{}}));
  const seen=new Set();
  for(let i=0;i<7;i++)for(const item of prioritizedRepairCandidates([],conflicts,1800000000000+i*600000))
    seen.add(item.number);
  assert.equal(seen.size,23);
});
test('candidate queues deduplicate double-labelled pull requests',()=>{
  assert.deepEqual(prioritizedRepairCandidates(
    [{number:2606,pull_request:{}}],
    [{number:2606,pull_request:{}},{number:1421,pull_request:{}}],
    1800000000000).map(x=>x.number),[2606,1421]);
});

test('current mergeability overrides stale conflict labels for exact-head source repair',async()=>{
  const f=fixture({pr:pr({labels:[{name:'hh:repair-needed'},
    {name:'hh:conflict-repair-needed'}],mergeable:true,mergeable_state:'blocked'})});
  core.outputs={};
  assert.equal(repairMode(pr({mergeable:false,mergeable_state:'dirty',
    labels:[{name:'hh:repair-needed'}]})),'conflict');
  const result=await claim({github:f.github,core,context,hasToken:true,number:11});
  assert.equal(result.status,'claimed');
  assert.equal(core.outputs.strategy,'code');
  assert.equal(f.log.comments,1);
});
test('a source label without a trusted receipt for exact HEAD never edits newer code',async()=>{
  const f=fixture({comments:[{user:{id:41898282,login:'github-actions[bot]',type:'Bot'},performed_via_github_app:{id:15368,slug:'github-actions'},body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+'e'.repeat(40)+' -->\nFailed jobs: core-lint-types-build.\n'}]});
  assert.equal(hasVerifiedSourceHandoff([{body:'not verified'}],sha),false);
  const result=await claim({github:f.github,core,context,hasToken:true,number:11});
  assert.equal(result.status,'skipped');
  assert.equal(f.log.comments,0);
});
test('ambiguous current mergeability fails closed',async()=>{
  const f=fixture({pr:pr({mergeable:null,mergeable_state:'unknown'})});
  const result=await claim({github:f.github,core,context,hasToken:true,number:11});
  assert.equal(result.status,'skipped');assert.equal(f.log.comments,0);
});
test('resolved conflict-only label is cleared after a second exact-head live verification',async()=>{
  const f=fixture({pr:pr({mergeable:true,mergeable_state:'clean',
    labels:[{name:'hh:conflict-repair-needed'}]})});
  let cleared=0;
  f.github.rest.issues.removeLabel=async args=>{
    assert.equal(args.issue_number,11);assert.equal(args.name,'hh:conflict-repair-needed');cleared++;
  };
  const result=await claim({github:f.github,core,context,hasToken:true,number:11});
  assert.equal(result.status,'skipped');
  assert.equal(cleared,1);assert.equal(f.log.comments,0);
});

test('active external lease stays owned after nominal expiry',()=>{
 const now=Date.parse('2026-11-01T22:00:00Z');
 const expired={schema:'HH_PR_SWEEP_LEASE_V1',head_sha:sha,
  state:'heartbeat',expires_at:'2026-11-01T21:30:00Z'};
 assert.equal(activeSweepLease([{body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+
  JSON.stringify(expired)}],sha,now),true);
});
test('Repair Worker records claim and true source publish as distinct signed HEAD receipts',async()=>{
 const f=fixture(),contextWithRun={...context,runId:41350000001};
 core.outputs={};
 const c=await claim({github:f.github,core,context:contextWithRun,hasToken:true,number:11});
 assert.equal(c.status,'claimed');
 assert.match(f.log.commentBodies[0],/HH_PR_TASK_V1/);
 assert.match(f.log.commentBodies[0],/"state":"CLAIMED"/);
 assert.match(f.log.commentBodies[0],/"outcome":"CLAIM_ONLY_NO_SOURCE_WRITE"/);
 const candidate={head_sha:sha,files:[{path:'lib/a.ts',original_sha:newSha,
   base64:Buffer.from('const a=1;\n').toString('base64')}]};
 const pub=await publish({github:f.github,core,context:contextWithRun,prNumber:11,
   expectedSha:sha,candidate,writer:f.writer});
 assert.equal(pub.status,'committed');
 assert.match(f.log.commentBodies.at(-1),/"state":"PUBLISHED"/);
 assert.match(f.log.commentBodies.at(-1),/"new_sha":"d{40}"/);
 assert.match(f.log.commentBodies.at(-1),/"outcome":"VERIFIED_SOURCE_COMMIT"/);
 assert.match(f.log.commentBodies.at(-1),/actions\/runs\/41350000001/);
});
test('empty autofix emits MANUAL receipt, never PUBLISHED',async()=>{
 const f=fixture();
 const result=await publish({github:f.github,core,context:{...context,runId:3},
  prNumber:11,expectedSha:sha,candidate:{head_sha:sha,files:[]},writer:f.writer});
 assert.equal(result.status,'manual_required');
 assert.match(f.log.commentBodies.at(-1),/"state":"MANUAL"/);
 assert.doesNotMatch(f.log.commentBodies.at(-1),/"state":"PUBLISHED"/);
});

test('publisher distinguishes moved owner HEAD from unauthorized PR and never writes either',async()=>{
 const c={head_sha:sha,files:[{path:'lib/a.ts',original_sha:newSha,base64:'YQ=='}]};
 const f=fixture({pr:pr({head:{ref:'fix/pr-11',sha:'e'.repeat(40),
   repo:{full_name:owner+'/'+repo}}})});
 await assert.rejects(publish({github:f.github,core,context,prNumber:11,
   expectedSha:sha,candidate:c,writer:f.writer}),/HH_REPAIR_PUBLISH_STALE_HEAD/);
 assert.equal(f.log.commit,0);
 const x=fixture({pr:pr({user:{login:'someone-else'}})});
 await assert.rejects(publish({github:x.github,core,context,prNumber:11,
   expectedSha:sha,candidate:c,writer:x.writer}),/HH_REPAIR_PUBLISH_STALE_OR_UNAUTHORIZED/);
 assert.equal(x.log.commit,0);
});
test('source Repair locks by canonical PR and only signed exact-HEAD tasks may write',()=>{
 const wf=require('node:fs').readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.ok(wf.includes("group: hh-real-repair-pr-${{ inputs.pr_number || 'unaddressed' }}"));
 assert.ok(wf.includes('cancel-in-progress: false'));
 assert.ok(!wf.includes('group: hh-real-repair-worker\n'));
 assert.ok(wf.includes("String(requested)===String(context.payload.inputs?.pr_number || '')"));
 for(const key of ['expected_sha','task_key','reservation_run_id'])
  assert.ok(wf.includes('context.payload.inputs?.'+key),key+' required for live claim');
 assert.ok(wf.includes('const dryRun=!addressed ||'));
 assert.ok(wf.includes("core.setOutput('audit_only',String(dryRun))"));
 assert.ok(wf.includes("HH_AUDIT_ONLY: ${{ steps.select.outputs.audit_only }}"));
 assert.ok(wf.includes("HH_AUDIT_ONLY: ${{ needs.claim.outputs.audit_only }}"));
 assert.ok(wf.includes('expectedSha:process.env.HH_REPAIR_SHA'));
 assert.ok(wf.includes("HH_REPAIR_PUBLISH_STALE_HEAD"));
});
test('trusted workflow treats only stale source HEAD as a non-fix no-op',()=>{
 const yml=require('node:fs').readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.match(yml,/error\?\.message !== 'HH_REPAIR_PUBLISH_STALE_HEAD'/);
 assert.match(yml,/status:'skipped_stale_head',reason:'STALE_HEAD_ABORTED'/);
 assert.match(yml,/source_published:false/);
 assert.match(yml,/if \(error\?\.message !== 'HH_REPAIR_PUBLISH_STALE_HEAD'\) throw error/);
});

test('forged source receipt cannot authorize a repair claim',async()=>{
 const forged={body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->\nFailed jobs: core-lint-types-build.\n',user:{id:123,login:'outsider',type:'User'}};
 assert.equal(hasVerifiedSourceHandoff([forged],sha),false);
 const f=fixture({comments:[forged]});
 assert.equal((await claim({github:f.github,core,context,hasToken:true,number:11})).status,'skipped');
 assert.equal(f.log.comments,0);
});

test('source Repair uses same explicit-release interpretation as the single Dispatcher',()=>{
 const now=Date.parse('2026-11-01T22:00:00Z'),user={login:owner};
 const item={schema:'HH_PR_SWEEP_LEASE_V1',owner:'chat-audio',lease_id:'repair-lock',
  head_sha:sha,state:'heartbeat',expires_at:'2026-11-01T21:00:00Z'};
 const wrap=x=>({user,body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify(x)});
 const events=[wrap(item),wrap({...item,state:'released'})];
 assert.equal(activeSweepLease(events,sha,now),false);
 assert.equal(activeSweepLease(events.slice(0,1),sha,now),true);
});
test('source Repair ignores a release from another GitHub commenter',()=>{
 const now=Date.parse('2026-11-01T22:00:00Z');
 const item={schema:'HH_PR_SWEEP_LEASE_V1',owner:'chat-audio',lease_id:'lock',
  head_sha:sha,state:'active',expires_at:'2026-11-01T21:00:00Z'};
 const events=[{user:{login:owner},body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+JSON.stringify(item)},
  {user:{login:'unrelated'},body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+
    JSON.stringify({...item,state:'released'})}];
 assert.equal(activeSweepLease(events,sha,now),true);
});

test('failed isolated fix is signed off as manual only after the same-run verified claim',async()=>{
 const runId=777, current=pr(),task=taskFor(current,{tier:'P1'});
 const owned={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  body:'<!-- '+MARKER+' '+sha+' -->\n'+commentBody({...task,state:'CLAIMED',
   owner_run_id:String(runId),outcome:'CLAIM_ONLY_NO_SOURCE_WRITE'})};
 const f=fixture({comments:[owned]});
 const result=await finalizeFailedFix({github:f.github,core,context:{...context,runId},
  prNumber:11,expectedSha:sha});
 assert.equal(result.status,'manual_required');
 assert.equal(result.source_published,false);
 assert.equal(f.log.commit,0);
 assert.equal(f.log.labels,1);
 assert.deepEqual(f.log.removed,['hh:repair-needed']);
 assert.equal(f.log.comments,1);
 assert.ok(f.log.commentBodies[0].includes('FIX_JOB_FAILED_NO_SOURCE_COMMIT'));
});
test('failed fix finalizer cannot escalate a forged, foreign, leased or moved HEAD',async()=>{
 const runId=888,current=pr(),task=taskFor(current,{tier:'P1'});
 const body='<!-- '+MARKER+' '+sha+' -->\n'+commentBody({...task,state:'CLAIMED',
  owner_run_id:String(runId)});
 const signed={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},body};
 const cases=[
  {comments:[{body}]},
  {comments:[{...signed,body:body.replace('888','other')}]},
  {comments:[signed],fresh:pr({head:{ref:'fix/pr-11',sha:newSha,
   repo:{full_name:owner+'/'+repo}}})},
  {comments:[signed,{body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+
   JSON.stringify({schema:'HH_PR_SWEEP_LEASE_V1',owner:'other',
    head_sha:sha,lease_id:'foreign',state:'active'})}]}
 ];
 for(const options of cases){
  const f=fixture(options);
  const result=await finalizeFailedFix({github:f.github,core,context:{...context,runId},
   prNumber:11,expectedSha:sha});
  assert.equal(result.status,'skipped');
  assert.equal(f.log.labels,0);
  assert.equal(f.log.comments,0);
  assert.deepEqual(f.log.removed,[]);
 }
});
test('source-fix terminal finalizer is restricted to failed fix jobs in the trusted workflow',()=>{
 const yml=require('node:fs').readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.ok(yml.includes('  finalize:'));
 assert.ok(yml.includes('needs: [claim,fix,code_fix,code_verify,publish]'));
 assert.ok(yml.includes('always()'));
 assert.ok(yml.includes('worker.finalize({github,core,context,'));
});

const outcomeCore={...core,warning:()=>{},summary:{
 addHeading(){return this;},addCodeBlock(){return this;},async write(){}
}};
const outcomeContext={...context,runId:41350000123};
const receiptKey='f'.repeat(32);
test('finalizer verifies a real parented source commit on the PR HEAD',async()=>{
 const original=pr(),f=fixture({pr:pr({head:{...original.head,sha:newSha}})});
 f.github.rest.git.getCommit=async()=>({data:{parents:[{sha}]}});
 const result=await finalize({github:f.github,core:outcomeCore,context:outcomeContext,
  number:11,expectedSha:sha,taskKey:receiptKey,claimStatus:'claimed',
  claimResult:'success',fixResult:'success',publishResult:'success',
  publishStatus:'committed',publishSha:newSha});
 assert.equal(result.state,'PUBLISHED');
 assert.equal(result.source_published,true);
 assert.equal(result.new_sha,newSha);
 assert.equal(f.log.labels,0);
 assert.match(f.log.commentBodies.at(-1),/SOURCE_COMMIT_VERIFIED_ON_PR_HEAD/);
 assert.match(f.log.commentBodies.at(-1),/HH_PR_REPAIR_OUTCOME_V1/);
});
test('failed isolated fix emits terminal step-level diagnostic and manual owner handoff',async()=>{
 const f=fixture({comments:[{user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  body:'<!-- '+MARKER+' '+sha+' -->\\n'+commentBody({...taskFor(pr(),{tier:'P1'}),
    state:'CLAIMED',owner_run_id:String(outcomeContext.runId),task_key:receiptKey})}]});
 f.github.rest.actions={listJobsForWorkflowRun:async()=>({data:{jobs:[
  {name:'fix',conclusion:'failure',steps:[{name:'Install dependencies',conclusion:'failure'}]}
 ]}})};
 const result=await finalize({github:f.github,core:outcomeCore,context:outcomeContext,
  number:11,expectedSha:sha,taskKey:receiptKey,claimStatus:'claimed',
  claimResult:'success',fixResult:'failure',publishResult:'skipped'});
 assert.equal(result.state,'FAILED');
 assert.equal(result.reason_code,'FIX_JOB_FAILURE');
 assert.equal(result.failed_step,'Install dependencies');
 assert.equal(result.source_published,false);
 assert.equal(f.log.labels,1);
 assert.deepEqual(f.log.removed,['hh:repair-needed']);
 assert.match(f.log.commentBodies.at(-1),/FIX_JOB_FAILURE/);
});
test('skipped claim due missing token produces explicit rejection, not a fake completion',async()=>{
 const f=fixture();
 const result=await finalize({github:f.github,core:outcomeCore,context:outcomeContext,
  number:11,expectedSha:sha,taskKey:receiptKey,claimStatus:'skipped',
  claimReason:'HH_AUTOMERGE_TOKEN_MISSING',claimResult:'success',
  fixResult:'skipped',publishResult:'skipped'});
 assert.equal(result.state,'REJECTED');
 assert.equal(result.reason_code,'HH_AUTOMERGE_TOKEN_MISSING');
 assert.equal(result.source_published,false);
 assert.equal(f.log.labels,0,'an unclaimed task must not change owner labels');
});
test('head movement is recorded as superseded without touching fresh source',async()=>{
 const original=pr(),f=fixture({pr:pr({head:{...original.head,sha:newSha}})});
 const result=await finalize({github:f.github,core:outcomeCore,context:outcomeContext,
  number:11,expectedSha:sha,taskKey:receiptKey,claimStatus:'claimed',
  claimResult:'success',fixResult:'success',publishResult:'success',
  publishStatus:'skipped_stale_head'});
 assert.equal(result.state,'SUPERSEDED');
 assert.equal(result.reason_code,'SOURCE_HEAD_MOVED_BEFORE_PUBLISH');
 assert.equal(result.source_published,false);
 assert.equal(f.log.labels,0);
});
test('finalizer is idempotent for same signed exact-head run receipt',async()=>{
 const marker='<!-- HH_PR_REPAIR_OUTCOME_V1 '+sha+' '+outcomeContext.runId+' -->';
 const f=fixture({comments:[{body:marker,
  user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'}}]});
 const result=await finalize({github:f.github,core:outcomeCore,context:outcomeContext,
  number:11,expectedSha:sha,taskKey:receiptKey,claimStatus:'claimed',
  claimResult:'success',fixResult:'failure'});
 assert.equal(result.status,'already_finalized');
 assert.equal(f.log.comments,0);
});
test('verified deterministic candidate plus failed GitHub publisher is NOT labeled as OpenRouter failure',async()=>{
 const f=fixture();
 const result=await finalize({github:f.github,core:outcomeCore,context:outcomeContext,
  number:11,expectedSha:sha,taskKey:receiptKey,claimStatus:'claimed',
  claimResult:'success',strategy:'code',fixResult:'success',codeAvailable:true,
  codeResult:'skipped',candidateStatus:'ready',
  candidateDetail:'VERIFIED_SOURCE_PATCH',
  codeVerifyResult:'success',codeVerifyStatus:'ready',
  publishResult:'failure'});
 assert.equal(result.state,'FAILED');
 assert.equal(result.source_published,false);
 assert.equal(result.reason_code,'SOURCE_PUBLISH_JOB_FAILURE');
 assert.equal(result.follow_up_task.category,'AUTOMATION_PROCESS');
 assert.equal(result.follow_up_task.reason_code,'SOURCE_PUBLISH_JOB_FAILURE');
 assert.equal(result.follow_up_task.strategy_code,'PUBLISHER_DIAGNOSTIC_HOLD');
 assert.equal(result.follow_up_task.next_action,'CHECK_PUBLISH_TOKEN_QUOTA_PERMISSIONS_AND_EXACT_HEAD');
 assert.equal(f.log.commit,0);
});

test('workflow guarantees a finalizer after code verification and publishing',()=>{
 const wf=require('node:fs').readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.match(wf,/  finalize:\n/);
 assert.match(wf,/needs: \[claim,fix,code_fix,code_verify,publish\]/);
 assert.match(wf,/always\(\)/);
 assert.match(wf,/HH_REPAIR_FINAL_OUTCOME/);
 assert.match(wf,/claim_status/);
 assert.match(wf,/publish_status/);
});


test('preclaim refusal has signed retry proof for an exact dispatcher reservation',async()=>{
 const task=taskFor(pr(),{tier:'P1'}),ctx={
  ...outcomeContext,payload:{inputs:{reservation_run_id:'42'}}};
 const actor={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'}};
 const reserved={...actor,body:commentBody(reservation(task,Date.now()-1000,42))};
 const f=fixture({comments:[reserved]});
 const result=await finalize({github:f.github,core:outcomeCore,context:ctx,
  number:11,expectedSha:sha,taskKey:task.task_key,claimStatus:'skipped',
  claimReason:'NO_UNCLAIMED_OWNER_PR',claimResult:'success',
  fixResult:'skipped',publishResult:'skipped'});
 assert.equal(result.state,'NO_CLAIM_RETRYABLE');
 assert.equal(result.source_published,false);
 assert.equal(result.reservation_run_id,'42');
 assert.ok(Date.parse(result.retry_after)>Date.now());
 assert.equal(f.log.labels,0,'no coding claim means no manual source escalation');
 assert.equal(f.log.commit,0);
 assert.equal(reservationStatus(task,[reserved,{...actor,
  body:f.log.commentBodies.at(-1)}],Date.parse(result.retry_after)+1000),'FREE');
});
test('preclaim retry is refused for unsigned reservations, active claims or budget exhaustion',async()=>{
 const task=taskFor(pr(),{tier:'P1'}),ctx={
  ...outcomeContext,payload:{inputs:{reservation_run_id:'42'}}};
 const actor={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'}};
 const reserveBody=commentBody(reservation(task,Date.now()-1000,42));
 const cases=[
  [{body:reserveBody}],
  [{...actor,body:reserveBody},{body:'<!-- '+MARKER+' '+sha+' -->'}],
  [{...actor,body:reserveBody},
   {...actor,body:commentBody({...task,state:'NO_CLAIM_RETRYABLE'})},
   {...actor,body:commentBody({...task,state:'NO_CLAIM_RETRYABLE'})}]
 ];
 for(const comments of cases){
  const f=fixture({comments});
  const x=await finalize({github:f.github,core:outcomeCore,context:ctx,
   number:11,expectedSha:sha,taskKey:task.task_key,claimStatus:'skipped',
   claimReason:'NO_UNCLAIMED_OWNER_PR',claimResult:'success',
   fixResult:'skipped',publishResult:'skipped'});
  assert.equal(x.state,'REJECTED');
  assert.equal(x.source_published,false);
  assert.equal(f.log.labels,0);
 }
});
test('missing owner token and interrupted claim may not unlock a source reservation',async()=>{
 const task=taskFor(pr(),{tier:'P1'}),ctx={
  ...outcomeContext,payload:{inputs:{reservation_run_id:'42'}}};
 const reserved={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  body:commentBody(reservation(task,Date.now()-1000,42))};
 for(const props of [
  {claimStatus:'skipped',claimReason:'HH_AUTOMERGE_TOKEN_MISSING',claimResult:'success'},
  {claimStatus:'skipped',claimReason:'NO_UNCLAIMED_OWNER_PR',claimResult:'failure'},
  {claimStatus:'skipped',claimReason:'NO_UNCLAIMED_OWNER_PR',claimResult:'success',
   fixResult:'success',publishResult:'skipped'}
 ]){
  const f=fixture({comments:[reserved]});
  const x=await finalize({github:f.github,core:outcomeCore,context:ctx,
   number:11,expectedSha:sha,taskKey:task.task_key,...props});
  assert.notEqual(x.state,'NO_CLAIM_RETRYABLE');
  assert.equal(x.source_published,false);
 }
});
test('existing Repair Worker workflow carries reservation identity without source tokens',()=>{
 const wf=require('node:fs').readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.ok(wf.includes('reservation_run_id:'));
 assert.equal((wf.match(/ref: \$\{\{ github\.sha \}\}/g)||[]).length,7);
 assert.ok(wf.includes('  commander-source-task:'));
 assert.ok(wf.includes("github.actor == 'andylitvinov-design'"));
 assert.ok(wf.includes("inputs.commander_source_task != ''"));
 assert.ok(wf.includes('node --test tests/ci-pr-commander-source-task.test.cjs'));
 assert.ok(!wf.includes('ref: codex/bootstrap-books'));
 const dispatcher=require('node:fs').readFileSync('scripts/ci-pr-queue-dispatcher.cjs','utf8');
 assert.ok(dispatcher.includes("reservation_run_id:String(context.runId||'')"));
});


test('exact-head addressed Repair verifies signed dispatcher reservation without queue scan',async()=>{
 const now=Date.parse('2026-11-02T15:10:00Z');
 const task=taskFor(pr(),{tier:'P1'});
 const bot={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
   performed_via_github_app:{id:15368,slug:'github-actions'}};
 const proof={...bot,body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->\nFailed jobs: core-lint-types-build.\n'};
 const hold={...bot,body:commentBody(reservation(task,now-1000,42))};
 const ctx={...context,eventName:'workflow_dispatch',runId:99};
 const f=fixture({comments:[proof,hold]});
 f.github.rest.issues.listForRepo=async()=>{throw Error('Must not scan unrelated queues');};
 core.outputs={};
 const args={github:f.github,core,context:ctx,hasToken:true,
   number:11,expectedSha:sha,taskKey:task.task_key,reservationRunId:'42',now};
 const ok=await claim(args);
 assert.equal(ok.status,'claimed');
 assert.equal(f.log.comments,1);
 assert.equal(core.outputs.strategy,'code');
 const unsigned=fixture({comments:[proof,{body:hold.body}]});
 assert.equal((await claim({...args,github:unsigned.github})).status,'skipped');
 assert.equal(unsigned.log.comments,0);
 const superseded=fixture({comments:[proof,hold,{...bot,
   body:commentBody({...task,state:'CLAIMED',owner_run_id:'other'})}]});
 assert.equal((await claim({...args,github:superseded.github})).status,'skipped');
 assert.equal(superseded.log.comments,0);
 const invalid=await claim({...args,reservationRunId:''});
 assert.equal(invalid.reason,'INVALID_ADDRESSED_REPAIR_TASK');
});

test('scheduled Repair avoids conflict-only queue and active dispatcher reservations',async()=>{
 const conflict=fixture({pr:pr({mergeable:false,mergeable_state:'dirty',
   labels:[{name:'hh:conflict-repair-needed'}]})});
 conflict.github.rest.issues.listForRepo=async args=>{
   assert.equal(args.labels,'hh:repair-needed');return {data:[]};
 };
 conflict.github.rest.pulls.get=async()=>{throw Error('Cron must not claim conflict');};
 const r=await claim({github:conflict.github,core,context:{...context,eventName:'schedule'},
   hasToken:true,number:0});
 assert.equal(r.status,'skipped');assert.equal(conflict.log.comments,0);
 const task=taskFor(pr(),{tier:'P1'}),now=Date.now();
 const bot={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
   performed_via_github_app:{id:15368,slug:'github-actions'}};
 const f=fixture({comments:[{...bot,body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->\nFailed jobs: core-lint-types-build.\n'},
   {...bot,body:commentBody(reservation(task,now-1000,42))}]});
 const held=await claim({github:f.github,core,context:{...context,eventName:'schedule'},
   hasToken:true,number:0,now});
 assert.equal(held.status,'skipped');assert.equal(f.log.comments,0);
});

test('Repair respects Control Tower hold labels and finalizer can post PR outcome',()=>{
 for(const blocked of ['hh:blocked','hh:worker-claimed','hh:direction-override:invalid']){
   assert.equal(eligible(pr({labels:[{name:'hh:repair-needed'},{name:blocked}]}),owner+'/'+repo),false);
 }
 const wf=require('node:fs').readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const final=wf.split('\n  finalize:\n')[1];
 assert.ok(final&&final.includes('pull-requests: write'));
 assert.ok(final.includes('issues: write'));
 assert.ok(wf.includes("reservationRunId:String(context.payload.inputs?.reservation_run_id || '')"));
 assert.ok(wf.includes('cache: npm'));
});


test('empty ESLint candidate skips privileged publisher and finalizer routes to truthful manual outcome',async()=>{
 const bot={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
   performed_via_github_app:{id:15368,slug:'github-actions'}};
 const owned=commentBody({...taskFor(pr(),{tier:'P1'}),
   state:'CLAIMED',owner_run_id:String(outcomeContext.runId),task_key:receiptKey});
 const f=fixture({comments:[{...bot,body:'<!-- '+MARKER+' '+sha+' -->\n'+owned}]});
 const outcome=await finalize({github:f.github,core:outcomeCore,context:outcomeContext,
   number:11,expectedSha:sha,taskKey:receiptKey,claimStatus:'claimed',
   claimResult:'success',fixResult:'success',publishResult:'skipped',
   candidateStatus:'manual_required',candidateDetail:'ESLINT_SCOPE_NOT_CONFIGURED'});
 assert.equal(outcome.state,'MANUAL');
 assert.equal(outcome.reason_code,'FREE_AI_EXECUTOR_NOT_CONFIGURED');
 assert.equal(outcome.detail_code,'ESLINT_SCOPE_NOT_CONFIGURED');
 assert.equal(outcome.source_published,false);
 assert.equal(outcome.new_sha,null);
 assert.equal(f.log.labels,1);
 assert.deepEqual(f.log.removed,['hh:repair-needed']);
 assert.match(f.log.commentBodies.at(-1),/"state":"MANUAL"/);
 assert.doesNotMatch(f.log.commentBodies.at(-1),/"state":"PUBLISHED"/);
});
test('Repair no-op never launches privileged publish and retains exact-HEAD diagnostic',()=>{
 const workflow=require('node:fs').readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.match(workflow,/needs\.fix\.outputs\.candidate_status == 'ready'/);
 assert.match(workflow,/candidate_detail/);
 assert.match(workflow,/--print-config/);
 assert.match(workflow,/ESLINT_SCOPE_NOT_CONFIGURED/);
});

test('trusted code repair scope rejects unauthorized paths, duplicates and stale SHA',()=>{
 const {sourceScope,validateCandidate,makePrompt}=
   require('../scripts/ci-pr-repair-code-candidate.cjs');
 const scope=sourceScope({REPAIR_SHA:sha,
   REPAIR_FILES_JSON:JSON.stringify(['components/a.tsx','lib/b.js'])});
 assert.deepEqual(scope.files,['components/a.tsx','lib/b.js']);
 for(const files of [['.github/workflows/a.yml'],['lib/../../x.js'],
   ['lib/a.js','lib/a.js'],Array.from({length:9},(_,i)=>'lib/a'+i+'.js')])
   assert.throws(()=>sourceScope({REPAIR_SHA:sha,REPAIR_FILES_JSON:JSON.stringify(files)}));
 assert.throws(()=>sourceScope({REPAIR_SHA:'stale',REPAIR_FILES_JSON:'["lib/a.js"]'}));
 const good={head_sha:sha,repair_kind:'free_ai',
   files:[{path:'components/a.tsx',original_sha:sha,base64:'ZXhwb3J0IHt9Owo='}]};
 assert.equal(validateCandidate(good,scope).length,1);
 assert.throws(()=>validateCandidate({...good,head_sha:newSha},scope));
 assert.throws(()=>validateCandidate({...good,
   files:[{...good.files[0],path:'.github/workflows/attack.yml'}]},scope));
 assert.throws(()=>validateCandidate({...good,
   files:[good.files[0],good.files[0]]},scope));
 const prompt=makePrompt(scope);
 assert.match(prompt,/Only the separately isolated verifier\/publisher/);
 assert.match(prompt,/components\/a.tsx/);
 assert.match(prompt,/Do not run git commit, git push/);
});
test('free model is activated only after deterministic failure and never sees write token',()=>{
 const wf=require('node:fs').readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.ok(wf.includes('code_available: ${{ steps.select.outputs.code_available }}'));
 assert.ok(wf.includes("const provider=process.env.HH_HAS_OPENROUTER_FREE_TOKEN==='true'?'openrouter':"));
 assert.ok(wf.includes("core.setOutput('code_available',provider==='none'?'false':'true')"));
 const codeFix=wf.split('\n  code_fix:\n')[1].split('\n  code_verify:\n')[0];
 const codeVerify=wf.split('\n  code_verify:\n')[1].split('\n  publish:\n')[0];
 assert.match(codeFix,/needs\.fix\.outputs\.candidate_status == 'manual_required'/);
 assert.match(codeFix,/ci-pr-repair-free-agent\.cjs/);
 assert.match(codeFix,/opencode\/cli@2\.1\.2/);
 assert.match(codeFix,/persist-credentials: false/);
 assert.match(codeVerify,/ci-pr-repair-code-candidate\.cjs verify/);
 assert.match(codeVerify,/candidate_status == 'proposed'/);
 assert.match(codeVerify,/needs.fix.outputs.candidate_status == 'ready'/);
 const trustedPublish=wf.split('\n  publish:\n')[1].split('\n  finalize:\n')[0];
 assert.match(trustedPublish,/name: hh-code-repair-verified/);
 assert.doesNotMatch(trustedPublish,/name: \$\{\{ needs.fix.outputs.candidate_status/);
 assert.doesNotMatch(wf,/OPENAI_API_KEY|openai\/codex-action@v1/);
 const pub=wf.split('\n  publish:\n')[1].split('\n  finalize:\n')[0];
 assert.match(pub,/HH_AUTOMERGE_TOKEN/);
 for(const isolated of [codeFix,codeVerify])assert.doesNotMatch(isolated,/HH_AUTOMERGE_TOKEN/);
});
test('free-model failures report NO source commit while unverified proposals cannot publish',async()=>{
 const bot={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
   performed_via_github_app:{id:15368,slug:'github-actions'}};
 const owned=commentBody({...taskFor(pr(),{tier:'P1'}),
   state:'CLAIMED',owner_run_id:String(outcomeContext.runId),task_key:receiptKey});
 for(const variant of [
  {codeAvailable:true,codeResult:'failure',expected:'FREE_AI_JOB_FAILED_NO_SOURCE_COMMIT'},
  {codeAvailable:true,codeResult:'success',codeStatus:'proposed',
    codeVerifyResult:'failure',expected:'FREE_AI_VERIFIER_JOB_FAILED_NO_SOURCE_COMMIT'},
  {codeAvailable:true,codeResult:'success',codeStatus:'no_change',
    expected:'FREE_AI_NO_VERIFIED_SOURCE_CHANGE'},
  {codeAvailable:true,codeResult:'success',codeStatus:'proposed',
    codeVerifyResult:'success',codeVerifyStatus:'manual_required',
    codeVerifyDetail:'FREE_AI_CANDIDATE_OUT_OF_SCOPE',expected:'FREE_AI_CANDIDATE_REJECTED'},
  {codeAvailable:true,codeResult:'success',codeStatus:'proposed',
    codeVerifyResult:'success',codeVerifyStatus:'ready',
    expected:'FREE_AI_VERIFIED_BUT_NOT_PUBLISHED_SKIPPED'}
 ]){
  const f=fixture({comments:[{...bot,body:'<!-- '+MARKER+' '+sha+' -->\n'+owned}]});
  const {expected,...props}=variant;
  const result=await finalize({github:f.github,core:outcomeCore,
   context:outcomeContext,number:11,expectedSha:sha,taskKey:receiptKey,
   claimStatus:'claimed',claimResult:'success',fixResult:'success',
   candidateStatus:'manual_required',publishResult:'skipped',...props});
  assert.equal(result.reason_code,expected);
  assert.equal(result.source_published,false);
  assert.equal(result.new_sha,null);
  assert.notEqual(result.state,'PUBLISHED');
  assert.equal(f.log.commit,0);
 }
});

test('pre-model sensitive source failure preserves true root and a human source owner',async()=>{
 const bot={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'}};
 const claimed=commentBody({...taskFor(pr(),{tier:'P1'}),
   state:'CLAIMED',owner_run_id:String(outcomeContext.runId),task_key:receiptKey});
 const f=fixture({comments:[{...bot,body:'<!-- '+MARKER+' '+sha+' -->\\n'+claimed}]});
 f.github.rest.actions={listJobsForWorkflowRun:async()=>({data:{jobs:[
  {name:'publish',conclusion:'failure',steps:[
    {name:'Finalize on publisher runner',conclusion:'failure'}]},
  {name:'code_fix',conclusion:'failure',steps:[
    {name:'Fail early on unsupported or sensitive free-model source scope',conclusion:'failure'}]}
 ]}})};
 const result=await finalize({github:f.github,core:outcomeCore,context:outcomeContext,
  number:11,expectedSha:sha,taskKey:receiptKey,claimStatus:'claimed',
  claimResult:'success',fixResult:'success',strategy:'code',
  codeAvailable:true,codeResult:'failure',publishResult:'skipped',
  candidateStatus:'manual_required',candidateDetail:'NO_AUTOFIXABLE_ESLINT_CHANGE'});
 assert.equal(result.reason_code,'FREE_AI_JOB_FAILED_NO_SOURCE_COMMIT',
  'existing monitor contract preserves the parent outcome');
 assert.equal(result.failed_step,'Fail early on unsupported or sensitive free-model source scope');
 assert.equal(result.detail_code,'FREE_AI_UNSAFE_SOURCE_SCOPE');
 assert.equal(result.follow_up_task?.category,'SOURCE_CODE');
 assert.equal(result.follow_up_task?.strategy_code,'MANUAL_SOURCE_SCOPE_REVIEW');
 assert.equal(result.follow_up_task?.responsible_role,'source-repair-owner');
 assert.equal(result.follow_up_task?.executor_kind,'owner_review');
 assert.equal(result.follow_up_task?.next_action,'ASSIGN_OWNER_FOR_SENSITIVE_OR_UNSUPPORTED_SOURCE');
 assert.equal(result.follow_up_task?.source_write_authorized,false);
 assert.equal(result.source_published,false);
 assert.equal(result.new_sha,null);
 assert.equal(f.log.commit,0);
});

test('trusted Repair finalization fast paths preserve independent Codex verification',()=>{
 const wf=require('node:fs').readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const claim=wf.split('  claim:\n')[1].split('  fix:\n')[0];
 const fix=wf.split('  fix:\n')[1].split('  code_fix:\n')[0];
 const codeFix=wf.split('  code_fix:\n')[1].split('  code_verify:\n')[0];
 const codeVerify=wf.split('  code_verify:\n')[1].split('  publish:\n')[0];
 const pub=wf.split('  publish:\n')[1].split('  finalize:\n')[0];
 const recover=wf.split('  finalize:\n')[1];
 assert.match(claim,/id: finalize_no_fix/);
 assert.match(pub,/id: finalize_outcome/);
 assert.match(pub,/HH_CODE_VERIFY_STATUS: \$\{\{ needs\.code_verify\.outputs\.candidate_status \}\}/);
 assert.match(pub,/HH_FIX_RESULT: \$\{\{ needs\.fix\.result \}\}/);
 assert.match(pub,/HH_DOWNLOAD_RESULT: \$\{\{ steps\.download_candidate\.outcome \}\}/);
 assert.match(recover,/needs\.claim\.outputs\.no_fix_finalized != 'success'/);
 assert.match(recover,/needs\.publish\.outputs\.finalization_status != 'success'/);
 assert.match(fix,/permissions:\n      contents: read/);
 assert.match(codeFix,/permissions:\n      contents: read/);
 assert.match(codeVerify,/permissions:\n      contents: read/);
 for(const untrusted of [fix,codeFix,codeVerify]) assert.doesNotMatch(untrusted,/HH_AUTOMERGE_TOKEN/);
 assert.match(pub,/HH_AUTOMERGE_TOKEN: \$\{\{ secrets\.HH_AUTOMERGE_TOKEN \}\}/);
 // Only the trusted publisher needs scoped contents:write after independent
 // patch verification. Isolated untrusted jobs MUST stay read-only.
 assert.match(pub,/permissions:\n      contents: write/);
 assert.match(pub,/HH_REPAIR_JOB_TOKEN: \$\{\{ github\.token \}\}/);
 assert.match(pub,/rateGuard\.chooseWriterMode/);
 for(const untrusted of [claim,fix,codeFix,codeVerify]){
  assert.doesNotMatch(untrusted,/contents: write/);
  assert.doesNotMatch(untrusted,/HH_REPAIR_JOB_TOKEN/);
 }
});


test('signed but mistaken base-change Specialist handoff cannot claim source write',async()=>{
 const signed={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+
    ' -->\nFailed jobs: hh-specialist, hh-merge-check.\n'};
 const f=fixture({comments:[signed]});
 const result=await claim({github:f.github,core,context,hasToken:true,number:11});
 assert.equal(result.status,'skipped');assert.equal(f.log.comments,0);
});
test('trusted failed Core/TypeScript source routes directly to Code Repair',async()=>{
 const body='<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->\n'+
   'Core CI failed on exact HEAD.\nFailed jobs: core-lint-types-build, release-ready.\n';
 const signed={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},body};
 assert.equal(verifiedCoreCodeFailure([signed],sha),true);
 assert.equal(verifiedCoreCodeFailure([{...signed,user:{login:'attacker'}}],sha),false);
 assert.equal(verifiedCoreCodeFailure([signed],newSha),false);
 assert.equal(verifiedCoreCodeFailure([{...signed,body:body.replace('core-lint-types-build','hh-specialist')}],sha),false);
 assert.equal(verifiedCoreCodeFailure([{...signed,body:'quoted '+body}],sha),false);
 const f=fixture({comments:[signed]});core.outputs={};
 const r=await claim({github:f.github,core,context,hasToken:true,number:11});
 assert.equal(r.status,'claimed');
 assert.equal(core.outputs.strategy,'code');
 assert.equal(r.strategy,'code');
 assert.match(f.log.commentBodies[0],/verified Core\/TypeScript code repair/);
});

test('Core task reaches manual review only after deterministic repair has no verified patch',async()=>{
 const f=fixture();
 const r=await finalize({github:f.github,core:outcomeCore,context:outcomeContext,
  number:11,expectedSha:sha,taskKey:receiptKey,claimStatus:'claimed',
  claimResult:'success',strategy:'code',fixResult:'success',
  candidateStatus:'manual_required',candidateDetail:'NO_AUTOFIXABLE_ESLINT_CHANGE',
  codeAvailable:false,codeResult:'skipped',publishResult:'skipped'});
 assert.equal(r.state,'MANUAL');
 assert.equal(r.strategy,'code');
 assert.equal(r.reason_code,'FREE_AI_EXECUTOR_NOT_CONFIGURED');
 assert.equal(r.detail_code,'NO_AUTOFIXABLE_ESLINT_CHANGE');
 assert.equal(r.source_published,false);
 assert.equal(f.log.commit,0);
});

test('direct code publisher requires verified parent commit on current PR HEAD',async()=>{
 const original=pr(),f=fixture({pr:pr({head:{...original.head,sha:newSha}})});
 f.github.rest.git.getCommit=async()=>({data:{parents:[{sha}]}});
 const r=await finalize({github:f.github,core:outcomeCore,context:outcomeContext,
  number:11,expectedSha:sha,taskKey:receiptKey,claimStatus:'claimed',
  claimResult:'success',strategy:'code',fixResult:'skipped',
  codeAvailable:true,codeResult:'success',codeStatus:'proposed',
  codeVerifyResult:'success',codeVerifyStatus:'ready',
  publishResult:'success',publishStatus:'committed',publishSha:newSha});
 assert.equal(r.state,'PUBLISHED');
 assert.equal(r.repair_kind,'free_ai');
 assert.equal(r.new_sha,newSha);
});

test('direct Core failures reach deterministic checks and then free AI without paid fallback',()=>{
 const wf=require('node:fs').readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const fix=wf.split('\n  fix:\n')[1].split('\n  code_fix:\n')[0];
 assert.match(fix,/Apply trusted TypeScript type-only import codemods/);
 assert.match(fix,/Verify deterministic Core repair with TypeScript/);
 assert.match(fix,/continue-on-error: true/);
 assert.match(fix,/npx tsc --noEmit --incremental false/);
 assert.match(fix,/ci-pr-repair-test-scope\.cjs/);
 assert.ok(wf.includes("const provider=process.env.HH_HAS_OPENROUTER_FREE_TOKEN==='true'?'openrouter':"));
 assert.ok(wf.includes("core.setOutput('code_available',provider==='none'?'false':'true')"));
 assert.ok(wf.includes("HH_HAS_FREE_OPENCODE_TOKEN: ${{ secrets.HH_OPENCODE_FREE_API_KEY != '' }}"));
 assert.ok(wf.includes("HH_OPENCODE_FREE_API_KEY: ${{ needs.claim.outputs.code_provider == 'opencode' && secrets.HH_OPENCODE_FREE_API_KEY || '' }}"));
 assert.ok(wf.includes("HH_OPENROUTER_FREE_API_KEY: ${{ needs.claim.outputs.code_provider == 'openrouter' && secrets.HH_OPENROUTER_FREE_API_KEY || '' }}"));
 assert.match(require('node:fs').readFileSync('scripts/ci-pr-repair-free-agent.cjs','utf8'),/FREE_AI_FREE_OPENCODE_CREDENTIAL_NOT_CONFIGURED/);
 assert.match(wf,/  code_fix:\n[\s\S]*?ci-pr-repair-free-agent\.cjs/);
 assert.match(wf,/  code_verify:\n[\s\S]*?ci-pr-repair-code-candidate\.cjs verify/);
 assert.ok(wf.includes('HH_AUTOMERGE_TOKEN'));
 assert.doesNotMatch(wf,/OPENAI_API_KEY|openai\/codex-action@v1/);
 assert.doesNotMatch(wf,/force: true/);
});

test('free AI publisher rejects sensitive path even if PR lists it',async()=>{
 const f=fixture();
 f.github.rest.pulls.listFiles=async()=>({data:[{filename:'lib/private/records.ts',status:'modified'}]});
 const candidate={head_sha:sha,repair_kind:'free_ai',files:[{
   path:'lib/private/records.ts',original_sha:newSha,
   base64:Buffer.from('export {};').toString('base64')}]};
 await assert.rejects(publish({github:f.github,core,context,prNumber:11,
   expectedSha:sha,candidate,writer:f.writer}),/HH_REPAIR_PUBLISH_UNSAFE_PATH/);
 assert.equal(f.log.commit,0);
});


test('only actual source Core failure can authorize a structured Watchdog repair receipt',async()=>{
 const bot={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
   performed_via_github_app:{id:15368,slug:'github-actions'}};
 for(const names of ['hh-specialist, hh-merge-check','hh-core-verified, release-ready',
   'release-ready']){
   const signed={...bot,body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->\n'+
     'Core CI failed on exact HEAD.\nFailed jobs: '+names+'.\n'};
   assert.equal(hasVerifiedSourceHandoff([signed],sha),false,names);
   assert.equal(verifiedCoreCodeFailure([signed],sha),false,names);
   const f=fixture({comments:[signed]});
   assert.equal((await claim({github:f.github,core,context,hasToken:true,number:11})).status,
     'skipped',names);
   assert.equal(f.log.comments,0);
 }
 const source={...bot,body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+' -->\n'+
   'Core CI failed on exact HEAD.\nFailed jobs: core-lint-types-build, hh-specialist.\n'};
 assert.equal(hasVerifiedSourceHandoff([source],sha),true);
 assert.equal(verifiedCoreCodeFailure([source],sha),true);
});


test('stacked parent repair is admitted when merge ancestry is safe',async()=>{
 for(const auto_merge of [null,{merge_method:'merge'}]){
  const parent=pr({auto_merge});
  const child={number:3103,state:'open',base:{ref:parent.head.ref}};
  const f=fixture({pr:parent,children:[child]});
  const r=await claim({github:f.github,core,context,number:11,hasToken:true});
  assert.equal(r.status,'claimed');
  assert.equal(f.log.comments,1);
 }
});
test('stacked parent does not auto-repair with a destructive squash/rebase method',async()=>{
 for(const method of ['squash','rebase']){
  const parent=pr({auto_merge:{merge_method:method}});
  const f=fixture({pr:parent,children:[{number:3103,state:'open',base:{ref:parent.head.ref}}]});
  const r=await claim({github:f.github,core,context,number:11,hasToken:true});
  assert.equal(r.status,'skipped');
  assert.equal(f.log.comments,0);
 }
});

test('stage receipts bind trusted bot, PR, old/new HEAD and real UTC time',()=>{
 const time='2026-11-03T21:00:00Z',key='b'.repeat(32),fresh='f'.repeat(40);
 const body=stageLine({stage:'source_published',pr_number:11,head_sha:sha,
  run_id:41700000001,task_key:key,new_sha:fresh,at:time,source:'verified_git_ref'});
 const comment={body,created_at:'2026-11-03T21:00:05Z',
  user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'}};
 assert.match(body,/HH_PR_STAGE_V1/);
 assert.equal(parseComment(comment,{number:11,head:sha}).length,1);
 assert.equal(parseComment(comment,{number:12}).length,0);
 assert.equal(parseComment(comment,{head:'9'.repeat(40)}).length,0);
 assert.equal(parseComment({...comment,user:{login:owner}}).length,0);
 assert.equal(parseComment({...comment,created_at:'2026-11-03T20:00:00Z'}).length,0);
 assert.throws(()=>stageLine({stage:'source_published',pr_number:11,head_sha:sha,
  run_id:41700000001,task_key:key,at:time,source:'verified_git_ref'}),/INVALID_STAGE_RECEIPT/);
});
test('native Ready and Triage timestamps are GitHub events; armed is not Triage',()=>{
 const stamps=timelineStages([
  {event:'ready_for_review',created_at:'2026-11-03T21:00:00Z'},
  {event:'labeled',label:{name:'hh:merge-stage:inspect'},created_at:'2026-11-03T21:00:07Z'},
  {event:'labeled',label:{name:'hh:merge-stage:armed'},created_at:'2026-11-03T21:02:00Z'}
 ]);
 assert.deepEqual(stamps.map(x=>x.stage),['ready','triage']);
 assert.deepEqual(stamps.map(x=>x.at),['2026-11-03T21:00:00Z','2026-11-03T21:00:07Z']);
});
test('repair_started requires an actual trusted Actions fix-step timestamp',()=>{
 const key='b'.repeat(32),at='2026-11-03T21:02:13Z';
 assert.throws(()=>stageLine({stage:'repair_started',pr_number:11,head_sha:sha,
   run_id:41700000001,task_key:key,at,source:'repair_worker_claim'}),/INVALID_STAGE_RECEIPT/);
 const body=stageLine({stage:'repair_started',pr_number:11,head_sha:sha,
   run_id:41700000001,task_key:key,at,source:'github_actions_fix_step'});
 const comment={body,created_at:'2026-11-03T21:10:00Z',
  user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'}};
 assert.deepEqual(parseComment(comment).map(x=>x.stage),['repair_started']);
 assert.equal(parseComment({...comment,performed_via_github_app:{slug:'other',id:1}}).length,0);
});



test('terminal Worker records signed patch verification on the current attempt without implying publication',async()=>{
 const old=process.env.GITHUB_RUN_ATTEMPT;
 process.env.GITHUB_RUN_ATTEMPT='2';
 try{
  const f=fixture();
  const started=new Date(Date.now()-120000).toISOString();
  const verified=new Date(Date.now()-30000).toISOString();
  f.github.rest.actions={listJobsForWorkflowRun:async()=>({data:{jobs:[
   {name:'fix',run_attempt:2,conclusion:'success',steps:[
     {name:'Apply trusted TypeScript type-only import codemods',started_at:started},
     {name:'Try targeted ESLint autofix and write bounded patch candidate',
       started_at:started,completed_at:verified,conclusion:'success'}
   ]},
   {name:'fix',run_attempt:1,conclusion:'success',steps:[
     {name:'Try targeted ESLint autofix and write bounded patch candidate',
       started_at:started,completed_at:verified,conclusion:'success'}
   ]}
  ]}})};
  const x=await finalize({github:f.github,core:outcomeCore,context:outcomeContext,
    number:11,expectedSha:sha,taskKey:receiptKey,claimStatus:'claimed',
    claimResult:'success',strategy:'lint',fixResult:'success',candidateStatus:'ready',
    publishResult:'skipped'});
  assert.equal(x.source_published,false);
  assert.match(f.log.commentBodies.at(-1),/"stage":"patch_verified"/);
  assert.doesNotMatch(f.log.commentBodies.at(-1),/"stage":"source_published"/);
  // A previous run_attempt's successful job does not prove the current one.
  const oldOnly=fixture();
  oldOnly.github.rest.actions={listJobsForWorkflowRun:async()=>({data:{jobs:[
    {name:'fix',run_attempt:1,conclusion:'success',steps:[
      {name:'Try targeted ESLint autofix and write bounded patch candidate',
       started_at:started,completed_at:verified,conclusion:'success'}
    ]}
  ]}})};
  await finalize({github:oldOnly.github,core:outcomeCore,context:outcomeContext,
    number:11,expectedSha:sha,taskKey:receiptKey,claimStatus:'claimed',
    claimResult:'success',strategy:'lint',fixResult:'success',candidateStatus:'ready',
    publishResult:'skipped'});
  assert.doesNotMatch(oldOnly.log.commentBodies.at(-1),/"stage":"patch_verified"/);
 }finally{
  if(old===undefined)delete process.env.GITHUB_RUN_ATTEMPT;
  else process.env.GITHUB_RUN_ATTEMPT=old;
 }
});

test('failed legacy cloud preflight stays FAILED and never publishes an unverified source commit',async()=>{
 const f=fixture();
 const r=await finalize({github:f.github,core:outcomeCore,context:outcomeContext,
  number:11,expectedSha:sha,taskKey:receiptKey,claimStatus:'claimed',
  claimResult:'success',strategy:'legacy',fixResult:'failure',
  candidateStatus:'',publishResult:'skipped'});
 assert.equal(r.state,'FAILED');
 assert.equal(r.lane,'legacy');
 assert.equal(r.reason_code,'LEGACY_PREFLIGHT_INCOMPLETE');
 assert.equal(r.source_published,false);
 assert.equal(r.new_sha,null);
});

test('Repair Worker stops an ownership claim when PR HEAD changes before receipt',async()=>{
 const f=fixture(),initial=pr();
 const moved=pr({head:{...initial.head,sha:newSha}});
 let reads=0;
 f.github.rest.pulls.get=async()=>({data:++reads===1?initial:moved});
 const result=await claim({github:f.github,core,context,hasToken:true,number:11});
 assert.equal(result.status,'skipped');
 assert.equal(f.log.comments,0);
 assert.equal(reads,2,'the current HEAD must be checked again before claiming');
});
test('Repair Worker refuses a newly active foreign lease after verified reservation',async()=>{
 const now=Date.parse('2026-11-05T04:00:00Z');
 const task=taskFor(pr(),{tier:'P1'});
 const bot={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'}};
 const source={...bot,body:'<!-- HH_PR_10MIN_SOURCE_REPAIR_V1 '+sha+
  ' -->\nFailed jobs: core-lint-types-build.\n'};
 const reserved={...bot,body:commentBody(reservation(task,now,777))};
 const foreign={user:{login:'another-owner'},body:'<!-- HH_PR_SWEEP_LEASE_V1 -->\n'+
  JSON.stringify({schema:'HH_PR_SWEEP_LEASE_V1',owner:'concurrent-writer',
   lease_id:'new',head_sha:sha,state:'active'})};
 const f=fixture();
 let reads=0;
 f.github.rest.issues.listComments=async()=>({data:++reads===1?
  [source,reserved]:[source,reserved,foreign]});
 const result=await claim({github:f.github,core,
  context:{...context,eventName:'workflow_dispatch'},
  number:11,expectedSha:sha,taskKey:task.task_key,
  reservationRunId:'777',hasToken:true,now});
 assert.equal(result.status,'skipped');
 assert.equal(f.log.comments,0);
 assert.equal(reads,2,'signed reservation and owner lease need last read before claim');
});

test('pre-npm veto checks exact-head liveness without granting source write',()=>{
 const current=pr();
 assert.equal(currentRepairHead(current,11,sha),true);
 // Manual legacy tasks may still perform their existing read-only preflight.
 assert.equal(currentRepairHead(pr({labels:[{name:'hh:repair-manual'}]}),11,sha),true);
 for(const changed of [
  pr({number:12}),pr({head:{...current.head,sha:newSha}}),
  pr({head:{...current.head,ref:'../../unsafe'}}),
  pr({head:{...current.head,repo:{full_name:'foreign/repo'}}}),
  pr({base:{ref:'codex/bootstrap-books'}}),pr({state:'closed'}),
  pr({draft:true}),pr({user:{login:'outsider'}}),
  pr({labels:[{name:'hh:hold'}]}),pr({labels:[{name:'hh:blocked'}]}),
  pr({labels:[{name:'hh:direction-override:invalid'}]}),pr({labels:null})
 ])assert.equal(currentRepairHead(changed,11,sha),false);
 assert.equal(currentRepairHead(current,11,'not-a-sha'),false);
 assert.equal(currentRepairHead(current,0,sha),false);
});
test('fix job checks live source HEAD before npm and protects all candidate-producing steps',()=>{
 const fs=require('node:fs'),src=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 const fix=src.split('\n  fix:\n')[1]?.split('\n  code_fix:\n')[0];assert.ok(fix);
 const pre=fix.indexOf('id: fresh_head'),npm=fix.indexOf('Install dependencies without running lifecycle scripts');
 assert.ok(pre>0&&pre<npm,'liveness check must precede npm');
 assert.ok(fix.includes('worker.currentRepairHead(pr,number,expected)'));
 for(const needle of [
  'id: legacy_deps','name: Install dependencies without running lifecycle scripts',
  'id: legacy_scan','name: Apply trusted TypeScript type-only import codemods',
  'name: Verify deterministic Core repair with TypeScript','id: build_candidate',
  'name: hh-repair-candidate','name: hh-legacy-preflight']){
   const at=fix.indexOf(needle);assert.ok(at>0,needle);
   const step=fix.slice(fix.lastIndexOf('\n      - ',at),at+needle.length+220);
   assert.ok(step.includes("steps.fresh_head.outputs.current == 'true'"),needle);
 }
});

test('repair delivery statuses never infer source publication from green read-only jobs',()=>{
 const {sourceDeliveryStatus}=require('../scripts/ci-pr-repair-worker.cjs');
 const prepared=sourceDeliveryStatus({state:'PREPARED',sourcePublished:false,codeAvailable:false});
 assert.deepEqual(prepared,{delivery_status:'READ_ONLY_PREFLIGHT_NO_SOURCE',
   next_action:'HANDOFF_EXISTING_SOURCE_OWNER'});
 assert.equal(sourceDeliveryStatus({state:'MANUAL',sourcePublished:false,
   codeAvailable:false}).delivery_status,'NO_FREE_CODE_EXECUTOR_NO_SOURCE');
 assert.equal(sourceDeliveryStatus({state:'SUPERSEDED',sourcePublished:false})
   .next_action,'REINSPECT_NEW_HEAD_AND_OWNER');
 assert.equal(sourceDeliveryStatus({state:'FAILED',sourcePublished:false})
   .delivery_status,'NO_VERIFIED_SOURCE_COMMIT');
 assert.equal(sourceDeliveryStatus({state:'PUBLISHED',sourcePublished:true})
   .delivery_status,'SOURCE_PUBLISHED_CI_UNVERIFIED');
 assert.notEqual(sourceDeliveryStatus({state:'PREPARED',sourcePublished:true})
   .delivery_status,'SOURCE_PUBLISHED_CI_UNVERIFIED');
});
test('read-only legacy finalization remains PREPARED and emits no-source delivery receipt',async()=>{
 const f=fixture();
 const result=await finalize({github:f.github,core:outcomeCore,context:outcomeContext,
   number:11,expectedSha:sha,taskKey:receiptKey,claimStatus:'claimed',
   claimResult:'success',fixResult:'success',strategy:'legacy',
   candidateStatus:'prepared',candidateDetail:'GIT_TREE_MERGES_WITHOUT_CONFLICT',
   publishResult:'skipped'});
 assert.equal(result.state,'PREPARED');
 assert.equal(result.source_published,false);
 assert.equal(result.verified_source_fix,false);
 assert.equal(result.delivery_status,'READ_ONLY_PREFLIGHT_NO_SOURCE');
 assert.equal(result.next_action,'HANDOFF_EXISTING_SOURCE_OWNER');
 assert.equal(f.log.commit,0);
});

test('repair finalizer emits an owned FIXED receipt only for an exact published source commit',()=>{
 const outcome=buildTaskOutcome({task_key:'1'.repeat(32),pr_number:11,
  head_sha:sha,new_sha:newSha, state:'PUBLISHED',reason_code:'SOURCE_COMMIT_VERIFIED_ON_PR_HEAD',
  source_published:true,head_matches:true,claim_status:'claimed',
  owner_run_id:'12345',now:'2026-11-10T01:00:00.000Z'});
 assert.equal(outcome.status,'FIXED');
 assert.equal(outcome.verified_source,true);
 assert.equal(outcome.next_action,'VERIFY_EXACT_HEAD_REQUIRED_CI');
 assert.equal(outcome.responsible_role,'exact-head-ci-verifier');
 assert.equal(validateTaskOutcome(outcome),true);
});

test('unverified or stale published claims cannot become FIXED',()=>{
 for(const input of [
  {source_published:false,head_matches:true},
  {source_published:true,head_matches:false},
  {source_published:true,head_matches:true,new_sha:sha}
 ]){
  assert.throws(()=>buildTaskOutcome({task_key:'1'.repeat(32),pr_number:11,
   head_sha:sha,new_sha:input.new_sha||newSha,state:'PUBLISHED',
   reason_code:'SOURCE_COMMIT_VERIFIED_ON_PR_HEAD',
   source_published:input.source_published,head_matches:input.head_matches,
   owner_run_id:'12345',now:'2026-11-10T01:00:00.000Z'}));
 }
});

test('manual, rerouted, waiting and retry outcomes always have an owner and next check',()=>{
 const now='2026-11-10T01:00:00.000Z';
 const base={task_key:'2'.repeat(32),pr_number:11,head_sha:sha,
  reason_code:'TEST_REASON',owner_run_id:'12345',now};
 const cases=[
  ['MANUAL','MANUAL_REQUIRED','repository-owner'],
  ['SUPERSEDED','REROUTED','pr-head-reconciler'],
  ['REJECTED','WAITING_INPUT','repository-owner'],
  ['FAILED','REROUTED','agents-director-maintainer','unknown'],
  ['FAILED','MANUAL_REQUIRED','repository-owner','claimed'],
  ['PREPARED','REROUTED','source-repair-owner'],
  ['UNKNOWN_STATE','UNCLASSIFIED','ci-diagnostic-triage']
 ];
 for(const [state,status,role,claim_status='unknown'] of cases){
  const result=buildTaskOutcome({...base,state,claim_status});
  assert.equal(result.status,status);
  assert.equal(result.responsible_role,role);
  assert.ok(result.next_action);
  assert.ok(Number.isFinite(Date.parse(result.next_check_at)));
  assert.equal(validateTaskOutcome(result),true);
 }
});

test('retry receipt must have a future bounded timestamp and remains exact-head scoped',()=>{
 const now='2026-11-10T01:00:00.000Z';
 const result=buildTaskOutcome({task_key:'3'.repeat(32),pr_number:11,head_sha:sha,
  state:'NO_CLAIM_RETRYABLE',reason_code:'NO_CLAIM_RETRYABLE',
  owner_run_id:'12345',retry_after:'2026-11-10T01:15:00.000Z',now});
 assert.equal(result.status,'RETRY_SCHEDULED');
 assert.equal(result.next_check_at,'2026-11-10T01:15:00.000Z');
 assert.throws(()=>buildTaskOutcome({task_key:'3'.repeat(32),pr_number:11,head_sha:sha,
  state:'NO_CLAIM_RETRYABLE',reason_code:'NO_CLAIM_RETRYABLE',
  owner_run_id:'12345',retry_after:'2026-11-10T00:59:00.000Z',now}));
});

test('outcome validation rejects terminal claims without independent source proof',()=>{
 const valid=buildTaskOutcome({task_key:'4'.repeat(32),pr_number:11,head_sha:sha,
  new_sha:newSha,state:'PUBLISHED',reason_code:'SOURCE_COMMIT_VERIFIED_ON_PR_HEAD',
  source_published:true,head_matches:true,owner_run_id:'12345',
  now:'2026-11-10T01:00:00.000Z'});
 assert.equal(validateTaskOutcome(valid),true);
 assert.equal(validateTaskOutcome({...valid,verified_source:false}),false);
 assert.equal(validateTaskOutcome({...valid,next_action:''}),false);
});


test('free model audit preserves numeric GitHub Actions run IDs and rejects wrong PR/HEAD',()=>{
 const {normalizeModelAudit}=require('../scripts/ci-pr-repair-worker.cjs');
 const raw={schema:'HH_FREE_AI_MODEL_RUN_V1',provider:'openrouter',model:'cohere/north-mini-code:free',
  model_version:'catalog-v1',catalog_model_created:1794260000,executor_type:'free_ci_patch_proposer',
  pr_number:42,source_head:sha,run_id:'123456',run_attempt:1,started_at:'2026-11-09T00:00:00.000Z',
  model_call_started_at:'2026-11-09T00:00:01.000Z',response_received_at:null,attempt_count:1,
  result:'MODEL_CALL_FAILED_OR_OUTPUT_REJECTED',failure_reason:'FREE_AI_OPENROUTER_PATCH_RESPONSE_TRUNCATED',
  patch_present:false,candidate_paths:[],verification_result:'NOT_RUN'};
 const audit=normalizeModelAudit(raw,{number:42,expectedSha:sha,runId:123456,runAttempt:1});
 assert.equal(audit.run_id,'123456');
 assert.equal(normalizeModelAudit(raw,{number:43,expectedSha:sha,runId:123456,runAttempt:1}),null);
 assert.equal(normalizeModelAudit({...raw,source_head:newSha},{number:42,expectedSha:sha,runId:123456,runAttempt:1}),null);
 assert.equal(normalizeModelAudit(raw,{number:42,expectedSha:sha,runId:123457,runAttempt:1}),null,
  'audit from a different workflow run must not be attached');
 assert.equal(normalizeModelAudit(raw,{number:42,expectedSha:sha,runId:123456,runAttempt:2}),null,
  'audit from a different rerun attempt must not be attached');
});


test('publisher and fallback finalizers pass the same-run free model audit with exact workflow attempt',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.match(source,/HH_MODEL_AUDIT:\s*\$\{\{\s*needs\.code_fix\.outputs\.model_audit\s*\}\}/);
 assert.match(source,/HH_WORKFLOW_ATTEMPT:\s*\$\{\{\s*github\.run_attempt\s*\}\}/);
 assert.match(source,/modelAuditRaw:process\.env\.HH_MODEL_AUDIT/);
 assert.match(source,/modelAuditRunAttempt:Number\(process\.env\.HH_WORKFLOW_ATTEMPT\|\|0\)/);
});

test('free-model prompt delivery receipt is accepted only for the exact signed task/run/attempt',()=>{
 const {normalizeModelAudit}=require('../scripts/ci-pr-repair-worker.cjs');
 const {promptReceipt}=require('../scripts/ci-pr-repair-free-agent.cjs');
 const taskKey='1'.repeat(32);
 const prompt=promptReceipt({sha,files:['components/public-card.tsx']},
  'bounded prompt',{tests:{ok:false,detail:'redacted'}},
  {taskKey,runId:'123456',runAttempt:1});
 const raw={schema:'HH_FREE_AI_MODEL_RUN_V1',provider:'openrouter',
   model:'cohere/north-mini-code:free',executor_type:'free_ci_patch_proposer',
   pr_number:42,source_head:sha,run_id:'123456',run_attempt:1,
   started_at:'2026-11-09T00:00:00.000Z',model_call_started_at:'2026-11-09T00:00:01.000Z',
   response_received_at:'2026-11-09T00:00:02.000Z',attempt_count:1,
   result:'MODEL_RESPONSE_RECEIVED',patch_present:false,candidate_paths:[],
   verification_result:'NOT_RUN',prompt_receipt:prompt,
   prompt_prepared_at:'2026-11-09T00:00:00.500Z',
   prompt_delivery_status:'RESPONSE_OBSERVED'};
 const expected={number:42,expectedSha:sha,runId:123456,runAttempt:1,taskKey};
 const audit=normalizeModelAudit(raw,expected);
 assert.equal(audit.prompt_receipt.prompt_id,prompt.prompt_id);
 assert.equal(audit.prompt_receipt.context_hash,prompt.context_hash);
 assert.equal(audit.prompt_delivery_status,'RESPONSE_OBSERVED');
 assert.equal(normalizeModelAudit(raw,{...expected,taskKey:'2'.repeat(32)}),null);
 assert.equal(normalizeModelAudit(raw,{...expected,runAttempt:2}),null);
 assert.equal(normalizeModelAudit({...raw,prompt_receipt:{...prompt,context_hash:'bad'}},expected),null);
 assert.equal(normalizeModelAudit({...raw,prompt_delivery_status:'RESPONSE_OBSERVED',
   response_received_at:null},expected),null,
  'a send attempt alone must never be recorded as a delivered response');
 assert.equal(normalizeModelAudit({...raw,prompt_delivery_status:'ATTEMPTED_UNCONFIRMED',
   response_received_at:null},expected).prompt_delivery_status,'ATTEMPTED_UNCONFIRMED');
 assert.equal(normalizeModelAudit({...raw,prompt_delivery_status:'PREPARED'},expected),null,
   'a started model call cannot be represented as only a prepared prompt');
});
test('repair workflow binds exact signed task key to isolated free proposer',()=>{
 const wf=require('node:fs').readFileSync('.github/workflows/hh-pr-repair-worker.yml','utf8');
 assert.match(wf,/REPAIR_TASK_KEY:\s*\$\{\{ needs\.claim\.outputs\.task_key \}\}/);
});

test('free-model publisher receipt is provider-neutral',()=>{
 const fs=require('node:fs');
 const source=fs.readFileSync(require.resolve('../scripts/ci-pr-repair-worker.cjs'),'utf8');
 assert.equal(source.includes('free-model source repair'),true);
 assert.equal(source.includes('free OpenCode/GLM source repair'),false);
});

test('verified dirty conflicts outrank manual legacy preflight and never enter source repair',()=>{
 const conflicted=pr({mergeable:false,mergeable_state:'dirty',labels:[
  {name:'hh:repair-manual'},
  {name:'hh:conflict-repair-needed'},
  {name:'hh:repair-needed'}
 ]});
 assert.equal(require('../scripts/ci-pr-task-state.cjs').validLegacyPrep(conflicted),true,
  'fixture reproduces the legacy-preflight eligibility that previously masked the conflict');
 const task=taskFor(conflicted,{tier:'P1',direction:'source'});
 assert.equal(task.lane,'conflict');
 assert.equal(task.reason_code,'merge-conflict');
 assert.equal(task.next_action,'CONFLICT_TRIAGE');
 assert.notEqual(task.next_action,'LEGACY_CLOUD_PREFLIGHT');
});


test('worker failure follow-up creates a specialist conflict task instead of UNKNOWN triage',()=>{
 const {makeWorkerFollowUp,validTask}=require('../scripts/ci-pr-error-task.cjs');
 const base={pr_number:3946,head_sha:sha,task_key:'a'.repeat(32),
  owner_run_id:'42840000000',state:'MANUAL',
  reason_code:'CONFLICT_REQUIRES_SOURCE_RESOLUTION',
  now:Date.parse('2026-11-10T15:00:00.000Z')};
 const first=makeWorkerFollowUp(base);
 const repeated=makeWorkerFollowUp(base);
 assert.equal(first.category,'MERGE_CONFLICT');
 assert.equal(first.strategy_code,'SEMANTIC_CONFLICT_TRIAGE');
 assert.equal(first.responsible_role,'semantic-conflict-resolver');
 assert.equal(first.next_action,'ASSIGN_SEMANTIC_CONFLICT_OWNER');
 assert.equal(first.recommended_status,'MANUAL_REQUIRED');
 assert.equal(first.task_id,repeated.task_id,'same failed task/run remains idempotent');
 assert.equal(first.source_write_authorized,false);
 assert.equal(first.execution_authorized,false);
 assert.equal(validTask(first),true);
});

test('worker failure follow-ups distinguish free-model failure from dispatch failure without authorizing retry',()=>{
 const {makeWorkerFollowUp,validTask}=require('../scripts/ci-pr-error-task.cjs');
 const common={pr_number:42,head_sha:sha,task_key:'b'.repeat(32),
  owner_run_id:'42840000001',now:Date.parse('2026-11-10T15:00:00.000Z')};
 const ai=makeWorkerFollowUp({...common,state:'FAILED',
  reason_code:'FREE_AI_OPENROUTER_PATCH_RESPONSE_INVALID'});
 const dispatch=makeWorkerFollowUp({...common,state:'REJECTED',
  reason_code:'DISPATCH_RESERVATION_UNVERIFIED'});
 assert.equal(ai.category,'AI_EXECUTOR');
 assert.equal(ai.strategy_code,'FREE_PROVIDER_HOLD');
 assert.equal(ai.recommended_status,'MANUAL_REQUIRED');
 assert.equal(dispatch.category,'AUTOMATION_PROCESS');
 assert.equal(dispatch.strategy_code,'RECOVER_EXISTING_TASK');
 for(const task of [ai,dispatch]){
  assert.equal(task.source_write_authorized,false);
  assert.equal(task.execution_authorized,false);
  assert.equal(validTask(task),true);
 }
});

test('safe OpenRouter response-shape metadata survives task finalization without source leakage',()=>{
 const {normalizeModelAudit}=require('../scripts/ci-pr-repair-worker.cjs');
 const receipt={schema:'HH_OPENROUTER_RESPONSE_SHAPE_V1',
  choices_count:1,finish_reason:'stop',content_type:'null',
  content_parts:0,text_parts:0,reasoning_present:true,tool_calls_present:false,
  raw_response:'SECRET_PRIVATE_MODEL_TEXT',untrusted_provider_key:'SECRET_PRIVATE_SOURCE'};
 const raw={schema:'HH_FREE_AI_MODEL_RUN_V1',provider:'openrouter',
  model:'cohere/north-mini-code:free',executor_type:'free_ci_patch_proposer',
  pr_number:42,source_head:sha,run_id:'123456',run_attempt:1,
  started_at:'2026-11-09T00:00:00.000Z',model_call_started_at:'2026-11-09T00:00:01.000Z',
  response_received_at:'2026-11-09T00:00:02.000Z',attempt_count:1,
  result:'MODEL_RESPONSE_RECEIVED',patch_present:false,candidate_paths:[],
  verification_result:'NOT_RUN',response_shape:receipt};
 const task={number:42,expectedSha:sha,runId:123456,runAttempt:1};
 const normalized=normalizeModelAudit(raw,task);
 assert.deepEqual(normalized.response_shape,{
  schema:'HH_OPENROUTER_RESPONSE_SHAPE_V1',choices_count:1,
  finish_reason:'stop',content_type:'null',content_parts:0,text_parts:0,
  reasoning_present:true,tool_calls_present:false
 });
 assert.doesNotMatch(JSON.stringify(normalized),/SECRET_PRIVATE_MODEL_TEXT|SECRET_PRIVATE_SOURCE/);
 assert.equal(normalizeModelAudit({...raw,response_shape:{...receipt,text_parts:2}},task).response_shape,null,
  'invalid shape must not invalidate the full audit or become a trusted receipt');
 assert.equal(normalizeModelAudit({...raw,response_shape:{...receipt,content_type:'SECRET_PRIVATE_SOURCE'}},task).response_shape,null);
 assert.equal(normalizeModelAudit({...raw,provider:'opencode',
  model:'opencode/glm-5.3-flash-free'},task).response_shape,null,
  'OpenRouter response shape must not be attributed to another provider');
});
