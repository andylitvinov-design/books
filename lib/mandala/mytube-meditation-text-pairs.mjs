/**
 * Two scenario-bound Russian meditation drafts per canonical MyTube video.
 * No provider calls, customer data, DB, automatic charging or WAV claim.
 */
import catalog from "../../data/video-catalog/mytube-meditations-512-ru-v1.json" with {type:"json"};
import taxonomy from "../../data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json" with {type:"json"};
export const MYTUBE_MEDITATION_TEXT_VERSION=catalog.schemaVersion;
export const MYTUBE_MEDITATION_COUNTS=Object.freeze({scenarios:256,variantsPerScenario:2,texts:512});
const canonical=new Set(taxonomy.categories.flatMap(c=>c.subcategories.flatMap(s=>s.topics.flatMap(t=>t.scenarios.map(x=>x.id)))));
const byId=new Map(catalog.entries.map(x=>[x.id,x]));
export function getMyTubePreparedMeditationPair(scenarioId,locale="ru"){
 if(locale!=="ru"||typeof scenarioId!=="string"||!canonical.has(scenarioId))return null;
 const row=byId.get(scenarioId);
 if(!row||typeof row.a!=="string"||typeof row.b!=="string"||row.a===row.b)return null;
 return {scenarioId,source:"editorial_ru_draft",durationMeasured:false,options:[
  {id:"a",title:"Образная медитация",seconds:30,text:row.a},
  {id:"b",title:"Практика внимания",seconds:30,text:row.b}
 ]};
}
export function auditMyTubePreparedMeditations(){
 const errors=[],texts=new Set();
 if(canonical.size!==256||byId.size!==256||catalog.entries.length!==256)errors.push("scenario_count");
 for(const row of catalog.entries){
  if(!canonical.has(row.id))errors.push("unknown_scenario:"+row.id);
  for(const variant of ["a","b"]){
   const script=row[variant],wc=typeof script==="string"?script.trim().split(/\s+/u).length:0;
   if(!script||wc<30||wc>42||texts.has(script))errors.push("script:"+row.id+":"+variant);
   texts.add(script);
  }
 }
 if(texts.size!==512)errors.push("unique_text_count");
 return {ok:errors.length===0,scenarios:byId.size,meditations:texts.size,errors};
}
