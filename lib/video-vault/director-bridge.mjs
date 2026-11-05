/**
 * Auto Video Director's optional, fail-closed real-footage path.
 * Scene IDs remain distinct from URLs. No R2 footage is exposed or selected
 * until server readback and client/playback permission is confirmed.
 */
import {selectVaultScenes} from './contracts.mjs';
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
