/**
 * Technical video asset evidence. A catalogue's "approved" editorial label
 * alone is NOT proof that decoded bytes, provenance and rights were checked.
 * Consumer remains entirely first party; never accepts arbitrary URL paths.
 */
export const VERIFIED_ASSETS_SCHEMA='hh-verified-assets-v1';
const PATH=/^\/videos\/holistic-house\/(money-films-v1|film-collection-v2|film-collection-v3)\/([a-z0-9-]+)\.mp4$/;
const HASH=/^[a-f0-9]{64}$/;
const safeId=id=>typeof id==='string'&&/^[a-z0-9-]+$/.test(id);

export function inspectVerifiedVideoAsset(scene,evidence){
  if(!scene||!safeId(scene.id)||scene.status!=='approved'||scene.media!=='licensed_mp4'||
     typeof scene.video!=='string'||!PATH.test(scene.video)||
     !scene.video.endsWith('/'+scene.id+'.mp4'))
    return {status:'rejected',reason:'catalog_not_approved'};
  if(!scene.rightsReference || !['existing_approved_first_party_master','dareful_cc_by_4_0']
    .includes(scene.rightsReference.kind))
    return {status:'rejected',reason:'rights_reference_missing'};
  if(!evidence||evidence.schemaVersion!==VERIFIED_ASSETS_SCHEMA||
     evidence.status!=='pass'||!Array.isArray(evidence.assets))
    return {status:'unverified',reason:'no_matching_media_evidence'};
  const entries=evidence.assets.filter(a=>a?.id===scene.id);
  if(entries.length!==1)return {status:'unverified',reason:'no_unique_media_evidence'};
  const a=entries[0];
  if(a.path!==scene.video||a.status!=='technical_ready'||a.technicalVerified!==true||
     !HASH.test(a.sha256)||a.codec!=='h264'||
     !Number.isFinite(a.durationSeconds)||a.durationSeconds<1||a.durationSeconds>120||
     !Number.isInteger(a.width)||a.width<360||
     !Number.isInteger(a.height)||a.height<360||
     !Number.isFinite(a.fps)||a.fps<10||a.fps>60||
     a.frameDecoded!==true||!['individual_record','collection_only'].includes(a.rightsScope))
    return {status:'rejected',reason:'media_evidence_mismatch'};
  const rightsReviewRequired=a.rightsScope==='collection_only';
  if(scene.rightsReference.kind==='dareful_cc_by_4_0' &&
     (rightsReviewRequired||!scene.rightsReference.attribution?.includes('CC BY 4.0')))
    return {status:'rejected',reason:'individual_attribution_missing'};
  return {
    status:'technical_ready',id:scene.id,path:scene.video,sha256:a.sha256,
    durationSeconds:a.durationSeconds,rightsScope:a.rightsScope,
    rightsReviewRequired,
  };
}

/** No invented substitute when one of the four required assets is missing. */
export function resolveVerifiedVideoPreset(preset,scenes,evidence){
  if(!preset||typeof preset.id!=='string'||!Array.isArray(preset.clips)||
     preset.clips.length!==4||new Set(preset.clips).size!==4||
     !Array.isArray(scenes))return {status:'rejected',reason:'invalid_preset'};
  const byId=new Map(scenes.filter(s=>s&&safeId(s.id)).map(s=>[s.id,s]));
  const assets=preset.clips.map(id=>inspectVerifiedVideoAsset(byId.get(id),evidence));
  const unavailable=assets.find(a=>a.status!=='technical_ready');
  if(unavailable)return {
    status:'unverified',reason:unavailable.reason,
    missingSceneIds:preset.clips.filter((_,i)=>assets[i].status!=='technical_ready'),
  };
  return {
    status:'technical_ready',presetId:preset.id,
    sceneIds:[...preset.clips],assets,
    rightsReviewRequired:assets.some(a=>a.rightsReviewRequired),
  };
}
