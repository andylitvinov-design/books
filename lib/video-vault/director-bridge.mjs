/**
 * Auto Video Director's optional, fail-closed real-footage path.
 * Scene IDs remain distinct from URLs. No R2 footage is exposed or selected
 * until server readback and client/playback permission is confirmed.
 */
import {selectVaultScenes} from './contracts.mjs';
import {suggestStoredReviewedStoryboard} from '../video-library/reviewed-storyboards.mjs';
export function suggestVerifiedVaultMontage(rows,{
 goal='',motif='',pace='',aspect='',category='',excludeAssetIds=[],
}={}){
 const assets=selectVaultScenes(rows,{
  goal,motif,pace,aspect,category,excludeAssetIds,limit:4,
  requireClientPlayback:true,
 });
 if(assets.length!==4)return {
  status:'unavailable',sourceType:'localApproved',
  reason:'FOUR_VERIFIED_DISTINCT_FOOTAGE_REQUIRED',
  assetIds:[],fallback:'existing_local_montage',
 };
 return {
  status:'ready_for_server_resolution',sourceType:'r2Approved',
  assetIds:assets.map(x=>x.asset_id),
  shots:assets.map((row,index)=>({index,sceneId:row.asset_id,
   durationMs:row.duration_ms,sourceType:'r2Approved'})),
  next:'POST /api/app/video-vault/resolve after user selection and consent',
 };
}

/**
 * Canonical story-specific path. Only source-controlled, individually reviewed
 * storyboard records may become candidates for the existing authenticated
 * Vault 4-shot resolver. Empty ledger returns an honest local/animation fallback.
 * This never signs R2 URLs, saves a film or upgrades a tag match into approval.
 */
export function suggestReviewedVaultStory(rows,{scenarioId,aspect}={}){
  return suggestStoredReviewedStoryboard(rows,{scenarioId,aspect});
}
