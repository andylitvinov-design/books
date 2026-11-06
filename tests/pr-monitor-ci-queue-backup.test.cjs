'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {read,parseCount,summarize}=require('../ops/pr-monitor/ci-queue-backup.js');
const NOW=Date.parse('2026-11-06T22:53:00Z');
test('all workflow statuses give 14 running and one waiting',()=>{
 const x=summarize({in_progress:14,queued:1,pending:0,waiting:0,requested:0},NOW);
 assert.equal(x.running,14);assert.equal(x.queued,1);assert.equal(x.queue_complete,true);
});
test('a missing waiting status is a lower bound, not an exact zero',()=>{
 const x=summarize({in_progress:0,queued:0,pending:null,waiting:0,requested:0},NOW);
 assert.equal(x.queued,0);assert.equal(x.queue_complete,false);
});
test('bad GitHub counts fail closed',()=>{
 assert.equal(parseCount({total_count:2,workflow_runs:[{}]}),2);
 assert.throws(()=>parseCount({total_count:-1,workflow_runs:[]}));
 assert.throws(()=>parseCount({total_count:0,workflow_runs:[{}]}));
});
test('failed primary can be rescued by only five public GETs',async()=>{
 const calls=[];
 const sample=await read(async url=>{
  calls.push(url);const s=new URL(url).searchParams.get('status');
  return {ok:true,json:async()=>({total_count:s==='in_progress'?14:s==='queued'?1:0,workflow_runs:[]})};
 },NOW);
 assert.equal(calls.length,5);assert.equal(sample.running,14);
 assert.equal(sample.queued,1);assert.equal(sample.queue_complete,true);
});
test('no public status responses never invent zero',async()=>{
 await assert.rejects(()=>read(async()=>({ok:false,status:503}),NOW+120000));
});
test('layout, script order and privacy scope',()=>{
 const dir=path.join(__dirname,'../ops/pr-monitor');
 const css=fs.readFileSync(path.join(dir,'gpt-agent-counter.css'),'utf8');
 const gpt=fs.readFileSync(path.join(dir,'gpt-agent-counter.js'),'utf8');
 const boot=fs.readFileSync(path.join(dir,'pr-two-screen-boot.js'),'utf8');
 const backup=fs.readFileSync(path.join(dir,'ci-queue-backup.js'),'utf8');
 assert.match(css,/repeat\(3,minmax\(0,1fr\)\)/);
 assert.match(gpt,/target\.append\(el\)/);assert.match(gpt,/Обычные чаты и Work не учтены/);
 assert.ok(boot.indexOf('ci-queue-backup.js')<boot.indexOf('pr-two-screen.js'));
 assert.doesNotMatch(backup,/setInterval\s*\(|workflow_dispatch|Authorization|GITHUB_TOKEN/);
});
