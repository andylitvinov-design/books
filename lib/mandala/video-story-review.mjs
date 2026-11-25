/**
 * Editorial screenplay versioning: editing an idea or narrative cannot
 * silently approve an older six-shot plan as though it still matched.
 * Client-local only; never verifies pixels, footage licensing or a person.
 */
const text=(value,max=2500)=>String(value??"").normalize("NFKC")
  .replace(/[\u0000-\u001f\u007f]/gu," ").replace(/\s+/gu," ").trim().slice(0,max);
export function storyReviewSignature(concept){
 if(!Array.isArray(concept?.storyboard)||concept.storyboard.length!==6)return null;
 return JSON.stringify([
  text(concept.mainMessage,600),text(concept.conceptText,2500),
  ...concept.storyboard.map(shot=>[
    text(shot?.title,180),text(shot?.action,400),text(shot?.emotion,180),
    text(shot?.shotType,60),Array.isArray(shot?.continuityKeys)?
      shot.continuityKeys.map(key=>text(key,80)):[]
  ])
 ]);
}
/**
 * Strict action-level fidelity for structured screenplay stories.
 * A human editorial confirmation cannot override missing or reordered scenes.
 * Curated stories without conceptScenes remain manual-review only.
 */
export function conceptSceneAlignment(concept){
 const scenes=concept?.conceptScenes;
 if(!Array.isArray(scenes)||!scenes.length)
  return {aligned:true,checked:false,reason:"no_structured_scenes"};
 const shots=concept?.storyboard;
 if(!Array.isArray(shots)||shots.length!==scenes.length||scenes.length!==6)
  return {aligned:false,checked:true,reason:"scene_count_mismatch"};
 const body=text(concept?.conceptText,16000).toLocaleLowerCase();
 let from=0;
 for(let i=0;i<scenes.length;i++){
  const scene=scenes[i],shot=shots[i];
  const action=text(shot?.action,600).toLocaleLowerCase();
  if(!action||scene?.id!==shot?.sceneId||
     text(scene?.action,600).toLocaleLowerCase()!==action)
   return {aligned:false,checked:true,reason:"shot_action_mismatch",index:i+1};
  const at=body.indexOf(action,from);
  if(at<0)return {aligned:false,checked:true,reason:"script_action_missing_or_reordered",index:i+1};
  from=at+action.length;
 }
 return {aligned:true,checked:true,reason:"script_and_six_shots_match"};
}
export function storyReviewRequired(concept){
 const changed=Array.isArray(concept?.userEditedFields)&&
  concept.userEditedFields.some(key=>["mainMessage","conceptText","storyboard"].includes(key));
 const signature=storyReviewSignature(concept);
 return Boolean((changed&&signature&&concept?.storyReviewSignature!==signature)||
   !conceptSceneAlignment(concept).aligned);
}
export function validEditorialShotActions(actions){
 if(!Array.isArray(actions)||actions.length!==6||
    actions.some(a=>typeof a!=="string"||text(a,361).length<24||text(a,361).length>360))
  return false;
 return new Set(actions.map(a=>text(a,360).toLocaleLowerCase())).size===6;
}
