'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {eligible,safeFiles,claim,publish,finalize,finalizeFailedFix,prioritizedRepairCandidates,validBranch,validCandidate,activeSweepLease,repairMode,hasVerifiedSourceHandoff,verifiedCoreCodeFailure,MARKER}=require('../scripts/ci-pr-repair-worker.cjs');
const {taskFor,commentBody,reservation,reservationStatus}=require('../scripts/ci-pr-task-state.cjs');
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
    git:{getCommit:async()=>({data:{tree:{sha:'c'.repeat(40)}}})}
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
test('publisher verifies owner, SHA, changed file blob and commits exactly once',async()=>{
  const f=fixture(), candidate={head_sha:sha,files:[{path:'lib/a.ts',original_sha:newSha,
    base64:Buffer.from('const a=1;\n').toString('base64')}]};
  assert.equal(validCandidate(candidate,sha),true);
  const r=await publish({github:f.github,core,context,prNumber:11,expectedSha:sha,candidate,writer:f.writer});
  assert.equal(r.status,'committed');
  assert.equal(f.log.commit,1);
  assert.equal(f.log.read,1);
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
 assert.ok(wf.includes('ref: codex/bootstrap-books'));
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
 assert.match(wf,/core\.setOutput\('code_available','true'\)/);
 const codeFix=wf.split('\n  code_fix:\n')[1].split('\n  code_verify:\n')[0];
 const codeVerify=wf.split('\n  code_verify:\n')[1].split('\n  publish:\n')[0];
 assert.match(codeFix,/needs\.fix\.outputs\.candidate_status == 'manual_required'/);
 assert.match(codeFix,/ci-pr-repair-free-agent\.cjs/);
 assert.match(codeFix,/opencode\/cli@2\.1\.2/);
 assert.match(codeFix,/persist-credentials: false/);
 assert.match(codeVerify,/ci-pr-repair-code-candidate\.cjs verify/);
 assert.match(codeVerify,/candidate_status == 'proposed'/);
 assert.doesNotMatch(wf,/OPENAI_API_KEY|openai\/codex-action@v1/);
 const pub=wf.split('\n  publish:\n')[1].split('\n  finalize:\n')[0];
 assert.match(pub,/HH_AUTOMERGE_TOKEN/);
 for(const isolated of [codeFix,codeVerify])assert.doesNotMatch(isolated,/HH_AUTOMERGE_TOKEN/);
});
test('Codex failures report NO source commit while unverified proposals cannot publish',async()=>{
 const bot={user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
   performed_via_github_app:{id:15368,slug:'github-actions'}};
 const owned=commentBody({...taskFor(pr(),{tier:'P1'}),
   state:'CLAIMED',owner_run_id:String(outcomeContext.runId),task_key:receiptKey});
 for(const variant of [
  {codeAvailable:true,codeResult:'failure',expected:'CODEX_JOB_FAILED_NO_SOURCE_COMMIT'},
  {codeAvailable:true,codeResult:'success',codeStatus:'proposed',
    codeVerifyResult:'failure',expected:'CODEX_VERIFIER_JOB_FAILED_NO_SOURCE_COMMIT'},
  {codeAvailable:true,codeResult:'success',codeStatus:'no_change',
    expected:'CODEX_NO_VERIFIED_SOURCE_CHANGE'},
  {codeAvailable:true,codeResult:'success',codeStatus:'proposed',
    codeVerifyResult:'success',codeVerifyStatus:'manual_required',
    codeVerifyDetail:'CODEX_CANDIDATE_OUT_OF_SCOPE',expected:'CODEX_CANDIDATE_REJECTED'},
  {codeAvailable:true,codeResult:'success',codeStatus:'proposed',
    codeVerifyResult:'success',codeVerifyStatus:'ready',
    expected:'CODEX_VERIFIED_BUT_NOT_PUBLISHED_SKIPPED'}
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
 assert.doesNotMatch(pub,/contents: write/);
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
 assert.ok(wf.includes("core.setOutput('code_available',process.env.HH_HAS_FREE_OPENCODE_TOKEN==='true'?'true':'false')"));
 assert.match(wf,/HH_HAS_FREE_OPENCODE_TOKEN: \\$\\{\\{ secrets\\.HH_OPENCODE_FREE_API_KEY != '' \\$\\}\\}/);
 assert.match(wf,/HH_OPENCODE_FREE_API_KEY: \\$\\{\\{ secrets\\.HH_OPENCODE_FREE_API_KEY \\$\\}\\}/);
 assert.match(wf,/FREE_AI_FREE_OPENCODE_CREDENTIAL_NOT_CONFIGURED/);
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
