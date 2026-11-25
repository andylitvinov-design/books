/**
 * HH STSE v1 deterministic scenario recommendation.
 * This is a local editorial planner, NOT a diagnosis, treatment or MP4 generator.
 * No raw user descriptions are logged, sent to providers or persisted.
 */
import {getMyTubeTopic,listMyTubeScenarios} from "../mytube-content-taxonomy.mjs";
import {listMyTubeScenarioMotifs} from "../mytube-creative-choices.mjs";
import expansion from "../../../data/video-catalog/state-transition-scenarios-v1.json" with {type:"json"};
import {
  STSE_VERSION,STSE_RANKER_VERSION,STSE_LOCALES,STATE_DEFINITIONS,
  TRANSITION_TEMPLATES,PROFILE_TRANSITIONS,
  STSE_MOTIF_BY_ID,
  STSE_STYLE_BY_ID,normalizeStyleId,listStates,auditStateTransitionRegistry
} from "./state-catalog.mjs";

const safeLocale=(locale)=>STSE_LOCALES.includes(locale)?locale:"ru";
const textKey=(value)=>String(value||"").normalize("NFKC").toLocaleLowerCase()
  .replace(/[^\p{L}\p{N}\s]+/gu," ").replace(/\s+/g," ").trim();
const stateMap=new Map(STATE_DEFINITIONS.map(x=>[x.id,x]));
const stateSynonyms=new Map();
for(const state of STATE_DEFINITIONS)for(const locale of STSE_LOCALES){
  for(const value of [state.labels[locale],...state.aliases[locale]]){
    const key=locale+":"+textKey(value);
    if(!stateSynonyms.has(key))stateSynonyms.set(key,new Set());
    stateSynonyms.get(key).add(state.id);
  }
}
const templates=new Map(TRANSITION_TEMPLATES.map(x=>[x.id,x]));
const close=(a,b,threshold)=>{
 if(Math.abs(a.length-b.length)>threshold)return false;
 const row=Array.from({length:b.length+1},(_,i)=>i);
 for(let i=0;i<a.length;i++){
   let prior=row[0];row[0]=i+1;
   for(let j=0;j<b.length;j++){
     const saved=row[j+1];
     row[j+1]=Math.min(row[j+1]+1,row[j]+1,prior+(a[i]===b[j]?0:1));prior=saved;
   }
   if(Math.min(...row)>threshold)return false;
 }
 return row[b.length]<=threshold;
};
function normalizedState(value,locale){
  if(value===null||value===undefined)return {status:"unmapped_state",reason:"empty_state"};
  const input=typeof value==="string"?{text:value}:value;
  if(!input||typeof input!=="object"||Array.isArray(input))return {status:"unmapped_state",reason:"invalid_state_payload"};
  if(input.stateId!==undefined&&input.stateId!==null){
    const state=stateMap.get(input.stateId);
    return state?{status:"ok",ids:[state.id],state,confidence:"high",evidenceCodes:["canonical_id"]}:
      {status:"unmapped_state",reason:"unknown_state_id"};
  }
  if(typeof input.text!=="string"||input.text.length>160||!input.text.trim())
    return {status:"unmapped_state",reason:"invalid_state_text"};
  const key=textKey(input.text);
  if(!key)return {status:"unmapped_state",reason:"empty_state_text"};
  const matched=stateSynonyms.get(locale+":"+key);
  if(matched?.size===1){
    const id=[...matched][0];return {status:"ok",ids:[id],state:stateMap.get(id),
      confidence:"high",evidenceCodes:["locale_alias_exact"]};
  }
  if(matched?.size>1)return {status:"ambiguous_transition",reason:"ambiguous_alias",ids:[...matched]};
  // Only typo-correction for a single short label, never long prose inference.
  if(key.length>=5&&key.length<=24&&!key.includes(" ")){
    const fuzzy=[];
    for(const [phrase,ids] of stateSynonyms){
      if(!phrase.startsWith(locale+":"))continue;
      const term=phrase.slice(3);
      if(!term.includes(" ")&&close(term,key,1))fuzzy.push(...ids);
    }
    const unique=[...new Set(fuzzy)];
    if(unique.length===1)return {status:"ok",ids:unique,state:stateMap.get(unique[0]),
      confidence:"low",evidenceCodes:["possible_typo_requires_confirmation"]};
    if(unique.length>1)return {status:"ambiguous_transition",reason:"ambiguous_typo",ids:unique};
  }
  return {status:"unmapped_state",reason:"unknown_text_choose_state"};
}
const crashMarkers=/(самоубийств|суицид|хочу умереть|убить себя|самоповрежден|self.harm|kill myself|suicide|quiero morir|suicidio|hacerme daño|острая боль в груди|chest pain)/iu;
const crisisLabel={
 ru:"Если вам сейчас угрожает опасность, обратитесь за срочной помощью или к специалисту. Подбор видеосценария не подходит для экстренной ситуации.",
 en:"If you are in immediate danger, contact emergency services or a qualified professional. A video scenario is not suitable for an emergency.",
 es:"Si corres peligro inmediato, contacta con emergencias o un profesional. Un vídeo no sustituye la atención urgente.",
};
function validateRequest(input){
 if(!input||typeof input!=="object"||Array.isArray(input))return "invalid_request";
 if(input.schemaVersion&&input.schemaVersion!=="state-transition-request-v1")return "invalid_version";
 if(typeof input.topicId!=="string"||!getMyTubeTopic(input.topicId))return "invalid_topic";
 if(input.locale&&!STSE_LOCALES.includes(input.locale))return "invalid_locale";
 for(const key of ["current","desired"]){
   if(!input[key])return "missing_"+key;
   if(typeof input[key]==="object"&&!Array.isArray(input[key])){
     if(input[key].text!==undefined&&input[key].text!==null&&
       (typeof input[key].text!=="string"||input[key].text.length>160))return "invalid_state_text";
     if(input[key].intensity&&!["low","medium","high"].includes(input[key].intensity))
       return "invalid_intensity";
   }
 }
 const prefs=input.preferences||{};
 if(typeof prefs!=="object"||Array.isArray(prefs))return "invalid_preferences";
 if(prefs.excludedMotifIds!==undefined&&(!Array.isArray(prefs.excludedMotifIds)||
     prefs.excludedMotifIds.length>46||prefs.excludedMotifIds.some(id=>typeof id!=="string"||!STSE_MOTIF_BY_ID.has(id))))
   return "invalid_motif";
 if(prefs.styleId!==undefined&&prefs.styleId!==null&&!normalizeStyleId(prefs.styleId))
   return "incompatible_style";
 if(prefs.pace!==undefined&&prefs.pace!==null&&!["gentle","steady"].includes(prefs.pace))
   return "invalid_pace";
 if(prefs.energy!==undefined&&prefs.energy!==null&&!["low","moderate","high"].includes(prefs.energy))
   return "invalid_energy";
 if(prefs.includeEditorialDrafts!==undefined&&typeof prefs.includeEditorialDrafts!=="boolean")
   return "invalid_editorial_preview";
 return null;
}
export function normalizeStates(input,locale="ru"){
 const lang=safeLocale(locale);
 const current=normalizedState(input?.current,lang),desired=normalizedState(input?.desired,lang);
 const status=current.status!=="ok"?current.status:desired.status!=="ok"?desired.status:"ok";
 return {status,current,desired,confidenceBand:
    current.confidence==="high"&&desired.confidence==="high"?"high":"low",
   // No raw text. Vectors are internal artistic hints, not user-facing measurements.
   evidenceCodes:[...(current.evidenceCodes||[]),...(desired.evidenceCodes||[])]};
}
export function planTransitions({current,desired,intensity="medium",pace=null}={}){
 if(!current?.state||!desired?.state)return [];
 const from=current.state.clusterId,to=desired.state.clusterId;
 const high=intensity==="high";
 const plausible=TRANSITION_TEMPLATES.filter(t=>{
   if(!t.allowedFrom.includes(from)&&!t.allowedFrom.includes("*"))return false;
   if(!t.allowedTo.includes(to)&&!t.allowedTo.includes("*"))return false;
   if(high&&t.maxIntensity!=="high")return false;
   if(pace==="gentle"&&t.pace!=="gentle")return false;
   return t.stages.length>=2&&t.stages.length<=5&&
     new Set(t.stages).size===t.stages.length&&t.edges.every((edge,i)=>
       edge.from===t.stages[i]&&edge.to===t.stages[i+1]);
 });
 const weighted=plausible.map(template=>{
   const generic=template.allowedFrom.includes("*"),same=current.state.id===desired.state.id;
   let cost=(generic?60:0)+(template.allowedTo.includes("*")?18:0)+(template.pace==="steady"?8:0);
   if(from==="tension"&&template.id==="grounding")cost-=20;
   if(from==="acceptance"&&template.id==="acceptance")cost-=20;
   if(from==="agency"&&current.state.polarity<0&&template.id==="agency")cost-=20;
   if(same&&template.id==="integration")cost-=30;
   // When grief is explicitly moving toward hope, prefer rebuilding hope over generic release.
   if(from==="hope"&&to==="hope"&&current.state.polarity<0&&desired.state.polarity>0&&template.id==="hope")cost-=20;
   return {templateId:template.id,stages:[...template.stages],pace:template.pace,
     edges:template.edges.map(edge=>edge.id),stageCoverage:4,activationContinuity:"bounded",
     safetyAnnotations:template.disallowedMotifIds.map(id=>"avoid_motif:"+id),
     cost,version:STSE_VERSION};
 }).sort((a,b)=>a.cost-b.cost||a.templateId.localeCompare(b.templateId));
 return weighted.slice(0,3);
}
const expandedIndex=new Map();
for(const record of expansion.topics||[]){
 for(const scenario of record.scenarios||[]){
   if(expandedIndex.has(scenario.id))throw new Error("duplicate stse scenario: "+scenario.id);
   expandedIndex.set(scenario.id,scenario);
 }
}

const legacyProfiles={
 journey:{styles:["nature","cinematic","symbolic","realistic"],intensities:["low","medium"]},
 shelter:{styles:["meditative","nature","minimal","realistic"],intensities:["low","medium","high"]},
 reframe:{styles:["symbolic","nature","meditative","realistic"],intensities:["low","medium","high"]},
 integration:{styles:["nature","meditative","cinematic","realistic"],intensities:["low","medium","high"]},
};
function profileForScenario(scenario,topicId,locale){
 const extra=expandedIndex.get(scenario.id);

 const source=extra||scenario;
 const current=extra?extra.allowedTransitionIds:PROFILE_TRANSITIONS[scenario.archetype]||["integration"];
 const motifs=extra?extra.motifIds:listMyTubeScenarioMotifs(scenario.id,locale).map(x=>x.id);
 const styleIds=extra?extra.styleIds:legacyProfiles[scenario.archetype]?.styles||["nature"];
 const beats=source.storyboard?.[locale]||scenario.sceneOutline;
 return {id:scenario.id,scenarioId:scenario.id,topicId,label:source.label?.[locale]||scenario.label,
   creativeBrief:source.creativeBrief?.[locale]||scenario.creativeBrief,
   beats:[...beats],sceneOutline:[...beats],archetype:source.archetype,allowedTransitionIds:[...current],
   motifIds:[...motifs],compatibleStyleIds:[...styleIds],
   intensityBand:extra?extra.intensityBand:legacyProfiles[scenario.archetype]?.intensities||["low","medium"],
   pace:extra?extra.pace:"gentle",forbiddenMotifIds:extra?extra.disallowedMotifIds:[],
   editorialReviewStatus:extra?"needs_human_review":"legacy_existing",
   mediaBindingStatus:"unbound",sourceStatus:"editorial_unbound",
   availablePlotModes:extra?[]:["grounded_dilemma","symbolic_quest","relational_mirror","branching_future"],
   legacyPlotCompatibility:!extra,conceptOnly:true,canExport:false,
   newExpansion:Boolean(extra),stageCount:4};
}
export function listStateTransitionScenarios(topicId,locale="ru",{includeEditorialDrafts=true}={}){
 // The registry always retains all 512 immutable IDs. Client-facing suggestions
 // are independently gated: unpublished editorial drafts cannot silently become
 // recommendations just because their JSON source exists.

 const found=getMyTubeTopic(topicId);
 if(!found)return [];
 const lang=safeLocale(locale);
 const old=listMyTubeScenarios(topicId,lang).map(row=>({
   ...found.topic.scenarios.find(x=>x.id===row.id),id:row.id}));
 const add=includeEditorialDrafts?
   ((expansion.topics||[]).find(x=>x.topicId===topicId)?.scenarios||[]):[];
 return [...old,...add].map(row=>profileForScenario(row,topicId,lang));
}
export function getStateTransitionScenario(id,locale="ru"){
 const topicId=String(id||"").replace(/-s[1-8]$/,"");
 return listStateTransitionScenarios(topicId,locale).find(row=>row.scenarioId===id)||null;
}
function clamp(value){return Math.min(100,Math.max(0,Math.round(value)));}
function rankWithPaths(topicId,paths,options={}){
 const locale=safeLocale(options.locale),prefs=options.preferences||{};
 const styleId=normalizeStyleId(prefs.styleId);
 const intensity=options.intensity||"medium";
 const excluded=new Set(prefs.excludedMotifIds||[]);
 const high=intensity==="high",avoid=new Set(high?["fire","cave","stars"]:[]);
 if(prefs.avoidPhysicalContact)avoid.add("hands");
 const scores=[];
 // The conservative default is to suggest only the original editorial-reviewed
 // story set. New 256 concept drafts require explicit preview opt-in AND stay
 // unrenderable until a separate approved media binding exists.
 for(const profile of listStateTransitionScenarios(topicId,locale,{
   includeEditorialDrafts:prefs.includeEditorialDrafts===true
 })){
   if(!profile.intensityBand.includes(intensity))continue;
   if(styleId&&!profile.compatibleStyleIds.includes(styleId))continue;
   const path=paths.find(p=>profile.allowedTransitionIds.includes(p.templateId));
   if(!path)continue;
   const forbidden=templates.get(path.templateId)?.disallowedMotifIds||[];
   const motifs=profile.motifIds.filter(id=>!excluded.has(id)&&!avoid.has(id)&&
       !forbidden.includes(id)&&!profile.forbiddenMotifIds.includes(id));
   if(!motifs.length)continue;
   // Strictly editorial scores: media is 0 until a separate rights + playable file check.
   const transitionFit=clamp(path.cost<0?100:path.cost>=60?50:95-path.cost/3);
   const topicFit=100;
   const narrativeFit=clamp(profile.newExpansion?96:82);
   // Energy is a nonclinical preference for film pacing, not a diagnostic scale.
   const intensityFit=clamp((profile.pace==="gentle"&&high?100:90)-
     (prefs.energy==="low"&&profile.pace==="steady"?30:0)-
     (prefs.energy==="high"&&profile.pace==="gentle"?5:0));
   const mediaAvailability=0;
   const score=clamp(.35*transitionFit+.25*topicFit+.20*narrativeFit+.10*intensityFit+.10*mediaAvailability);
   scores.push({profile,path,score,scoreBreakdown:{transitionFit,topicFit,narrativeFit,intensityFit,mediaAvailability},
      motifIds:motifs});
 }
 // Choose an appropriate transition before optimizing editorial presentation of that transition.
 scores.sort((a,b)=>a.path.cost-b.path.cost||b.score-a.score||a.profile.scenarioId.localeCompare(b.profile.scenarioId));
 const selected=[],usedMechanisms=new Set(),usedMotifs=new Set();
 for(const candidate of scores){
   if(selected.length===3)break;
   const mechanism=candidate.path.templateId;
   const firstMotif=candidate.motifIds[0];
   if(selected.length&&usedMechanisms.has(mechanism)&&usedMotifs.has(firstMotif))continue;
   selected.push(candidate);usedMechanisms.add(mechanism);usedMotifs.add(firstMotif);
 }
 // If there aren't three diverse routes, return fewer rather than fictional alternatives.
 return selected.map((row,i)=>({
   rank:i+1,scenarioId:row.profile.scenarioId,topicId,
   label:row.profile.label,creativeBrief:row.profile.creativeBrief,
   transitionTemplateId:row.path.templateId,
   fourBeats:[...row.profile.beats],
   reasonCodes:["supports_"+row.path.templateId+"_transition","topic_specific","editorial_only",
      row.profile.newExpansion?"requires_editorial_review":"legacy_scenario"],
   rationale:locale==="ru"?
     "Для вашей темы предлагается путь через "+(TRANSITION_EXPLANATIONS[row.path.templateId]?.ru||"постепенное исследование")+".":
     locale==="es"?
       "Una historia que acompaña el cambio mediante "+(TRANSITION_EXPLANATIONS[row.path.templateId]?.es||"una exploración suave")+".": 
       "A supportive story built around "+(TRANSITION_EXPLANATIONS[row.path.templateId]?.en||"gentle exploration")+".",
   suggestedMotifIds:row.motifIds.slice(0,5),
   suggestedStyleId:normalizeStyleId(prefs.styleId)||row.profile.compatibleStyleIds[0],
   supportedStyleIds:row.profile.compatibleStyleIds,
   mediaStatus:"needs_verified_media",mediaBindingStatus:"unbound",
   plotModeStatus:row.profile.legacyPlotCompatibility?"canonical_four_plots":"requires_editorial_plot_binding",
   scoreBreakdown:row.scoreBreakdown,
   editorialReviewStatus:row.profile.editorialReviewStatus,
   safeToAutoExport:false,
 }));
}
export function rankScenarios(topicId,paths,preferences={},context={}){
 return rankWithPaths(topicId,paths,{...context,preferences});
}
export function resolveMotifAndStyle(scenario,path,preferences={}){
 if(!scenario)return {status:"no_safe_scenario"};
 const excluded=new Set(preferences.excludedMotifIds||[]);
 const motifId=scenario.suggestedMotifIds.find(id=>!excluded.has(id))||null;
 const styleId=normalizeStyleId(preferences.styleId)||scenario.suggestedStyleId;
 if(!motifId||!STSE_MOTIF_BY_ID.has(motifId)||!STSE_STYLE_BY_ID.has(styleId))
   return {status:"incompatible_style"};
 return {status:"editorial_only",scenarioId:scenario.scenarioId,
   transitionTemplateId:path?.templateId||scenario.transitionTemplateId,motifId,styleId,
   sourceKind:"unverified_editorial_concept",mediaStatus:"needs_verified_media"};
}
const TRANSITION_EXPLANATIONS={
 grounding:{ru:"мягкую опору и ощущение безопасности",en:"a gentle sense of grounding and safety",es:"apoyo suave y seguridad"},
 restoration:{ru:"отдых и постепенное восстановление",en:"rest and gradual replenishment",es:"descanso y recuperación gradual"},
 agency:{ru:"маленькие действия и личную инициативу",en:"small steps and personal agency",es:"pequeños pasos e iniciativa propia"},
 acceptance:{ru:"бережное принятие и право быть собой",en:"compassionate acceptance and room to be yourself",es:"aceptación amable y espacio para ser tú"},
 connection:{ru:"уважительный контакт без принуждения",en:"connection without pressure",es:"conexión sin presión"},
 clarification:{ru:"прояснение вариантов",en:"clarifying the available choices",es:"aclarar las opciones"},
 boundary:{ru:"спокойное обозначение границ",en:"calm and respectful boundaries",es:"límites claros y respetuosos"},
 release:{ru:"пространство для облегчения",en:"room for gentle release",es:"espacio para soltar con calma"},
 freedom:{ru:"постепенное расширение возможностей",en:"gradually exploring more freedom",es:"explorar más libertad de forma gradual"},
 hope:{ru:"постепенное возвращение надежды",en:"a gradual opening toward hope",es:"abrirse poco a poco a la esperanza"},
 decision:{ru:"небольшой осознанный выбор",en:"one manageable choice",es:"una pequeña elección consciente"},
 integration:{ru:"бережное соединение опыта",en:"gently integrating the experience",es:"integrar la experiencia con suavidad"},
};
const hexHash=(value)=>{
 let h=2166136261;
 for(let i=0;i<value.length;i++){h^=value.charCodeAt(i);h=Math.imul(h,16777619);}
 return (h>>>0).toString(16).padStart(8,"0");
};
export function recommendScenario(input){
 const locale=safeLocale(input?.locale),invalid=validateRequest(input);
 const base={schemaVersion:"scenario-recommendation-v1",catalogVersion:"mytube-content-taxonomy-4x4x4-v4+hh-stse-v1",
   rankerVersion:STSE_RANKER_VERSION,modelMode:"deterministic_offline",recommendationId:null,
   normalized:null,path:null,recommendations:[],clarification:null};
 if(invalid)return {...base,status:invalid};
 const speech=[input.current?.text,input.desired?.text].filter(x=>typeof x==="string").join(" ");
 if(crashMarkers.test(speech))return {...base,status:"safety_support",clarification:crisisLabel[locale]};
 const normalized=normalizeStates(input,locale);
 if(normalized.status!=="ok")return {...base,status:normalized.status,
   clarification:locale==="ru"?"Уточните, пожалуйста, состояние в списке «Сейчас» или «Хочу».":
      locale==="es"?"Selecciona tu estado en la lista «Ahora» o «Quiero».":
        "Please select your state from the Now or Want list."};
 const intensity=input.current?.intensity||"medium",prefs=input.preferences||{};
 const paths=planTransitions({current:normalized.current,desired:normalized.desired,
   intensity,pace:prefs.pace});
 const recommendations=rankWithPaths(input.topicId,paths,{locale,preferences:prefs,intensity});
 const status=recommendations.length?"ok":"no_safe_scenario";
 const first=paths.find(p=>p.templateId===recommendations[0]?.transitionTemplateId)||paths[0]||null;
 return {...base,status,recommendationId:"stse-"+hexHash(JSON.stringify([
   STSE_RANKER_VERSION,input.topicId,normalized.current.state.id,
   normalized.desired.state.id,intensity,prefs.energy||null,
   prefs.styleId||null,prefs.includeEditorialDrafts===true,prefs.excludedMotifIds||[]])),
   normalized:{currentIds:normalized.current.ids,desiredIds:normalized.desired.ids,
     confidenceBand:normalized.confidenceBand,evidenceCodes:normalized.evidenceCodes},
   path:first?{templateId:first.templateId,stages:first.stages,pace:first.pace,
     stageCoverage:first.stageCoverage,activationContinuity:first.activationContinuity,
     safetyAnnotations:first.safetyAnnotations}:null,
   recommendations,clarification:normalized.confidenceBand==="low"?
     (locale==="ru"?"Проверьте распознанные состояния перед подтверждением.":
       locale==="es"?"Comprueba los estados sugeridos antes de confirmar.":
         "Please verify the suggested states before confirming."):null};
}
export function auditStateTransitionCatalog(){
 const errors=[],legacy=new Set(),extended=new Set(),topics=new Set();
 for(const c of ["ru","en","es"]){
   for(const category of expansion.topics||[]){
     topics.add(category.topicId);
     const scenarios=listStateTransitionScenarios(category.topicId,c);
     if(scenarios.length!==8)errors.push("count:"+c+":"+category.topicId);
     for(const row of scenarios){
       if(!row.label||row.beats.length!==4||row.beats.some(x=>!x?.trim()))
         errors.push("translation:"+c+":"+row.scenarioId);
       if(row.motifIds.length<4||row.motifIds.some(id=>!STSE_MOTIF_BY_ID.has(id)))
         errors.push("motifs:"+c+":"+row.scenarioId);
       if(row.compatibleStyleIds.length<2||row.compatibleStyleIds.some(id=>!STSE_STYLE_BY_ID.has(id)))
         errors.push("styles:"+c+":"+row.scenarioId);
       if(row.newExpansion)extended.add(row.scenarioId);else legacy.add(row.scenarioId);
     }
   }
 }
 const registryAudit=auditStateTransitionRegistry();
 return {ok:!errors.length&&registryAudit.ok,errors:[...errors,...registryAudit.errors],
   counts:{topics:topics.size,legacyScenarios:legacy.size,newScenarios:extended.size,
     scenarios:legacy.size+extended.size,states:STATE_DEFINITIONS.length,
     motifs:STSE_MOTIF_BY_ID.size,styles:STSE_STYLE_BY_ID.size,
     newPendingHumanReview:extended.size,approvedNewMediaBindings:0}};
}
export {listStates};
