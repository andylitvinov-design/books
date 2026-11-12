/**
 * Voice transcript -> actual licensed MP4 cut list, aligned to the spoken clock.
 * No network calls, model guesses, transcript storage or unverified clip URLs.
 */
import {isSafeMontageScene,validateMontageClips} from "./video-montage-sources.mjs";
import {verifiedCategorySource,verifiedSceneAspect,canonicalSourceMasterKey} from "./category-video-storyboard.mjs";
import {requestedVisualSignals,matchedVisualSignals} from "./prompt-shot-director.mjs";
import {getMyTubeMotif,getMyTubeStyle} from "./mytube-creative-choices.mjs";

export const AUDIO_VISUAL_STORYBOARD_VERSION="hh-audio-visual-clock-v1";
const LENGTHS=[10,15,20,30,60];
const VISUAL_BEATS=[
  ["calm","rest","soft","morning","dawn"],
  ["trust","support","forest","roots","connection"],
  ["light","sun","growth","movement","strength"],
  ["path","horizon","clarity","freedom","renewal"]
];

const clean=value=>typeof value==="string"?value.replace(/[\u0000-\u001f\u007f]/g," ").replace(/\s+/g," ").trim():"";
const finite=value=>typeof value==="number"&&Number.isFinite(value);
const round=value=>Math.round(value*100)/100;

export function normalizeTimedTranscript(wire){
  if(!wire||typeof wire!=="object"||!Array.isArray(wire.segments)||
    !wire.segments.length||wire.segments.length>240)return null;
  const segments=[];
  let previousStart=-1;
  for(const item of wire.segments){
    if(!item||!finite(item.start)||!finite(item.end)||
      item.start<0||item.end<=item.start||item.end>181||
      item.start+0.15<previousStart)return null;
    const text=clean(item.text);
    if(!text||text.length>750)return null;
    segments.push({startSeconds:round(item.start),
      endSeconds:round(item.end),text});
    previousStart=item.start;
  }
  const actualEnd=Math.max(...segments.map(item=>item.endSeconds));
  const supplied=finite(wire.duration)&&wire.duration>=actualEnd-0.25?
    wire.duration:actualEnd;
  if(supplied<=0||supplied>180)return null;
  return {text:segments.map(item=>item.text).join(" ").slice(0,10000),
    durationSeconds:round(Math.max(supplied,actualEnd)),segments};
}
function blocked(status,other={}){
  return {version:AUDIO_VISUAL_STORYBOARD_VERSION,status,canExport:false,
    durationSeconds:0,shots:[],prompt:"",edit:null,...other};
}
function avoidedSceneBySpeech(scene,avoid){
  if(!avoid.length)return false;
  const tokens=cueWords(scene);
  return (avoid.includes("mountain")&&["mountain","peak","summit","cliff"].some(x=>tokens.has(x)))||
    (avoid.includes("flashing")&&["flash","flashing","flicker","strobe"].some(x=>tokens.has(x)));
}
function excludedFromText(text){
  const exclusions=[];
  if(/(?:без|исключи|не показыва(?:й|ть)|without|no|avoid|sin)\s+(?:\w+\s+){0,2}(?:мор[яе]|океан|вод[ыу]|sea\b|ocean\b|water\b|mar\b|agua\b)/iu.test(text))exclusions.push("water");
  if(/(?:без|исключи|не показыва(?:й|ть)|without|no|avoid|sin)\s+(?:\w+\s+){0,2}(?:лес[а-я]*|forest\b|woods\b|bosque\b)/iu.test(text))exclusions.push("forest");
  return exclusions;
}
function cueWords(scene){
  return new Set([...(scene.tags||[]),...(scene.motifs||[])]
    .flatMap(value=>String(value).toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean));
}
function totalVideoSeconds(audioSeconds){
  return LENGTHS.find(value=>audioSeconds+0.4<=value)||null;
}
function cutsFor(seconds){return seconds>=60?12:seconds>=30?6:4;}
function formatClock(seconds){
  const value=Math.max(0,Math.floor(seconds));
  return String(Math.floor(value/60)).padStart(2,"0")+":"+
    String(value%60).padStart(2,"0");
}
function sectionText(segments,start,end){
  // Use the REAL segment intersections; don't invent speech for silent sections.
  return segments.filter(item=>item.startSeconds<end&&item.endSeconds>start)
    .map(item=>item.text).join(" ").slice(0,650);
}
/**
 * @param {{transcript:object,scenes:readonly object[],aspect?:string,theme?:string,concept?:object|null}} options
 * @returns {object}
 */
export function planAudioVisualStoryboard({transcript,scenes,aspect="landscape",theme="energy",locale="ru",concept=null}={}){
  if(!transcript||!Array.isArray(transcript.segments)||!Array.isArray(scenes)||
    !["landscape","portrait","square"].includes(aspect))
    return blocked("INVALID_INPUT");
  const seconds=transcript.durationSeconds;
  if(!finite(seconds)||seconds<=0)return blocked("INVALID_TIMECODES");
  const durationSeconds=totalVideoSeconds(seconds);
  if(!durationSeconds)return blocked("AUDIO_LONGER_THAN_60_SECONDS",
    {audioSeconds:seconds});
  const count=cutsFor(durationSeconds);
  const part=Math.floor(durationSeconds/count),remainder=durationSeconds%count;
  let cursor=0;
  const windows=Array.from({length:count},(_,index)=>{
    const length=part+(index<remainder?1:0),startSeconds=cursor;
    cursor+=length;
    const spokenText=sectionText(transcript.segments,startSeconds,cursor);
    const signals=requestedVisualSignals(spokenText,excludedFromText(transcript.text||""));
    return {startSeconds,durationSeconds:length,spokenText,signals};
  });
  const excludedMotifs=excludedFromText(transcript.text||"");
  const semanticAvoid=Array.isArray(concept?.avoidImagery)?
    concept.avoidImagery.filter(x=>["water","forest","dark","mountain","flashing"].includes(x)):[];
  const sceneExclusions=[...new Set([...excludedMotifs,...semanticAvoid.filter(x=>["water","forest","dark"].includes(x))])];
  const motifTags=getMyTubeMotif(concept?.motifId)?.visualTags||[];
  const styleTags=getMyTubeStyle(concept?.styleId)?.visualTags||[];
  const qualified=scenes.map(scene=>verifiedCategorySource(scene))
    .filter(scene=>scene&&isSafeMontageScene(scene,sceneExclusions)&&
      !avoidedSceneBySpeech(scene,semanticAvoid)&&
      verifiedSceneAspect(scene,aspect)&&
      finite(scene.durationSeconds)&&scene.durationSeconds>=Math.max(...windows.map(w=>w.durationSeconds)))
    .map(scene=>({
      scene,master:canonicalSourceMasterKey(scene),sourceGroup:scene.sourceOriginalGroupId||scene.id,
      originKeys:[...new Set(scene.originMasterKeys?.length?scene.originMasterKeys:
        [canonicalSourceMasterKey(scene)])],
      group:scene.perceptualGroupId||null,words:cueWords(scene)
    })).filter(item=>item.master&&item.originKeys.every(Boolean));
  if(qualified.length<count)return blocked("INSUFFICIENT_APPROVED_VIDEO",
    {required:count,available:qualified.length,durationSeconds});
  const usedIds=new Set(),usedMaster=new Set(),usedOrigins=new Set(),usedGroups=new Set(),usedSourceGroups=new Set();
  const shots=[];
  for(let index=0;index<windows.length;index++){
    const window=windows[index],stage=Math.min(3,Math.floor(index*4/count));
    const ranked=qualified.filter(item=>
      !usedIds.has(item.scene.id)&&!usedMaster.has(item.master)&&!usedSourceGroups.has(item.sourceGroup)&&
      (!item.group||!usedGroups.has(item.group))&&
      item.originKeys.every(key=>!usedOrigins.has(key)))
      .map(item=>{
        const matched=matchedVisualSignals(item.scene,window.signals);
        const stageMatches=VISUAL_BEATS[stage].filter(tag=>item.words.has(tag)).length;
        // Transcript matches dominate. Concept motif/style and stage only refine
        // the ranking of verified footage, never create or whitelist a scene.
        const conceptual=Array.isArray(concept?.sceneOutline)?
          requestedVisualSignals(String(concept.sceneOutline[stage]||"").slice(0,180),sceneExclusions):[];
        const semanticMatches=matchedVisualSignals(item.scene,conceptual).length;
        const motifMatches=motifTags.filter(tag=>item.words.has(tag)).length;
        const styleMatches=styleTags.filter(tag=>item.words.has(tag)).length;
        const score=matched.length*95+stageMatches*4+semanticMatches*8+
          Math.min(2,motifMatches)*12+Math.min(2,styleMatches)*3+
          (item.scene.theme===theme?5:0)+(item.scene.media==="licensed_mp4"?2:0);
        return {...item,score,matched};
      })
      .sort((a,b)=>b.score-a.score||a.scene.id.localeCompare(b.scene.id));
    if(!ranked.length)return blocked("INSUFFICIENT_DISTINCT_MASTERS",
      {durationSeconds,required:count,available:shots.length});
    const chosen=ranked[0];
    usedIds.add(chosen.scene.id);usedMaster.add(chosen.master);usedSourceGroups.add(chosen.sourceGroup);
    chosen.originKeys.forEach(key=>usedOrigins.add(key));
    if(chosen.group)usedGroups.add(chosen.group);
    shots.push({sceneId:chosen.scene.id,startSeconds:window.startSeconds,
      durationSeconds:window.durationSeconds,endSeconds:window.startSeconds+window.durationSeconds,
      spokenText:window.spokenText,concepts:window.signals,
      matchedConcepts:chosen.matched,visualLabel:chosen.scene.label?.[locale]||chosen.scene.label?.en||chosen.scene.id,
      needsReview:window.signals.length>0&&chosen.matched.length===0});
  }
  const ids=shots.map(shot=>shot.sceneId);
  if(!validateMontageClips(ids,scenes,sceneExclusions,aspect,count!==4))
    return blocked("SCENE_RIGHTS_OR_ASPECT_FAILED",{durationSeconds});
  const prompt=shots.map(shot=>
    formatClock(shot.startSeconds)+"–"+formatClock(shot.endSeconds)+
    " | "+(shot.concepts.join(", ")||"transition")+
    " | "+shot.visualLabel+" ["+shot.sceneId+"]").join("\n");
  return {version:AUDIO_VISUAL_STORYBOARD_VERSION,status:"READY_FOR_REVIEW",
    canExport:true,privacy:"local",durationSeconds,audioSeconds:seconds,
    shots,prompt,excludedMotifs:sceneExclusions,
    conceptAware:Boolean(concept?.topicId),
    edit:{clipIds:ids,durationSecondsByStage:shots.map(s=>s.durationSeconds),
      captionTexts:shots.map(()=>""),
      excludedMotifs:sceneExclusions},
    needsReview:shots.some(shot=>shot.needsReview)};
}
