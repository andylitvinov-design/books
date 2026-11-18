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
export function storyReviewRequired(concept){
 const changed=Array.isArray(concept?.userEditedFields)&&
  concept.userEditedFields.some(key=>["mainMessage","conceptText","storyboard"].includes(key));
 const signature=storyReviewSignature(concept);
 return Boolean(changed&&signature&&concept?.storyReviewSignature!==signature);
}
export function validEditorialShotActions(actions){
 if(!Array.isArray(actions)||actions.length!==6||
    actions.some(a=>typeof a!=="string"||text(a,361).length<24||text(a,361).length>360))
  return false;
 return new Set(actions.map(a=>text(a,360).toLocaleLowerCase())).size===6;
}
