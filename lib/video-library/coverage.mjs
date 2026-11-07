/**
 * Holistic House video library: truthful offline category, site and source coverage.
 *
 * This module never performs network requests, never touches client records and
 * never upgrades a candidate/link/procedural animation to approved camera footage.
 * Coverage means metadata relevance, NOT frame-reviewed storyboard readiness.
 */
import sceneCatalog from "../../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import motionCatalog from "../../data/video-catalog/original-motion-scenes-v1.json" with {type:"json"};
import taxonomy from "../../data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json" with {type:"json"};
import editorialRanks from "../../data/video-catalog/mytube-scene-rankings-v1.json" with {type:"json"};
import crosswalk from "../../data/video-catalog/video-goal-mytube-crosswalk-v1.json" with {type:"json"};
import {VIDEO_GOAL_TOPICS,VIDEO_GOAL_SCENARIOS} from "../mandala/video-goal-taxonomy.mjs";
import {auditStoredStoryboardEvidence} from "./reviewed-storyboards.mjs";

const ASPECTS=new Set(["portrait","landscape","square"]);
const RANK_STATUS="editorial_metadata_only_not_frame_verified";
const safeScene=(s,aspect)=>s?.media==="licensed_mp4"&&s?.status==="approved"&&
  typeof s.video==="string"&&
  /^\/videos\/holistic-house\/[a-z0-9-]+\/[a-z0-9-]+\.mp4$/.test(s.video)&&
  ["dareful_cc_by_4_0","existing_approved_first_party_master"].includes(s.rightsReference?.kind)&&
  Array.isArray(s.allowedAspects)&&s.allowedAspects.includes(aspect)&&
  Number.isFinite(s.width)&&Number.isFinite(s.height)&&
  (aspect==="portrait"?s.height>s.width:aspect==="landscape"?s.width>s.height:s.width===s.height);
const sum=(xs,p)=>xs.reduce((n,x)=>n+(p(x)?1:0),0);
const distinct=a=>new Set(a).size;

export const VIDEO_SITE_PLACEMENTS=Object.freeze([
  {id:"studio",route:"/{locale}/holistic-support/mandala",
    source:"local_mp4_plus_private_vault_when_enabled",
    state:"source_catalog_present_not_individual_story_verified"},
  {id:"mytube",route:"/{locale}/mytube",source:"approved_public_video_discovery",
    state:"index_connected_provider_playback_not_checked"},
  {id:"meditations",route:"/{locale}/meditations",
    source:"existing_public_meditations_and_separately_gated_research",
    state:"existing_sources_candidate_embeds_must_remain_separate"},
  {id:"academy",route:"/{locale}/academy",
    source:"psimaster_youtube_and_existing_course_playlists",
    state:"course_refs_exist_live_playback_not_checked"},
  {id:"services",route:"/{locale}/services",
    source:"data/service-video-library.ts",
    state:"partial_localized_video_fallback_es_to_en"},
  {id:"homepage",route:"/{locale}",source:"presentation_components",
    state:"placement_not_individually_audited"},
]);

export function auditVideoTopicCrosswalk(){
  const studioIds=new Set(VIDEO_GOAL_TOPICS.map(t=>t.id));
  const mytubeIds=new Set(taxonomy.categories.flatMap(c=>
    c.subcategories.flatMap(s=>s.topics.map(t=>t.id))));
  const keys=Object.keys(crosswalk.studioToMyTube);
  const unmapped=[...studioIds].filter(id=>!Object.hasOwn(crosswalk.studioToMyTube,id));
  const unknown=keys.filter(id=>!studioIds.has(id));
  const orphanLinks=keys.flatMap(id=>(crosswalk.studioToMyTube[id]||[])
    .filter(topicId=>!mytubeIds.has(topicId)).map(topicId=>({studioTopicId:id,mytubeTopicId:topicId})));
  const malformed=keys.filter(id=>!Array.isArray(crosswalk.studioToMyTube[id])||
    crosswalk.studioToMyTube[id].length===0||
    distinct(crosswalk.studioToMyTube[id])!==crosswalk.studioToMyTube[id].length);
  return {studioTopics:studioIds.size,mytubeTopics:mytubeIds.size,
    mappedStudioTopics:keys.length,unmapped,unknown,orphanLinks,malformed,
    valid:unmapped.length===0&&unknown.length===0&&orphanLinks.length===0&&
      malformed.length===0&&studioIds.size===30&&mytubeIds.size===64};
}

/**
 * @param {object} options
 * @param {"portrait"|"landscape"|"square"} [options.aspect]
 * @param {number} [options.minScore] Relative editorial matching threshold only.
 * @param {object[]} [options.scenes] Test-injectable source rows.
 * @param {object[]} [options.animations] Test-injectable procedural rows.
 * @param {object[]} [options.ranks] Test-injectable editorial ranking.
 */
export function auditVideoSiteCoverage({
  aspect="portrait",minScore=65,scenes=sceneCatalog.scenes,
  animations=motionCatalog.scenes,ranks=editorialRanks.scenes,
}={}){
  if(!ASPECTS.has(aspect)||!Number.isInteger(minScore)||minScore<0||
    minScore>100||![scenes,animations,ranks].every(Array.isArray))
    throw Error("INVALID_VIDEO_SITE_COVERAGE_INPUT");
  const cross=auditVideoTopicCrosswalk();
  if(!cross.valid)throw Error("INVALID_VIDEO_STUDIO_MYTUBE_CROSSWALK");
  const usedIds=new Set(),usedVideos=new Set();
  const candidates=[];
  for(const s of scenes){
    if(!safeScene(s,aspect)||usedIds.has(s.id)||usedVideos.has(s.video))continue;
    usedIds.add(s.id);usedVideos.add(s.video);candidates.push(s);
  }
  const possibleIds=new Set(candidates.map(s=>s.id));
  const rankingByTopic=new Map();
  for(const r of ranks){
    if(!possibleIds.has(r.sceneId)||!Array.isArray(r.topics))continue;
    for(const [index,t] of r.topics.entries()){
      if(!t||typeof t.topicId!=="string"||typeof t.score!=="number"||t.score<minScore)continue;
      const old=rankingByTopic.get(t.topicId)||new Map();
      const prior=old.get(r.sceneId);
      if(!prior||prior.score<t.score)old.set(r.sceneId,{score:t.score,primary:index===0});
      rankingByTopic.set(t.topicId,old);
    }
  }
  const topics=[],categories=[],queue=[];
  for(const category of taxonomy.categories){
    let covered=0,readyFour=0;
    for(const sub of category.subcategories)for(const t of sub.topics){
      const matches=[...(rankingByTopic.get(t.id)?.entries()||[])];
      const approvedClipIds=matches.map(([id])=>id).sort();
      const primaryCount=sum(matches,([,x])=>x.primary);
      const count=matches.length;
      if(count>0)covered++;
      if(count>=4)readyFour++;
      const row={categoryId:category.id,subcategoryId:sub.id,topicId:t.id,
        categoryLabel:category.label.ru,subcategoryLabel:sub.label.ru,
        topicLabel:t.label.ru,aspect,taggedCandidateCount:count,
        primaryTaggedCount:primaryCount,
        catalogClipIds:approvedClipIds,
        hasFourTopicTaggedOptions:count>=4,
        frameVerifiedClipCount:0,verifiedStoryboards:0,
        readyForRealFootageExport:false,evidence:RANK_STATUS};
      topics.push(row);
      const shortage=Math.max(0,4-count);
      if(shortage)queue.push({categoryId:category.id,topicId:t.id,
        topicLabel:t.label.ru,aspect,taggedOptions:count,optionsShortOfFour:shortage,
        priority:["love-relationships","stress-anxiety"].includes(category.id)?0:1,
        stage:"new_independent_source_rights_and_visual_review_required",
        sourceAssetIds:[],approvedForImport:false});
    }
    categories.push({id:category.id,label:category.label.ru,totalTopics:16,
      topicsWithAnyTaggedOption:covered,topicsWithFourTaggedOptions:readyFour,
      topicsWithoutTaggedOptions:16-covered,
      evidence:RANK_STATUS});
  }
  queue.sort((a,b)=>a.priority-b.priority||a.taggedOptions-b.taggedOptions||
    a.topicId.localeCompare(b.topicId));
  const studioTopics=VIDEO_GOAL_TOPICS.map(t=>{
    const linked=crosswalk.studioToMyTube[t.id];
    const linkedRows=linked.map(id=>topics.find(row=>row.topicId===id)).filter(Boolean);
    return {studioTopicId:t.id,studioCategoryId:t.categoryId,
      relatedMyTubeTopicIds:linked,
      relatedTopicsWithTaggedOptions:sum(linkedRows,row=>row.taggedCandidateCount>0),
      mediaBoundShotCount:0,
      shotCount:VIDEO_GOAL_SCENARIOS.filter(s=>s.topicId===t.id).length*4,
      readyForRealFootageExport:false,evidence:"topic_crosswalk_only_no_verified_shot_bindings"};
  });
  const studioShots=studioTopics.reduce((total,t)=>total+t.shotCount,0);
  const allVideoPaths=[...scenes,...animations].map(s=>s?.video).filter(Boolean);
  const distinctPaths=distinct(allVideoPaths);
  const duplicatePaths=allVideoPaths.length-distinctPaths;
  return {
    schemaVersion:"hh-video-site-coverage-v2",
    aspect,minScore,sourceRevision:"repository_manifests_not_live_provider_readback",
    inventory:{
      localLicensedCatalogRows:scenes.length,
      localLicensedEligibleForAspect:candidates.length,
      proceduralAnimationCatalogRows:animations.length,
      combinedCatalogRows:scenes.length+animations.length,
      distinctCatalogVideoPaths:distinctPaths,duplicatePaths,
      independentlyVerifiedCameraMasters:null,
      locallyDecodedAndHashedThisRun:false,
      r2RegisteredReady:null,r2PhysicalReady:null,
      cloudInventoryState:"not_queried_this_run",
      externalYouTubeIndexState:"separate_not_counted_as_mp4",
    },
    summary:{
      mytubeCategories:categories.length,
      mytubeSubcategories:sum(taxonomy.categories,c=>c.subcategories.length===4)*4,
      mytubeTopics:topics.length,
      mytubeTopicsWithAnyTaggedOption:sum(topics,t=>t.taggedCandidateCount>0),
      mytubeTopicsWithFourTaggedOptions:sum(topics,t=>t.hasFourTopicTaggedOptions),
      mytubeTopicsWithoutTaggedOptions:sum(topics,t=>t.taggedCandidateCount===0),
      mytubeFrameVerifiedStories:0,
      studioCategories:5,studioTopics:studioTopics.length,
      studioScenarios:VIDEO_GOAL_SCENARIOS.length,studioShots,
      studioVerifiedBoundShots:0,
      sitePlacementGroups:VIDEO_SITE_PLACEMENTS.length,
      mediaAndRightsStatus:"metadata_only_never_claim_export_ready",
    },
    categories,topics,studioTopics,
    storyboardEvidence:auditStoredStoryboardEvidence(),
    sourcingQueue:queue,sites:VIDEO_SITE_PLACEMENTS,
    mapping:cross,
  };
}
