/** Licensed photographic REFERENCES, not proof of filmed actions or MP4 approval. */
import {STORY_PHOTOS,STORY_PHOTO_BY_ID,getMyTubeScenarioPhotos,isTrustedStoryPhoto,
 MYTUBE_SCENARIO_PHOTO_COVERAGE}
 from "./story-photo-library.mjs";
import {assignNarrativeShotSources} from "./narrative-shot-assignment.mjs";
import {scoreScenePhoto} from "./storyboard-visual-matcher.mjs";

const EDITORIAL_REFERENCES=Object.freeze({
 "ready-relationship-s1":Object.freeze([
  "pexels-36113252","pexels-13410205","pexels-7747182",
  "pexels-40043387","pexels-37713503","pexels-17123438"
 ]),
 "ready-relationship-s2":Object.freeze({
  landscape:Object.freeze([
   "pexels-36085970","pexels-4669488","pexels-13872590",
   "pexels-7259761","pexels-36824272","pexels-4413480"
  ]),
  portrait:Object.freeze([
   "pexels-35854894","pexels-29783867","pexels-12220945",
   "pexels-5438150","pexels-14750530","pexels-36667696"
  ])
 })
});
const CATEGORY=Object.freeze({
 "love-relationships":"love","goals-money":"business",
 "stress-anxiety":"stress","energy-confidence":"energy"
});
const PERSON=/\b(?:people|person|man|woman|women|men|couple|friends?|hands|family|crowd|child|walking)\b/iu;
function permitted(photo,avoidImagery){
 if(!photo||!isTrustedStoryPhoto(photo))return false;
 const avoid=Array.isArray(avoidImagery)?avoidImagery.join(" ").toLowerCase():"";
 const tags=new Set(photo.tags||[]);
 if(/no people|without people|без людей|sin personas|sin gente/i.test(avoid)&&
   (photo.tags||[]).some(tag=>PERSON.test(tag)))return false;
 const excluded=new Set(avoid.split(/[^a-z]+/).filter(Boolean));
 for(const motif of ["forest","water","ocean","sea","mountain","flowers","city","rain"]){
  if(excluded.has(motif)&&(tags.has(motif)||
    (motif==="water"&&["ocean","sea","river","lake"].some(tag=>tags.has(tag)))))
   return false;
 }
 return true;
}
function unique(items){
 const used=new Set();
 return items.filter(p=>p&&!used.has(p.id)&&used.add(p.id));
}
/** Ordered selected film actions are the matching basis. No speculative category filler.
 * Legacy callers without an authored guide retain illustrative references.
 * Missing exact action evidence is an honest null / NEEDS_MEDIA, never a random photo.
 */
export function storyboardPhotoReferences({
 scenarioId="",categoryId="",shotCount=6,avoidImagery=[],sceneGuides=null,aspect="landscape"
}={}){
 if(!Number.isInteger(shotCount)||shotCount<1||shotCount>12)return [];
 const specified=EDITORIAL_REFERENCES[scenarioId];
 const pins=Array.isArray(specified)?specified:
  (specified?.[aspect==="portrait"?"portrait":"landscape"]||[]);
 const assigned=getMyTubeScenarioPhotos(scenarioId);
 const category=CATEGORY[categoryId]||null;
 const generic=category?STORY_PHOTOS.filter(photo=>
  photo.autoUseEligible===true&&photo.categories?.includes(category)&&
  permitted(photo,avoidImagery)):[];
 const options=unique([...pins.map(id=>STORY_PHOTO_BY_ID.get(id)),...assigned,...generic])
  .filter(photo=>permitted(photo,avoidImagery)&&
   (!photo.editorialScenarioId||photo.editorialScenarioId===scenarioId));
 const authored=Array.isArray(sceneGuides)&&sceneGuides.length===shotCount&&
  sceneGuides.every(beat=>beat&&typeof beat==="object")?sceneGuides:null;
 if(authored){
  const rows=authored.map((beat,index)=>[
   ...options.flatMap(photo=>{
    const score=scoreScenePhoto(photo,beat,{
     scenarioId,pinId:pins[index]||"",aspect
    });
    return score===null?[]:[{groupKey:photo.id,source:photo,score}];
   }),
   // Each shot owns its own dummy candidate; Hungarian assignment preserves
   // useful matches and leaves missing shots empty without stealing later assets.
   {groupKey:"__missing_scene_"+index,source:{id:"__missing_scene_"+index},score:-100}
  ]);
  const assignedGlobally=assignNarrativeShotSources(rows);
  return assignedGlobally?assignedGlobally.map(item=>
   item?.source&&isTrustedStoryPhoto(item.source)?item.source:null):
   Array.from({length:shotCount},()=>null);
 }
 // Legacy external callers (such as 256-catalog coverage audit) are references
 // only and are NEVER permission to render an exact filmed action.
 const used=new Set();
 return Array.from({length:shotCount},(_,i)=>{
  const photo=[STORY_PHOTO_BY_ID.get(pins[i]),assigned[i],...generic].find(p=>
    p&&!used.has(p.id)&&permitted(p,avoidImagery))||null;
  if(photo)used.add(photo.id);
  return photo;
 });
}
export const STORYBOARD_REFERENCE_STATUS="editorial_photo_reference_not_action_verified";

// A filmed action and an illustrative photo story are different promises.
// Reuse only the existing reviewed binding of the SELECTED canonical story,
// never a category-wide/random filler. Work/learning needs work photographs,
// not the old income-growth binding containing six cash-counting close-ups.
const ILLUSTRATIVE_SCENARIO_PHOTOS=Object.freeze({
 "income-growth-s2":Object.freeze([
  "story-photo-office-employee-focus","story-photo-office-work-notes",
  "story-photo-office-project-notes","story-photo-office-laptop-document",
  "story-photo-office-team-plan","story-photo-office-manager-documents"
 ])
});
export function illustrativeStoryboardPhotoReferences({
 scenarioId="",categoryId="",shotCount=6,aspect="portrait",
 avoidImagery=[],userEditedFields=[]
}={}){
 const binding=MYTUBE_SCENARIO_PHOTO_COVERAGE[scenarioId];
 if(!binding||binding.categoryId!==categoryId||shotCount!==6||
    !["portrait","landscape"].includes(aspect))return [];
 // The original editorial set cannot vouch for a visitor's changed action or
 // exclusions. Keep that request in the strict matcher/manual-source flow.
 if(!Array.isArray(avoidImagery)||avoidImagery.some(value=>String(value).trim())||
    !Array.isArray(userEditedFields)||userEditedFields.some(field=>
      ["mainMessage","conceptText","storyboard"].includes(field)))return [];
 const photos=(ILLUSTRATIVE_SCENARIO_PHOTOS[scenarioId]||binding.photoIds)
  .map(id=>STORY_PHOTO_BY_ID.get(id));
 if(photos.length!==6||photos.some(photo=>!isTrustedStoryPhoto(photo))||
    new Set(photos.map(photo=>photo.upstreamSrc)).size!==6)return [];
 return photos;
}
export const STORYBOARD_ILLUSTRATION_STATUS="illustrative_topic_photos_not_action_verified";
