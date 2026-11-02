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
function makeGithub({mergeCount=1,controlCount=0,headSha=sha,compare='ahead'}={}){
 const prs=Array.from({length:mergeCount},(_,i)=>({
  number:3000+i,base:{ref:'codex/public-book-library'},
  merged_at:'2026-11-02T04:00:00.000Z',created_at:'2026-11-01T04:00:00.000Z',
  updated_at:'2026-11-02T04:01:00.000Z',merge_commit_sha:mergedSha}));
 const controls=Array.from({length:controlCount},(_,i)=>({
  number:7000+i,base:{ref:'codex/bootstrap-books'},
  merged_at:'2026-11-02T04:00:00.000Z',created_at:'2026-11-01T04:00:00.000Z',
  updated_at:'2026-11-02T04:01:00.000Z',merge_commit_sha:'d'.repeat(40)}));
 return {rest:{pulls:{list:async({base})=>({data:base==='codex/bootstrap-books'?controls:prs})},
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
 assert.equal(result.control_branch,'codex/bootstrap-books');
 assert.equal(result.production_branch,'codex/public-book-library');
 assert.equal(result.public_alias,'holistichouse.vercel.app');
 assert.equal(result.merged_scope,'PRODUCTION_BRANCH_ONLY');
 assert.equal(result.control_plane_merged_count,0);
 assert.equal(result.sampled_prs[0].delivery_state,'PRODUCTION_LIVE_VERIFIED');
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


test('served revision history confirms every PR in a 24h cohort larger than 40 with one API page',async()=>{
 const prs=Array.from({length:80},(_,i)=>({
  number:4000+i,merge_commit_sha:(i+1).toString(16).padStart(40,'0')
 }));
 let pages=0,compares=0;
 const github={rest:{repos:{
  listCommits:async({sha:ref,page,per_page})=>{
   pages++;assert.equal(ref,sha);assert.equal(page,1);assert.equal(per_page,100);
   return {data:[{sha},...prs.map(pr=>({sha:pr.merge_commit_sha}))]};
  },
  compareCommits:async()=>{compares++;throw Error('should not compare verified history');}
 }}};
 const result=await m.confirmedAncestry(github,ctx.repo,prs,sha);
 assert.equal(result.complete,true);
 assert.equal(result.confirmed.size,80);
 assert.equal(result.historyHits,80);
 assert.equal(result.historyPages,1);
 assert.equal(result.comparisons,0);
 assert.equal(pages,1);assert.equal(compares,0);
});

test('Git history positives and GitHub compare negatives give complete served-SHA coverage',async()=>{
 const prs=Array.from({length:90},(_,i)=>({
  number:5000+i,merge_commit_sha:(i+100).toString(16).padStart(40,'0')
 }));
 const listed=prs.slice(0,60);
 let comparisons=0;
 const github={rest:{repos:{
  listCommits:async()=>({data:[{sha},...listed.map(pr=>({sha:pr.merge_commit_sha}))]}),
  compareCommits:async({base,head:tested})=>{
   comparisons++;assert.equal(tested,sha);
   const index=prs.findIndex(pr=>pr.merge_commit_sha===base);
   const newer=index>=80;
   return {data:{status:newer?'behind':'ahead',merge_base_commit:{sha:base}}};
  }
 }}};
 const result=await m.confirmedAncestry(github,ctx.repo,prs,sha);
 assert.equal(result.complete,true);
 assert.equal(result.confirmed.size,80);
 assert.equal(result.comparisons,30);
 assert.equal(result.historyHits,60);
 assert.equal(comparisons,30);
});

test('malformed Git history never manufactures LIVE; ambiguous compare yields partial coverage',async()=>{
 const prs=[{number:500,merge_commit_sha:'c'.repeat(40)}];
 const github={rest:{repos:{
  listCommits:async()=>({data:[{sha:'d'.repeat(40)},{sha:prs[0].merge_commit_sha}]}),
  compareCommits:async()=>({data:{status:'queued'}})
 }}};
 const result=await m.confirmedAncestry(github,ctx.repo,prs,sha);
 assert.equal(result.confirmed.size,0);
 assert.equal(result.historyFailed,true);
 assert.equal(result.comparisons,1);
 assert.equal(result.complete,false);
 assert.equal(result.errors,1);
});

test('control-plane merges are tracked separately and never called missing LIVE',async()=>{
 const r=await m.run({github:makeGithub({mergeCount:0,controlCount:2}),
  core:core(),context:ctx,now,
  liveEvidence:{verified_live:false,reason:'PUBLIC_RUNTIME_PROOF_UNAVAILABLE'}});
 assert.equal(r.merged_count,0);
 assert.equal(r.control_plane_merged_count,2);
 assert.equal(r.control_plane_merge_coverage,'complete');
 assert.equal(r.control_plane_sample.length,2);
 assert.equal(r.control_plane_sample[0].delivery_state,
  'CONTROL_MERGED_RUNTIME_NOT_APPLICABLE');
 assert.equal(r.live_confirmed_count,null);
 assert.equal(r.receipt_candidate,null);
});

test('production PR does not need ancestry in the GitHub default branch',async()=>{
 const r=await m.run({github:makeGithub({mergeCount:1,controlCount:1}),
  core:core(),context:ctx,now,
  liveEvidence:{verified_live:true,reason:'LIVE_VERIFIED',production_sha:sha}});
 assert.equal(r.merged_count,1);
 assert.equal(r.control_plane_merged_count,1);
 assert.equal(r.sampled_prs[0].delivery_state,'PRODUCTION_LIVE_VERIFIED');
 assert.equal(r.control_plane_sample[0].delivery_state,
  'CONTROL_MERGED_RUNTIME_NOT_APPLICABLE');
});
