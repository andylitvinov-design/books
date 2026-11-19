/**
 * Photographic storyboard references, NOT approved render sources.
 * The user sees genuine catalog photographs even when an exact filmed
 * action has not yet been verified. No new network provider or upload.
 */
import {STORY_PHOTOS,STORY_PHOTO_BY_ID,getMyTubeScenarioPhotos,isTrustedStoryPhoto}
 from "./story-photo-library.mjs";
const EDITORIAL_REFERENCES=Object.freeze({
 // Making Room for Love: six nearby, distinct REAL photographic ideas.
 // This is not a claim that any photo depicts the exact scripted action.
 "ready-relationship-s1":Object.freeze([
  "pexels-36113252","pexels-13410205","pexels-7747182",
  "pexels-40043387","pexels-37713503","pexels-17123438"
 ])
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
 const avoided=new Set(avoid.split(/[^a-z]+/).filter(Boolean));
 for(const motif of ["forest","water","ocean","sea","mountain","flowers","city","rain"]){
  if(avoided.has(motif)&&(tags.has(motif)||
   (motif==="water"&&["ocean","sea","river","lake"].some(tag=>tags.has(tag)))))
   return false;
 }
 return true;
}
/** One slot per storyboard beat (photo or null). Exact selected scenario only.
 * Never use these preview references as an automatic montage/MP4 asset.
 */
export function storyboardPhotoReferences({
 scenarioId="",categoryId="",shotCount=6,avoidImagery=[]
}={}){
 if(!Number.isInteger(shotCount)||shotCount<1||shotCount>12)return [];
 const curated=EDITORIAL_REFERENCES[scenarioId]||[];
 const assigned=getMyTubeScenarioPhotos(scenarioId);
 const category=CATEGORY[categoryId]||null;
 const generic=category?STORY_PHOTOS.filter(photo=>
  photo.autoUseEligible===true&&photo.categories?.includes(category)&&permitted(photo,avoidImagery)):[];
 const used=new Set();
 return Array.from({length:shotCount},(_,i)=>{
  const photo=[STORY_PHOTO_BY_ID.get(curated[i]),assigned[i],...generic]
   .find(candidate=>candidate&&!used.has(candidate.id)&&permitted(candidate,avoidImagery))||null;
  if(photo)used.add(photo.id);
  return photo;
 });
}
export const STORYBOARD_REFERENCE_STATUS="editorial_photo_reference_not_action_verified";
