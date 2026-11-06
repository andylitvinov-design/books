'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {read,parseCount,summarize}=require('../ops/pr-monitor/ci-queue-backup.js');
const NOW=Date.parse('2026-11-06T23:00:00Z');
const payload=(status,names,extra=0)=>({total_count:names.length+extra,
 workflow_runs:names.map((name,i)=>({id:100+i,name,status}))});
test('real 7 in progress includes non-CI, but monitor counts only recognizable CI',()=>{
 const result=parseCount(payload('in_progress',[
  'HH PR core release gate','Holistic Support mandala release checks',
  'HH zero-cost PR CI worker','HH PR 10-minute watchdog',
  'HH native auto-merge','HH PR core release gate','Unrelated Workflow']),
  'in_progress');
 assert.equal(result.count,3);
 assert.equal(result.complete,true);
});
test('queued native auto-merge is not counted as CI',()=>{
 assert.equal(parseCount(payload('queued',['HH native auto-merge']),'queued').count,0);
 assert.equal(parseCount(payload('queued',['HH Specialist Tests']),'queued').count,1);
});
test('pagination-incomplete census is explicitly partial',()=>{
 const p=payload('queued',['HH Specialist Tests'],120);
 assert.equal(parseCount(p,'queued').count,1);
 assert.equal(parseCount(p,'queued').complete,false);
});
test('malformed API responses and missing workflow identity fail closed',()=>{
 assert.throws(()=>parseCount({total_count:-1,workflow_runs:[]},'queued'));
 assert.throws(()=>parseCount({total_count:0,workflow_runs:[{}]},'queued'));
 assert.throws(()=>parseCount({total_count:1,workflow_runs:[{}]},'queued'));
});
test('all five status GETs remain read-only; filtered counters are lower bounds',async()=>{
 const calls=[];
 const data=await read(async url=>{
  calls.push(url);
  const status=new URL(url).searchParams.get('status');
  const names=status==='in_progress'?
   ['HH PR core release gate','HH zero-cost PR CI worker','HH PR 10-minute watchdog']:
   status==='queued'?['HH native auto-merge']:[];
  return {ok:true,json:async()=>payload(status,names)};
 },NOW);
 assert.equal(calls.length,5);
 assert.ok(calls.every(x=>x.includes('per_page=100')));
 assert.equal(data.running,1);assert.equal(data.queued,0);
 assert.equal(data.queue_complete,true);assert.equal(data.lower_bound,true);
});
test('HTTP errors cannot invent a zero and do not schedule CI',async()=>{
 await assert.rejects(()=>read(async()=>({ok:false,status:503}),NOW+120000));
 const src=fs.readFileSync(path.join(__dirname,'../ops/pr-monitor/ci-queue-backup.js'),'utf8');
 assert.doesNotMatch(src,/setInterval\s*\(|workflow_dispatch|Authorization|GITHUB_TOKEN/);
});
test('mobile row, boot order, and backend scope remain intact',()=>{
 const dir=path.join(__dirname,'../ops/pr-monitor');
 const css=fs.readFileSync(path.join(dir,'gpt-agent-counter.css'),'utf8');
 const gpt=fs.readFileSync(path.join(dir,'gpt-agent-counter.js'),'utf8');
 const boot=fs.readFileSync(path.join(dir,'pr-two-screen-boot.js'),'utf8');
 const screen=fs.readFileSync(path.join(dir,'pr-two-screen.js'),'utf8');
 const html=fs.readFileSync(path.join(dir,'index.html'),'utf8');
 assert.match(css,/repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(gpt,/target\.append\(el\)/);
 assert.match(gpt,/Обычные чаты и Work не учтены/);
 assert.ok(boot.indexOf('ci-queue-backup.js')<boot.indexOf('pr-two-screen.js'));
 assert.match(screen,/Watchdog\/AutoMerge исключены/);
 assert.match(screen,/return '≥'\+String\(queueFallback\.running\)/);
 assert.match(html,/20261106-ci-filter-v2/);
});
