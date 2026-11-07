/**
 * Semantic four-shot gate for VERIFIED editor-approved storyboards.
 *
 * A client must never supply this ledger as proof of rights/visual review.
 * Live lookups use only the source-controlled ledger below. Its initial
 * plans array is intentionally EMPTY while no individual frame review exists.
 * Even a passing ledger is *not* export evidence: the existing Vault resolve
 * must still HEAD-check R2 and the final MP4 must pass playback/export QA.
 */
import ledger from "../../data/video-catalog/reviewed-storyboard-bindings-v1.json" with {type:"json"};
import {getMyTubeTopic} from "../mandala/mytube-content-taxonomy.mjs";
import {VIDEO_GOAL_SCENARIOS} from "../mandala/video-goal-taxonomy.mjs";
import {isGeneratorEligible} from "../video-vault/contracts.mjs";

const ID=/^[a-z][a-z0-9-]{2,63}$/;
const EVIDENCE=/^[a-z][a-z0-9-]{5,100}$/;
export const FOUR_SHOT_LEDGER_SCHEMA="hh-four-shot-storyboard-ledger-v1";
export const FOUR_SHOT_PLAN_SCHEMA="hh-four-shot-story-plan-v1";
const unavailable=(reason)=>Object.freeze({
  status:"unavailable",
  reason,
  sourceType:"localApproved",
  fallback:"existing_local_montage_explicitly_labeled",
  assetIds:[],
  readyForServerResolution:false,
  verifiedFinishedFilm:false,
  canExport:false,
});

function storyBelongs(plan){
  if(plan.taxonomy==="mytube"){
    const found=getMyTubeTopic(plan.topicId);
    return Boolean(found&&found.category.id===plan.categoryId&&
      found.topic.scenarios.some(s=>s.id===plan.scenarioId));
  }
  if(plan.taxonomy==="studio")
    return VIDEO_GOAL_SCENARIOS.some(s=>s.id===plan.scenarioId&&
      s.topicId===plan.topicId&&s.categoryId===plan.categoryId);
  return false;
}

/**
 * May receive a synthetic ledger during tests, but production ONLY passes
 * source-controlled reviewed records into this validator.
 */
export function evaluateReviewedFourShotPlan(plan,rows,{aspect}={}){
  if(!plan||typeof plan!=="object"||Array.isArray(plan)||
    plan.schemaVersion!==FOUR_SHOT_PLAN_SCHEMA||
    !["studio","mytube"].includes(plan.taxonomy)||
    ![plan.categoryId,plan.topicId,plan.scenarioId].every(x=>typeof x==="string"&&ID.test(x))||
    !["portrait","landscape"].includes(plan.aspect)||
    (aspect!==undefined&&aspect!==plan.aspect)||
    !storyBelongs(plan))
    return unavailable("INVALID_CANONICAL_STORY_OR_ASPECT");
  if(!Array.isArray(plan.shots)||plan.shots.length!==4)
    return unavailable("EXACTLY_FOUR_REVIEWED_BEATS_REQUIRED");
  if(!Array.isArray(rows))return unavailable("NO_TRUSTED_APPROVED_ROWS");
  const byId=new Map(rows.map(r=>[r?.asset_id,r]));
  const ids=new Set(),masterIds=new Set(),hashes=new Set(),evidenceIds=new Set(),selected=[];
  for(const [index,shot] of plan.shots.entries()){
    if(!shot||shot.shotIndex!==index+1||
      !ID.test(shot.assetId||"")||
      typeof shot.filmedMasterId!=="string"||shot.filmedMasterId.length<6||shot.filmedMasterId.length>180||
      !EVIDENCE.test(shot.frameEvidenceId||"")||
      shot.reviewStatus!=="approved"||shot.visualMatchApproved!==true||
      shot.rightsBindingVerified!==true||
      typeof shot.humanReviewer!=="string"||shot.humanReviewer.trim().length<3||
      typeof shot.reviewedAt!=="string"||!Number.isFinite(Date.parse(shot.reviewedAt))||
      Date.parse(shot.reviewedAt)>Date.now()+86400000||
      !Number.isInteger(shot.inMs)||!Number.isInteger(shot.outMs)||
      shot.inMs<0||shot.outMs<=shot.inMs||shot.outMs-shot.inMs<1000)
      return unavailable("SHOT_FRAME_RIGHTS_OR_TIME_UNVERIFIED");
    const row=byId.get(shot.assetId);
    if(!isGeneratorEligible(row,{requireClientPlayback:true})||
      row.aspect_ratio!==plan.aspect||row.filmed_master_id!==shot.filmedMasterId||
      !Number.isSafeInteger(Number(row.duration_ms))||
      shot.outMs>Number(row.duration_ms))
      return unavailable("SOURCE_NOT_GENERATOR_ELIGIBLE_OR_WRONG_ASPECT");
    if(ids.has(shot.assetId)||masterIds.has(row.filmed_master_id)||hashes.has(row.sha256)||
      evidenceIds.has(shot.frameEvidenceId))
      return unavailable("DUPLICATE_MASTER_IN_FOUR_SHOTS");
    ids.add(shot.assetId);masterIds.add(row.filmed_master_id);hashes.add(row.sha256);
    evidenceIds.add(shot.frameEvidenceId);
    selected.push({shotIndex:index+1,assetId:shot.assetId,
      filmedMasterId:row.filmed_master_id,inMs:shot.inMs,outMs:shot.outMs,
      reviewEvidenceId:shot.frameEvidenceId,sourceType:"r2Approved"});
  }
  return Object.freeze({
    status:"ready_for_server_resolution",
    sourceType:"r2Approved",
    categoryId:plan.categoryId,topicId:plan.topicId,scenarioId:plan.scenarioId,
    aspect:plan.aspect,assetIds:selected.map(s=>s.assetId),shots:selected,
    next:"existing_auth_vault_resolve_must_verify_live_R2_HEAD",
    readyForServerResolution:true,
    verifiedFinishedFilm:false,
    canExport:false,
  });
}

export function suggestStoredReviewedStoryboard(rows,{scenarioId,aspect}={}){
  if(ledger.schemaVersion!==FOUR_SHOT_LEDGER_SCHEMA||!Array.isArray(ledger.plans))
    return unavailable("REVIEW_LEDGER_INVALID");
  if(typeof scenarioId!=="string"||!ID.test(scenarioId)||
    !["portrait","landscape"].includes(aspect))
    return unavailable("INVALID_STORY_REQUEST");
  const matches=ledger.plans.filter(p=>p?.scenarioId===scenarioId&&p.aspect===aspect);
  if(matches.length!==1)return unavailable(matches.length?"AMBIGUOUS_STORY_REVIEW":"NO_FRAME_APPROVED_STORYBOARD");
  return evaluateReviewedFourShotPlan(matches[0],rows,{aspect});
}

export function auditStoredStoryboardEvidence(){
  const plans=Array.isArray(ledger.plans)?ledger.plans:[];
  return {
    schemaVersion:FOUR_SHOT_LEDGER_SCHEMA,
    versionedPlans:plans.length,
    frameApprovedPlans:plans.filter(p=>p?.shots?.length===4&&
      p.shots.every(s=>s.reviewStatus==="approved"&&s.visualMatchApproved===true&&
        s.rightsBindingVerified===true&&Boolean(s.frameEvidenceId))).length,
    currentLiveR2Verified:false,
    finishedExportsVerified:0,
    evidence:"source_controlled_editorial_review_not_live_R2_OR_MP4_export",
  };
}
