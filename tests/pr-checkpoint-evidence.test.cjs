'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const {summarizeCheckpoints,MERGE_MILESTONES}=require('../ops/pr-monitor/pr-checkpoint-evidence.cjs');
const at='2026-11-04T19:36:10.000Z';
const row=(key,evidence='NOT_RECORDED')=>({key,evidence,at:evidence==='GITHUB_VERIFIED_EVENT'?at:null,url:null});
const rows=()=>[
 ...MERGE_MILESTONES.map(k=>row(k,'GITHUB_VERIFIED_EVENT')),
 row('ready','GITHUB_VERIFIED_EVENT'),row('triage'),row('claimed'),
 row('ci_failed'),row('repair_started'),row('source_published'),
 row('conflict_detected'),row('conflict_label_cleared'),row('repeat_ci_queued'),
 row('deployment_ready'),row('live_verified')
];
test('successful first CI has 6/6 merge milestones and conditional N/A, not 7/17',()=>{
 const x=summarizeCheckpoints(rows(),{merged:true,historyPartial:false,failures:0,repeats:0,conflictSeen:false});
 assert.equal(x.coverage.total,6);assert.equal(x.coverage.observed,6);
 assert.deepEqual(x.coverage.missing,[]);
 assert.equal(x.coverage.all_checkpoint_opportunities,17);
 assert.deepEqual([...x.coverage.conditional_not_applicable].sort(),
  ['ci_failed','repair_started','source_published','conflict_detected','conflict_label_cleared','repeat_ci_queued'].sort());
 assert.deepEqual(x.coverage.conditional_unverified,['triage','claimed']);
 assert.equal(x.coverage.merge_boundary_chain_verified,true);
 assert.equal(x.coverage.full_history_confirmed,true);
 assert.equal(x.coverage.delivery.independently_live_verified,false);
 assert.deepEqual(x.coverage.delivery.missing,['deployment_ready','live_verified']);
});
test('partial history does not invent absence of repair or conflict',()=>{
 const x=summarizeCheckpoints(rows(),{merged:true,historyPartial:true,failures:0,repeats:0,conflictSeen:false});
 assert.equal(x.coverage.observed,6);
 assert.deepEqual(x.coverage.conditional_not_applicable,[]);
 assert.equal(x.coverage.merge_boundary_chain_verified,true);
 assert.equal(x.coverage.full_history_confirmed,false);
 assert.equal(x.checkpoints.find(r=>r.key==='repair_started').evidence,'NOT_RECORDED');
});
test('missing mandatory runner event cannot become zero or complete',()=>{
 const r=rows();r.find(x=>x.key==='runner_started').at=null;
 r.find(x=>x.key==='runner_started').evidence='NOT_RECORDED';
 const x=summarizeCheckpoints(r,{merged:true,historyPartial:false,failures:1,repeats:1,conflictSeen:true});
 assert.equal(x.coverage.observed,5);
 assert.deepEqual(x.coverage.missing,['runner_started']);
 assert.equal(x.coverage.full_history_confirmed,false);
 assert.equal(x.coverage.conditional_not_applicable.length,0);
});
test('confirmed LIVE is separate from merge chain and READY timestamp',()=>{
 const r=rows();const l=r.find(x=>x.key==='live_verified');
 l.at=at;l.evidence='GITHUB_VERIFIED_EVENT';
 const x=summarizeCheckpoints(r,{merged:true,historyPartial:false,failures:0,repeats:0,conflictSeen:false});
 assert.deepEqual(x.coverage.delivery.missing,['deployment_ready']);
 assert.equal(x.coverage.delivery.independently_live_verified,true);
});
test('open PR cannot be labeled completed Created to Merged',()=>{
 const x=summarizeCheckpoints(rows(),{merged:false,historyPartial:false,failures:0,repeats:0,conflictSeen:false});
 assert.equal(x.coverage.merge_boundary_chain_verified,false);
});
test('duplicate rows are rejected and no timers or network',()=>{
 assert.throws(()=>summarizeCheckpoints([row('created'),row('created')]),/DUPLICATE/);
 const fs=require('node:fs');const src=fs.readFileSync(require.resolve('../ops/pr-monitor/pr-checkpoint-evidence.cjs'),'utf8');
 assert.doesNotMatch(src,/\bfetch\s*\(|\bsetInterval\s*\(|https:\/\/api/);
});
