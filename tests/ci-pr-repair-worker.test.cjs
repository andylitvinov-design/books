'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {eligible,safeFiles,claim,publish,prioritizedRepairCandidates,validBranch,validCandidate,activeSweepLease,MARKER}=require('../scripts/ci-pr-repair-worker.cjs');
const sha='a'.repeat(40), newSha='b'.repeat(40), owner='andylitvinov-design', repo='books';
const context={repo:{owner,repo}};
const core={info:()=>{},outputs:{},setOutput(k,v){this.outputs[k]=v;}};
const pr=(extra={})=>({number:11,state:'open',draft:false,user:{login:owner},
  base:{ref:'codex/public-book-library'},head:{ref:'fix/pr-11',sha,
    repo:{full_name:owner+'/'+repo}},labels:[{name:'hh:repair-needed'}],...extra});
const sourceFiles=[{filename:'lib/a.ts',status:'modified'}];
function fixture(options={}){
  const p=options.pr||pr(), log={comments:0,assigned:0,labels:0,removed:[],read:0,commit:0};
  const github={rest:{pulls:{
    get:async()=>({data:options.fresh||p}),list:async()=>({data:options.children||[]}),
    listFiles:async()=>({data:sourceFiles})},
    issues:{listForRepo:async()=>({data:[{number:11,pull_request:{}}]}),
      listComments:async()=>({data:options.comments||[]}),
      createComment:async()=>{log.comments++},
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
  assert.equal(core.outputs.strategy,'lint');
  assert.equal(f.log.comments,1);
  assert.equal(f.log.assigned,1);
  const already=fixture({comments:[{body:'<!-- '+MARKER+' '+sha+' -->'}]});
  const second=await claim({github:already.github,core,context,hasToken:true,number:11});
  assert.equal(second.status,'skipped');
  assert.equal(already.log.comments,0);
});
test('dry run and absent owner token never claim or modify source',async()=>{
  for(const params of [{dryRun:true},{hasToken:false}]){
    const f=fixture();const r=await claim({github:f.github,core,context,number:11,...params});
    assert.equal(f.log.comments,0);
    assert.ok(['dry_run','skipped'].includes(r.status));
  }
});
test('conflicting source is assigned to owner but never unsafe-merged',async()=>{
  const f=fixture({pr:pr({labels:[{name:'hh:conflict-repair-needed'}]})});
  const r=await claim({github:f.github,core,context,hasToken:true,number:11});
  assert.equal(r.status,'manual_conflict');
  assert.equal(f.log.comments,2);
  assert.equal(f.log.labels,1);
  assert.deepEqual(f.log.removed,['hh:conflict-repair-needed']);
  assert.equal(f.log.commit,0);
});
test('active external lease blocks concurrent worker',async()=>{
  assert.equal(activeSweepLease([{body:'<!-- HH_PR_SWEEP_LEASE_V1 {"schema":"HH_PR_SWEEP_LEASE_V1","head_sha":"'+sha+'","state":"active","expires_at":"2099-01-01T00:00:00Z"} -->'}],sha,Date.now()),true);
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
  await assert.rejects(publish({github:f.github,core,context,prNumber:11,expectedSha:sha,candidate:c,writer:f.writer}),/STALE/);
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
  const f=fixture({comments:[{body:wrap(old)}]});
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
