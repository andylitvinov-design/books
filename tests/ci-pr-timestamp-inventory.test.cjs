'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {capture,rows,decode,FLAGS}=require('../scripts/ci-pr-timestamp-inventory.cjs');
const sha=n=>String(n).repeat(40);
const at='2026-11-04T18:00:00Z';
const pr=(n,patch={})=>({number:n,state:'open',head:{sha:sha(n)},
 base:{ref:'codex/public-book-library'},draft:false,
 created_at:'2026-10-30T14:05:01Z',updated_at:'2026-11-04T17:55:01Z',labels:[],...patch});
test('all open PR receive exact GitHub metadata and separately labelled observations',()=>{
 const data=capture({prs:[pr(1),pr(2,{draft:true,labels:[{name:'hh:conflict-repair-needed'}]})],
  observedAt:at,totalExpected:2,productionExpected:2});
 assert.equal(data.total,2);assert.equal(data.counts.created_exact,2);
 assert.equal(data.counts.updated_exact,2);assert.equal(data.counts.head_exact,2);
 assert.equal(data.counts.ready,1);assert.equal(data.counts.draft,1);
 assert.equal(data.counts.conflict_hint_now,1);
 assert.equal(data.event_time_coverage,'NOT_ASSESSED_FROM_PR_LIST');
 const first=decode(rows(data).get(1));
 assert.equal(first.created_at,'2026-10-30T14:05:01.000Z');
 assert.equal(first.first_observed_at.ready,at.replace('Z','.000Z'));
 assert.equal(first.first_observed_at.triage,null);
 assert.equal(rows(data).size,2);
});
test('same HEAD preserves first-observed timestamp; cleared label is not erased',()=>{
 const first=capture({prs:[pr(1,{labels:[{name:'hh:merge-stage:inspect'}]})],observedAt:at});
 const second=capture({prs:[pr(1)],observedAt:'2026-11-04T18:10:00Z',previous:first});
 assert.equal(decode(rows(second).get(1)).first_observed_at.triage,at.replace('Z','.000Z'));
 assert.equal(rows(second).get(1)[6]&FLAGS.triage,0,'current label is no longer present');
});
test('new HEAD has a new observation clock but original GitHub creation time',()=>{
 const first=capture({prs:[pr(1)],observedAt:at});
 const updated=capture({prs:[pr(1,{head:{sha:'a'.repeat(40)}})],
  observedAt:'2026-11-04T18:10:00Z',previous:first});
 assert.equal(updated.counts.head_changed,1);
 assert.equal(decode(rows(updated).get(1)).created_at,decode(rows(first).get(1)).created_at);
 assert.notEqual(decode(rows(updated).get(1)).current_head_first_observed_at,
  decode(rows(first).get(1)).current_head_first_observed_at);
});
test('reject partial, duplicate, stale or contradictory inventories',()=>{
 assert.throws(()=>capture({prs:[pr(1),pr(1)],observedAt:at}),/PR_METADATA_UNVERIFIED/);
 assert.throws(()=>capture({prs:[pr(1)],observedAt:at,totalExpected:2}),/PR_COUNT_DRIFT/);
 assert.throws(()=>capture({prs:[pr(1)],observedAt:at,productionExpected:0}),/PRODUCTION_PR_COUNT_DRIFT/);
 assert.throws(()=>capture({prs:[pr(1,{created_at:null})],observedAt:at}),/PR_METADATA_UNVERIFIED/);
 const prior=capture({prs:[pr(1)],observedAt:at});
 assert.throws(()=>capture({prs:[pr(1)],observedAt:'2026-11-04T17:59:00Z',previous:prior}),/STALE_TIMESTAMP_SNAPSHOT/);
});
test('no new network calls, schedules or CI runner side effects',()=>{
 const fs=require('node:fs'),path=require('node:path');
 const s=fs.readFileSync(path.join(__dirname,'../scripts/ci-pr-timestamp-inventory.cjs'),'utf8');
 assert.doesNotMatch(s,/\bfetch\s*\(|setInterval\s*\(|createWorkflowDispatch|workflow_dispatch|github\.rest\./);
});
