/**
 * Owner-only, read-only Storyboard photo sourcing audit.
 * Video posters are NOT independent photographs or approved shot bindings.
 * External photo source pages are references, NOT decoded local images.
 */
import filmCatalog from "../../data/video-catalog/scene-taxonomy.json" with {type:"json"};
import approvedLedger from "../../data/video-catalog/reviewed-storyboard-bindings-v1.json" with {type:"json"};
import {VIDEO_GOAL_CATEGORIES,VIDEO_GOAL_TOPICS,VIDEO_GOAL_SCENARIOS,VIDEO_STORY_MOTIFS} from "../mandala/video-goal-taxonomy.mjs";
import {STORY_BUSINESS_PHOTOS,isTrustedStoryPhoto} from "../mandala/story-photo-library.mjs";
import {createGoalTreeMediaQueue} from "../mandala/video-goal-media-coverage.mjs";
import {isUsableFilm} from "../mandala/scenario-media-coverage.mjs";

export const STORY_PHOTO_AUDIT_VERSION="hh-story-photo-audit-v1";
const CAMERA_EVIDENCE=new Set(["source_page_verified","official_page_and_real_encoded_media"]);
const ALIASES=Object.freeze({
 sunrise:["dawn","morning"],sunset:["dusk","evening"],
 shore:["coast","beach"],river:["stream"],stream:["river"],
 ocean:["sea"],forest:["trees","tree"],tree:["trees","forest"],
 mountain:["mountains"],flowers:["bloom","flower"],meadow:["field","grass"],
 light:["sunlight","glow"],sun:["sunlight"],sky:["clouds"],
 leaves:["leaf","fern"],path:["trail"],garden:["flowers"],
 breeze:["wind"],stone:["rock"],warmth:["warm"],
 roots:["root"],hearth:["fireplace"],home:["house"],
 notebook:["notes"],stage:["presentation"],notebook:["notes","documents"],
 harvest:["crops"],road:["roadway"]
});
const PHOTO_ALIASES=Object.freeze({
 notebook:["notes","documents"],stage:["presentation"],hands:["handover"],
 circle:["meeting"],path:["career"],road:["career"],bridge:["collaboration"],
 light:["presentation"],door:["opportunity"]
});
const HUMAN_SUBJECTS=new Set([
 "hands","home","hearth","heart","window","door","bridge","notebook",
 "stage","nest","mirror","circle","shield","lantern"
]);
function match(tags,motif,aliases=ALIASES){
 const values=new Set(tags);
 if(values.has(motif))return 2;
 return (aliases[motif]||[]).some(tag=>values.has(tag))?1:0;
}
function cameraStill(scene){
 return isUsableFilm(scene)&&CAMERA_EVIDENCE.has(scene.originEvidenceLevel)&&
   scene.poster==="/videos/holistic-house/"+scene.collection+"/"+scene.id+".jpg"&&
   Array.isArray(scene.tags)&&Array.isArray(scene.motifs);
}
function photoReference(photo){
 return isTrustedStoryPhoto(photo)&&
   photo.visualOrigin==="real_camera_photo"&&
   photo.media==="licensed_photo"&&Array.isArray(photo.tags);
}
const sortedMatches=(items,motif,tagsOf,aliases)=>items
 .map(item=>({item,matchScore:match(tagsOf(item),motif,aliases)}))
 .filter(row=>row.matchScore>0)
 .sort((a,b)=>b.matchScore-a.matchScore||a.item.id.localeCompare(b.item.id));
function contextFor(categoryId){
 return {
  body:"somatic calm and physical wellbeing",
  business:"real people, purposeful work and professional progress",
  energy:"renewal, vitality and grounded movement",
  love:"respectful human connection, family and belonging",
  stress:"quiet recovery, safety and an unhurried atmosphere"
 }[categoryId]||"gentle personal growth";
}
function searchQuery(motif,categoryId){
 const title=VIDEO_STORY_MOTIFS[motif]?.en||motif;
 return title+" documentary photography natural light "+contextFor(categoryId);
}
function generationBrief(motif,categoryId){
 const title=VIDEO_STORY_MOTIFS[motif]?.en||motif;
 return "Photorealistic still of "+title+" in the context of "+contextFor(categoryId)+
  "; one clear subject and believable action, natural skin and hands when present,"+
  " soft pleasant light, calm cinematic composition, no typography, no logo, no fake employer,"+
  " no clinical claims; create separate 9:16 and 16:9 crops. Label AI-origin explicitly.";
}

/**
 * Every one of the 480 story beats stays UNBOUND until an editor checks real
 * frames, license, physical image bytes, correct aspect and specific story fit.
 * A generic motif candidate cannot silently become a finished movie.
 */
export function auditStoryPhotoCoverage({
 scenarios=VIDEO_GOAL_SCENARIOS,topics=VIDEO_GOAL_TOPICS,
 scenes=filmCatalog.scenes,photoReferences=STORY_PHOTOS,
 reviewedPlans=approvedLedger.plans,
}={}){
 if(![scenarios,topics,scenes,photoReferences,reviewedPlans].every(Array.isArray)||
    scenarios.length>200||scenes.length>300)
  throw Error("INVALID_STORY_PHOTO_AUDIT_INPUT");
 const topicById=new Map(topics.map(t=>[t.id,t]));
 const storyById=new Map(scenarios.map(s=>[s.id,s]));
 const stills=scenes.filter(cameraStill);
 const photos=photoReferences.filter(photoReference);
 const videoQueue=createGoalTreeMediaQueue({scenarios,topics,scenes});
 const rows=videoQueue.slots.map(slot=>{
  const story=storyById.get(slot.scenarioId);
  const topic=topicById.get(slot.topicId);
  const hint=VIDEO_STORY_MOTIFS[slot.visualMotifId];
  if(!story||!topic||!hint)throw Error("INVALID_STORY_PHOTO_BEAT");
  const local=sortedMatches(stills,slot.visualMotifId,
    s=>[...s.motifs,...s.tags],ALIASES).slice(0,4);
  // Current external reference list is a reviewed business collection only.
  const external=sortedMatches(photos,slot.visualMotifId,p=>p.tags,PHOTO_ALIASES)
    .filter(row=>row.item.categories?.includes(slot.categoryId)).slice(0,4);
  return {
   id:slot.id,categoryId:slot.categoryId,topicId:slot.topicId,
   scenarioId:slot.scenarioId,shot:slot.shot,
   topicTitle:topic.label,storyTitle:story.label,
   visualMotifId:slot.visualMotifId,visualHint:hint,
   candidateVideoIds:slot.candidateApprovedClipIds,
   candidateLocalStillIds:local.map(x=>x.item.id),
   candidateExternalPhotoIds:external.map(x=>x.item.id),
   sourceStatus:"unbound",photoFrameReviewed:false,videoFrameReviewed:false,
   rightsVerifiedForThisShot:false,canExport:false,
   photoCandidateState:local.length||external.length
      ?"metadata_candidate_needs_pixel_rights_and_story_review"
      :"no_relevant_photo_candidate_in_known_catalogues",
   searchQuery:searchQuery(slot.visualMotifId,slot.categoryId),
   generationBrief:generationBrief(slot.visualMotifId,slot.categoryId),
  };
 });
 const perCategory=VIDEO_GOAL_CATEGORIES.map(category=>{
  const selected=rows.filter(s=>s.categoryId===category.id);
  return {id:category.id,labels:category.label,
   topics:topics.filter(t=>t.categoryId===category.id).length,
   scenarios:scenarios.filter(s=>s.categoryId===category.id).length,
   beats:selected.length,
   beatsWithVideoTagCandidate:selected.filter(s=>s.candidateVideoIds.length).length,
   beatsWithLocalStillCandidate:selected.filter(s=>s.candidateLocalStillIds.length).length,
   beatsWithExternalPhotoReference:selected.filter(s=>s.candidateExternalPhotoIds.length).length,
   beatsMissingPhotoCandidate:selected.filter(s=>!s.candidateLocalStillIds.length&&!s.candidateExternalPhotoIds.length).length,
   approvedPhotoBindings:0};
 });
 const byNeed=new Map();
 for(const row of rows){
  if(row.candidateLocalStillIds.length||row.candidateExternalPhotoIds.length)continue;
  const key=row.categoryId+"|"+row.visualMotifId;
  const group=byNeed.get(key)||{
   id:key,categoryId:row.categoryId,motifId:row.visualMotifId,
   visualHint:row.visualHint,missingBeats:0,
   exampleScenarioId:row.scenarioId,exampleStoryTitle:row.storyTitle,
   exampleShot:row.shot,searchQuery:row.searchQuery,
   generationBrief:row.generationBrief,
   suggestedSource:HUMAN_SUBJECTS.has(row.visualMotifId)?
    "find_real_camera_photo_first":"find_licensed_camera_photo_or_generate_labeled_ai_still",
  };
  group.missingBeats++;
  byNeed.set(key,group);
 }
 const priorityQueue=[...byNeed.values()].sort((a,b)=>
   b.missingBeats-a.missingBeats||a.id.localeCompare(b.id))
   .map(group=>({...group,priority:group.missingBeats>=4?"P0":"P1"}));
 return {
  schemaVersion:STORY_PHOTO_AUDIT_VERSION,
  scope:"owner_readonly_repository_metadata_not_live_file_validation",
  warning:"Source-page/photo tags and video poster JPGs are editorial candidates only. No external JPEG, Cloudflare R2 object, filmed master or final export was decoded by this audit.",
  summary:{
   categories:perCategory.length,topics:topics.length,scenarios:scenarios.length,
   storyboardBeats:rows.length,unboundBeats:rows.filter(x=>x.sourceStatus==="unbound").length,
   cataloguedVideoCompositions:scenes.filter(isUsableFilm).length,
   localCameraSourcePosterReferences:stills.length,
   localLegacyPosterReferences:scenes.filter(isUsableFilm).length-stills.length,
   externalPhotoSourceReferences:photos.length,
   beatsWithAnyPhotoCandidate:rows.filter(s=>s.candidateLocalStillIds.length||s.candidateExternalPhotoIds.length).length,
   beatsWithoutPhotoCandidate:rows.filter(s=>!s.candidateLocalStillIds.length&&!s.candidateExternalPhotoIds.length).length,
   beatsWithVideoTagCandidate:rows.filter(s=>s.candidateVideoIds.length).length,
   reviewedFourShotPlans:reviewedPlans.length,
   verifiedPhotoBindings:0,
   photoFilesDecodedInThisAudit:false,remoteVaultChecked:false,
   acquisitionMotifCategoryGroups:priorityQueue.length,
  },
  categories:perCategory,
  sources:{
   localVideoFrameStills:stills.map(s=>({
    id:s.id,poster:s.poster,labels:s.label,
    originEvidence:s.originEvidenceLevel,
    sourceKind:"video_poster_still_not_independent_photo",
   })),
   externalPhotoReferences:photos.map(p=>({
    id:p.id,sourcePage:p.sourcePage,labels:p.labels,
    sourceKind:"remote_photo_reference_not_download_or_decode_verified",
   })),
  },
  priorityQueue,rows,
 };
}
