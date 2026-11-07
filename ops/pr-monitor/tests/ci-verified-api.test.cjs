'use strict';
const test=require('node:test');const assert=require('node:assert/strict');
const {census}=require('../api/ci-verified-load.js');
const now=Date.parse('2026-11-07T13:00:00Z');
const iso=mins=>new Date(now-mins*60000).toISOString();
test('API uses existing GitHub Actions GETs without dispatching or counting terminal jobs',async()=>{
 const touched=[];
 const job={id:21,run_id:1,name:'core',status:'completed',created_at:iso(150),started_at:iso(150),completed_at:iso(149)};
 const run={id:1,name:'HH PR core release gate',status:'in_progress',created_at:iso(200),html_url:'https://github.com/andylitvinov-design/books/actions/runs/1'};
 const request=async(url,options)=>{
   touched.push({url,options});
   let obj;
   if(url.includes('event=schedule'))obj={total_count:0,workflow_runs:[]};
   else if(url.includes('/jobs?'))obj={total_count:1,jobs:[job]};
   else if(url.includes('status=in_progress'))obj={total_count:1,workflow_runs:[run]};
   else obj={total_count:0,workflow_runs:[]};
   return {ok:true,headers:{get:()=>null},json:async()=>obj};
 };
 const result=await census(now,request);
 assert.equal(result.ci.running_jobs,0);assert.equal(result.ci.stale_workflows,1);
 assert.equal(result.coverage.complete,true);assert.equal(touched.length,8);
 assert.ok(touched.every(x=>x.options?.headers?.Accept&&x.url.startsWith('https://api.github.com/repos/andylitvinov-design/books/')));
 assert.ok(touched.every(x=>!x.options?.method||x.options.method==='GET'));
});
