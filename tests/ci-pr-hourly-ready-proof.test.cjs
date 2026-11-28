'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const {completeLatestChecks,readHourlyReadyReceipt}=require('../scripts/ci-pr-hourly-ready-proof.cjs');
test('hourly uses only exact successful current run/attempt and optional protected V3 validator',async()=>{
 const sampleSha="aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",full="andylitvinov-design/books";
 const check=(id,name,job,status="completed",conclusion="success")=>({id,name,status,conclusion,head_sha:sampleSha,app:{id:15368,slug:"github-actions"},check_suite:{id:9},details_url:`https://github.com/${full}/actions/runs/11/job/${job}`});
 const gate=check(1,'hh-merge-check',21),core=check(2,'core-lint-types-build',22);
 const checks=new Map([[gate.name,gate],[core.name,core]]);
 const jobs=[{"name":"hh-merge-check","id":21,"run_id":11,"status":"completed","conclusion":"success","check_run_url":"https://api.github.com/repos/andylitvinov-design/books/check-runs/1"},{"name":"core-lint-types-build","id":22,"run_id":11,"status":"completed","conclusion":"success","check_run_url":"https://api.github.com/repos/andylitvinov-design/books/check-runs/2"}];
 const mk=(opts={})=>({rest:{actions:{getWorkflowRun:async()=>({data:{id:11,check_suite_id:opts.badSuite?8:9,run_attempt:2}})}},request:async()=>({data:{total_count:opts.incomplete?4:jobs.length,jobs:opts.badJob?[{...jobs[0],id:77},jobs[1]]:jobs}})});
 const params={owner:'andylitvinov-design',repo:'books',pr:{head:{sha:sampleSha}},checks,target:'b'.repeat(40),verify:async({jobs,target})=>jobs.length===2?target:null};
 assert.equal(await readHourlyReadyReceipt({...params,github:mk()}),params.target);
 for(const opts of [{badSuite:true},{badJob:true},{incomplete:true}])assert.equal(await readHourlyReadyReceipt({...params,github:mk(opts)}),null);
 for(const patch of [{status:'in_progress'},{conclusion:'failure'},{head_sha:'b'.repeat(40)},{details_url:'https://example.com/a'},{check_suite:{id:8}}])assert.equal(await readHourlyReadyReceipt({...params,github:mk(),checks:new Map([[gate.name,{...gate,...patch}],[core.name,core]])}),null);
 assert.equal(await readHourlyReadyReceipt({...params,github:mk(),verify:undefined}),null);
});
test('hourly paginates complete check inventory instead of permanently holding PRs with >100 checks',async()=>{
 const rows=Array.from({length:145},(_,i)=>({id:i+1,name:'test-'+i}));
 const pg=(opts={})=>({rest:{checks:{listForRef:async({page})=>({data:{total_count:opts.moved&&page===2?146:opts.tooMany?501:145,check_runs:opts.duplicate&&page===2?[rows[0],...rows.slice(101)]:rows.slice((page-1)*100,page*100)}})}}});
 const args={owner:'o',repo:'r',sha:'a'.repeat(40)};
 assert.equal((await completeLatestChecks({...args,github:pg()})).size,145);
 for(const opts of [{moved:true},{tooMany:true},{duplicate:true}])assert.equal(await completeLatestChecks({...args,github:pg(opts)}),null);
 const workflow=require('node:fs').readFileSync('.github/workflows/hh-pr-full-inventory.yml','utf8');
 assert.ok(workflow.includes('hourlyProof.completeLatestChecks('));
 assert.ok(workflow.includes('verify:baseEvidence.verifiedMergeReadyV3'));
});
