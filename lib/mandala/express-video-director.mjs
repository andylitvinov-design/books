/**
 * Express Video Director — text OR locally supplied/consented audio -> one
 * source-backed six-shot video recipe. This never renders/upload media itself,
 * invents song words, assumes a diagnosis, or authorizes an export/credit.
 * The existing Canvas/Safari/credit engine is the single production writer.
 */
import {suggestVideoConcept} from "./auto-video-concept.mjs";
import {getVideoCreativeDirections} from "./video-creative-directions.mjs";
import {listMyTubeScenarios} from "./mytube-content-taxonomy.mjs";
import {MYTUBE_SCENARIO_PHOTO_COVERAGE,getMyTubeScenarioPhotos,
  isTrustedStoryPhoto} from "./story-photo-library.mjs";
import {rankPersonalMusic} from "./music-match.mjs";
import {curatedAudioTracks} from "./curated-audio-recommendations.mjs";
import {MYTUBE_REVIEWED_MUSIC_BEDS} from "./creative-editor-audio-lanes.mjs";
import {requestedVisualSignals,matchedVisualSignals} from "./prompt-shot-director.mjs";
import {assignNarrativeShotSources} from "./narrative-shot-assignment.mjs";

export const EXPRESS_VIDEO_RECIPE_VERSION="hh-express-video-v1";
const themes=new Set(["money","energy","relationships","goals","life","health"]);
const languages=new Set(["ru","en","es"]);
const clipCount=6;
const photoDenied={
  water:/\b(?:water|ocean|sea|river|lake|waterfall|coast|waves|mar|agua)\b|вод|мор|океан/iu,
  forest:/\b(?:forest|woods|jungle|bosque)\b|лес/iu,
  mountain:/\b(?:mountain|summit|peak|montana|montaña)\b|гор|вершин/iu,
  dark:/\b(?:dark|night|shadow|darkness|noche|oscuridad)\b|темн|ноч/iu,
  flashing:/\b(?:flashing|flicker|strobe|flash)\b|вспыш|миган/iu
};
const text=value=>typeof value==="string"?
  value.normalize("NFKC").replace(/[\u0000-\u001f\u007f<>]/gu," ")
    .replace(/\s+/gu," ").trim().slice(0,800):"";
const blocked=(reason,extra={})=>({version:EXPRESS_VIDEO_RECIPE_VERSION,
  canRender:false,reason,clipIds:[],durationSeconds:0,...extra});
const videoTheme=(concept,oldTheme)=>{
  const category=concept.categoryId;
  if(category==="love-relationships")return "relationships";
  if(category==="stress-anxiety")return "health";
  if(category==="energy-confidence")return "energy";
  if(category==="goals-money")return oldTheme==="money"?"money":"goals";
  return oldTheme;
};
const secondsOf=seconds=>typeof seconds==="number"&&Number.isFinite(seconds)&&seconds>0?
  seconds:null;
/** User speech is never transcribed without a separate explicit consent; only
 * existing verified timecodes may influence photo ordering. */
export function planExpressVideo({
 locale="ru",goal="",theme="energy",selectedTopicId=null,
 personalization=null,transcript=null,hasAudio=false,audioDurationSeconds=null
}={}){
 const lang=languages.has(locale)?locale:"ru";
 const fallback=themes.has(theme)?theme:"energy";
 const measured=secondsOf(audioDurationSeconds);
 if(hasAudio&&(!measured||measured>59.6))
   return blocked(!measured?"AUDIO_DURATION_UNKNOWN":"AUDIO_OVER_59_SECONDS");
 const total=hasAudio&&measured>29.6?60:30;
 const inputGoal=text(goal)||text(transcript?.text);
 const concept=suggestVideoConcept({locale:lang,goal:inputGoal,theme:fallback,
   speechTranscript:transcript&&Array.isArray(transcript.segments)?transcript:null,
   selectedTopicId,personalization});
 const directions=getVideoCreativeDirections(concept,lang);
 const scenarioId=directions.find(item=>item?.scenarioId)?.scenarioId||concept.scenarioId;
 const canonical=listMyTubeScenarios(concept.topicId,lang).find(x=>x.id===scenarioId);
 const binding=MYTUBE_SCENARIO_PHOTO_COVERAGE[scenarioId];
 const photos=getMyTubeScenarioPhotos(scenarioId);
 if(!canonical||!binding||photos.length!==clipCount||!photos.every(isTrustedStoryPhoto))
   return blocked("NO_VERIFIED_SCENARIO_PHOTOS",{topicId:concept.topicId,scenarioId});
 const avoided=Array.isArray(concept.avoidImagery)?concept.avoidImagery:[];
 if(avoided.some(id=>{
    const deny=photoDenied[id];
    return deny&&photos.some(photo=>deny.test(
      [photo.labels.en,photo.labels.ru,...photo.tags].join(" ").toLowerCase()));
 }))return blocked("SCENARIO_IMAGERY_EXCLUDED",{topicId:concept.topicId,scenarioId});
 // Six distinct approved JPEG references already belong to this exact
 // canonical scenario. The binding is editorial metadata, not proof that
 // a literal action in a full authored screenplay appears in a photo.
 const segmentList=Array.isArray(transcript?.segments)?
   transcript.segments.filter(s=>Number.isFinite(s?.startSeconds)&&
    Number.isFinite(s?.endSeconds)&&s.endSeconds>s.startSeconds):[];
 const windows=Array.from({length:clipCount},(_,index)=>{
   const from=index*total/clipCount,to=(index+1)*total/clipCount;
   // Transcript timings belong to whole segments, not individual words.
   // Include every segment that overlaps the shot; assigning it only to its
   // midpoint drops speech context from the other shots it actually spans.
   const spoken=segmentList.filter(segment=>
     segment.startSeconds<to&&segment.endSeconds>from
   ).map(segment=>text(segment.text)).join(" ");
   const signals=requestedVisualSignals(spoken,avoided);
   return {from,to,signals};
 });
 const rows=windows.map((window,index)=>{
   const stage=Math.min(4,Math.floor(index*4/clipCount)+1);
   return photos.map((photo,photoIndex)=>{
     const matches=matchedVisualSignals(photo,window.signals);
     const stageDistance=Math.abs(stage-(binding.sceneNos[photoIndex]||stage));
     return {source:photo,groupKey:"photo:"+photo.id,
       score:matches.length*60+Math.max(0,4-stageDistance)*12+
         (index===photoIndex?5:0),matches,stage};
   });
 });
 const choices=assignNarrativeShotSources(rows);
 if(!choices||choices.length!==clipCount||
    new Set(choices.map(x=>x.source.id)).size!==clipCount)
   return blocked("NO_DISTINCT_PHOTO_ASSIGNMENT",{topicId:concept.topicId,scenarioId});
 const sources=choices.map(x=>x.source);
 const clipIds=sources.map(x=>x.id);
 const name=canonical.label;
 const cues=canonical.sceneOutline;
 const captions=hasAudio?Array(clipCount).fill(""):
   [name,cues[0],cues[1],cues[2],cues[3],concept.mainMessage]
     .map(value=>text(value).slice(0,85));
 const chosenTheme=videoTheme(concept,fallback);
 const ranked=rankPersonalMusic({tracks:curatedAudioTracks,theme:chosenTheme,
   wish:inputGoal,transcript:text(transcript?.text),voiceFriendly:hasAudio,
   kind:"melody",limit:10});
 const soundtrack=ranked.find(item=>!hasAudio||
   (MYTUBE_REVIEWED_MUSIC_BEDS.includes(item.id)&&item.voiceSafe))||null;
 if(!hasAudio&&!soundtrack)return blocked("NO_RIGHTS_REVIEWED_MUSIC",
   {topicId:concept.topicId,scenarioId});
 return {version:EXPRESS_VIDEO_RECIPE_VERSION,canRender:true,reason:"READY",
   locale:lang,theme:chosenTheme,topicId:concept.topicId,scenarioId,
   screenplaySource:directions.length?"authored_film_direction":"canonical_topic_scenario",
   durationSeconds:total,aspect:"portrait",clipIds,
   durationSecondsByStage:Array(clipCount).fill(total/clipCount),
   captionTexts:captions,excludedMotifs:avoided,
   musicId:soundtrack?.id||null,withOriginalAudio:hasAudio,
   musicBedVolumePercent:hasAudio&&soundtrack?15:0,
   evidence:"scenario_editorial_photos_license_checked_not_literal_action_review",
   photos:sources.map((photo,index)=>({
     id:photo.id,sceneNo:index+1,sourcePage:photo.sourcePage,
     matchedWords:choices[index].matches,sourceStatus:"editorial_photo_binding"
   })),
   needsEditorialReview:windows.some((window,index)=>window.signals.length>0&&
     choices[index].matches.length===0),
   audioStatus:hasAudio?"original_audio_non_looping":"reviewed_music",
   transcriptUsed:segmentList.length>0
 };
}
