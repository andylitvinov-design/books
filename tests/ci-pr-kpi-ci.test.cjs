'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {normalizeCoreEvidence}=require('../scripts/ci-pr-kpi-ci.cjs');
const SHA='a'.repeat(40),BASE='b'.repeat(40),AT='2026-11-01T22:30:00Z',END='2026-11-01T22:35:00Z';
const run={id:7,name:'HH PR core release gate',path:'.github/workflows/hh-pr-core-release.yml@refs/pull/8/merge',event:'pull_request',status:'completed',conclusion:'success',run_attempt:1,created_at:AT,updated_at:END,head_sha:SHA,head_branch:'fix/8',repository:{full_name:'andylitvinov-design/books'},head_repository:{full_name:'andylitvinov-design/books'},pull_requests:[{number:8,head:{sha:SHA,ref:'fix/8'},base:{sha:BASE,ref:'codex/public-book-library'}}]};
const job=name=>({run_id:7,run_attempt:1,name,status:'completed',conclusion:'success',completed_at:END});
const jobs=[job('hh-core-verified'),job('hh-specialist'),job('release-ready')];
test('only real same-run required gate jobs produce exact-head CI evidence',()=>{
 const r=normalizeCoreEvidence([run],jobs);assert.equal(r.complete,true);
 assert.deepEqual(r.events.map(x=>x.kind),['ci_first_pass','ci_green']);assert.equal(r.events[0].head,SHA);
});
test('missing, skipped, ambiguous or misassociated jobs do not become green',()=>{
 for(const [r,js] of [[run,jobs.slice(0,2)],[run,[jobs[0],{...jobs[1],conclusion:'skipped'},jobs[2]]],
  [run,[...jobs,jobs[1]]],[{...run,pull_requests:[]},jobs]]){
  const x=normalizeCoreEvidence([r],js);assert.equal(x.complete,false);assert.equal(x.events.some(e=>e.kind==='ci_green'),false);
 }
});
test('a first-attempt failure is recorded only from actual failed required jobs',()=>{
 const failed={...run,conclusion:'failure'};
 const js=[{...jobs[0],conclusion:'failure'},jobs[1],jobs[2]];
 const r=normalizeCoreEvidence([failed],js);assert.equal(r.complete,true);
 assert.deepEqual(r.events.map(x=>x.kind),['ci_first_failure']);
});
test('synthetic merge SHA needs verified ordered parents',()=>{
 const synthetic={...run,head_sha:'f'.repeat(40)};
 assert.equal(normalizeCoreEvidence([synthetic],jobs).complete,false);
 const r=normalizeCoreEvidence([synthetic],jobs,{7:[BASE,SHA]});assert.equal(r.complete,true);
 assert.equal(normalizeCoreEvidence([synthetic],jobs,{7:[SHA,BASE]}).complete,false);
});

test('a failing or pending non-gate job prevents a false first-pass success',()=>{
 const failed={...run,conclusion:'failure'};
 const js=[...jobs,{run_id:7,run_attempt:1,name:'other required',status:'completed',conclusion:'failure',completed_at:END}];
 const r=normalizeCoreEvidence([failed],js);assert.deepEqual(r.events.map(e=>e.kind),['ci_first_failure']);
 const pending=[...jobs,{run_id:7,run_attempt:1,name:'other required',status:'in_progress',conclusion:null}];
 assert.equal(normalizeCoreEvidence([{...run,status:'in_progress',conclusion:null}],pending).events.some(e=>e.kind==='ci_first_pass'),false);
});
