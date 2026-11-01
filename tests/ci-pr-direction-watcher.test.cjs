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
test('legacy manual priority is cleaned but independent Repair labels remain intact',async()=>{
  const item=pr(40,'feat(voice): guest TTS',{labels:[
    {name:'hh:priority:p0'},{name:'hh:repair-needed'}
  ]});
  const f=fixture([item]);
  const result=await run({github:f.github,core:core(),context,now:NOW});
  assert.equal(result.updated,1);
  assert.deepEqual(f.counts.adds[0].labels,['hh:direction:audio-hypno','hh:priority:2']);
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
  const wrong=pr(2,'feat: other',{base:{ref:'codex/bootstrap-books'}});
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
