/**
 * Emotional Scene Director v1 — physical, local MP4 scene planning.
 *
 * Keeps four editorial narrative beats distinct from 4–12 physical shots.
 * A curated tag match is NOT evidence that a literal story event is depicted.
 * No clinical inference, raw user-profile persistence, provider calls or spend.
 */
import {validateMyTubeMeaningPath,listMyTubeMotifScenarios} from "./mytube-meaning-hierarchy.mjs";
import {getMyTubeMotif} from "./mytube-creative-choices.mjs";
import {getEmotionalVectorByStates,getEmotionalVector} from "./meaning-emotion/emotional-vector-matrix.mjs";
import {recommendMyTubeTopicStoryClips} from "./mytube-video-tagging.mjs";
import {verifiedCategorySource,verifiedSceneAspect,canonicalSourceMasterKey} from "./category-video-storyboard.mjs";
import {isSafeMontageScene} from "./video-montage-sources.mjs";

export const EMOTIONAL_SCENE_DIRECTOR_VERSION="hh-emotional-scene-director-v1";
export const FILM_SHOT_LENGTHS=Object.freeze([10,15,20,30,60]);
export const EMOTIONAL_STRATEGY_TAGS=Object.freeze({
 S01:["calm","quiet","rest","shelter","steady","soft"],
 S02:["support","warm","home","shelter","gentle","light"],
 S03:["acceptance","nature","water","soft","open","flower"],
 S04:["clarity","light","clear","horizon","path","focus"],
 S05:["hope","warm","sunrise","dawn","golden","renewal"],
 S06:["strength","rise","mountain","motion","path","energy"],
 S07:["connection","together","garden","bridge","whole"],
 S08:["renewal","sunrise","growth","bloom","morning","open"]
});
const ROLES=Object.freeze(["orientation","safety","development","integration"]);
const TOKEN_STOP=new Set(["that","this","from","with","your","their","there","into","then","only","more",
 "which","these","those","when","will","have","there","where","them","does","what","been",
 "story","scene","feels","feeling","seeing","something","through"]);
const tokens=(value)=>Array.from(new Set(String(value??"").toLowerCase().match(/[a-z][a-z0-9]{2,}/g)||[]))
 .filter(token=>!TOKEN_STOP.has(token));
const sourceWords=(source)=>new Set(tokens([
  ...(source.tags||[]),...(source.motifs||[]),...(source.categories||[]),
  source.label?.en||"",source.description?.en||""
 ].join(" ")));
export function emotionalFilmShotCount(durationSeconds){
 return FILM_SHOT_LENGTHS.includes(durationSeconds)?Math.max(4,Math.ceil(durationSeconds/5)):null;
}
const ordinal=(value,low,high)=>value==="low"||value==="gentle"?low:
 value==="high"||value==="intense"?high:
 value==="medium"||value==="moderate"?5:Number.isInteger(value)?value:null;
const isRange=(value,min,max)=>value===null||(Number.isInteger(value)&&value>=min&&value<=max);
function emotionProfile(profile){
 if(!profile||typeof profile!=="object")return {status:"NEEDS_EMOTIONAL_SELECTION"};
 const vector=profile.currentStateId&&profile.desiredStateId?
   getEmotionalVectorByStates(profile.currentStateId,profile.desiredStateId):
   profile.currentClusterId&&profile.desiredClusterId?
   getEmotionalVector(profile.currentClusterId,profile.desiredClusterId):null;
 if(!vector)return {status:"UNMAPPED_EMOTIONAL_AXIS"};
 const intensity=ordinal(profile.intensity,2,9);
 const energy=ordinal(profile.energy,2,8);
 const activation=ordinal(profile.activation,2,8);
 const feltSafety=ordinal(profile.feltSafety,2,8);
 if(!isRange(intensity,0,10)||!isRange(energy,0,10)||
    !isRange(activation,0,10)||!isRange(feltSafety,0,10))
   return {status:"INVALID_EMOTIONAL_INPUT"};
 const lowResource=energy!==null&&energy<=3;
 const strong= intensity!==null&&intensity>=8;
 const overloaded=activation!==null&&activation>=7;
 const gentle=lowResource||strong||overloaded||
   (feltSafety!==null&&feltSafety<=3)||profile.pace==="gentle";
 const desired=vector.desiredClusterId;
 let target=desired==="clarity"?"S04":desired==="vitality"?"S06":
   desired==="connection"?"S07":desired==="confidence"||desired==="boundaries"?"S06":
   desired==="hope"?"S08":desired==="self_acceptance"?"S03":"S01";
 // Low energy is not permission for forced activation or a hero's challenge.
 if(lowResource&&target==="S06")target="S05";
 const start=gentle?(lowResource?"S02":"S01"):
   vector.currentClusterId==="confusion"?"S04":"S03";
 const middle=target==="S01"?"S02":target;
 const ids=[start,start,middle,target==="S06"&&gentle?"S05":target];
 return {status:"ok",vectorId:vector.id,currentClusterId:vector.currentClusterId,
   desiredClusterId:desired,intensity,energy,activation,feltSafety,
   envelope:{pace:gentle?"gentle":"steady",contrastCeiling:gentle?"low":"moderate",
     avoidForcedChallenge:gentle,allowNegativeDramaticDip:false},
   strategyIds:ids,reliefShapeIds:gentle?["R01","R02","R04"]:target==="S04"?["R06"]:["R07","R12"],
   whyCodes:[gentle?"RESOURCE_OR_INTENSITY_GENTLE":"CLIENT_PACE_STEADY",
     "EMOTIONAL_AXIS:"+vector.id,"TARGET_STRATEGY:"+target]};
}
function blocked(status,base={},extra={}){
 return {...base,ok:false,status,renderReady:false,publishAuthorized:false,
   clipIds:[],shots:[],...extra};
}
/**
 * @param {{
 * topicId:string,meaningAxisId:string,motifId:string,scenarioId:string,
 * plot?:{beats?:string[],visualCues?:string[]}|null,
 * emotional?:object|null,durationSeconds:number,aspect:"portrait"|"landscape"|"square",
 * locale?:"ru"|"en"|"es",scenes?:readonly object[],excludedMotifs?:string[],
 * styleId?:string|null,allowAbstractMotion?:boolean
 * }} input
 * Reproducible local-media plan. Not a finished video.
 */
export function planEmotionDrivenVideo({
 topicId,meaningAxisId,motifId,scenarioId,plot=null,emotional=null,
 durationSeconds=30,aspect="landscape",locale="ru",scenes=[],
 excludedMotifs=[],styleId=null,allowAbstractMotion=false
}={}){
 const base={version:EMOTIONAL_SCENE_DIRECTOR_VERSION,topicId,meaningAxisId,motifId,
   scenarioId,durationSeconds,aspect,locale,sceneCount:emotionalFilmShotCount(durationSeconds),
   videoBasis:"licensed_source_not_generated_video",mediaFidelity:"curated_tags_symbolic_not_event_verified",
   exportEvidence:"requires_actual_browser_MP4_record_and_playback_check",publishAuthorized:false};
 const path=validateMyTubeMeaningPath({topicId,meaningAxisId,motifId,scenarioId});
 if(!path.ok)return blocked("INVALID_MEANING_PATH",base,{reasonCodes:[path.status]});
 if(!FILM_SHOT_LENGTHS.includes(durationSeconds)||
    !["ru","en","es"].includes(locale)||
    !["portrait","landscape","square"].includes(aspect)||
    !Array.isArray(scenes)||!Array.isArray(excludedMotifs))
   return blocked("INVALID_SCENE_REQUEST",base,{reasonCodes:["INVALID_INPUT"]});
 const emotion=emotionProfile(emotional);
 if(emotion.status!=="ok")return blocked(emotion.status,base,{reasonCodes:[emotion.status]});
 const templates=listMyTubeMotifScenarios(topicId,meaningAxisId,motifId,"en");
 const template=templates.find(row=>row.id===scenarioId);
 const localizedTemplate=listMyTubeMotifScenarios(topicId,meaningAxisId,motifId,locale)
   .find(row=>row.id===scenarioId);
 const motif=getMyTubeMotif(motifId);
 if(!template||!localizedTemplate||!motif)
   return blocked("INVALID_MEANING_PATH",base);
 // Human-readable scene captions use the requested locale. Trusted visual
 // metadata/English cues stay independent from translated prose.
 const englishBeats=template.sceneOutline.length===4?template.sceneOutline:
   ["Orientation","Safety","Development","Integration"];
 const beats=localizedTemplate.sceneOutline.length===4?localizedTemplate.sceneOutline:englishBeats;
 const plotCues=Array.isArray(plot?.visualCues)&&plot.visualCues.length===4?plot.visualCues:null;
 const stages=beats.map((beat,index)=>{
   const tagBrief=[englishBeats[index],plotCues?.[index]||""].join(" ");
   const motifTags=tokens([motifId,...(motif.visualTags||[])].join(" "));
   const beatTags=tokens(tagBrief).slice(0,7);
   const strategyId=emotion.strategyIds[index];
   const emotionTags=EMOTIONAL_STRATEGY_TAGS[strategyId];
   return {beatIndex:index+1,beatText:beat,strategyId,role:ROLES[index],
     targetVisualTags:[...new Set([...motifTags,...beatTags])].slice(0,12),
     emotionalTags:emotionTags};
 });
 const coverage=recommendMyTubeTopicStoryClips({
   topicId,scenarioId,scenes,excludedMotifs,motifId,styleId,
   meaningAxisId,targetAspect:aspect
 });
 if(!Array.isArray(coverage.candidates))
   return blocked("NEEDS_VERIFIED_MEDIA",base,{reasonCodes:[coverage.status]});
 const registry=new Map(scenes.filter(Boolean).map(row=>[row.id,row]));
 const available=new Map();
 for(const candidate of coverage.candidates){
   const verified=verifiedCategorySource(registry.get(candidate.sceneId));
   if(!verified||!isSafeMontageScene(verified,excludedMotifs)||
      !verifiedSceneAspect(verified,aspect)||
      (!allowAbstractMotion&&verified.media!=="licensed_mp4"))continue;
   const masterKey=canonicalSourceMasterKey(verified);
   if(!masterKey)continue;
   const originKeys=Array.isArray(verified.originMasterKeys)&&verified.originMasterKeys.length
     ?verified.originMasterKeys.filter(key=>typeof key==="string"&&key.length<512)
     :[masterKey];
   if(!originKeys.length)continue;
   const item={candidate,source:verified,masterKey,originKeys,words:sourceWords(verified),
     perceptualGroupId:verified.perceptualGroupId||null};
   const old=available.get(masterKey);
   if(!old||candidate.score>old.candidate.score||
     (candidate.score===old.candidate.score&&verified.id<old.source.id))
     available.set(masterKey,item);
 }
 const count=emotionalFilmShotCount(durationSeconds);
 const media=[...available.values()];
 const planBase={...base,pathId:path.pathId,emotionalAxisId:emotion.vectorId,
   emotionalEnvelope:emotion.envelope,reliefShapeIds:emotion.reliefShapeIds,
   strategySequence:emotion.strategyIds.map((strategyId,i)=>({
     stage:i+1,strategyId,startT:i/4,endT:(i+1)/4,
     targetTags:[...EMOTIONAL_STRATEGY_TAGS[strategyId]]
   })),stages,availableUniqueMasters:media.length,
   reasonCodes:[...emotion.whyCodes]};
 if(media.length<count)
   return blocked("NEEDS_VERIFIED_MEDIA",planBase,{
     reasonCodes:[...planBase.reasonCodes,"INSUFFICIENT_DISTINCT_PHYSICAL_SOURCES"],
     missingMediaCount:count-media.length});
 const baseLength=Math.floor(durationSeconds/count);
 const remainder=durationSeconds%count;
 const shots=[],used=new Set(),usedOrigins=new Set(),groups=new Set();
 let cursor=0;
 for(let i=0;i<count;i++){
   const beatIndex=Math.min(3,Math.floor(i*4/count));
   const stage=stages[beatIndex];
   const seconds=baseLength+(i<remainder?1:0);
   const candidates=media.filter(row=>!used.has(row.masterKey)&&
     row.originKeys.every(key=>!usedOrigins.has(key))&&
     (!row.perceptualGroupId||!groups.has(row.perceptualGroupId))&&
     row.source.durationSeconds>=seconds).map(row=>{
       const matchedTags=stage.targetVisualTags.filter(tag=>row.words.has(tag));
       const emotionTags=stage.emotionalTags.filter(tag=>row.words.has(tag));
       return {...row,matchedTags,emotionTags,
         stageScore:matchedTags.length*40+emotionTags.length*5+
           row.candidate.score+(row.candidate.motifMatch?50:0)};
     }).filter(row=>row.matchedTags.length>0)
      .sort((a,b)=>b.stageScore-a.stageScore||
        a.source.id.localeCompare(b.source.id));
   const chosen=candidates[0];
   if(!chosen)return blocked("NEEDS_VERIFIED_MEDIA",planBase,{
     reasonCodes:[...planBase.reasonCodes,"MISSING_STAGE_TAGGED_SOURCE"],
     missingStage:beatIndex+1,missingShot:i+1,plannedShots:shots.length});
   used.add(chosen.masterKey);
   chosen.originKeys.forEach(key=>usedOrigins.add(key));
   if(chosen.perceptualGroupId)groups.add(chosen.perceptualGroupId);
   shots.push({number:i+1,beatIndex:beatIndex+1,emotionalStageId:stage.strategyId,
     role:stage.role,requiredTags:[...stage.targetVisualTags],
     emotionalTags:[...stage.emotionalTags],matchedTags:chosen.matchedTags,
     sceneId:chosen.source.id,sourceMasterKey:chosen.masterKey,
     assetPath:chosen.source.video,sourceDurationSeconds:chosen.source.durationSeconds,
     startSeconds:cursor,durationSeconds:seconds,
     sourceKind:chosen.source.media,rightsKind:chosen.source.rightsReference.kind,
     matchingEvidence:"catalog_metadata_not_frame_review",
     depictedEventVerified:false,loopRequired:false});
   cursor+=seconds;
 }
 if(cursor!==durationSeconds||new Set(shots.map(x=>x.sourceMasterKey)).size!==count)
   return blocked("INVALID_PHYSICAL_PLAN",planBase,{reasonCodes:["DURATION_OR_REUSE"]});
 const selected=shots.map(shot=>media.find(item=>item.source.id===shot.sceneId));
 if(motifId&&!selected.some(item=>item?.candidate.motifMatch))
   return blocked("NEEDS_VERIFIED_MEDIA",planBase,{
     reasonCodes:[...planBase.reasonCodes,"MOTIF_NOT_REPRESENTED_IN_APPROVED_SOURCES"]});
 if(styleId&&selected.filter(item=>item?.candidate.styleMatch).length<Math.ceil(count*.6))
   return blocked("NEEDS_VERIFIED_MEDIA",planBase,{
     reasonCodes:[...planBase.reasonCodes,"STYLE_NOT_REPRESENTED_IN_APPROVED_SOURCES"]});
 return {...planBase,ok:true,status:"READY_SYMBOLIC_LOCAL_RENDER",
   renderReady:true,clipIds:shots.map(shot=>shot.sceneId),shots,
   stageCoverage:stages.map(stage=>({beatIndex:stage.beatIndex,
     assignedShots:shots.filter(shot=>shot.beatIndex===stage.beatIndex).length})),
   matchedMediaCount:count,missingMediaCount:0,
   // The user can render this symbolic edit, but actual visual events still need editorial review.
   verifiedLiteralScenario:false,publishAuthorized:false};
}
