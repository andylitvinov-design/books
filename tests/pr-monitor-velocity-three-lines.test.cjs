'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const api=require('../ops/pr-monitor/api/pr-merge-ci-head-trends.js')._internals;
const ui=require('../ops/pr-monitor/pr-velocity-three-lines.js');
const BASE='2026-11-05T15:00:00Z';
const END='2026-11-05T16:00:00Z';
const ms=x=>Date.parse(x);
const mockRun=(id,sha,queued)=>({pr:100,source_head:sha,run_id:id,attempt:1,base:'codex/public-book-library',queued_at:queued,pr_created_at:BASE});
const sha1='a'.repeat(40),sha2='b'.repeat(40);
test('median accepts only observed values',()=>{
 assert.equal(api.median([]),null);
 assert.equal(api.median([3,1,5,7]),4);
});
test('first saved CI and next-HEAD proxy use exact compatible timestamps',()=>{
 const run=api.collectRuns([{user:{login:'github-actions[bot]'},body:'<!-- HH_CORE_CI_JOURNEY_SHARD_V1:2026-11-05T15-success -->\n'+JSON.stringify({schema:'HH_CORE_CI_JOURNEY_SHARD_V1',runs:[mockRun(1,sha1,'2026-11-05T15:02:00Z'),mockRun(2,sha2,'2026-11-05T15:07:00Z')]})}]);
 const v=api.evidence({created:ms(BASE),merged:ms(END)},run.get(100));
 assert.deepEqual(v,{first:2,headUpper:5,lastWaveUpper:5,headTransitions:1});
});
test('no new head event never means zero CI->HEAD time',()=>{
 const r=[{pr:100,head:sha1,queued:ms('2026-11-05T15:02:00Z'),created:ms(BASE)}];
 assert.deepEqual(api.evidence({created:ms(BASE),merged:ms(END)},r),{first:2,headUpper:null,lastWaveUpper:null,headTransitions:0});
 assert.deepEqual(api.evidence({created:ms(BASE),merged:ms(END)},[]),{first:null,headUpper:null,lastWaveUpper:null,headTransitions:0});
});
test('untrusted comments or broken schema cannot affect CI values',()=>{
 const body='<!-- HH_CORE_CI_JOURNEY_SHARD_V1:2026-11-05T15-success -->\n'+JSON.stringify({schema:'HH_CORE_CI_JOURNEY_SHARD_V1',runs:[mockRun(1,sha1,'2026-11-05T15:02:00Z')]});
 assert.deepEqual(api.parseShard({user:{login:'attacker'},body}),[]);
 assert.equal(api.parseShard({user:{login:'github-actions[bot]'},body}).length,1);
});
test('only actual GitHub merge on target base contributes and bins sum correctly',()=>{
 const item={number:100,created_at:BASE,pull_request:{url:'https://api.github.com/repos/andylitvinov-design/books/pulls/100',merged_at:'2026-11-05T15:15:00Z'}};
 const pr=api.validateMerge(item,ms(BASE),ms(END));
 assert.ok(pr);
 assert.equal(api.validateMerge({...item,pull_request:{...item.pull_request,merged_at:null}},ms(BASE),ms(END)),null);
 const z=api.buildBins({prs:[pr],ci:new Map(),from:ms(BASE),to:ms(END),hours:1,completeMerges:true,completeArchive:false,archiveComments:12});
 assert.equal(z.buckets.reduce((a,b)=>a+b.merged_count,0),1);
 assert.equal(z.coverage.first_ci_sample,0);
 assert.equal(z.buckets[1].first_ci.median_minutes,null);
 assert.equal(z.buckets[1].ci_to_head_upper.median_minutes,null);
});
test('front-end accepts three series only with matched bins and known sample n',()=>{
 const from=ms(BASE),step=10*60000;
 const buckets=Array.from({length:6},(_,i)=>({start:new Date(from+step*i).toISOString(),end:new Date(from+step*(i+1)).toISOString(),count:i===0?1:0,total:{median_minutes:i===0?30:null,n:i===0?1:0}}));
 const more={schema:'HH_PR_MERGE_CI_HEAD_TRENDS_V1',period_hours:1,buckets:buckets.map((b,i)=>({start:b.start,end:b.end,merged_count:b.count,first_ci:{n:i===0?1:0,median_minutes:i===0?2:null},ci_to_head_upper:{n:0,median_minutes:null}})),coverage:{merged_complete:true,archive_complete:false}};
 const raw={schema:'HH_PR_STAGE_TIMELINE_V2',period_hours:1,buckets};
 const model=ui.series(raw,more,1);
 assert.equal(model.points[0].merge,30);
 assert.equal(model.points[0].first,2);
 assert.equal(model.points[0].head,null);
 assert.throws(()=>ui.series(raw,{...more,buckets:more.buckets.slice(1)},1));
 assert.throws(()=>ui.series(raw,{...more,buckets:more.buckets.map((x,i)=>i===0?{...x,merged_count:2}:x)},1),/Несогласованные/);
});
test('no timer, dispatcher, paid API, or fabricated CI if no events',()=>{
 const dir=path.join(__dirname,'../ops/pr-monitor');
 const files=['api/pr-merge-ci-head-trends.js','pr-velocity-three-lines.js'];
 const source=files.map(p=>fs.readFileSync(path.join(dir,p),'utf8')).join('\n');
 assert.doesNotMatch(source,/setInterval\s*\(|workflow_dispatch|create[_A-Z]*Deployment|stripe|openai/i);
 assert.match(source,/HH_PR_MERGE_CI_HEAD_TRENDS_V1/);
 assert.match(source,/UPPER_BOUND_FROM_NEXT_CI_NEW_HEAD/);
});
test('a long lifetime with three distinct HEADs has a separate last-wave upper bound',()=>{
 const q=at=>Date.parse('2026-11-05T'+at+':00Z');
 const rows=[
  {head:sha1,queued:q('15:02'),created:ms(BASE)},
  {head:sha1,queued:q('15:04'),created:ms(BASE)},
  {head:sha2,queued:q('15:20'),created:ms(BASE)},
  {head:sha1,queued:q('15:25'),created:ms(BASE)},
 ];
 assert.deepEqual(api.evidence({created:ms(BASE),merged:ms(END)},rows),
   {first:2,headUpper:23,lastWaveUpper:5,headTransitions:2});
});
test('last-wave bucket preserves missing data and cannot fabricate a zero',()=>{
 const pr={number:100,created:ms(BASE),merged:ms('2026-11-05T15:15:00Z')};
 const z=api.buildBins({prs:[pr],ci:new Map(),from:ms(BASE),to:ms(END),
   hours:1,completeMerges:true,completeArchive:false,archiveComments:1});
 assert.equal(z.buckets[1].last_head_wave_upper.n,0);
 assert.equal(z.buckets[1].last_head_wave_upper.median_minutes,null);
 assert.equal(z.coverage.last_head_wave_sample,0);
});
test('last-wave UI keeps original three lines and shows only the separate bounded sample',()=>{
 const start=ms(BASE),step=10*60000;
 const buckets=Array.from({length:6},(_,i)=>({
   start:new Date(start+step*i).toISOString(),end:new Date(start+step*(i+1)).toISOString(),
   count:i===0?1:0,total:{median_minutes:i===0?33:null,n:i===0?1:0}}));
 const raw={schema:'HH_PR_STAGE_TIMELINE_V2',period_hours:1,buckets};
 const more={schema:'HH_PR_MERGE_CI_HEAD_TRENDS_V1',period_hours:1,
   buckets:buckets.map((b,i)=>({start:b.start,end:b.end,merged_count:b.count,
     first_ci:{n:i===0?1:0,median_minutes:i===0?2:null},
     ci_to_head_upper:{n:i===0?1:0,median_minutes:i===0?28:null},
     last_head_wave_upper:{n:i===0?1:0,median_minutes:i===0?5:null}})),
   coverage:{merged_complete:true,archive_complete:true}};
 const model=ui.series(raw,more,1);
 assert.equal(model.points[0].head,28);
 assert.equal(model.points[0].lastHead,5);
 assert.equal(model.points[1].lastHead,null);
 assert.throws(()=>ui.series(raw,{...more,buckets:more.buckets.map((b,i)=>i===0?
   {...b,last_head_wave_upper:{n:2,median_minutes:5}}:b)},1),/Некорректная выборка/);
});
