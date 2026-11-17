'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const {census}=require('../api/ci-verified-load.js');

test('read-only load samples real oldest queued page with exactly one extra GET',async()=>{
 const now=Date.parse('2026-11-17T17:00:00Z');
 const base='https://github.com/andylitvinov-design/books/actions/runs/';
 const freshId=id=>({
   id,name:'HH PR core release gate',event:'pull_request',
   status:'queued',created_at:'2026-11-17T16:56:00Z',
   html_url:base+id
 });
 const staleId=id=>({
   ...freshId(id),created_at:'2026-11-11T20:27:54Z',
   updated_at:'2026-11-11T20:27:54Z'
 });
 const first=Array.from({length:100},(_,i)=>freshId(200-i));
 const tail=[staleId(100),staleId(99),staleId(98)];
 const urls=[];
 const result=await census(now,async url=>{
   urls.push(url);
   let body;
   if(url.includes('status=queued&per_page=100&page=2'))
     body={total_count:103,workflow_runs:tail};
   else if(url.includes('status=queued&per_page=100'))
     body={total_count:103,workflow_runs:first};
   else if(url.includes('/actions/runs?status='))
     body={total_count:0,workflow_runs:[]};
   else if(url.includes('/jobs?'))
     body={total_count:0,jobs:[]};
   else
     body={total_count:0,workflow_runs:[]};
   return {ok:true,headers:{get:()=>null},json:async()=>body};
 });
 assert.equal(urls.filter(u=>u.includes('status=queued&per_page=100&page=2')).length,1);
 assert.equal(result.coverage.oldest_queued_page,'VERIFIED_LAST_PAGE');
 assert.equal(result.coverage.oldest_queued_run_candidates,3);
 assert.equal(result.stale.some(r=>r.id===98&&r.reason==='QUEUED_WORKFLOW_WITHOUT_JOBS'),true);
 assert.equal(result.ci.running_jobs,0);
 assert.equal(result.ci.queued_jobs,0);
 assert.equal(result.coverage.complete,false,'uninspected middle pages never become complete');
 assert.equal(result.source.kind,'BOUNDED_GITHUB_ACTIONS_READ_ONLY');
 assert.equal(urls.length<=result.coverage.limit+8,true,'bounded API quota remains unchanged except one read');
});
