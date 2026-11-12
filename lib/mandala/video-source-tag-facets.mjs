/**
 * One conservative tag vocabulary for every approved Holistic House MP4.
 * Tags describe existing catalogue metadata; not verified literal shot content,
 * camera motion, model releases, health effects or publishing permissions.
 */
const ASPECTS=new Set(["portrait","landscape","square"]);
const LEGACY_PORTRAIT_COLLECTIONS=new Set([
  "money-films-v1","film-collection-v2","film-collection-v3","original-motion-v1",
]);
const clean=items=>[...new Set((Array.isArray(items)?items:[])
  .filter(x=>typeof x==="string").map(x=>x.trim().toLowerCase()).filter(Boolean))];

export function physicalSceneAspect(scene){
  if(!scene||typeof scene!=="object")return null;
  const w=scene.width,h=scene.height;
  if(Number.isInteger(w)&&Number.isInteger(h)&&w>0&&h>0)
    return w===h?"square":w>h?"landscape":"portrait";
  // Original release manifests independently document all 44 legacy 16:9-
  // unlabelled MP4s as 9:16. New unknown families must provide real dimensions.
  return LEGACY_PORTRAIT_COLLECTIONS.has(scene.collection)?"portrait":null;
}

export function sceneSupportsPhysicalAspect(scene,targetAspect=null){
  if(targetAspect===null)return true;
  if(!ASPECTS.has(targetAspect)||physicalSceneAspect(scene)!==targetAspect)return false;
  return scene.allowedAspects===undefined||
    (Array.isArray(scene.allowedAspects)&&scene.allowedAspects.includes(targetAspect));
}

export function deriveVideoSceneTags(scene,{motifs=[],styles=[],topics=[]}={}){
  if(!scene||scene.status!=="approved"||
    !["licensed_mp4","original_motion_mp4"].includes(scene.media)||
    typeof scene.id!=="string"||!Array.isArray(scene.tags)||
    !Array.isArray(scene.categories)||!Array.isArray(scene.motifs)||
    !scene.rightsReference?.kind)return null;
  const aspect=physicalSceneAspect(scene);
  if(!aspect||!sceneSupportsPhysicalAspect(scene,aspect))return null;
  const productionStyle=scene.media==="original_motion_mp4"?
    "original_abstract_animation":
    scene.rightsReference.kind==="dareful_cc_by_4_0"?
      "licensed_cinematic_footage":"licensed_motion_or_composite";
  const subjectTags=clean(scene.tags),literalMotifTags=clean(scene.motifs);
  const categories=clean([...scene.categories,scene.theme]);
  const visual=clean([...subjectTags,...literalMotifTags,...categories,
    ...(scene.media==="original_motion_mp4"?["original_motion_mp4"]:[])]);
  const motifCandidates=clean(motifs.filter(x=>x.visualTags?.some(tag=>
    visual.includes(tag))).map(x=>x.id));
  const styleCandidates=clean(styles.filter(x=>x.visualTags?.some(tag=>
    visual.includes(tag))).map(x=>x.id));
  const topicTags=clean([
    ...topics.map(row=>typeof row==="string"?row:row?.topicId),
    ...(typeof scene.sourceId==="string"?[scene.sourceId]:[]),
  ]);
  const paceTag=["slow","moderate","fast"].includes(scene.pace)?scene.pace:"unknown";
  const emotionTags=visual.filter(x=>["calm","joy","hope","confidence","love",
    "inspiration","grounding","recovery","energy","connection","peace"].includes(x));
  const colorTags=visual.filter(x=>["gold","golden","blue","green","red",
    "white","black","pink","orange","purple","warm","cool"].includes(x));
  return Object.freeze({
    id:scene.id,sourceClass:scene.media==="original_motion_mp4"?
      "procedural_not_filmed":"licensed_or_composited",
    productionStyle,physicalAspect:aspect,allowedSourceAspects:[aspect],
    subjectTags,literalMotifTags,categoryTags:categories,topicTags,
    motifCandidates,styleCandidates,paceTag,
    energyHint:paceTag==="slow"?"low":paceTag==="moderate"?"medium":
      paceTag==="fast"?"high":"unknown",
    emotionTagCandidates:emotionTags,colorTagCandidates:colorTags,
    searchableTags:clean([...visual,...topicTags,aspect,productionStyle,paceTag]),
    evidence:{
      subject:"catalog_metadata_not_independently_frame_verified",
      motifs:"catalog_tags_not_literal_frame_certification",
      styles:"editorial_candidates_not_visual_style_certification",
      orientation:"verified_source_manifest_or_integer_dimensions",
      originalMotionNotRealCamera:scene.media==="original_motion_mp4",
      doesNotGrantPublicationRights:true,
    },
  });
}

export function auditVideoSceneTags(scenes,{motifs=[],styles=[],topicsById={}}={}){
  if(!Array.isArray(scenes))throw Error("VIDEO_TAG_AUDIT_INVALID_INPUT");
  const ids=new Set(),paths=new Set(),missing=[],records=[];
  for(const scene of scenes){
    if(ids.has(scene?.id)||paths.has(scene?.video))throw Error("VIDEO_TAG_AUDIT_DUPLICATE_SOURCE");
    ids.add(scene.id);paths.add(scene.video);
    const tagged=deriveVideoSceneTags(scene,{
      motifs,styles,topics:topicsById[scene.id]||[],
    });
    if(!tagged||!tagged.subjectTags.length||!tagged.searchableTags.length)
      missing.push(scene.id);
    else records.push(tagged);
  }
  return Object.freeze({
    schemaVersion:"hh-video-tags-v2",
    total:scenes.length,tagged:records.length,missing,
    sourceKinds:{
      licensed:records.filter(x=>x.sourceClass==="licensed_or_composited").length,
      procedural:records.filter(x=>x.sourceClass==="procedural_not_filmed").length,
    },
    aspectCounts:Object.fromEntries([...ASPECTS].map(aspect=>
      [aspect,records.filter(x=>x.physicalAspect===aspect).length])),
    withMotifCandidates:records.filter(x=>x.motifCandidates.length>0).length,
    withStyleCandidates:records.filter(x=>x.styleCandidates.length>0).length,
    metadataOnly:true,records,
  });
}
