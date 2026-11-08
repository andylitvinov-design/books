import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {verifyPmSourceReceipts,signedCandidateSha} from '../lib/project-management/source-receipts.mjs';

const req='9d3948d6-1648-46be-bce2-7c2854ed9ed5';
const previous='a'.repeat(40),next='b'.repeat(40),taskKey='1'.repeat(32);
const prNo=3857,watchdog=42404011048,worker=42404038363;
const pr={number:prNo,base:{ref:'codex/public-book-library'},
 head:{sha:next,repo:{full_name:'andylitvinov-design/books'}}};
function comment(extra,{app=15368,time='2026-11-07T19:00:15Z',user='github-actions[bot]'}={}){
 const record={schema:'HH_PR_TASK_V1',task_key:taskKey,pr_number:prNo,head_sha:previous,...extra};
 return {user:{login:user,type:'Bot'},performed_via_github_app:{id:app},
  created_at:time,body:'<!-- HH_PR_TASK_V1 -->\n```json\n'+JSON.stringify(record)+'\n```'};
}
const reserve=comment({state:'RESERVED',owner_run_id:String(watchdog)});
const claim=comment({state:'CLAIMED',owner_run_id:String(worker)});
const runner=comment({state:'RUNNER_STARTED',owner_run_id:String(worker),
 source_published:false,outcome:'VERIFIED_REAL_RUNNER_NOT_SOURCE_FIX',
 runner:{run_id:worker,job_id:128497805163,runner_id:1000173880,
  runner_name:'GitHub Actions',started_at:'2026-11-07T19:00:15Z'}});
const prepared=comment({state:'PREPARED',owner_run_id:String(worker),
 source_published:false,reason_code:'LEGACY_CLOUD_PREFLIGHT_NO_SOURCE_WRITE'});
const published=comment({state:'PUBLISHED',owner_run_id:String(worker),
 source_published:true,outcome:'VERIFIED_SOURCE_COMMIT',new_sha:next,
 commit_url:'https://github.com/andylitvinov-design/books/commit/'+next});
const base={pr,watchdogRunId:watchdog,requestId:req,expectedHeadSha:previous,
 requestedAt:'2026-11-07T19:00:00Z'};
test('verified runner reservation does not mean source was published',()=>{
 const result=verifyPmSourceReceipts({...base,comments:[reserve,claim,runner]});
 assert.equal(result.status,'RUNNER_CONFIRMED_NO_SOURCE');
 assert.equal(result.workerRun,worker);
 assert.equal(result.sourcePublished,false);
 assert.equal(result.codingAgentVerified,false);
 assert.equal(result.commitSha,null);
});
test('signed read-only preflight is a known NO SOURCE result, not success',()=>{
 const result=verifyPmSourceReceipts({...base,comments:[reserve,claim,runner,prepared]});
 assert.equal(result.status,'READ_ONLY_PREFLIGHT_NO_SOURCE');
 assert.equal(result.reason,'LEGACY_CLOUD_PREFLIGHT_NO_SOURCE_WRITE');
 assert.equal(result.sourcePublished,false);
});
test('source publication requires trusted bot lineage AND independent commit parent',()=>{
 const comments=[reserve,claim,runner,published];
 assert.equal(signedCandidateSha({...base,comments}),next);
 assert.equal(verifyPmSourceReceipts({...base,comments}).status,'SOURCE_COMMIT_UNCONFIRMED');
 assert.equal(verifyPmSourceReceipts({...base,comments,commit:{sha:next,parents:[]}}).sourcePublished,false);
 const result=verifyPmSourceReceipts({...base,comments,
  commit:{sha:next,parents:[{sha:previous}]}});
 assert.equal(result.status,'SOURCE_COMMIT_VERIFIED');
 assert.equal(result.commitSha,next);
 assert.equal(result.sourcePublished,true);
 assert.equal(result.codingAgentVerified,false);
});
test('bot/app forgery, wrong watchdog, request, old timing, task key and PR never pass',()=>{
 const comments=[reserve,claim,runner,published],mutations=[
  {...base,comments:comments.map(x=>({...x,performed_via_github_app:{id:999}}))},
  {...base,comments:comments.map(x=>({...x,user:{login:'random',type:'Bot'}}))},
  {...base,comments:comments.map(x=>({...x,created_at:'2026-11-07T18:00:00Z'}))},
  {...base,comments,watchdogRunId:watchdog+1},
  {...base,comments,requestId:'bad'},
  {...base,comments,expectedHeadSha:next},
  {...base,comments,pr:{...pr,number:prNo+1}},
  {...base,comments,pr:{...pr,base:{ref:'codex/bootstrap-books'}}}
 ];
 for(const args of mutations){
  const result=verifyPmSourceReceipts({...args,commit:{sha:next,parents:[{sha:previous}]}});
  assert.equal(result.sourcePublished,false);
 }
});
test('no signed runner, incomplete timeline or bad copied URL cannot make source success',()=>{
 const withoutRunner=[reserve,claim,published];
 assert.equal(verifyPmSourceReceipts({...base,comments:withoutRunner}).status,'WORKER_CLAIMED');
 const bad=comment({state:'PUBLISHED',owner_run_id:String(worker),source_published:true,
  outcome:'VERIFIED_SOURCE_COMMIT',new_sha:next,commit_url:'https://evil.example/'+next});
 assert.equal(verifyPmSourceReceipts({...base,comments:[reserve,claim,runner,bad],
  commit:{sha:next,parents:[{sha:previous}]}}).sourcePublished,false);
 assert.equal(signedCandidateSha({...base,comments:[reserve,claim,runner,bad]}),null);
});
test('owner API fetches only bounded public source metadata and displays proof without fake LIVE',()=>{
 const route=readFileSync(new URL('../app/api/admin/project-management/route.js',import.meta.url),'utf8');
 const ui=readFileSync(new URL('../app/admin/project-management/project-management-client.jsx',import.meta.url),'utf8');
 const css=readFileSync(new URL('../app/admin/project-management/project-management.module.css',import.meta.url),'utf8');
 assert.match(route,/ownerMaterialRequest/);
 assert.match(route,/comments\.length!==pr\.comments/);
 assert.match(route,/Promise\.all\(\[sourceReadback\(\),deliveryReadback\]\)/);
 assert.ok(route.includes("githubRead('issues/'+task.pr_number+'/comments?per_page=100')"));
 assert.match(route,/signedCandidateSha\(args\)/);
 assert.match(route,/verifyPmSourceReceipts\(\{\.\.\.args,commit\}\)/);
 assert.doesNotMatch(route,/sourceReceipt\?\.sourcePublished\s*\?\s*\x27completed_live/);
 assert.match(ui,/SOURCE_COMMIT_VERIFIED/);
 assert.match(ui,/sourceReceipt\.commitUrl/);
 assert.match(ui,/t\.watchdogOnly/);
 assert.match(css,/\.sourceProof\{/);
});
