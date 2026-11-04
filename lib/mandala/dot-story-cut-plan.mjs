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
    Number.isFinite(scene.durationSeconds)&&scene.durationSeconds>=1&&
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
  const relevant=stageClipIds!==null
    ?stageClipIds.map(id=>{
        const row=pool.find(x=>x.scene.id===id);
        return {...row,relevance:Math.max(row.relevance,1)};
      })
    :pool.filter(item=>item.relevance>0);
  // Do not substitute four random unrelated videos for a requested story.
  if(relevant.length<minUniqueScenes)return {
    ...fail('VERIFIED_SCENE_COVERAGE_INSUFFICIENT'),
    plotId,approvedRelevantCount:relevant.length,requiredCount:minUniqueScenes,
  };
  const desiredCuts=Math.max(4,Math.ceil(audioDurationMs/targetCutMs));
  const cutCount=Math.min(MAX_CUTS,Math.min(desiredCuts,Math.floor(audioDurationMs/MIN_CUT_MS)));
  if(cutCount<4)return fail('AUDIO_TOO_SHORT_FOR_FOUR_BEATS');
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
    const selected=primary||
      sorted.find(x=>x.scene.id!==shots.at(-1)?.sceneId)??sorted[0];
    const length=base+(i<remainder?1:0);
    shots.push(Object.freeze({
      index:i,stage,sceneId:selected.scene.id,sourcePath:selected.scene.video,
      sourceDurationMs:Math.round(selected.scene.durationSeconds*1000),
      startMs:cursor,durationMs:length,
      // A single licensed clip may loop within a cut if its source is short.
      loopRequired:length>Math.round(selected.scene.durationSeconds*1000),
      relevance:selected.relevance,
    }));
    cursor+=length;
    used.add(selected.scene.id);
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
