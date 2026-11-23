/**
 * Voice transcript -> actual licensed MP4 cut list, aligned to the spoken clock.
 * No network calls, model guesses, transcript storage or unverified clip URLs.
 */
import {isSafeMontageScene,validateMontageClips} from "./video-montage-sources.mjs";
import {verifiedCategorySource,verifiedSceneAspect,canonicalSourceMasterKey} from "./category-video-storyboard.mjs";
import {requestedVisualSignals,matchedVisualSignals} from "./prompt-shot-director.mjs";
import {getMyTubeMotif,getMyTubeStyle} from "./mytube-creative-choices.mjs";
import {assignNarrativeShotSources} from "./narrative-shot-assignment.mjs";

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
  // Authored screenplay shots are literal director instructions, not generic
  // emotional prompts. Require filmed sources when the requested look is real.
  const authored=Array.isArray(concept?.storyboard)&&
    concept.storyboard.length===count&&concept.storyboard.every(s=>typeof s?.action==="string")?
    concept.storyboard:null;
  const filmOnly=["cinematic","realistic"].includes(concept?.styleId);
  const qualified=scenes.map(scene=>verifiedCategorySource(scene))
    .filter(scene=>scene&&(!filmOnly||scene.media==="licensed_mp4")&&
      isSafeMontageScene(scene,sceneExclusions)&&
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
  // Score all shot/source pairs BEFORE assigning footage: greedy first-shot
  // matches used to consume scarce clips needed for a later spoken moment.
  const rankedRows=windows.map((window,index)=>{
    const stage=Math.min(3,Math.floor(index*4/count));
    const authoredAction=authored?.[index]?.action||"";
    const contextual=authoredAction||
      (Array.isArray(concept?.sceneOutline)?String(concept.sceneOutline[stage]||"").slice(0,230):"");
    const sceneSignals=requestedVisualSignals(contextual,sceneExclusions);
    const sceneKeywords=Array.isArray(authored?.[index]?.keywords)?
      authored[index].keywords.filter(word=>typeof word==="string"&&/^[a-z]{3,30}$/.test(word)).slice(0,8):[];
    return qualified.map(item=>{
      const matched=matchedVisualSignals(item.scene,window.signals);
      const visualMatched=matchedVisualSignals(item.scene,sceneSignals);
      const literalKeywords=sceneKeywords.filter(tag=>item.words.has(tag));
      const stageMatches=VISUAL_BEATS[stage].filter(tag=>item.words.has(tag)).length;
      const motifMatches=motifTags.filter(tag=>item.words.has(tag)).length;
      const styleMatches=styleTags.filter(tag=>item.words.has(tag)).length;
      const score=matched.length*95+stageMatches*4+
        visualMatched.length*(authored?52:12)+
        literalKeywords.length*(authored?32:0)+
        Math.min(2,motifMatches)*12+Math.min(2,styleMatches)*3+
        (item.scene.theme===theme?5:0)+(item.scene.media==="licensed_mp4"?2:0);
      return {...item,source:item.scene,
        groupKey:item.group?"perceptual:"+item.group:
          item.originKeys[0]?"origin:"+item.originKeys[0]:"source:"+item.sourceGroup,
        score,matched,visualMatched,literalKeywords};
    }).sort((a,b)=>b.score-a.score||a.scene.id.localeCompare(b.scene.id));
  });
  const globallyAssigned=assignNarrativeShotSources(rankedRows);
  // A global match is accepted only if ALL the original source/origin/group
  // restrictions remain satisfied, not merely the optimizer's groupKey.
  const isDistinct=(picked)=>{
    if(!picked||picked.length!==count)return false;
    const ids=new Set(),masters=new Set(),origins=new Set(),groups=new Set(),sourceGroups=new Set();
    for(const item of picked){
      if(ids.has(item.scene.id)||masters.has(item.master)||sourceGroups.has(item.sourceGroup)||
         item.group&&groups.has(item.group)||item.originKeys.some(k=>origins.has(k)))return false;
      ids.add(item.scene.id);masters.add(item.master);sourceGroups.add(item.sourceGroup);
      if(item.group)groups.add(item.group);
      for(const key of item.originKeys)origins.add(key);
    }
    return true;
  };
  let chosenRows=isDistinct(globallyAssigned)?globallyAssigned:null;
  let matchingMode="global_distinct_sources";
  if(!chosenRows){
    // Conservative fallback for catalogues with overlapping origin groups.
    // Never relax the constraints just to fill six frames.
    matchingMode="verified_greedy_fallback";
    const usedIds=new Set(),usedMaster=new Set(),usedOrigins=new Set(),usedGroups=new Set(),usedSourceGroups=new Set();
    const local=[];
    for(const row of rankedRows){
      const chosen=row.find(item=>!usedIds.has(item.scene.id)&&
        !usedMaster.has(item.master)&&!usedSourceGroups.has(item.sourceGroup)&&
        (!item.group||!usedGroups.has(item.group))&&
        item.originKeys.every(key=>!usedOrigins.has(key)));
      if(!chosen)return blocked("INSUFFICIENT_DISTINCT_MASTERS",
        {durationSeconds,required:count,available:local.length});
      usedIds.add(chosen.scene.id);usedMaster.add(chosen.master);
      usedSourceGroups.add(chosen.sourceGroup);
      chosen.originKeys.forEach(key=>usedOrigins.add(key));
      if(chosen.group)usedGroups.add(chosen.group);
      local.push(chosen);
    }
    chosenRows=local;
  }
  const shots=chosenRows.map((item,index)=>{
    const window=windows[index];
    const needsReview=window.signals.length>0&&item.matched.length===0||
      Boolean(authored?.[index]&&(rankedRows[index][0].score>0)&&
       item.visualMatched.length===0&&item.literalKeywords.length===0);
    return {sceneId:item.scene.id,startSeconds:window.startSeconds,
      durationSeconds:window.durationSeconds,endSeconds:window.startSeconds+window.durationSeconds,
      spokenText:window.spokenText,concepts:window.signals,
      matchedConcepts:item.matched,
      matchedStoryboardConcepts:item.visualMatched,
      visualLabel:item.scene.label?.[locale]||item.scene.label?.en||item.scene.id,
      needsReview};
  });
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
    matchingMode,authoredStoryboardAware:Boolean(authored),
    editorialSourceFit:shots.some(shot=>shot.needsReview)?"needs_visual_review":"metadata_matched_not_frame_verified",
    edit:{clipIds:ids,durationSecondsByStage:shots.map(s=>s.durationSeconds),
      captionTexts:shots.map(()=>""),
      excludedMotifs:sceneExclusions},
    needsReview:shots.some(shot=>shot.needsReview)};
}
