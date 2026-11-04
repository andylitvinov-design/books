/**
 * Conservative plot-aware edit plan from genuinely approved local MP4 clips.
 *
 * A "plot" is an editorial narrative with four beats. We can suggest topic-
 * matched footage for those four beats, but visual ranking is not evidence that
 * the depicted action actually happens in the footage.
 *
 * This is deterministic, read-only, free and leaves the final rights gate intact.
 */
import {recommendMyTubeTopicStoryClips} from "./mytube-video-tagging.mjs";
import {validateMontageClips} from "./video-montage-sources.mjs";

const PLOT_MODES = Object.freeze([
  "grounded_dilemma", "symbolic_quest", "relational_mirror", "branching_future",
]);
const MODE_HINTS = Object.freeze({
  grounded_dilemma: ["person", "people", "work", "hands", "city", "home", "life", "day", "journey", "walk"],
  symbolic_quest: ["forest", "cosmic", "stars", "sun", "light", "magic", "portal", "dream", "mystery", "nature", "mountain"],
  relational_mirror: ["partner", "people", "heart", "together", "couple", "love", "connection", "hands", "family", "friend"],
  branching_future: ["path", "road", "travel", "choice", "crossroads", "portal", "horizon", "journey", "door", "future"],
});
const STAGE_HINTS = [
  ["morning", "beginning", "dawn", "start", "origin", "path", "alone"],
  ["rain", "storm", "dark", "night", "challenge", "tension", "shadow", "mist"],
  ["light", "bridge", "growth", "nature", "support", "river", "change", "flow"],
  ["horizon", "sunrise", "golden", "peace", "freedom", "renewal", "open", "calm"],
];
const STOPWORDS=new Set([
  "with","from","this","that","have","there","into","your","their","then","when",
  "where","through","they","them","becomes","become","someone","person","people",
  "story","choice","rather","without","before","after","again","over","under",
  "what","will","does","only","more","once","while","some","about","behind",
  "looks","feels","feel","comes","come","starts","start","another","moment",
  "each","other","itself","because","something","someone","whatsoever",
]);
const tokenize=(text)=>String(text||"").toLocaleLowerCase("en")
  .match(/[a-z][a-z]+/g)?.filter(token=>token.length>3&&!STOPWORDS.has(token))??[];
const uniqueTokens=(words)=>new Set(words.flatMap(tokenize));
function smallHash(text) {
  let h=2166136261;
  for (const character of String(text)) h=Math.imul(h^character.charCodeAt(0),16777619)>>>0;
  return h;
}
function invalid(status, plotId=null, topicId=null, candidateCount=0){
  return {status,plotId,topicId,candidateCount,clipIds:[],stages:[],
    hasFourApprovedSources:false,verifiedFinishedPlot:false,
    mediaFidelity:"unverified_editorial_plot"};
}
/**
 * @param {{
 *   plot?: {id:string, scenarioId:string, topicId:string, plotMode:string,
 *     visualCues?:readonly string[], beats?:readonly string[]},
 *   scenes?:readonly object[], excludedMotifs?:readonly string[],
 *   minTopicScore?:number
 * }} [options]
 */
export function recommendMyTubePlotMontage({
  plot,scenes=[],excludedMotifs=[],minTopicScore=65,
}={}) {
  const plotId=typeof plot?.id==="string"?plot.id:null;
  const topicId=typeof plot?.topicId==="string"?plot.topicId:null;
  const scenarioId=typeof plot?.scenarioId==="string"?plot.scenarioId:null;
  const suffix=plotId?.match(/-p([1-4])$/);
  if(!suffix||!scenarioId||!topicId||plotId!==scenarioId+"-p"+suffix[1]||
    !PLOT_MODES.includes(plot.plotMode)||PLOT_MODES[Number(suffix[1])-1]!==plot.plotMode||
    !Array.isArray(plot.beats)||plot.beats.length!==4) {
    return invalid("invalid_plot",plotId,topicId);
  }
  // Reuse strict topic, scenario, licensing and negative-motif checks.
  const coverage=recommendMyTubeTopicStoryClips({
    topicId,scenarioId,scenes,excludedMotifs,minTopicScore,
  });
  if(!coverage.dedicatedFourSceneReady){
    return invalid(coverage.status,plotId,topicId,coverage.candidateCount);
  }
  const bySceneId=new Map(scenes.map(scene=>[scene?.id,scene]));
  const eligible=coverage.candidates.map(row=>({
    ...row,source:bySceneId.get(row.sceneId),
  })).filter(row=>Boolean(row.source));
  if(eligible.length<4) return invalid("insufficient_topic_media",plotId,topicId,eligible.length);
  const sourceTokens=eligible.map(row=>uniqueTokens([
    row.sceneId,row.source.tags?.join(" ")||"",
    row.source.motifs?.join(" ")||"",
    row.source.label?.en||"",row.source.description?.en||"",
  ]));
  const modeHints=new Set(MODE_HINTS[plot.plotMode]);
  const beatTokens=(plot.visualCues?.length===4?plot.visualCues:plot.beats).map(tokenize);
  const rankedByStage=[0,1,2,3].map(stageIndex=>eligible.map((row,index)=>{
    const source=sourceTokens[index];
    const lexical=beatTokens[stageIndex].filter(token=>source.has(token)).length;
    const mood=STAGE_HINTS[stageIndex].filter(token=>source.has(token)).length;
    const mode=[...modeHints].filter(token=>source.has(token)).length;
    // Style and narrative hints alter ranking, while actual topic evidence
    // continues to dominate. Stable tiny salt avoids four identical orders.
    const variety=smallHash(plot.id+"|"+stageIndex+"|"+row.sceneId)%7;
    return {row,stageIndex,score:row.score+Math.min(4,lexical)*9+
      Math.min(3,mood)*6+Math.min(3,mode)*7+variety,
      lexicalMatches:lexical,modeMatches:mode,moodMatches:mood};
  }).sort((a,b)=>b.score-a.score||a.row.sceneId.localeCompare(b.row.sceneId)));
  // Solve four-stage assignment without reusing clips. Branch and bound to the
  // 12 best candidates/stage (at most 12^4 combos), no extra media downloads.
  const top=rankedByStage.map(list=>list.slice(0,12));
  let best=null, bestScore=-Infinity, bestTie="";
  function visit(stage,chosen,used,total){
    if(stage===4){
      const tie=chosen.map(x=>x.row.sceneId).join("|");
      if(total>bestScore||(total===bestScore&&(best===null||tie<bestTie))){
        best=[...chosen];bestScore=total;bestTie=tie;
      }
      return;
    }
    for(const item of top[stage]){
      if(used.has(item.row.sceneId))continue;
      used.add(item.row.sceneId);chosen.push(item);
      visit(stage+1,chosen,used,total+item.score);
      chosen.pop();used.delete(item.row.sceneId);
    }
  }
  visit(0,[],new Set(),0);
  if(!best||best.length!==4)return invalid("insufficient_topic_media",plotId,topicId,eligible.length);
  const clipIds=best.map(x=>x.row.sceneId);
  if(!validateMontageClips(clipIds,scenes,excludedMotifs))
    return invalid("unsafe_clip_selection",plotId,topicId,coverage.candidateCount);
  return {
    status:"topic_matched_symbolic_plot_preview",
    plotId,topicId,scenarioId,plotMode:plot.plotMode,
    candidateCount:coverage.candidateCount,clipIds,
    stages:best.map((x,i)=>({
      stage:i+1,clipId:x.row.sceneId,
      plotBeat:plot.beats[i],
      sourceTopicScore:x.row.topicScore,
      sourceScenarioVisualFit:x.row.scenarioVisualFit,
      approximateStageScore:x.score,
      depictedEventVerified:false,
    })),
    hasFourApprovedSources:true,verifiedFinishedPlot:false,
    mediaFidelity:"topic_matched_symbolic_approximation",
  };
}
