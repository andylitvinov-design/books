import test from "node:test";
import assert from "node:assert/strict";
import {
  FOUR_SHOT_PLAN_SCHEMA,evaluateReviewedFourShotPlan,
  suggestStoredReviewedStoryboard,auditStoredStoryboardEvidence,
} from "../lib/video-library/reviewed-storyboards.mjs";
import {suggestReviewedVaultStory} from "../lib/video-vault/director-bridge.mjs";

const sha=i=>i.toString(16).padStart(64,"0");
function footage(i,{master="filmed-master-"+i,aspect="portrait",clientRaw=true}={}){
 const hash=sha(i);
 return {
  asset_id:"asset-"+i,source_provider:"first_party",source_asset_id:"source-"+i,
  filmed_master_id:master,type:"real_footage",status:"generator_eligible",
  owner_review_status:"approved",visual_review_score:5,
  commercial_use_ok:true,derivative_edit_ok:true,raw_client_delivery_ok:clientRaw,
  subject_release_status:"not_applicable",
  technical_verified_at:"2026-11-05T00:00:00Z",
  r2_head_checked_at:"2026-11-05T00:00:00Z",
  r2_readback_sha256:hash,sha256:hash,codec:"h264",file_bytes:100000,
  r2_object_key:"masters/asset-"+i+"/"+hash+".mp4",
  poster_object_key:"posters/asset-"+i+"/"+hash+".jpg",
  aspect_ratio:aspect,duration_ms:5000,
 };
}
function plan(rows,{taxonomy="mytube",aspect="portrait"}={}){
 return {
  schemaVersion:FOUR_SHOT_PLAN_SCHEMA,taxonomy,
  categoryId:taxonomy==="mytube"?"stress-anxiety":"stress",
  topicId:taxonomy==="mytube"?"stress-relief":"stress-anxiety",
  scenarioId:taxonomy==="mytube"?"stress-relief-s1":"stress-anxiety-s1",
  aspect,shots:rows.map((r,i)=>({
    shotIndex:i+1,assetId:r.asset_id,filmedMasterId:r.filmed_master_id,
    inMs:0,outMs:5000,
    frameEvidenceId:"frame-evidence-"+(i+1),
    reviewStatus:"approved",visualMatchApproved:true,
    rightsBindingVerified:true,humanReviewer:"Editorial Reviewer",
    reviewedAt:"2026-11-05T00:00:00Z",
  })),
 };
}
test("source-controlled review ledger remains empty without independent real frames",()=>{
 const x=auditStoredStoryboardEvidence();
 assert.equal(x.versionedPlans,0);
 assert.equal(x.frameApprovedPlans,0);
 assert.equal(x.finishedExportsVerified,0);
 assert.equal(x.currentLiveR2Verified,false);
 const empty=suggestStoredReviewedStoryboard([],{scenarioId:"stress-relief-s1",aspect:"portrait"});
 assert.equal(empty.status,"unavailable");
 assert.equal(empty.reason,"NO_FRAME_APPROVED_STORYBOARD");
 assert.equal(empty.canExport,false);
 const bridge=suggestReviewedVaultStory([],{scenarioId:"stress-relief-s1",aspect:"portrait"});
 assert.equal(bridge.readyForServerResolution,false);
 assert.match(bridge.fallback,/local_montage/);
});
test("four reviewed independent masters can enter existing server resolver, not claim finished export",()=>{
 const rows=[1,2,3,4].map(i=>footage(i));
 const outcome=evaluateReviewedFourShotPlan(plan(rows),rows,{aspect:"portrait"});
 assert.equal(outcome.status,"ready_for_server_resolution");
 assert.equal(outcome.readyForServerResolution,true);
 assert.equal(outcome.verifiedFinishedFilm,false);
 assert.equal(outcome.canExport,false);
 assert.deepEqual(outcome.assetIds,["asset-1","asset-2","asset-3","asset-4"]);
 assert.equal(new Set(outcome.shots.map(s=>s.filmedMasterId)).size,4);
 assert.ok(outcome.shots.every(s=>!Object.hasOwn(s,"playbackUrl")&&!Object.hasOwn(s,"r2Key")));
});
test("a Studio canonical story can be semantically validated without claiming a real export",()=>{
 const rows=[1,2,3,4].map(i=>footage(i));
 const x=evaluateReviewedFourShotPlan(plan(rows,{taxonomy:"studio"}),rows);
 assert.equal(x.status,"ready_for_server_resolution");
 assert.equal(x.canExport,false);
});
test("deny duplicates, missing review/rights, wrong aspect and untrusted source",()=>{
 const rows=[1,2,3,4].map(i=>footage(i));
 const original=plan(rows);
 const reject=(p,r=rows)=>assert.equal(evaluateReviewedFourShotPlan(p,r).readyForServerResolution,false);
 reject({...original,scenarioId:"not-a-canonical-story"});
 reject({...original,shots:original.shots.slice(0,3)});
 reject({...original,shots:original.shots.map((s,i)=>i===0?{...s,rightsBindingVerified:false}:s)});
 reject({...original,shots:original.shots.map((s,i)=>i===0?{...s,frameEvidenceId:""}:s)});
 reject({...original,shots:original.shots.map((s,i)=>i===1?{...s,frameEvidenceId:original.shots[0].frameEvidenceId}:s)});
 reject({...original,shots:original.shots.map((s,i)=>i===0?{...s,outMs:6000}:s)});
 reject({...original,shots:original.shots.map((s,i)=>i===0?{...s,visualMatchApproved:false}:s)});
 reject({...original,shots:original.shots.map((s,i)=>i===0?{...s,shotIndex:2}:s)});
 reject({...original,shots:original.shots.map((s,i)=>i===1?{...s,assetId:"asset-1",filmedMasterId:"filmed-master-1"}:s)});
 reject(original,rows.map((r,i)=>i===1?{...r,filmed_master_id:rows[0].filmed_master_id}:r));
 reject(original,rows.map((r,i)=>i===0?{...r,raw_client_delivery_ok:false}:r));
 reject(original,rows.map((r,i)=>i===0?{...r,aspect_ratio:"landscape"}:r));
 reject(original,rows.map((r,i)=>i===0?{...r,status:"candidate"}:r));
 reject(original,[]);
 reject({...original,taxonomy:"unknown"});
 assert.equal(evaluateReviewedFourShotPlan(original,rows,{aspect:"landscape"}).readyForServerResolution,false);
});
