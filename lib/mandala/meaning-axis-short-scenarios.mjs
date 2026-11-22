/**
 * 512 opt-in 14-second symbolic film drafts (64 topics × 8 approved meaning axes).
 * Distinct from the 256 canonical MyTube 30-second scripts. No media bindings,
 * payment, user profiling, external AI requests or automatic rendering.
 */
import source from "../../data/video-catalog/meaning-axis-short-scenarios-512-v1.json" with {type:"json"};

const LOCALES=Object.freeze(["en","ru","es"]);
const langOf=locale=>LOCALES.includes(locale)?locale:"en";
const AXES=Object.freeze(source.axes.map(axis=>Object.freeze({...axis})));
const SCRIPTS=Object.freeze(source.scenarios);
const byId=new Map(SCRIPTS.map(row=>[row.id,row]));
const bySubsector=new Map(SCRIPTS.map(row=>[row.subsectorId,row]));
const byTopic=new Map();
for(const row of SCRIPTS){
  const list=byTopic.get(row.topicId)||[];
  list.push(row);
  byTopic.set(row.topicId,list);
}
const readRow=(row,locale)=>{
  if(!row)return null;
  const l=langOf(locale);
  return {
    id:row.id,subsectorId:row.subsectorId,topicId:row.topicId,
    categoryId:row.categoryId,subcategoryId:row.subcategoryId,axisId:row.axisId,
    label:row.label[l],sceneOutline:[...row.outline[l]],
    captionDrafts:[...row.captions[l]],voiceoverDraft:[...row.voiceoverDraft[l]],
    durationMs:source.durationMs,
    shotTimingsMs:source.shotTimingsMs.map(([start,end])=>({start,end})),
    sourceStatus:source.status,conceptOnly:true,canRender:false,
    humanReviewed:false,mediaMatched:false,
  };
};

export const MEANING_AXIS_SHORT_SCENARIOS_VERSION=source.schemaVersion;
export const MEANING_AXIS_SHORT_SCENARIOS_COUNTS=Object.freeze({...source.hierarchy});

export function listMeaningAxisShortAxes(locale="en"){
  const l=langOf(locale);
  return AXES.map(axis=>({id:axis.id,label:axis.name[l],definition:axis.definition[l],legacyId:axis.legacyId}));
}
export function listMeaningAxisShortScenarios(topicId,locale="en"){
  return (byTopic.get(topicId)||[]).map(row=>readRow(row,locale));
}
export function getMeaningAxisShortScenarioBySubsector(subsectorId,locale="en"){
  return readRow(bySubsector.get(subsectorId),locale);
}
export function getMeaningAxisShortScenarioById(id,locale="en"){
  return readRow(byId.get(id),locale);
}
export function auditMeaningAxisShortScenarios(){
  const errors=[],ids=new Set(),subsectors=new Set(),topics=new Map();
  const axisIds=new Set(AXES.map(a=>a.id));
  if(AXES.length!==8||axisIds.size!==8)errors.push("axis_count");
  if(SCRIPTS.length!==512)errors.push("script_count");
  if(source.durationMs!==14000)errors.push("duration");
  if(source.release.canRender!==false||source.release.humanReviewed!==false||source.release.verifiedRights!==false)
    errors.push("unsafe_release_flags");
  for(const l of LOCALES){
    const labels=new Set(),outlines=new Set();
    for(const s of SCRIPTS){
      if(!Array.isArray(s.outline?.[l])||s.outline[l].length!==4||s.outline[l].some(x=>typeof x!=="string"||x.length<10))errors.push("outline:"+s.id+":"+l);
      const title=s.label?.[l]?.trim().toLocaleLowerCase(l);
      if(!title||labels.has(title))errors.push("duplicate_title:"+s.id+":"+l);
      labels.add(title);
      const brief=s.outline?.[l]?.join(" → ")?.toLocaleLowerCase(l);
      if(!brief||outlines.has(brief))errors.push("duplicate_storyboard:"+s.id+":"+l);
      outlines.add(brief);
      if(!Array.isArray(s.captions?.[l])||s.captions[l].length!==3||s.captions[l].some(x=>typeof x!=="string"||Array.from(x).length>36))errors.push("caption:"+s.id+":"+l);
      if(!Array.isArray(s.voiceoverDraft?.[l])||s.voiceoverDraft[l].length!==2)errors.push("voiceover:"+s.id+":"+l);
    }
  }
  for(const s of SCRIPTS){
    if(ids.has(s.id))errors.push("duplicate_id:"+s.id);
    ids.add(s.id);
    if(subsectors.has(s.subsectorId)||s.subsectorId!==s.topicId+"__"+s.axisId)errors.push("subsector:"+s.id);
    subsectors.add(s.subsectorId);
    if(!axisIds.has(s.axisId))errors.push("axis:"+s.id);
    const row=topics.get(s.topicId)||new Set();
    row.add(s.axisId);topics.set(s.topicId,row);
  }
  if(topics.size!==64||[...topics.values()].some(x=>x.size!==8))errors.push("topic_axis_coverage");
  if(source.shotTimingsMs.length!==4||source.shotTimingsMs[0][0]!==0||source.shotTimingsMs.at(-1)[1]!==14000||
    source.shotTimingsMs.some((pair,i,arr)=>pair[1]<=pair[0]||(i>0&&pair[0]!==arr[i-1][1])))errors.push("shot_timing");
  return {ok:!errors.length,counts:{topics:topics.size,meaningAxes:axisIds.size,newDrafts:SCRIPTS.length,
    existingCanonicalDrafts:source.hierarchy.existingCanonicalThirtySecondScenarios},errors};
}