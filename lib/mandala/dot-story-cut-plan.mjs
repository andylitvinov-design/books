/**
 * Deterministic, read-only long-form cut planner for Dot audio + approved MP4.
 * This module does NOT download, decode, transcribe or render anything.
 * The server-side renderer must revalidate rights, media bytes and exact duration.
 */
import {isSafeMontageScene} from './video-montage-sources.mjs';
import {resolveTelegramStoryPlot} from './telegram-story-plots.mjs';

export const DOT_STORY_CUT_PLAN_VERSION='hh-dot-story-cut-plan-v1';
const MIN_AUDIO_MS=1000;
const MAX_AUDIO_MS=1800_000;
const MAX_CUTS=300;
const MIN_CUT_MS=3000;
const MAX_CUT_MS=30000;
const TARGET_CUT_MS=12000;
const fail=code=>({ok:false,code});
const tokens=values=>new Set(values.flatMap(x=>String(x).toLowerCase().split(/[^a-z0-9]+/)).filter(Boolean));
const overlap=(a,b)=>[...a].filter(x=>b.has(x)).length;

function eligibleScene(scene,excludedMotifs){
  return isSafeMontageScene(scene,excludedMotifs)&&
    Number.isFinite(scene.durationSeconds)&&scene.durationSeconds>=3&&
    typeof scene.video==='string'&&scene.video.startsWith('/videos/holistic-house/');
}
function choosePool(plot,scenes,excludedMotifs){
  const desired=tokens(plot.visualTags);
  return scenes.filter(scene=>eligibleScene(scene,excludedMotifs))
    .map(scene=>({
      scene,
      relevance:overlap(desired,tokens([...scene.tags,...scene.motifs]))*10,
    }))
    .sort((a,b)=>b.relevance-a.relevance||a.scene.id.localeCompare(b.scene.id));
}
/** @param {{
 * plotId:string,audioDurationMs:number,scenes:readonly any[],
 * excludedMotifs?:readonly string[],targetCutMs?:number,
 * minUniqueScenes?:number,allowRepetition?:boolean,stageClipIds?:readonly string[]
 * }} input
 */
export function compileDotStoryCutPlan(input={}){
  const {plotId,audioDurationMs,scenes,excludedMotifs=[],
    targetCutMs=TARGET_CUT_MS,minUniqueScenes=4,allowRepetition=true,stageClipIds=null}=input;
  const plot=resolveTelegramStoryPlot(plotId);
  if(!plot)return fail('PLOT_UNKNOWN');
  if(!Number.isInteger(audioDurationMs)||audioDurationMs<MIN_AUDIO_MS||
    audioDurationMs>MAX_AUDIO_MS)return fail('AUDIO_DURATION_INVALID');
  if(!Number.isInteger(targetCutMs)||targetCutMs<MIN_CUT_MS||
    targetCutMs>MAX_CUT_MS)return fail('CUT_LENGTH_INVALID');
  if(!Number.isInteger(minUniqueScenes)||minUniqueScenes<4||minUniqueScenes>20||
    !Array.isArray(scenes)||!Array.isArray(excludedMotifs))return fail('SCENE_INPUT_INVALID');
  const pool=choosePool(plot,scenes,excludedMotifs);
  // These exact four IDs are supplied ONLY by the trusted canonical MyTube
  // topic/plot ranker, not by an arbitrary client form or Telegram callback.
  // Validate membership/rights at each boundary before rendering.
  if(stageClipIds!==null&&(!Array.isArray(stageClipIds)||
      stageClipIds.length!==4||new Set(stageClipIds).size!==4||
      !stageClipIds.every(id=>typeof id==='string'&&
        pool.some(row=>row.scene.id===id))))
    return fail('PLOT_STAGE_SOURCE_INVALID');
  // With four stage anchors, every supplied scene must originate from the
  // trusted server topic ranker, not a user URL or random catalogue sample.
  // Preserve the stage anchors but rotate all explicitly ranked alternatives.
  const relevant=stageClipIds!==null
    ?pool.map(item=>({...item,relevance:Math.max(item.relevance,1)}))
    :pool.filter(item=>item.relevance>0);
  // Do not substitute four random unrelated videos for a requested story.
  if(relevant.length<minUniqueScenes)return {
    ...fail('VERIFIED_SCENE_COVERAGE_INSUFFICIENT'),
    plotId,approvedRelevantCount:relevant.length,requiredCount:minUniqueScenes,
  };
  if(audioDurationMs<4*MIN_CUT_MS)return fail('AUDIO_TOO_SHORT_FOR_FOUR_BEATS');
  // A 5-second source must never be silently looped into a 12-second shot.
  // Split the audio into more real source-bounded cuts; fail honestly if
  // the 300-cut limit or the minimum cut length makes that impossible.
  const shortestSourceMs=Math.min(...relevant.map(item=>
    Math.floor(item.scene.durationSeconds*1000)));
  const nonLoopingCutMs=Math.min(targetCutMs,shortestSourceMs);
  const desiredCuts=Math.max(4,Math.ceil(audioDurationMs/nonLoopingCutMs));
  const maxFeasibleCuts=Math.min(MAX_CUTS,Math.floor(audioDurationMs/MIN_CUT_MS));
  if(desiredCuts>maxFeasibleCuts)return {
    ...fail('NON_LOOPING_SOURCE_COVERAGE_INSUFFICIENT'),plotId,
    requiredCuts:desiredCuts,maxCuts:maxFeasibleCuts,
  };
  const cutCount=desiredCuts;
  if(!allowRepetition&&cutCount>relevant.length)return {
    ...fail('UNIQUE_SCENES_INSUFFICIENT'),plotId,
    approvedRelevantCount:relevant.length,requiredCount:cutCount,
  };
  // Allocate every millisecond, including final remainder, without drift.
  const base=Math.floor(audioDurationMs/cutCount);
  const remainder=audioDurationMs%cutCount;
  const shots=[];
  let cursor=0;
  const used=new Set();
  const usedOrigins=new Set();
  const masterKeys=row=>Array.isArray(row.scene.originMasterKeys)&&
    row.scene.originMasterKeys.length?row.scene.originMasterKeys:
    ['scene:'+row.scene.id];
  const overlaps=(row,keys)=>masterKeys(row).some(k=>keys.has(k));
  for(let i=0;i<cutCount;i++){
    const stage=Math.min(3,Math.floor(i*4/cutCount));
    // Prefer unseen clips and avoid immediate repetition where possible.
    const sorted=[...relevant].sort((a,b)=>
      Number(used.has(a.scene.id))-Number(used.has(b.scene.id))||
      b.relevance-a.relevance||
      a.scene.id.localeCompare(b.scene.id));
    const firstInStage=i===0||stage!==shots.at(-1)?.stage;
    // The first shot of each act must use that act's canonically ranked MP4.
    const primary=stageClipIds!==null&&firstInStage
      ?relevant.find(x=>x.scene.id===stageClipIds[stage]):null;
    // Never let a beat's primary choice duplicate the immediately previous MP4.
    const previousId=shots.at(-1)?.sceneId;
    const nextStage=Math.min(3,Math.floor((i+1)*4/cutCount));
    // Reserve the next act's canonical first scene at the last prior cut.
    const nextPrimary=stageClipIds!==null&&nextStage>stage
      ?stageClipIds[nextStage]:null;
    // Reserve later act anchors and reject every non-adjacent reuse when
    // strict uniqueness is requested for a complete owner video.
    const futureAnchors=!allowRepetition&&stageClipIds!==null
      ?new Set(stageClipIds.slice(stage+1)):null;
    const futureOrigins=new Set(!futureAnchors?[]:
      relevant.filter(row=>futureAnchors.has(row.scene.id)).flatMap(masterKeys));
    if(!allowRepetition&&primary&&
      (used.has(primary.scene.id)||overlaps(primary,usedOrigins)))
      return fail('UNIQUE_FILMED_SOURCES_INSUFFICIENT');
    const selected=!allowRepetition
      ?(primary?.scene.id!==previousId?primary:null)||
        sorted.find(x=>!used.has(x.scene.id)&&
          !overlaps(x,usedOrigins)&&!overlaps(x,futureOrigins))
      :(primary?.scene.id!==previousId?primary:null)||
        sorted.find(x=>x.scene.id!==previousId&&x.scene.id!==nextPrimary)||
        sorted.find(x=>x.scene.id!==previousId);
    if(!selected)return fail(allowRepetition
      ?'ADJACENT_SCENE_REPEAT':'UNIQUE_FILMED_SOURCES_INSUFFICIENT');
    const length=base+(i<remainder?1:0);
    if(length>Math.floor(selected.scene.durationSeconds*1000))
      return fail('NON_LOOPING_SOURCE_COVERAGE_INSUFFICIENT');
    shots.push(Object.freeze({
      index:i,stage,sceneId:selected.scene.id,sourcePath:selected.scene.video,
      sourceDurationMs:Math.round(selected.scene.durationSeconds*1000),
      startMs:cursor,durationMs:length,
      // Each cut fits its physical master; no within-shot repetition.
      loopRequired:false,
      relevance:selected.relevance,
    }));
    cursor+=length;
    used.add(selected.scene.id);
    masterKeys(selected).forEach(k=>usedOrigins.add(k));
  }
  if(cursor!==audioDurationMs) return fail('TIMELINE_MISMATCH');
  return Object.freeze({
    ok:true,version:DOT_STORY_CUT_PLAN_VERSION,
    plotId,scenarioId:plot.scenarioId,
    taxonomyVersion:plot.taxonomyVersion,
    plotSource:'canonical_mytube_topic_ranker',
    stageClipIds:stageClipIds?Object.freeze([...stageClipIds]):null,
    audioDurationMs,cutCount,uniqueSceneCount:used.size,
    needsPhysicalMediaVerification:true,
    needsOwnerPreviewApproval:true,
    publishAuthorized:false,
    audioPolicy:'preserve_original_no_transcription',
    stages:Object.freeze([...plot.visualBeats]),
    shots:Object.freeze(shots),
  });
}
