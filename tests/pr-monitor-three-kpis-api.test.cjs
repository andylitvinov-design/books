'use strict';
const test=require('node:test'),assert=require('node:assert/strict');
const model=require('../ops/pr-monitor/pr-three-kpi-model.cjs');
const source=require('node:fs').readFileSync(
 require('node:path').join(__dirname,'../ops/pr-monitor/api/pr-three-kpis.js'),'utf8');
const at=new Date(Date.now()-120000).toISOString(),before=new Date(Date.now()-360000).toISOString();
const head='a'.repeat(40);
function job(n,name,conclusion){
 return {id:n,name,conclusion,queued_at:before,started_at:before,completed_at:at,
  url:'https://github.com/andylitvinov-design/books/actions/runs/10/job/'+n};
}
function issueShard(){
 const bucket='2026-11-04T18-failure';
 const run={pr:101,run_id:101,attempt:1,source_head:head,
  base:'codex/public-book-library',queued_at:before,completed_at:at,
  conclusion:'failure',partial_jobs:false,jobs:[
   job(1,'core-lint-types-build','failure'),job(2,'hh-specialist','success'),
   job(3,'hh-merge-check','failure')
  ]};
 return [{user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  body:'<!-- HH_CORE_CI_JOURNEY_SHARD_V1:'+bucket+' -->\n'+JSON.stringify({
   schema:'HH_CORE_CI_JOURNEY_SHARD_V1',bucket,runs:[run]})}];
}
function response(obj){
 return {ok:true,status:200,headers:{get:k=>k==='x-ratelimit-remaining'?'4500':null},
  json:async()=>obj};
}
function fakeRes(){
 const r={statusCode:200,payload:null,setHeader(){return this;},
  end(s){this.payload=JSON.parse(s);return this;}};
 return r;
}
test('normal GET uses existing archive only, with historical not fabricated',async()=>{
 const old=global.fetch,paths=[];
 try{
  global.fetch=async uri=>{paths.push(uri);return response(issueShard());};
  const handler=require('../ops/pr-monitor/api/pr-three-kpis.js');
  const res=fakeRes();await handler({method:'GET',query:{}},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.payload.schema,model.SCHEMA);
  assert.equal(res.payload.windows.two_weeks_ago.ci_first_pass.percent_observed,null);
  assert.equal(res.payload.windows.two_weeks_ago.error_to_repair.mean_min,null);
  assert.equal(res.payload.windows.last_24h.error_to_repair.mean_min,null);
  assert.equal(res.payload.coverage.repair_read_budget,0);
  assert.equal(paths.length,1,'one GET only, no extra per-PR reads by default');
  assert.match(paths[0],/\/issues\/3419\/comments/);
 }finally{global.fetch=old;}
});
test('bounded GitHub merge read joins saved green Core with later real merge',async()=>{
 const old=global.fetch,paths=[];
 const created=new Date(Date.now()-7200000).toISOString();
 const merged=new Date(Date.now()-60000).toISOString();
 const close={number:102,state:'closed',created_at:created,merged_at:merged,
  updated_at:merged,merge_commit_sha:'b'.repeat(40),
  base:{ref:'codex/public-book-library'},head:{sha:head}};
 const success={pr:102,run_id:102,attempt:1,source_head:head,
  base:'codex/public-book-library',queued_at:before,completed_at:at,
  pr_created_at:created,conclusion:'success',partial_jobs:false,current_head:true,
  merged_at:null,jobs:[job(21,'core-lint-types-build','success'),
    job(22,'hh-specialist','success'),job(23,'hh-merge-check','success')]};
 const bucket='2026-11-04T18-success';
 const shards=[{user:{id:41898282,login:'github-actions[bot]',type:'Bot'},
  performed_via_github_app:{id:15368,slug:'github-actions'},
  body:'<!-- HH_CORE_CI_JOURNEY_SHARD_V1:'+bucket+' -->\n'+JSON.stringify({
   schema:'HH_CORE_CI_JOURNEY_SHARD_V1',bucket,runs:[success]})}];
 try{
  global.fetch=async uri=>{
   paths.push(uri);
   if(uri.includes('/issues/3419/comments'))return response(shards);
   if(uri.includes('/pulls?state=closed'))return response([close]);
   throw Error('UNEXPECTED_ENDPOINT');
  };
  delete require.cache[require.resolve('../ops/pr-monitor/api/pr-three-kpis.js')];
  const h=require('../ops/pr-monitor/api/pr-three-kpis.js'),res=fakeRes();
  await h({method:'GET',query:{}},res);
  assert.equal(res.statusCode,200);
  assert.equal(res.payload.windows.last_24h.green_to_merge.n,1);
  assert.equal(res.payload.windows.last_24h.green_to_merge.exact_head_merge_proofs,1);
  assert.equal(res.payload.coverage.merge_lookup.status,'COMPLETE_LATEST_25H');
  assert.equal(paths.length,2,'cached bounded issue read and one PR page');
  assert.ok(paths[1].includes('/pulls?state=closed'));
 }finally{global.fetch=old;}
});
test('POST never calls GitHub or starts CI',async()=>{
 const old=global.fetch;let reads=0;
 try{
  global.fetch=async()=>{reads++;throw Error('NEVER');};
  const h=require('../ops/pr-monitor/api/pr-three-kpis.js');
  const res=fakeRes();await h({method:'POST',query:{}},res);
  assert.equal(res.statusCode,405);assert.equal(reads,0);
 }finally{global.fetch=old;}
});
test('new endpoint has bounded page/read limits, never launches a runner',()=>{
 assert.match(source,/MAX_PAGES=4,MAX_REPAIR_PR_READS=5/);
 assert.doesNotMatch(source,/workflow_dispatch|createWorkflowDispatch|setInterval\s*\(/);
});
