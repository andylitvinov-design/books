/** Canonical editorial navigation: category > subcategory > topic > meaning > motif > scenario. */
import meanings from "../../data/video-catalog/meaning-emotion-ideas-v1.json" with {type:"json"};
import mapping from "../../data/video-catalog/mytube-meaning-motifs-v1.json" with {type:"json"};
import {getMyTubeTopic,listMyTubeScenarios,getMyTubeTaxonomy} from "./mytube-content-taxonomy.mjs";
import {getMyTubeMotif} from "./mytube-creative-choices.mjs";
const lang=locale=>["ru","en","es"].includes(locale)?locale:"ru";
const axisIds=new Set(meanings.axes.map(x=>x.id));
export const MYTUBE_MEANING_COUNTS=Object.freeze({categories:4,subcategories:16,topics:64,
  axesPerTopic:8,motifsPerAxis:4,scenariosPerMotif:4,pathsPerTopic:128,
  potentialPaths:8192,uniqueScenarioTemplates:256});
export const makeMyTubeMeaningPathId=(topicId,axisId,motifId,scenarioId)=>
  [topicId,axisId,motifId,scenarioId].join("::");
export function listMyTubeMeaningAxes(topicId,locale="ru"){
 if(!getMyTubeTopic(topicId))return [];
 const l=lang(locale);
 return meanings.axes.map(x=>({id:x.id,label:x.labels[l],description:x.shortDescription[l],
  facets:x.facets.map(f=>({id:f.id,label:f.labels[l]})),motifCount:4,
  sourceStatus:x.editorialStatus,conceptOnly:true}));
}
export function listMyTubeMeaningMotifs(topicId,axisId,locale="ru"){
 if(!getMyTubeTopic(topicId)||!axisIds.has(axisId))return [];
 const l=lang(locale);
 return (mapping.motifsByAxis[axisId]||[]).map((id,i)=>{
  const m=getMyTubeMotif(id);
  return m?{id,topicId,meaningAxisId:axisId,label:m.label[l],meaning:m.meaning[l],
   visualTags:[...m.visualTags],rank:i+1,recommended:i===0,
   scenarioCount:4,sourceStatus:m.status,conceptOnly:true}:null;
 }).filter(Boolean);
}
export function listMyTubeMotifScenarios(topicId,axisId,motifId,locale="ru"){
 if(!listMyTubeMeaningMotifs(topicId,axisId,locale).some(m=>m.id===motifId))return [];
 return listMyTubeScenarios(topicId,locale).map(s=>({...s,meaningAxisId:axisId,motifId,
  pathId:makeMyTubeMeaningPathId(topicId,axisId,motifId,s.id),
  filmScenarioTemplateId:s.id,sourceStatus:"editorial_composition_unreviewed",conceptOnly:true,canExport:false}));
}
export function getMyTubeTopicMeaningTree(topicId,locale="ru"){
 const x=getMyTubeTopic(topicId);if(!x)return null;
 return {id:topicId,label:x.topic.label[lang(locale)],categoryId:x.category.id,
  subcategoryId:x.subcategory.id,meaningAxes:listMyTubeMeaningAxes(topicId,locale).map(a=>({
   ...a,motifs:listMyTubeMeaningMotifs(topicId,a.id,locale).map(m=>({
    ...m,scenarios:listMyTubeMotifScenarios(topicId,a.id,m.id,locale)
   }))
  }))};
}
export function validateMyTubeMeaningPath({topicId,meaningAxisId,motifId,scenarioId}={}){
 if(!getMyTubeTopic(topicId))return {ok:false,status:"unknown_topic"};
 if(!axisIds.has(meaningAxisId))return {ok:false,status:"invalid_meaning_axis"};
 if(!mapping.motifsByAxis[meaningAxisId]?.includes(motifId))return {ok:false,status:"invalid_axis_motif"};
 if(!listMyTubeScenarios(topicId).some(s=>s.id===scenarioId))
  return {ok:false,status:"invalid_film_scenario"};
 return {ok:true,status:"editorial_path",
  pathId:makeMyTubeMeaningPathId(topicId,meaningAxisId,motifId,scenarioId)};
}
export function auditMyTubeMeaningHierarchy(){
 const problems=[],paths=new Set(),templates=new Set();
 if(mapping.hierarchy.join(">")!=="category>subcategory>topic>meaningAxis>motif>filmScenario")problems.push("order");
 if(mapping.meaningAxisIds.join(":")!==meanings.axes.map(x=>x.id).join(":"))problems.push("axes");
 for(const axis of meanings.axes){
  const ids=mapping.motifsByAxis[axis.id]||[];
  if(ids.length!==4||new Set(ids).size!==4||ids.some(id=>!getMyTubeMotif(id)))problems.push("motif:"+axis.id);
 }
 const topics=getMyTubeTaxonomy().categories.flatMap(c=>c.subcategories.flatMap(s=>s.topics));
 for(const topic of topics)for(const a of listMyTubeMeaningAxes(topic.id))
  for(const m of listMyTubeMeaningMotifs(topic.id,a.id)){
   const choices=listMyTubeMotifScenarios(topic.id,a.id,m.id);
   if(choices.length!==4)problems.push("scenario_count:"+topic.id);
   for(const s of choices){
    if(paths.has(s.pathId))problems.push("duplicate:"+s.pathId);
    paths.add(s.pathId);templates.add(s.id);
   }
  }
 if(topics.length!==64||paths.size!==8192||templates.size!==256)problems.push("totals");
 return {ok:problems.length===0,counts:{topics:topics.length,meaningAxes:8,
  editorialPaths:paths.size,originalScenarioTemplates:templates.size},errors:problems};
}
