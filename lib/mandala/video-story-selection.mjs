/**
 * One source of truth for Ideas -> Montage scene continuity.
 *
 * Both workspaces consume the SAME base brief and the same selected direction.
 * Never silently replace a visitor-selected film with the first taxonomy film
 * when a draft signature is stale, nor reuse an old concept after a new goal.
 * Pure editorial data, no network, media verification, payments or storage.
 */
import {getVideoCreativeDirections,applyVideoCreativeDirection} from "./video-creative-directions.mjs";

export function isCurrentVideoFilmIntent(base,candidate){
 return Boolean(base&&candidate&&
  (candidate.signature===base.signature||candidate.baseSignature===base.signature));
}

export function resolveSelectedVideoFilm({
 base=null,locale="en",selectedDirectionId=null,draft=null,approved=null
}={}){
 if(!base)return {concept:null,source:"no_brief",directionId:null,selectionMissing:false};
 const options=getVideoCreativeDirections(base,locale);
 const currentDraft=isCurrentVideoFilmIntent(base,draft)?draft:null;
 const currentApproved=isCurrentVideoFilmIntent(base,approved)?approved:null;
 const explicit=typeof selectedDirectionId==="string"&&selectedDirectionId.trim()
  ?selectedDirectionId.trim():null;
 const id=explicit||currentDraft?.creativeDirectionId||
  currentApproved?.creativeDirectionId||options[0]?.id||null;
 const direction=options.find(item=>item.id===id);
 // If this intent had an explicitly chosen film that is no longer available,
 // never substitute another plot. The editor should request a new selection.
 if(explicit&&!direction)return {
  concept:base,source:"selection_missing",directionId:explicit,selectionMissing:true
 };
 const chosen=(candidate)=>Boolean(candidate&&candidate.creativeDirectionId===id);
 if(chosen(currentDraft))return {concept:currentDraft,source:"draft",directionId:id,selectionMissing:false};
 if(chosen(currentApproved))return {concept:currentApproved,source:"approved",directionId:id,selectionMissing:false};
 if(direction)return {concept:applyVideoCreativeDirection(base,direction),
  source:explicit?"selected":"default",directionId:id,selectionMissing:false};
 return {concept:currentDraft||currentApproved||base,
  source:currentDraft?"draft":currentApproved?"approved":"undirected",
  directionId:id,selectionMissing:false};
}
