'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {run,selectReclassification,LABELS}=require('../scripts/ci-pr-direction-watcher.cjs');
const HEAD='a'.repeat(40);
const NOW=Date.parse('2026-11-01T18:00:00Z');
const context={repo:{owner:'andylitvinov-design',repo:'books'},
  ref:'refs/heads/codex/bootstrap-books'};
const core=()=>({info:()=>{},summary:{
  addHeading(){return this},addCodeBlock(){return this},async write(){return true}
}});
const pr=(number,title='feat(video): new generator',extra={})=>({
  number,title,state:'open',draft:false,labels:[],
  created_at:'2026-10-01T12:00:00Z',updated_at:new Date(NOW).toISOString(),
  head:{ref:'work-'+number,sha:HEAD,repo:{full_name:'andylitvinov-design/books'}},
  base:{ref:'codex/public-book-library'},...extra
});
function fixture(items,opts={}){
  const counts={adds:[],removes:[],creates:[],gets:[],pathReads:0};
  const github={rest:{
    pulls:{
      list:async ({page})=>({data:page===1?items:[],headers:{'x-ratelimit-remaining':'1500'}}),
      get:async ({pull_number})=>{counts.gets.push(pull_number);
        return {data:items.find(x=>x.number===pull_number)};},
      listFiles:async()=>{counts.pathReads++;
        return {data:[{filename:'src/services/voice/output.ts'}]};}
    },
    issues:{
      listLabelsForRepo:async ({page})=>({data:page===1?
        (opts.missingLabels?[]:LABELS.map(x=>({name:x.name}))):[]}),
      createLabel:async args=>{counts.creates.push(args.name);return {data:args};},
      addLabels:async args=>{counts.adds.push(args);return {data:{}};},
      removeLabel:async args=>{counts.removes.push(args.name);return {data:{}};}
    }
  }};
  return {github,counts};
}
test('all GitHub label descriptions respect the strict 100-character API limit',()=>{
  assert.equal(new Set(LABELS.map(x=>x.name)).size,LABELS.length);
  for(const label of LABELS){
    assert.ok(label.description.length>0&&label.description.length<=100,
      label.name+' invalid description length '+label.description.length);
    assert.match(label.color,/^[a-f0-9]{6}$/i);
  }
});
test('GitHub 422 validation is NOT mistaken for successful label creation',async()=>{
  const f=fixture([pr(1)],{missingLabels:true});
  let verified=0;
  f.github.rest.issues.createLabel=async()=>{
    const error=new Error('Validation Failed: description too long');
    error.status=422;throw error;
  };
  f.github.rest.issues.getLabel=async()=>{
    verified++;
    const error=new Error('Not Found');error.status=404;throw error;
  };
  const result=await run({github:f.github,core:core(),context,now:NOW});
  assert.equal(verified,1);
  assert.equal(result.reason,'LABEL_CATALOG_UNAVAILABLE');
  assert.equal(result.updated,0);
  assert.equal(result.createdLabels,0);
  assert.equal(f.counts.adds.length,0,'never label a PR with an unverified catalog');
});
test('genuine concurrent label creation requires exact-name readback',async()=>{
  const f=fixture([pr(1)]);
  const missing=LABELS[0];
  f.github.rest.issues.listLabelsForRepo=async()=>({data:
    LABELS.filter(l=>l.name!==missing.name).map(l=>({name:l.name}))});
  f.github.rest.issues.createLabel=async()=>{const error=new Error('Already exists');
    error.status=422;throw error;};
  let read=0;
  f.github.rest.issues.getLabel=async({name})=>{
    read++;return {data:{name}};
  };
  const result=await run({github:f.github,core:core(),context,now:NOW});
  assert.equal(read,1);
  assert.equal(result.createdLabels,0,'already-existing race is not a new creation');
  assert.equal(result.updated,1);
  assert.equal(f.counts.adds.length,1);
});
test('every open production PR is inventoried, but writes are capped',async()=>{
  const items=Array.from({length:50},(_,i)=>pr(i+1,i%2?'feat(reiki): learning':'fix(video): Create'));
  const f=fixture(items);
  const result=await run({github:f.github,core:core(),context,now:NOW,maxUpdates:4});
  assert.equal(result.inventoried,50);
  assert.equal(result.production,50);
  assert.equal(result.updated,4);
  assert.equal(result.pending,46);
  assert.equal(f.counts.adds.length,4);
  assert.ok(f.counts.adds.every(x=>x.labels.some(y=>y.startsWith('hh:direction:'))));
  assert.ok(result.apiRequests<115);
});
test('trusted initial dispatch drains backlog through bounded serial batches',async()=>{
  const items=Array.from({length:50},(_,i)=>
    pr(i+1,i%2?'feat(reiki): course':'feat(video): render'));
  const f=fixture(items);
  const continued=[];
  f.github.rest.actions={createWorkflowDispatch:async args=>{
    continued.push(args);return {data:{},headers:{'x-ratelimit-remaining':'1300'}};
  }};
  const selectedContext={...context,eventName:'workflow_dispatch',
    payload:{inputs:{dry_run:'false',batch:'0'}}};
  const result=await run({github:f.github,core:core(),context:selectedContext,
    now:NOW,maxUpdates:4});
  assert.equal(result.updated,4);
  assert.equal(result.pending,46);
  assert.equal(result.nextBatch,1);
  assert.equal(continued.length,1);
  assert.equal(continued[0].workflow_id,'hh-pr-direction-watcher.yml');
  assert.deepEqual(continued[0].inputs,{dry_run:'false',batch:'1'});
});
test('isolated PR read error does not strand healthy bootstrap backlog',async()=>{
  const items=Array.from({length:10},(_,i)=>pr(i+1,'feat(video): render'));
  const f=fixture(items);
  const oldGet=f.github.rest.pulls.get;
  f.github.rest.pulls.get=async args=>{
    if(args.pull_number===2)throw Error('Unexpected end of JSON input');
    return oldGet(args);
  };
  const continued=[];
  f.github.rest.actions={createWorkflowDispatch:async args=>{
    continued.push(args);return {data:{},headers:{'x-ratelimit-remaining':'1400'}};
  }};
  const result=await run({github:f.github,core:core(),
    context:{...context,eventName:'workflow_dispatch',
      payload:{inputs:{dry_run:'false',batch:'0'}}},
    now:NOW,maxUpdates:4});
  assert.equal(result.errors,1);
  assert.ok(result.updated>=1);
  assert.equal(result.nextBatch,1,'a single bad PR must not freeze healthy PRs');
  assert.equal(continued.length,1);
  assert.equal(continued[0].inputs.batch,'1');
});
test('all failed batch does not create an endless bootstrap dispatch',async()=>{
  const f=fixture(Array.from({length:6},(_,i)=>pr(i+1)));
  f.github.rest.pulls.get=async()=>{throw Error('upstream read unavailable');};
  let dispatched=0;
  f.github.rest.actions={createWorkflowDispatch:async()=>{dispatched++;}};
  const result=await run({github:f.github,core:core(),
    context:{...context,eventName:'workflow_dispatch',
      payload:{inputs:{dry_run:'false',batch:'0'}}},
    now:NOW,maxUpdates:4});
  assert.equal(result.updated,0);
  assert.equal(result.errors,4);
  assert.equal(result.nextBatch,null);
  assert.equal(dispatched,0);
});
test('bootstrap never chains from schedule, dry-run, or after its hard cap',async()=>{
  const items=Array.from({length:50},(_,i)=>pr(i+1));
  for(const scenario of [
    {eventName:'schedule',inputs:{batch:'0'},dryRun:false,want:null},
    {eventName:'workflow_dispatch',inputs:{batch:'0'},dryRun:true,want:null},
    {eventName:'workflow_dispatch',inputs:{batch:'11'},dryRun:false,want:null}
  ]){
    const f=fixture(items);
    let dispatched=0;
    f.github.rest.actions={createWorkflowDispatch:async()=>{dispatched++;}};
    const result=await run({github:f.github,core:core(),context:{
      ...context,eventName:scenario.eventName,payload:{inputs:scenario.inputs}},
      dryRun:scenario.dryRun,now:NOW,maxUpdates:4});
    assert.equal(result.nextBatch,scenario.want);
    assert.equal(dispatched,0);
    if(scenario.inputs.batch==='11')assert.equal(result.reason,'BOOTSTRAP_BATCH_LIMIT');
  }
});
test('legacy manual priority is cleaned but independent Repair labels remain intact',async()=>{
  const item=pr(40,'feat(voice): guest TTS',{labels:[
    {name:'hh:priority:p0'},{name:'hh:repair-needed'}
  ]});
  const f=fixture([item]);
  const result=await run({github:f.github,core:core(),context,now:NOW});
  assert.equal(result.updated,1);
  assert.deepEqual(f.counts.adds[0].labels,['hh:direction:audio-hypno','hh:priority:2',
    'hh:merge-priority:04','hh:merge-stage:repair']);
  assert.deepEqual(f.counts.removes,['hh:priority:p0']);
});
test('vague title may use changed filenames without reading source code',async()=>{
  const item=pr(2,'feat: improve existing system');
  const f=fixture([item]);
  const result=await run({github:f.github,core:core(),context,now:NOW});
  assert.equal(result.updated,1);
  assert.equal(result.selected[0].direction,'audio-hypno');
  assert.equal(f.counts.pathReads,1);
});
test('dry run reports reclassification without writing labels',async()=>{
  const f=fixture([pr(1)],{missingLabels:true});
  const result=await run({github:f.github,core:core(),context,dryRun:true,now:NOW});
  assert.equal(result.updated,0);
  assert.equal(result.selected.length,1);
  assert.equal(f.counts.adds.length,0);
  assert.equal(f.counts.creates.length,0);
});
test('refuses to label PRs targeting untrusted branch and stale HEADs',async()=>{
  const good=pr(1);
  const wrong=pr(2,'feat: other',{base:{ref:'unrelated-untrusted-branch'}});
  const f=fixture([good,wrong]);
  f.github.rest.pulls.get=async()=>({data:{...good,head:{...good.head,sha:'b'.repeat(40)}}});
  const result=await run({github:f.github,core:core(),context,now:NOW});
  assert.equal(result.production,1);
  assert.equal(result.updated,0);
  assert.equal(f.counts.adds.length,0);
});
test('invalid or multiple override directions are not relabeled by the watcher',async()=>{
  const item=pr(1,'feat(video): feature',{labels:[
    {name:'hh:direction-override:video'},
    {name:'hh:direction-override:messenger-crm'}]});
  const f=fixture([item]);
  const result=await run({github:f.github,core:core(),context,now:NOW});
  assert.equal(result.blockedOverrides,1);
  assert.equal(result.updated,0);
});
test('selection reserves slots for lower priority while preferring high levels',()=>{
  const items=Array.from({length:35},(_,i)=>pr(i+1,i<5?'feat(video): Create':'feat(reiki): courses'));
  const chosen=selectReclassification(items,NOW,9);
  assert.equal(chosen.length,9);
  assert.ok(chosen.some(x=>x.title.includes('video')));
  const seen=new Set();
  for(let i=0;i<8;i++)
    selectReclassification(items,NOW+i*600000,9).forEach(x=>seen.add(x.number));
  assert.ok(seen.size>12);
});

test('classifier also marks trusted default-branch infrastructure PRs',async()=>{
  const item=pr(9,'fix(ci): make Watchdog dispatch by direction',{
    base:{ref:'codex/bootstrap-books'}
  });
  const f=fixture([item]);
  const result=await run({github:f.github,core:core(),context,now:NOW});
  assert.equal(result.production,0);
  assert.equal(result.defaultBranchPRs,1);
  assert.equal(result.inScope,1);
  assert.equal(result.updated,1);
  assert.deepEqual(f.counts.adds[0].labels,['hh:direction:platform','hh:priority:1',
    'hh:merge-priority:01','hh:merge-stage:inspect']);
});

test('ten-rank watcher updates work stage idempotently without replacing unrelated labels',async()=>{
  const item=pr(55,'fix(video): restore Create',{labels:[
    {name:'hh:direction:video'},{name:'hh:priority:1'},
    {name:'hh:merge-priority:01'},{name:'hh:merge-stage:inspect'},
    {name:'hh:repair-needed'}
  ]});
  const f=fixture([item]);
  const result=await run({github:f.github,core:core(),context,now:NOW});
  assert.equal(result.byMergePriority.R01,1);
  assert.equal(result.byStage.repair,1);
  assert.equal(result.updated,1);
  assert.deepEqual(f.counts.adds[0].labels,['hh:merge-stage:repair']);
  assert.deepEqual(f.counts.removes,['hh:merge-stage:inspect']);
});
