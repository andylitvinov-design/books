/**
 * Story / Montage: camera-filmed footage ONLY.
 * "encoded MP4" is not a quality classification: procedural motion, generated
 * drawings and low-evidence composites are excluded, even if media=licensed_mp4.
 * No external provider, paid render, private data or new asset acquisition.
 */
import {
  planMyTubeCategory, verifiedCategorySource, verifiedSceneAspect,
  canonicalSourceMasterKey
} from "./category-video-storyboard.mjs";
import {isSafeMontageScene} from "./video-montage-sources.mjs";
import {
 isProfessionalVideoIntent,matchesFilmedStorySubject
} from "./storyboard-content-alignment.mjs";
import {assignNarrativeShotSources} from "./narrative-shot-assignment.mjs";

const FILMED_COLLECTION="film-collection-v3";
const RELEASED_SOURCE=/^https:\/\/dareful\.com\/[a-z0-9-]+(?:\/[a-z0-9-]+)*\/$/i;
const ARTIFACT_SHA=/^[a-f0-9]{64}$/i;
const CATEGORY_THEMES=Object.freeze({
  "goals-money":["goals","money","life"],
  "love-relationships":["relationships","life"],
  "energy-confidence":["energy","health","goals"],
  "stress-anxiety":["health","life","energy"],
});
const tokens=values=>new Set(values.flatMap(item=>
  String(item??"").toLowerCase().split(/[^a-z0-9]+/).filter(Boolean)));

/** A verified film is NOT equivalent to an allowed animated MP4. */
export function isReviewedFilmedStoryScene(scene,aspect="portrait"){
  if(!scene||scene.collection!==FILMED_COLLECTION||scene.status!=="approved"||
     scene.media!=="licensed_mp4"||
     scene.rightsReference?.kind!=="dareful_cc_by_4_0"||
     !RELEASED_SOURCE.test(scene.rightsReference?.sourcePage||"")||
     scene.rightsReference?.licenseUrl!=="https://creativecommons.org/licenses/by/4.0/"||
     !ARTIFACT_SHA.test(scene.technicalQuality?.sha256||"")||
     scene.technicalQuality?.editorialApproved!==true||
     scene.technicalQuality?.decodedFrame!==true||
     !(scene.technicalQuality?.score>=90)||
     !(scene.technicalQuality?.reviewedFrames>=9)||
     typeof scene.id!=="string"||
     scene.poster!=="/videos/holistic-house/film-collection-v3/"+scene.id+".jpg"||
     !isSafeMontageScene(scene))return false;
  const verified=verifiedCategorySource(scene);
  return Boolean(verified&&verifiedSceneAspect(verified,aspect));
}
const matchCount=(need,have)=>[...need].filter(word=>have.has(word)).length;

/**
 * A current montage is "applied" in Story only if ALL its shots are separately
 * verified filmed footage; graphics in old edits are never silently approved.
 */
export function isReviewedFilmedStorySequence({shots,scenes,aspect="portrait"}={}){
  if(!Array.isArray(shots)||!shots.length||shots.length>12||!Array.isArray(scenes))
    return false;
  const lookup=new Map(scenes.map(scene=>[scene?.id,scene]));
  const used=new Set();
  return shots.every(shot=>{
    const source=lookup.get(shot?.sceneId);
    if(!isReviewedFilmedStoryScene(source,aspect))return false;
    const key=canonicalSourceMasterKey(source);
    if(!key||used.has(key)||!Number.isFinite(shot.startSeconds)||
       shot.startSeconds<0||!Number.isFinite(shot.durationSeconds)||
       shot.durationSeconds<=0||
       shot.durationSeconds>verifiedCategorySource(source).durationSeconds+0.00001)
      return false;
    used.add(key);
    return true;
  });
}

/**
 * Four meaning beats become separate non-looping camera shots.
 * Always fail closed rather than substituting cartoons or reusing one master.
 * The returned timing/rights shape is the existing category editor shape.
 */
export function planReviewedFilmedStory({
  categoryId,locale="en",aspect="portrait",durationSeconds=30,
  scenes=[],excludedMotifs=[],excludedVisuals=[],styleId=null,pace="slow",
  goal="",phrases=[],sceneGuides=[]
}={}){
  const baseline=planMyTubeCategory({
    categoryId,locale,aspect,durationSeconds,scenes:[]
  });
  if(!CATEGORY_THEMES[categoryId]||
     !["ru","en","es"].includes(locale)||
     !["portrait","landscape","square"].includes(aspect)||
     ![10,15,20,30,60].includes(durationSeconds)||
     !Array.isArray(scenes)||!Array.isArray(excludedMotifs)||
     !Array.isArray(excludedVisuals)||!Array.isArray(phrases)||
     !Array.isArray(sceneGuides)||!["slow","dynamic"].includes(pace)||
     (styleId!==null&&typeof styleId!=="string"))
    return {...baseline,ok:false,status:"INVALID_FILMED_STORY_REQUEST",
      shots:[],canExport:false};
  const professional=isProfessionalVideoIntent({goal,phrases});
  const eligible=new Map();
  for(const scene of scenes){
    if(!isReviewedFilmedStoryScene(scene,aspect)||
       !isSafeMontageScene(scene,excludedMotifs)||
       !matchesFilmedStorySubject(scene,{professional,excludedVisuals}))continue;
    const key=canonicalSourceMasterKey(scene);
    if(!key)continue;
    const old=eligible.get(key);
    if(!old||scene.id.localeCompare(old.id)<0)eligible.set(key,scene);
  }
  const sources=[...eligible.values()];
  const required=Math.max(4,Math.ceil(durationSeconds/5));
  const fail=(status,completed=0)=>({
    ...baseline,ok:false,status,shots:[],canExport:false,
    sourcePolicy:"filmed_editorially_verified_only",
    subjectPolicy:professional?"real_workplace_footage_required":"general_filmed_footage",
    requiredUniqueMasters:required,availableUniqueMasters:sources.length,
    missingUniqueMasters:Math.max(required-completed,0)
  });
  if(sources.length<required)return fail(professional?
    "INSUFFICIENT_RELEVANT_FILMED_FOOTAGE":"INSUFFICIENT_REVIEWED_FILMED_FOOTAGE");
  // Score every candidate against EVERY ordered concept scene before picking a
  // source. The previous greedy walk stole a later scene's only real match.
  const guided=sceneGuides.length>0;
  if(guided&&sceneGuides.length!==required)return fail("INVALID_FILMED_SCENE_GUIDE_COUNT");
  const styles=baseline.stages??[],rows=[];
  const BROAD=new Set(["people","person","team","work","office","energy",
    "life","calm","growth","nature","motion","video","cinematic","film","scene","light"]);
  const durations=Array.from({length:required},(_,index)=>
    Math.floor(durationSeconds*1000/required)+
      (index<durationSeconds*1000%required?1:0));
  for(let i=0;i<required;i++){
    const stageIndex=Math.min(3,Math.floor(i*4/required));
    const stage=styles[stageIndex],guide=guided?sceneGuides[i]:null;
    const stageWords=tokens(stage?.requiredTags||[]);
    const guideWords=tokens(guide?.keywords||[]);
    const specific=new Set([...guideWords].filter(word=>!BROAD.has(word)));
    const candidates=sources.filter(scene=>{
      const verified=verifiedCategorySource(scene);
      return verified&&verified.durationSeconds*1000>=durations[i];
    }).map(scene=>{
      const words=tokens([...(scene.tags||[]),...(scene.motifs||[]),
        ...(scene.categories||[]),scene.description?.en||""]);
      const matches=matchCount(stageWords,words);
      const guideMatches=matchCount(guideWords,words);
      const specificMatches=matchCount(specific,words);
      // A broad 'growth' or 'energy' tag cannot stand in for a physical action.
      // On a specific authored shot require two distinct anchors if supplied.
      if(guide?.requiresLiteralMatch===true&&
        (!specific.size||specificMatches<Math.min(2,specific.size)))return null;
      if(professional&&guided&&specific.size&&specificMatches===0)return null;
      const paceMatches=pace==="dynamic"?
        matchCount(tokens(["action","motion","moving","dynamic","active"]),words):0;
      const styleMatches=styleId==="realistic"?
        matchCount(tokens(["people","office","work","client"]),words):
        styleId==="urban"?matchCount(tokens(["city","urban","street","office"]),words):
        styleId==="cinematic"?matchCount(tokens(["cinematic","film","camera","aerial"]),words):0;
      const key=canonicalSourceMasterKey(scene);
      const origin=Array.isArray(scene.originMasterKeys)&&scene.originMasterKeys.length?
        scene.originMasterKeys[0]:key;
      const groupKey=scene.perceptualGroupId?
        "perceptual:"+scene.perceptualGroupId:String(origin);
      return {source:scene,groupKey,words,matches,guideMatches,
        score:guideMatches*65+specificMatches*40+matches*12+
          (CATEGORY_THEMES[categoryId].includes(scene.theme)?15:0)+
          styleMatches*8+paceMatches*4};
    }).filter(Boolean).sort((a,b)=>b.score-a.score||
      a.source.id.localeCompare(b.source.id));
    if(!candidates.length)return fail(professional||guide?.requiresLiteralMatch===true?
      "INSUFFICIENT_RELEVANT_STAGE_FOOTAGE":"INSUFFICIENT_STAGE_FILMED_FOOTAGE",i);
    rows.push(candidates);
  }
  const assigned=assignNarrativeShotSources(rows);
  if(!assigned)return fail("INSUFFICIENT_DISTINCT_STAGE_FILMED_FOOTAGE");
  const shots=[],used=new Set();
  let cursor=0;
  for(let i=0;i<required;i++){
    const selected=assigned[i],scene=selected.source;
    const stageIndex=Math.min(3,Math.floor(i*4/required));
    const stageWords=tokens(styles[stageIndex]?.requiredTags||[]);
    const guideWords=tokens(sceneGuides[i]?.keywords||[]);
    const key=canonicalSourceMasterKey(scene);
    const verified=verifiedCategorySource(scene);
    const durationMs=durations[i];
    used.add(key);
    shots.push({
      index:i+1,stage:stageIndex+1,sceneId:scene.id,
      sourceMasterKey:key,sourcePath:verified.video,startMs:cursor,
      sourceInMs:0,durationMs,sourceDurationMs:Math.round(verified.durationSeconds*1000),
      matchedTags:[...stageWords,...guideWords].filter(word=>selected.words.has(word)),
      styleId,mediaKind:scene.media,
      symbolicFallback:selected.matches===0&&selected.guideMatches===0,
      loopRequired:false,depictedEventVerified:false
    });
    cursor+=durationMs;
  }
  return {...baseline,ok:true,status:"REVIEWED_FILMED_STORYBOARD",
    sourcePolicy:"filmed_editorially_verified_only",
    subjectPolicy:professional?"real_workplace_footage_required":"general_filmed_footage",
    shots,clipIds:shots.map(shot=>shot.sceneId),
    requiredUniqueMasters:required,availableUniqueMasters:sources.length,
    uniqueSourceMasterCount:used.size,totalPlannedMs:cursor,
    canExport:false,publishAuthorized:false};
}
