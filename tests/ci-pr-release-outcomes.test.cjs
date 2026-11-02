'use strict';
const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs'),os=require('node:os'),path=require('node:path');
const m=require('../scripts/ci-pr-release-outcomes.cjs');
const sha='a'.repeat(40), mergedSha='b'.repeat(40);
const date='2026-11-02T05:00:00.000Z',now=Date.parse(date);
const ctx={repo:{owner:'andylitvinov-design',repo:'books'},
 eventName:'schedule',ref:'refs/heads/codex/bootstrap-books'};
const core=()=>({info(){},summary:{addHeading(){return this},
 addCodeBlock(){return this},async write(){}}});
function makeGithub({mergeCount=1,headSha=sha,compare='ahead'}={}){
 const prs=Array.from({length:mergeCount},(_,i)=>({
  number:3000+i,base:{ref:'codex/public-book-library'},
  merged_at:'2026-11-02T04:00:00.000Z',created_at:'2026-11-01T04:00:00.000Z',
  updated_at:'2026-11-02T04:01:00.000Z',merge_commit_sha:mergedSha}));
 return {rest:{pulls:{list:async()=>({data:prs})},
  actions:{listWorkflowRuns:async()=>({data:{total_count:2,workflow_runs:[
   {id:1,event:'pull_request',head_branch:'feature',head_sha:sha,
    created_at:'2026-11-02T04:00:00.000Z',run_started_at:'2026-11-02T04:01:00.000Z',
    updated_at:'2026-11-02T04:11:00.000Z',status:'completed',conclusion:'success'},
   {id:2,event:'pull_request',head_branch:'feature',head_sha:sha,
    created_at:'2026-11-02T04:20:00.000Z',run_started_at:'2026-11-02T04:21:00.000Z',
    updated_at:'2026-11-02T04:35:00.000Z',status:'completed',conclusion:'success',run_attempt:2}
  ]}})},
  repos:{getBranch:async()=>({data:{commit:{sha:headSha}}}),
   compareCommits:async()=>({data:{status:compare,merge_base_commit:{sha:mergedSha}}})}}};
}
test('merge and Core metrics are deterministic and deduplicate repeated source events',async()=>{
 const result=await m.run({github:makeGithub(),core:core(),context:ctx,now,
  liveEvidence:{verified_live:true,reason:'LIVE_VERIFIED',production_sha:sha}});
 assert.equal(result.merged_count,1);
 assert.equal(result.live_confirmed_count,1);
 assert.equal(result.unverified_live_count,0);
 assert.equal(result.live_coverage,'complete_current_head');
 assert.equal(result.pr_to_merge_p50_minutes,1440);
 assert.equal(result.merge_to_live_observation_upper_bound_p50_minutes,60);
 assert.equal(result.core.runs,2);
 assert.equal(result.core.duplicate_same_source,1);
 assert.equal(result.core.rerun_attempts,1);
});
test('only proven ancestry can confirm a merged PR is served',async()=>{
 const r=await m.run({github:makeGithub({compare:'diverged'}),
  core:core(),context:ctx,now,liveEvidence:{verified_live:true,reason:'LIVE_VERIFIED',production_sha:sha}});
 assert.equal(r.live_confirmed_count,0);
 assert.equal(r.unverified_live_count,1);
 assert.equal(m.ancestryValid({status:'ahead',merge_base_commit:{sha:'c'.repeat(40)}},mergedSha),false);
});
test('a Vercel pending status cannot be misreported as zero LIVE',async()=>{
 const r=await m.run({github:makeGithub(),core:core(),context:ctx,now,
  liveEvidence:{verified_live:false,reason:'VERCEL_GITHUB_STATUS_UNVERIFIED'}});
 assert.equal(r.merged_count,1);
 assert.equal(r.live_confirmed_count,null);
 assert.equal(r.unverified_live_count,null);
 assert.equal(r.live_coverage,'UNVERIFIED');
});
test('changing production HEAD invalidates previously valid LIVE evidence',async()=>{
 const r=await m.run({github:makeGithub({headSha:'f'.repeat(40)}),
  core:core(),context:ctx,now,liveEvidence:{verified_live:true,reason:'LIVE_VERIFIED',production_sha:sha}});
 assert.equal(r.live_confirmed_count,null);
 assert.ok(r.errors.includes('PRODUCTION_HEAD_CHANGED'));
});
test('report persists machine-readable merged and LIVE evidence for 14-day trends',async()=>{
 const temp=fs.mkdtempSync(path.join(os.tmpdir(),'hh-outcomes-'));
 try{const filename=path.join(temp,'metrics.json');
  const r=await m.run({github:makeGithub(),core:core(),context:ctx,now,
   liveEvidence:{verified_live:true,reason:'LIVE_VERIFIED',production_sha:sha},reportPath:filename});
  assert.deepEqual(JSON.parse(fs.readFileSync(filename,'utf8')),r);
 }finally{fs.rmSync(temp,{force:true,recursive:true})}
});
test('untrusted source cannot measure or write false LIVE',async()=>{
 const r=await m.run({github:makeGithub(),core:core(),context:{...ctx,ref:'refs/heads/untrusted'},now,
  liveEvidence:{verified_live:true,reason:'LIVE_VERIFIED',production_sha:sha}});
 assert.equal(r.merged_count,null);
 assert.equal(r.live_confirmed_count,null);
 assert.ok(r.errors.includes('UNTRUSTED_CONTEXT'));
});
test('one status cannot masquerade as an ancestor when GitHub reports diverged',()=>{
 assert.equal(m.ancestryValid({status:'identical'},mergedSha),true);
 assert.equal(m.ancestryValid({status:'ahead',merge_base_commit:{sha:mergedSha}},mergedSha),true);
 assert.equal(m.ancestryValid({status:'behind',merge_base_commit:{sha:mergedSha}},mergedSha),false);
 assert.equal(m.ancestryValid({status:'diverged',merge_base_commit:{sha:mergedSha}},mergedSha),false);
 assert.equal(m.percentile([1,2,3,4],.5),2);
});
