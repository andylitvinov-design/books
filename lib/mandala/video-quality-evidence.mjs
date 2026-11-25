/**
 * No aesthetic or rights claim from a filename, SHA or simple format label.
 * Returns a conservative technical tier only for trusted first-party media.
 * Visual/semantic suitability and CC BY/source permissions remain separate.
 */
const validSha=x=>typeof x==="string"&&/^[a-f0-9]{64}$/.test(x);
const validMeta=s=>s&&s.status==="approved"&&typeof s.id==="string"&&
  s.video==="/videos/holistic-house/"+s.collection+"/"+s.id+".mp4";

export function videoQualityEvidence(scene){
  if(!validMeta(scene))return {tier:"rejected",weight:0,reason:"no_approved_first_party_source"};
  const w=Number(scene.width),h=Number(scene.height),fps=Number(scene.fps);
  if(scene.collection==="original-motion-v1"&&
     scene.media==="original_motion_mp4"&&
     scene.visualOrigin==="original_procedural_non_photographic"&&
     scene.rightsReference?.kind==="project_generated_original"&&validSha(scene.sha256)){
    // The existing 684 are genuine, but only 432x768 at 18fps. Never call HD.
    if(w<720||h<1280||fps<24)
      return {tier:"standard_motion_art",weight:0,reason:"legacy_low_resolution_or_fps"};
    return {tier:"native_hd_motion_art",weight:3,reason:"resolution_fps_only_visual_review_still_required"};
  }
  if(scene.media!=="licensed_mp4"||!
     ["existing_approved_first_party_master","dareful_cc_by_4_0"].includes(scene.rightsReference?.kind))
    return {tier:"unverified",weight:0,reason:"missing_individual_source_evidence"};
  const quality=scene.technicalQuality;
  if(quality?.editorialApproved===true&&quality?.decodedFrame===true&&
     Number.isInteger(w)&&Number.isInteger(h)&&fps>=24&&
     validSha(quality.sha256)&&Number(quality.score)>=65){
    if(quality.sourceOriginalLandscapeCrop===true)return {tier:"editorially_reviewed_encoded_portrait_hd",weight:4,reason:"upscaled_portrait_encoded_from_landscape_not_native_footage"};
    if(w>=1080&&h>=1920)return {tier:"editorially_reviewed_fullhd",weight:5,reason:"motion_and_reviewed_physical_quality_evidence"};
    if(w>=720&&h>=1280)return {tier:"editorially_reviewed_hd",weight:4,reason:"motion_and_reviewed_physical_quality_evidence"};
  }
  if(Number.isInteger(w)&&Number.isInteger(h)&&w>=720&&h>=1280&&fps>=24)
    return {tier:"technical_hd_pending_editorial_review",weight:1,reason:"physical_hd_claim_requires_review"};
  // Older taxonomy records omit codec dimensions, but separately retained
  // verified collection manifests document v2/v3 as 1080x1920 at 24fps and
  // v1 as 720x1280 with unspecified FPS. This is NOT individual editorial QA.
  if(["film-collection-v2","film-collection-v3"].includes(scene.collection))
    return {tier:"collection_reported_fullhd",weight:2,reason:"collection_level_technical_evidence_only"};
  if(scene.collection==="money-films-v1")
    return {tier:"collection_reported_hd_unknown_fps",weight:1,reason:"collection_size_only_fps_unverified"};
  return {tier:"format_unverified",weight:0,reason:"missing_video_fps_or_physical_review"};
}
/** Secondary key only. Relevance, exclusions, and goal-first intent dominate. */
export function presetQualityTieBreaker(preset,sceneById){
  if(!preset||!Array.isArray(preset.clips)||!(sceneById instanceof Map))return 0;
  return preset.clips.reduce((total,id)=>total+videoQualityEvidence(sceneById.get(id)).weight,0);
}
