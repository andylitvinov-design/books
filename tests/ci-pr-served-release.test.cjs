'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const {verifyServedRevision}=require('../scripts/ci-pr-served-release.cjs');
const {run}=require('../scripts/ci-pr-release-outcomes.cjs');
const sha='a'.repeat(40), head='b'.repeat(40), prMerge='c'.repeat(40);
const id='dpl_6fNgUY64EQdmMK9baHvgxc7K32oU';
const context={repo:{owner:'andylitvinov-design',repo:'books'},
 ref:'refs/heads/codex/bootstrap-books',eventName:'schedule'};
const proof={schema:'HH_PUBLIC_RELEASE_EVIDENCE_V1',available:true,sha,
 deployment_id:id,project_id:'prj_4jAwcx6lrKyUKZ3R9vgC5xwwyC0b',
 environment:'production',branch:'codex/public-book-library',
 repo:'andylitvinov-design/books'};
const status={context:'Vercel',state:'success',
 target_url:'https://vercel.com/super10/codex-public-book-library/6fNgUY64EQdmMK9baHvgxc7K32oU',
 updated_at:'2026-11-02T04:00:00Z'};
const core=()=>({info(){},summary:{addHeading(){return this},addCodeBlock(){return this},async write(){}}});
function fixtures({replace={},ancestry='ahead',statusState='success',siteStatus=200}={}){
 const read=[];
 const api={rest:{repos:{
  getBranch:async()=>({data:{protected:true,commit:{sha:head}}}),
  getCombinedStatusForRef:async({ref})=>({data:{total_count:ref===sha?1:0,
   statuses:ref===sha?[{...status,state:statusState}]:[]}}),
  compareCommits:async({base})=>({data:{status:ancestry,merge_base_commit:{sha:base}}})
 },pulls:{list:async()=>({data:[]})},
 actions:{listWorkflowRuns:async()=>({data:{total_count:0,workflow_runs:[]}})}}};
 const fetchImpl=async url=>{
  read.push(url);
  if(url.includes('release-evidence'))return {status:200,
   url:'https://holistichouse.vercel.app/api/public/release-evidence',
   headers:{get:()=> 'application/json'},json:async()=>({...proof,...replace})};
  return {status:siteStatus,url:'https://holistichouse.vercel.app/en',
   headers:{get:()=> 'text/html; charset=utf-8'},
   text:async()=> '<html><body>verified</body></html>'};
 };
 return {github:api,fetchImpl,read};
}
test('canonical site can independently prove an older deployment with HEAD ahead',async()=>{
 const f=fixtures();const r=await verifyServedRevision({github:f.github,context,fetchImpl:f.fetchImpl});
 assert.equal(r.verified_live,true);
 assert.equal(r.production_sha,sha);
 assert.equal(r.current_head_sha,head);
 assert.equal(r.reason,'SERVING_VERIFIED_REVISION');
 assert.equal(f.read.length,2);
});
test('wrong project, preview, SHA, alias response or Vercel status never confirms LIVE',async()=>{
 for(const changed of [{project_id:'other'}, {environment:'preview'},
  {sha:'d'.repeat(40)},{deployment_id:'dpl_other'}]){
  const f=fixtures({replace:changed});const r=await verifyServedRevision({github:f.github,context,fetchImpl:f.fetchImpl});
  assert.equal(r.verified_live,false,JSON.stringify(changed));
 }
 for(const opt of [{statusState:'failure'}, {siteStatus:503}, {ancestry:'diverged'}]){
  const f=fixtures(opt);const r=await verifyServedRevision({github:f.github,context,fetchImpl:f.fetchImpl});
  assert.equal(r.verified_live,false,JSON.stringify(opt));
 }
});
test('untrusted repo/ref never queries public or GitHub data',async()=>{
 const f=fixtures();const r=await verifyServedRevision({github:f.github,
  context:{...context,ref:'refs/heads/fork'},fetchImpl:f.fetchImpl});
 assert.equal(r.verified_live,false);assert.equal(f.read.length,0);
});
test('served revision counts only the merged PR ancestry already on the site',async()=>{
 const f=fixtures();
 f.github.rest.pulls.list=async()=>({data:[{number:3070,
  base:{ref:'codex/public-book-library'},
  merge_commit_sha:prMerge,created_at:'2026-11-01T02:00:00Z',
  merged_at:'2026-11-02T04:00:00Z',updated_at:'2026-11-02T04:00:00Z'}]});
 const original=f.github.rest.repos.compareCommits;
 f.github.rest.repos.compareCommits=async ({base,...others})=>({data:{
  status:'ahead',merge_base_commit:{sha:base===sha?sha:prMerge}}});
 const r=await run({github:f.github,core:core(),context,
  now:Date.parse('2026-11-02T05:00:00Z'),
  liveEvidence:{verified_live:false,reason:'VERCEL_GITHUB_STATUS_UNVERIFIED'},
  fetchImpl:f.fetchImpl});
 assert.equal(r.merged_count,1);
 assert.equal(r.live_confirmed_count,1);
 assert.equal(r.served_sha,sha);
 assert.equal(r.current_head_sha,head);
 assert.equal(r.live_coverage,'complete_served_revision');
 assert.equal(r.receipt_candidate.verified_live,true);
 assert.equal(r.receipt_candidate.production_sha,sha);
 assert.equal(r.receipt_candidate.current_head_sha,head);
 assert.equal(r.receipt_candidate.deployment_id,id);
 assert.equal(r.receipt_candidate.proof_method,
  'PUBLIC_RUNTIME_ALIAS_SHA_AND_DEPLOYMENT_ANCESTRY');
 assert.ok(r.receipt_candidate.evidence_urls.includes(
  'https://holistichouse.vercel.app/api/public/release-evidence'));
});

function vercelApiFixture({aliasProject=proof.project_id,aliasHost='holistichouse.vercel.app',
 deploymentSha=sha,readyState='READY',target='production',statusState='success',
 siteStatus=200,ancestry='ahead',moving=false}={}){
 const f=fixtures({statusState,siteStatus,ancestry});
 let branchReads=0;
 f.github.rest.repos.getBranch=async()=>({data:{protected:true,commit:{
  sha:moving&&++branchReads===2?'e'.repeat(40):head}}});
 f.github.rest.repos.getCombinedStatusForRef=async({ref})=>({data:{
  total_count:ref===sha?1:0,statuses:ref===sha?[{...status,state:statusState}]:[]}});
 f.github.rest.repos.compareCommits=async({base,head:tip})=>({data:{
  status:ancestry,merge_base_commit:{sha:base}}});
 f.fetchImpl=async(url,opts={})=>{
  f.read.push(url);
  if(url.includes('release-evidence'))return {status:404,
   url:'https://holistichouse.vercel.app/api/public/release-evidence',
   headers:{get:()=> 'application/json'}};
  if(url.includes('/v4/aliases/'))return {status:200,json:async()=>({
   alias:aliasHost,projectId:aliasProject,deploymentId:id})};
  if(url.includes('/v13/deployments/'))return {status:200,json:async()=>({
   id,projectId:proof.project_id,readyState,target,alias:['holistichouse.vercel.app'],
   meta:{githubCommitSha:deploymentSha,githubCommitRef:proof.branch,
    githubOrg:'andylitvinov-design',githubRepo:'books'}})};
  if(url==='https://holistichouse.vercel.app/en')return {status:siteStatus,
   url:'https://holistichouse.vercel.app/en',
   headers:{get:()=> 'text/html; charset=utf-8'},
   text:async()=> '<html><body>verified</body></html>'};
  throw Error('Unexpected URL in read-only LIVE test: '+url);
 };
 return f;
}
test('Vercel alias API proves an older served SHA when public identity is unavailable',async()=>{
 const f=vercelApiFixture();
 const r=await verifyServedRevision({github:f.github,context,fetchImpl:f.fetchImpl,
  vercelToken:'scoped-read-only-test'});
 assert.equal(r.verified_live,true);
 assert.equal(r.production_sha,sha);
 assert.equal(r.deployment_id,id);
 assert.equal(r.current_head_sha,head);
 assert.equal(r.reason,'SERVING_VERIFIED_REVISION');
 assert.equal(r.proof_method,'VERCEL_API_READY_AND_ALIAS_WITH_GITHUB_STATUS');
 assert.equal(f.read.length,4);
});
test('Vercel API LIVE proof requires token and rejects unknown or unsafe evidence',async()=>{
 let f=vercelApiFixture();
 let r=await verifyServedRevision({github:f.github,context,fetchImpl:f.fetchImpl});
 assert.equal(r.verified_live,false);
 assert.equal(r.reason,'SERVED_PUBLIC_RUNTIME_PROOF_UNAVAILABLE');
 assert.equal(f.read.length,1,'no unauthenticated Vercel API requests');
 const unsafe=[
  {aliasProject:'another-project'},
  {aliasHost:'preview.vercel.app'},
  {deploymentSha:'f'.repeat(40)},
  {readyState:'BUILDING'},
  {target:'preview'},
  {statusState:'failure'},
  {siteStatus:503},
  {ancestry:'diverged'}
 ];
 for(const options of unsafe){
  f=vercelApiFixture(options);
  r=await verifyServedRevision({github:f.github,context,fetchImpl:f.fetchImpl,
   vercelToken:'scoped-read-only-test'});
  assert.equal(r.verified_live,false,'unexpected proof for '+JSON.stringify(options));
 }
});
test('a protected HEAD may advance during proof if served SHA remains its ancestor',async()=>{
 const f=vercelApiFixture({moving:true});
 const r=await verifyServedRevision({github:f.github,context,fetchImpl:f.fetchImpl,
  vercelToken:'scoped-read-only-test'});
 assert.equal(r.verified_live,true);
 assert.equal(r.current_head_sha,'e'.repeat(40));
});
test('LIVE reporting passes existing read-only Vercel token to served-revision verifier',async()=>{
 const f=vercelApiFixture();
 f.github.rest.pulls.list=async()=>({data:[{number:3011,
  base:{ref:'codex/public-book-library'},merge_commit_sha:prMerge,
  created_at:'2026-11-01T02:00:00Z',
  merged_at:'2026-11-02T04:00:00Z',updated_at:'2026-11-02T04:00:00Z'}]});
 f.github.rest.repos.compareCommits=async({base})=>({data:{
  status:'ahead',merge_base_commit:{sha:base}}});
 const r=await run({github:f.github,core:core(),context,
  now:Date.parse('2026-11-02T05:00:00Z'),vercelToken:'scoped-read-only-test',
  liveEvidence:{verified_live:false,reason:'EVENT_SHA_NOT_CURRENT_PRODUCTION'},
  fetchImpl:f.fetchImpl});
 assert.equal(r.live_confirmed_count,1);
 assert.equal(r.live_evidence,'SERVING_VERIFIED_REVISION');
 assert.equal(r.served_sha,sha);
 assert.equal(r.receipt_candidate.verified_live,true);
 assert.equal(r.receipt_candidate.proof_method,
  'VERCEL_API_READY_AND_ALIAS_WITH_GITHUB_STATUS_ANCESTRY');
 assert.ok(r.receipt_candidate.evidence_urls.includes(
  'https://vercel.com/super10/codex-public-book-library/'+id.slice(4)));
 assert.equal(r.receipt_candidate.evidence_urls.some(x=>x.includes('api/public/release-evidence')),false);
});
