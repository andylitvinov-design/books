/**
 * Source-backed replacement catalogue for the existing four-stage video editor.
 * No provider calls, new footage, file-system paths, user profiles or payments.
 * This helper is consumed by both the client selector and the final composer.
 */
const APPROVED_COLLECTIONS=new Set(["money-films-v1","film-collection-v2","film-collection-v3"]);
const APPROVED_RIGHTS=new Set(["existing_approved_first_party_master","dareful_cc_by_4_0"]);
const ALLOWED_EXCLUSIONS=new Set(["water","forest","dark"]);
const FORBIDDEN={
  water:new Set(["water","sea","ocean","lake","river","stream","falls","waterfall","coast","beach","shore","waves","wave"]),
  forest:new Set(["forest","trees","tree","garden","woods","wood","fern","roots","root"]),
  dark:new Set(["dark","night","stars","star","midnight"]),
};

/** A public catalogue entry is trusted only if its status, provenance,
 * collection and exact same-origin MP4 path all agree.
 */
export function isApprovedMontageScene(scene){
  return !!scene&&typeof scene.id==="string"&&/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(scene.id)&&
    typeof scene.theme==="string"&&
    APPROVED_COLLECTIONS.has(scene.collection)&&APPROVED_RIGHTS.has(scene.rightsReference?.kind)&&
    scene.status==="approved"&&scene.media==="licensed_mp4"&&
    scene.video==="/videos/holistic-house/"+scene.collection+"/"+scene.id+".mp4"&&
    Array.isArray(scene.motifs)&&Array.isArray(scene.tags);
}
function exclusionList(excludedMotifs){
  if(!Array.isArray(excludedMotifs)||
    excludedMotifs.some(v=>typeof v!=="string"||!ALLOWED_EXCLUSIONS.has(v)))
    return null;
  return [...new Set(excludedMotifs)];
}
/** Suppress both explicit motif IDs and obvious source-title synonyms.
 * @param {MontageSourceScene|null|undefined} scene
 * @param {readonly string[]} [excludedMotifs]
 * @returns {boolean}
 */
export function isSafeMontageScene(scene,excludedMotifs=[]){
  if(!isApprovedMontageScene(scene))return false;
  const exclusion=exclusionList(excludedMotifs);
  if(!exclusion)return false;
  const tokens=[scene.id,...scene.motifs,...scene.tags].join(" ")
    .toLowerCase().split(/[\s_-]+/).filter(Boolean);
  const found=new Set(tokens);
  return exclusion.every(key=>![...FORBIDDEN[key]].some(word=>found.has(word)));
}
/** Final composer whitelist, never accept four arbitrary URLs or one repeated MP4.
 * @param {readonly string[]} clipIds
 * @param {readonly MontageSourceScene[]} scenes
 * @param {readonly string[]} [excludedMotifs]
 * @returns {boolean}
 */
export function validateMontageClips(clipIds,scenes,excludedMotifs=[]){
  if(!Array.isArray(clipIds)||clipIds.length!==4||
    clipIds.some(id=>typeof id!=="string"||!id.trim())||
    new Set(clipIds).size!==4||!Array.isArray(scenes)||
    !exclusionList(excludedMotifs))return false;
  const registry=new Map(scenes.filter(isApprovedMontageScene).map(scene=>[scene.id,scene]));
  return clipIds.every(id=>isSafeMontageScene(registry.get(id),excludedMotifs));
}
/**
 * @typedef {{
 *   id:string, theme:string, collection:string, status:string, media:string,
 *   video:string, rightsReference:{kind:string}, tags:readonly string[],
 *   motifs:readonly string[], pace?:string
 * }} MontageSourceScene
 */
/** Score available *real* alternatives for a stage. Preserve theme where possible,
 * and otherwise prefer overlapping motifs/tags over a random adjacent topic.
 * @param {{scenes?:readonly MontageSourceScene[],currentId?:string,
 *   selectedIds?:readonly string[],excludedMotifs?:readonly string[],
 *   limit?:number}} [options]
 * @returns {MontageSourceScene[]}
 */
export function montageReplacementOptions({
  scenes,currentId,selectedIds,excludedMotifs=[],limit=6,
}={}){
  if(!Array.isArray(scenes)||!Array.isArray(selectedIds)||
    !Number.isInteger(limit)||limit<1||limit>12||
    !exclusionList(excludedMotifs))return [];
  const original=scenes.find(item=>item?.id===currentId);
  if(!isApprovedMontageScene(original))return [];
  const selected=new Set(selectedIds);
  const originalTags=new Set(original.tags);
  const originalMotifs=new Set(original.motifs);
  return scenes.filter(scene=>
    scene?.id!==currentId&&!selected.has(scene?.id)&&isSafeMontageScene(scene,excludedMotifs))
    .map((scene,index)=>({
      scene,index,
      score:(scene.theme===original.theme?100:0)+
        scene.motifs.filter(v=>originalMotifs.has(v)).length*8+
        scene.tags.filter(v=>originalTags.has(v)).length*3+
        (scene.pace&&scene.pace===original.pace?2:0),
    }))
    .sort((a,b)=>b.score-a.score||a.index-b.index)
    .slice(0,limit)
    .map(item=>item.scene);
}
