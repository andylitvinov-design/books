/**
 * Bridge from the 120 editorial goal/topic/storyboard IDs (PR #2949)
 * to four REAL, already-generated first-party MP3 recordings per storyboard.
 *
 * Economical by design: 480 placements reuse the existing 192 distinct
 * recordings (PR #2948). No recording repeats within a goal category; files
 * may be reused across DIFFERENT categories. No new Vercel storage, FFmpeg
 * build time, paid API, URLs from unapproved sources or visitor profiling.
 *
 * An audio-ready playlist does NOT make an unbound video storyboard executable.
 */
import manifest from "../../data/video-catalog/goal-tree-audio-playlists-v1.json" with {type:"json"};
import {
  SCENARIO_AUDIO_REGISTRY,SCENARIO_AUDIO_VARIANTS,
  isScenarioAudioId,scenarioAudioTracks,
} from "./scenario-audio-catalog.mjs";

export const GOAL_TREE_AUDIO_VERSION=manifest.version;
export const GOAL_TREE_AUDIO_TOTALS=Object.freeze({...manifest.totals});
const validLocales=new Set(["ru","en","es"]);
const lookup=new Map(manifest.assignments.map(row=>[row.scenarioId,row]));
const actualPresets=new Set(SCENARIO_AUDIO_REGISTRY.map(entry=>entry.id));
const matches=/^score-([a-z0-9]+(?:-[a-z0-9]+)*)-([1-4])$/;
const localeOf=l=>validLocales.has(l)?l:"ru";

export function isKnownGoalAudioScenario(id){
  return typeof id==="string"&&lookup.has(id);
}
export function getGoalTreeAudioChoices(scenarioId){
  const row=lookup.get(scenarioId);
  if(!row)return [];
  const tracks=[];
  for(const id of row.audioIds){
    if(!isScenarioAudioId(id))return [];
    const parts=matches.exec(id);
    if(!parts||!actualPresets.has(parts[1]))return [];
    const base=scenarioAudioTracks(parts[1]).find(track=>track.id===id);
    if(!base)return [];
    const variant=SCENARIO_AUDIO_VARIANTS.find(v=>v.id===Number(parts[2]));
    if(!variant)return [];
    tracks.push(Object.freeze({
      ...base,
      name:Object.fromEntries(["ru","en","es"].map(l=>[l,variant.name[l]+" · "+row.label[l]])),
      sourceScenarioId:parts[1],goalScenarioId:row.scenarioId,
      categoryId:row.categoryId,topicId:row.topicId,
      rights:base.rights,
      mediaUrl:"/audio/mandala/scenarios/"+id+".mp3",
    }));
  }
  return tracks.length===4&&new Set(tracks.map(t=>t.id)).size===4?tracks:[];
}
export function recommendedGoalAudio(scenarioId,locale="ru"){
  const tracks=getGoalTreeAudioChoices(scenarioId);
  if(!tracks.length)return null;
  return Object.freeze({
    scenarioId,
    selected:tracks[0].id,
    choices:tracks.map(track=>Object.freeze({
      id:track.id,url:track.mediaUrl,name:track.name[localeOf(locale)],
      detail:track.detail[localeOf(locale)],voiceSafe:track.voiceSafe,
      durationSeconds:track.durationSeconds,
      rights:track.rights,
    })),
    // The taxonomy's sourceStatus remains 'unbound' pending real licensed MP4s.
    finalVideoReady:false,
  });
}
export function goalTreeAudioCoverage(){
  const categories={};const global=new Set();const failed=[];
  for(const row of manifest.assignments){
    (categories[row.categoryId]??={scenarios:0,audioPlacements:0,uniqueFiles:new Set()}).scenarios++;
    const local=getGoalTreeAudioChoices(row.scenarioId);
    if(local.length!==4){failed.push(row.scenarioId);continue}
    categories[row.categoryId].audioPlacements+=local.length;
    for(const x of local){categories[row.categoryId].uniqueFiles.add(x.id);global.add(x.id)}
  }
  return Object.freeze({
    expectedScenarios:120,scenarios:manifest.assignments.length,
    audioPlacements:manifest.assignments.length*4,
    physicalDistinctFiles:global.size,
    categories:Object.fromEntries(Object.entries(categories).map(([id,stats])=>[id,{
      scenarios:stats.scenarios,audioPlacements:stats.audioPlacements,
      uniqueFiles:stats.uniqueFiles.size
    }])),
    pendingVideoBinding:true,failed
  });
}
