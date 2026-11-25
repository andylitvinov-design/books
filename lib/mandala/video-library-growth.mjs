/**
 * Read-only inventory and editorial sourcing backlog for the existing Video Studio.
 * A source-page URL, draft, variant, or storyboard is NEVER a published video.
 * This module performs no download, import, render, account operation, or payment.
 */
export const VIDEO_LIBRARY_TARGET=320;
const ID=/^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const RIGHTS=new Set(["existing_approved_first_party_master","dareful_cc_by_4_0"]);
const CC_BY="https://creativecommons.org/licenses/by/4.0/";

function requiredArray(value,label){
  if(!Array.isArray(value))throw Error("invalid_"+label);
  return value;
}
function uniqueIds(rows,label){
  const used=new Set();
  for(const row of rows){
    if(!ID.test(row?.id||"")||used.has(row.id))throw Error("duplicate_or_invalid_"+label);
    used.add(row.id);
  }
}
function flattenEditorialTaxonomy(taxonomy){
  const categories=requiredArray(taxonomy?.categories,"editorial_categories");
  if(categories.length!==4)throw Error("expected_four_editorial_categories");
  uniqueIds(categories,"category");
  const topics=[],scenarioIds=new Set(),topicIds=new Set(),subIds=new Set();
  for(const category of categories){
    const subs=requiredArray(category.subcategories,"subcategories");
    if(subs.length!==4)throw Error("expected_four_subcategories");
    uniqueIds(subs,"subcategory");
    for(const sub of subs){
      if(subIds.has(sub.id))throw Error("duplicate_subcategory");
      subIds.add(sub.id);
      const four=requiredArray(sub.topics,"topics");
      if(four.length!==4)throw Error("expected_four_topics");
      uniqueIds(four,"topic");
      for(const topic of four){
        if(topicIds.has(topic.id))throw Error("duplicate_topic");
        topicIds.add(topic.id);
        if(typeof topic.label?.en!=="string"||!topic.label.en.trim())throw Error("missing_english_topic_label");
        const stories=requiredArray(topic.scenarios,"scenarios");
        if(stories.length!==4)throw Error("expected_four_scenarios");
        uniqueIds(stories,"scenario");
        for(const story of stories){
          if(scenarioIds.has(story.id))throw Error("duplicate_story");
          scenarioIds.add(story.id);
        }
        topics.push({categoryId:category.id,subcategoryId:sub.id,
          topicId:topic.id,topicEn:topic.label.en,scenarios:stories.length});
      }
    }
  }
  return {categories:categories.map(item=>({id:item.id,label:item.label?.en||item.id})),
    topics,scenarioCount:scenarioIds.size};
}
function inspectApproved(catalog,rightsRecords){
  const scenes=requiredArray(catalog?.scenes,"approved_catalog");
  if(catalog.count!==scenes.length)throw Error("catalog_count_mismatch");
  uniqueIds(scenes,"approved_scene");
  const videos=new Set(),sourceHashes=new Set();
  for(const s of scenes){
    if(s.status!=="approved"||s.media!=="licensed_mp4"||
       !RIGHTS.has(s.rightsReference?.kind)||
       !/^\/videos\/holistic-house\/(money-films-v1|film-collection-v2|film-collection-v3)\/[a-z0-9-]+\.mp4$/.test(s.video||"")||
       !s.video.endsWith("/"+s.id+".mp4")||
       videos.has(s.video))throw Error("unusable_approved_scene_"+(s.id||"unknown"));
    videos.add(s.video);
  }
  const publishedPages=new Set();
  for(const s of requiredArray(rightsRecords,"published_source_records")){
    for(const item of requiredArray(s.sources,"published_sources")){
      if(typeof item.sourcePage==="string")publishedPages.add(item.sourcePage);
      if(typeof item.sha256==="string")sourceHashes.add(item.sha256);
    }
  }
  return {sceneCount:scenes.length,publishedPages,sourceHashes};
}
function inspectPending(manifests,publishedPages){
  // Promotions are reflected in the approved canonical catalog and source
  // provenance; a once-pending item must not block future legitimate imports.
  const sourcePages=new Set(),ids=new Set(),pending=[],publishedSourceIds=[];
  for(const manifest of requiredArray(manifests,"candidate_manifests")){
    if(manifest?.version!=="hh-dareful-source-candidates-v1"||
       manifest.approvedForPublication!==false||manifest.licenseUrl!==CC_BY)
      throw Error("unsafe_candidate_manifest");
    for(const item of requiredArray(manifest.sources,"candidate_sources")){
      const page="https://dareful.com/"+item.id+"/";
      if(!ID.test(item.id||"")||item.sourcePage!==page||
         typeof item.mediaUrl!=="string"||
         !/^https:\/\/stream\.mux\.com\/[a-zA-Z0-9]+\.m3u8$/.test(item.mediaUrl)||
         item.visualReviewRequired!==true||
         ids.has(item.id)||sourcePages.has(page))
        throw Error("duplicate_or_unreviewed_candidate_"+(item?.id||"unknown"));
      ids.add(item.id);sourcePages.add(page);
      if(publishedPages.has(page)){
        publishedSourceIds.push(item.id);
        continue;
      }
      pending.push({id:item.id,sourcePage:page,theme:item.suggestedTheme||null,
        status:"pending_editorial_review_not_imported",
        requiresActualSourceFrames:true,requiresIndividualLicenseRecheck:true});
    }
  }
  return {pending,publishedSourceIds};
}

export function planVideoLibraryGrowth({catalog,publishedSourceRecords=[],
  candidateManifests=[],mytube,target=VIDEO_LIBRARY_TARGET}={}){
  if(!Number.isInteger(target)||target<320||target>2000)
    throw Error("invalid_unique_video_target");
  const approved=inspectApproved(catalog,publishedSourceRecords);
  const {pending,publishedSourceIds}=inspectPending(candidateManifests,approved.publishedPages);
  const editorial=flattenEditorialTaxonomy(mytube);
  const topicBase=Math.floor(target/editorial.topics.length);
  const topicRemainder=target%editorial.topics.length;
  const phrases=[
    "distinct establishing location and clear subject",
    "real close-up detail or meaningful symbolic object",
    "genuine visible camera or environmental movement",
    "different location or visual perspective for a transition",
    "original, visually distinct integration or resolution shot",
  ];
  const sourcePlan=editorial.topics.flatMap((topic,topicIndex)=>
    Array.from({length:topicBase+(topicIndex<topicRemainder?1:0)},(_,index)=>({
      key:topic.topicId+"-source-"+(index+1),
      category:topic.categoryId,subcategory:topic.subcategoryId,
      topic:topic.topicId,sourceIndex:index+1,
      visualBrief:topic.topicEn+" — "+phrases[index%phrases.length]+
        (index>=phrases.length?", independently sourced viewpoint "+(index+1):""),
      sourceUrl:null,license:null,originalMasterSha256:null,
      reviewStatus:"not_sourced_not_published",
    })));
  const byCategory=editorial.categories.map(category=>({
    id:category.id,label:category.label,
    topics:editorial.topics.filter(t=>t.categoryId===category.id).length,
    desiredUniqueVisualSources:sourcePlan.filter(item=>item.category===category.id).length,
    independentlyApprovedForThisCategory:null,
  }));
  return {
    schemaVersion:"hh-video-library-growth-v1",
    publicationStatus:"PLAN_ONLY_NO_ADDITIONAL_LIVE_MP4",
    currentApprovedCatalogRecords:approved.sceneCount,
    newlyPublishedByThisPlanner:0,
    uniqueSourceTarget:target,
    minimumAdditionalApprovedMasters:Math.max(0,target-approved.sceneCount),
    editorialCategories:editorial.categories.length,
    editorialTopics:editorial.topics.length,
    editorialScenarios:editorial.scenarioCount,
    scenarioFourShotRequirements:editorial.scenarioCount*4,
    minimumSourcesPerTopic:topicBase,
    pendingCandidateSources:pending.length,
    candidateSourcesAlreadyInPublishedProvenance:publishedSourceIds.length,
    pendingUnapprovedNotCounted:pending,
    byCategory,
    proposedSourceBriefs:sourcePlan,
    globallyDistinctMasterProof:"requires_sha256_and_frame_comparison_on_real_files",
    approvedCatalogRightsCaveat:"collection-only provenance requires per-source review",
    releaseGate:"license_and_creator_proof + original_video + ffprobe_frame_motion + dedupe + editor_approval + phone_export",
  };
}
