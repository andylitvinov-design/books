'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {summarizePR,report,waveDetail}=require('../api/ci-journey-summary.js')._test;
const one='a'.repeat(40),two='b'.repeat(40);
const time=s=>'2026-11-06T'+s+':00Z';
const url=id=>'https://github.com/andylitvinov-design/books/actions/runs/'+id;
function run(id,head,queued,started,completed,conclusion){
 return {pr:27,run_id:id,source_head:head,queued_at:time(queued),completed_at:time(completed),
  conclusion,base:'codex/public-book-library',attempt:1,workflow_url:url(id),jobs:[{
   id:id*10,name:'core-lint-types-build',queued_at:time(queued),started_at:time(started),
   completed_at:time(completed),url:url(id)+'/job/'+(id*10)}]};
}
const series=[run(1,one,'10:00','10:01','10:05','success'),
 run(2,two,'10:10','10:11','10:15','failure'),
 run(3,two,'10:20','10:21','10:25','success')];
const now=Date.parse(time('10:30'));
test('one entry per real gap: changed HEAD, same HEAD, evidence and failure flag',()=>{
 const row=summarizePR(27,series);
 assert.equal(row.wave_rows.length,2);
 assert.deepEqual(row.wave_rows.map(x=>x.kind),['new_head','same_head']);
 assert.deepEqual(row.wave_rows.map(x=>x.duration_ms),[300000,300000]);
 assert.deepEqual(row.wave_rows.map(x=>x.after_failure),[false,true]);
 assert.ok(row.wave_rows.every(x=>x.actor_verified===false));
 assert.equal(row.wave_head_evidence.new_head_count,1);
 assert.equal(row.wave_head_evidence.same_head_count,1);
 assert.equal(row.stages_ms.between_waves_unknown,600000);
});
test('compact overview and complete user-invoked wave details',()=>{
 const store={runs:series,pagination_partial:true,comments:1,remaining:300,stale:false,fetched_at:time('10:30')};
 assert.equal(report(store,24,now).rows[0].wave_rows,undefined);
 const detail=waveDetail(store,27,24,now);
 assert.equal(detail.total_waves,2);
 assert.equal(detail.pagination_partial,true);
 assert.equal(detail.history_complete,false);
 assert.equal(waveDetail(store,27,1,now+86400000).available,false);
});
test('overlapping repeated Core is not a gap',()=>{
 const row=summarizePR(27,[...series,run(4,two,'10:24','10:25','10:30','success')]);
 assert.equal(row.wave_rows.length,2);
 assert.equal(row.stages_ms.between_waves_unknown,600000);
});
