import registry from "../../data/video-catalog/photo-library-v1.json" with { type: "json" };
import goals from "../../data/video-catalog/video-goal-taxonomy-body-v1.json" with { type: "json" };
import business from "../../data/video-catalog/video-goal-taxonomy-business-v1.json" with { type: "json" };
import energy from "../../data/video-catalog/video-goal-taxonomy-energy-v1.json" with { type: "json" };
import love from "../../data/video-catalog/video-goal-taxonomy-love-v1.json" with { type: "json" };
import stress from "../../data/video-catalog/video-goal-taxonomy-stress-v1.json" with { type: "json" };

const TOPICS=[goals,business,energy,love,stress].flatMap(group=>
  (group.topics||[]).map(topic=>({...topic,categoryId:group.id})));
const ASPECTS=new Set(["portrait","landscape","square"]);
const HASH=/^[a-f0-9]{64}$/;
const PHOTO_PATH=/^\/images\/video-library\/[a-z0-9-]+[.]jpg$/;
const normalize=value=>String(value||"").trim().toLowerCase();
const photoWords=photo=>new Set([...(photo.tags||[]),...(photo.motifs||[])].map(normalize));
const unique=values=>[...new Set(values)];

export const PHOTO_LIBRARY_VERSION=registry.version;
export const PHOTO_LIBRARY_POLICY=Object.freeze(registry.selectionPolicy);
export const PHOTO_SOURCE_QUEUE=Object.freeze(registry.assets);
export const PHOTO_LIBRARY=Object.freeze(registry.assets.filter(isApprovedPhoto));

export function isApprovedPhoto(photo){
  return Boolean(photo&&photo.class==="photograph"&&photo.status==="approved"&&
    photo.downloadStatus==="imported"&&photo.rightsStatus==="source-license-verified"&&
    photo.editorialStatus==="source-and-frame-reviewed"&&
    PHOTO_PATH.test(photo.localPath||"")&&HASH.test(photo.sha256||"")&&
    Number.isInteger(photo.width)&&photo.width>=720&&
    Number.isInteger(photo.height)&&photo.height>=720&&
    Number.isInteger(photo.bytes)&&photo.bytes>0&&photo.bytes<=5*1024*1024&&
    ASPECTS.has(photo.aspect)&&Array.isArray(photo.allowedAspects)&&
    photo.allowedAspects.length>0&&photo.allowedAspects.every(x=>ASPECTS.has(x))&&
    typeof photo.sourcePageUrl==="string"&&
    photo.sourcePageUrl.startsWith("https://commons.wikimedia.org/wiki/File:")&&
    typeof photo.sourceFileUrl==="string"&&
    photo.sourceFileUrl.startsWith("https://upload.wikimedia.org/wikipedia/commons/")&&
    (photo.licenseId==="CC0-1.0"||photo.licenseId==="Public-Domain"||photo.licenseId==="CC-BY-2.0")&&
    typeof photo.attribution==="string"&&photo.attribution.length>=8);
}

export function rankPhotoFallback(records,{topicId,scenarioId=null,requiredTags=[],aspect="portrait",
  excludedMotifs=[],usedPhotoIds=[],limit=8}={}){
  if(!Array.isArray(records)||typeof topicId!=="string"||!topicId||
    !ASPECTS.has(aspect)||!Array.isArray(requiredTags)||!Array.isArray(excludedMotifs)||
    !Array.isArray(usedPhotoIds)||!Number.isInteger(limit)||limit<1||limit>24)return [];
  const wanted=new Set(requiredTags.map(normalize).filter(Boolean));
  const excluded=new Set(excludedMotifs.map(normalize).filter(Boolean));
  const used=new Set(usedPhotoIds);
  return records.filter(photo=>isApprovedPhoto(photo)&&
    photo.topicIds?.includes(topicId)&&photo.allowedAspects.includes(aspect)&&!used.has(photo.id))
    .map(photo=>{
      const tags=photoWords(photo);
      if([...excluded].some(tag=>tags.has(tag)))return null;
      const matched=unique([...wanted].filter(tag=>tags.has(tag)));
      const scenarioBoost=scenarioId&&photo.scenarioIds?.includes(scenarioId)?8:0;
      const score=matched.length*10+scenarioBoost;
      if(wanted.size&&matched.length===0)return null;
      return {photo,score,matchedTags:matched};
    }).filter(Boolean).sort((a,b)=>b.score-a.score||a.photo.id.localeCompare(b.photo.id))
    .slice(0,limit).map(item=>({...item.photo,matchScore:item.score,matchedTags:item.matchedTags}));
}

export function listApprovedPhotos({topicId=null,aspect=null,tags=[]}={}){
  if(aspect!==null&&!ASPECTS.has(aspect))return [];
  const wanted=new Set((Array.isArray(tags)?tags:[]).map(normalize).filter(Boolean));
  return PHOTO_LIBRARY.filter(photo=>
    (!topicId||photo.topicIds.includes(topicId))&&
    (!aspect||photo.allowedAspects.includes(aspect))&&
    (!wanted.size||[...wanted].some(tag=>photoWords(photo).has(tag))));
}

/** Call only after the approved video resolver has exhausted exact-fit footage. */
export function resolveStoryboardVisual({videoCandidates=[],topicId,scenarioId=null,
  requiredTags=[],aspect="portrait",excludedMotifs=[],usedPhotoIds=[]}={}){
  if(!Array.isArray(videoCandidates))
    return {kind:"media-needed",reason:"invalid-video-candidate-list",fallback:false};
  const validVideo=videoCandidates.find(item=>item&&item.status==="approved"&&
    item.media==="licensed_mp4"&&typeof item.video==="string"&&
    /^\/videos\/holistic-house\/[a-z0-9_/-]+[.]mp4$/.test(item.video));
  if(validVideo)return {kind:"video",asset:validVideo,fallback:false};
  const [photo]=rankPhotoFallback(PHOTO_LIBRARY,{topicId,scenarioId,requiredTags,aspect,
    excludedMotifs,usedPhotoIds,limit:1});
  if(photo)return {kind:"photo",asset:photo,fallback:true,motion:"local-ken-burns",
    externalProviderCalls:0,rights:photo.licenseId,attribution:photo.attribution};
  return {kind:"media-needed",reason:"no-approved-video-or-imported-photo",fallback:false};
}

export function getPhotoCoverageReport(){
  return TOPICS.map(topic=>{
    const photos=PHOTO_LIBRARY.filter(photo=>photo.topicIds.includes(topic.id));
    return {topicId:topic.id,categoryId:topic.categoryId,approvedPhotoCount:photos.length,
      targetPhotoCount:registry.selectionPolicy.perTopicMinimum,
      missingPhotoCount:Math.max(0,registry.selectionPolicy.perTopicMinimum-photos.length),
      photoIds:photos.map(photo=>photo.id)};
  });
}

export function getPhotoLibrarySummary(){
  const byAspect=Object.fromEntries([...ASPECTS].map(aspect=>[
    aspect,PHOTO_LIBRARY.filter(photo=>photo.aspect===aspect).length]));
  const byCategory=Object.fromEntries(["love","stress","energy","business","body"].map(category=>[
    category,PHOTO_LIBRARY.filter(photo=>photo.categories.includes(category)).length]));
  const coverage=getPhotoCoverageReport();
  return {version:PHOTO_LIBRARY_VERSION,approvedPhotos:PHOTO_LIBRARY.length,
    sourceVerifiedPendingImport:registry.assets.filter(photo=>
      photo.status==="source_verified_pending_import").length,
    failedImports:registry.assets.filter(photo=>photo.downloadStatus==="failed").length,
    byAspect,byCategory,topicsWithAnyPhoto:coverage.filter(row=>row.approvedPhotoCount>0).length,
    totalTopics:coverage.length,topicsAtTarget:coverage.filter(row=>row.approvedPhotoCount>=row.targetPhotoCount).length,
    missingSourceCount:registry.assets.length-PHOTO_LIBRARY.length};
}
