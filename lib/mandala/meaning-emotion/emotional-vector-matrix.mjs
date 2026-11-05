/**
 * HH Emotional Vector Matrix 64 v1.
 * Authorial creative taxonomy, never a validated clinical score, automatic
 * diagnosis or permission to impose a transformation on a person.
 */
export const EMOTION_MATRIX_VERSION="hh-emotional-vectors-64-v1";
const sourceCurrent=[["anxiety","Тревога и страх","Anxiety and fear","Ansiedad y miedo","anxiety tension worry overload",-2],["shame","Стыд и самокритика","Shame and self-criticism","Vergüenza y autocrítica","shame self_criticism",-3],["anger","Злость и обида","Anger and resentment","Enojo y resentimiento","anger resentment",-2],["fatigue","Усталость и истощение","Fatigue and depletion","Cansancio y agotamiento","fatigue exhaustion",-2],["loneliness","Одиночество и отчуждение","Loneliness and isolation","Soledad y aislamiento","loneliness isolation",-2],["confusion","Растерянность и потерянность","Confusion and lost direction","Confusión y desorientación","confusion uncertainty lost meaningless",-1],["helplessness","Бессилие и скованность","Helplessness and stuckness","Impotencia y bloqueo","helplessness doubt stuck constraint stagnation procrastination",-3],["sadness","Печаль и уныние","Sadness and discouragement","Tristeza y desánimo","sadness discouraged",-2]];
const sourceDesired=[["calm","Спокойствие и безопасность","Calm and safety","Calma y seguridad","calm safe grounded trust",2],["confidence","Уверенность и способность действовать","Confidence and agency","Confianza y capacidad de actuar","confidence capable",2],["self_acceptance","Самопринятие и доброта к себе","Self-acceptance and self-kindness","Autoaceptación y amabilidad propia","self_acceptance compassion",3],["boundaries","Границы и свобода","Boundaries and freedom","Límites y libertad","boundaries assertiveness freedom openness",2],["vitality","Энергия и движение","Energy and momentum","Energía e impulso","vitality rested motivation momentum",3],["connection","Близость и контакт","Closeness and connection","Cercanía y conexión","connection closeness",2],["clarity","Ясность и направление","Clarity and direction","Claridad y dirección","clarity focus meaning direction",2],["hope","Надежда и радость","Hope and joy","Esperanza y alegría","hope joy",2]];
const oldCuratedPairs=[["anxiety","confidence","anxiety_confidence"],["anxiety","calm","anxiety_calm"],["shame","self_acceptance","shame_acceptance"],["anger","boundaries","anger_boundaries"],["fatigue","vitality","fatigue_vitality"],["loneliness","connection","loneliness_connection"],["confusion","clarity","confusion_clarity"],["self_criticism","compassion","selfcrit_compassion"]];
const buildCluster=([id,ru,en,es,states,suggestedValence])=>Object.freeze({
 id,labels:Object.freeze({ru,en,es}),stateIds:Object.freeze(states.split(" ")),
 representativeStateId:states.split(" ")[0],suggestedValence
});
export const CURRENT_EMOTION_CLUSTERS=Object.freeze(sourceCurrent.map(buildCluster));
export const DESIRED_EMOTION_CLUSTERS=Object.freeze(sourceDesired.map(buildCluster));
const nowById=new Map(CURRENT_EMOTION_CLUSTERS.map(x=>[x.id,x]));
const wantById=new Map(DESIRED_EMOTION_CLUSTERS.map(x=>[x.id,x]));
const index=items=>new Map(items.flatMap(c=>c.stateIds.map(id=>[id,c])));
const nowByState=index(CURRENT_EMOTION_CLUSTERS);
const wantByState=index(DESIRED_EMOTION_CLUSTERS);
const localeOf=x=>["ru","en","es"].includes(x)?x:"ru";
export const EMOTIONAL_VECTOR_MATRIX=Object.freeze(
 CURRENT_EMOTION_CLUSTERS.flatMap(from=>DESIRED_EMOTION_CLUSTERS.map(to=>{
  const old=oldCuratedPairs.filter(([a,b])=>
   nowByState.get(a)?.id===from.id&&wantByState.get(b)?.id===to.id);
  return Object.freeze({
   id:"ev64:"+from.id+">"+to.id,currentClusterId:from.id,desiredClusterId:to.id,
   reviewStatus:old.length?"partially_curated":"awaiting_idea_editorial",
   legacyVectorIds:Object.freeze(old.map(x=>x[2])),version:EMOTION_MATRIX_VERSION
  });
 }))
);
const matrixIndex=new Map(EMOTIONAL_VECTOR_MATRIX.map(x=>[
 x.currentClusterId+">"+x.desiredClusterId,x]));
const localized=(items,locale)=>items.map(x=>({
 id:x.id,label:x.labels[localeOf(locale)],
 representativeStateId:x.representativeStateId,stateIds:[...x.stateIds],
 suggestedValence:x.suggestedValence
}));
export function listCurrentEmotionClusters(locale="ru"){
 return localized(CURRENT_EMOTION_CLUSTERS,locale);
}
export function listDesiredEmotionClusters(locale="ru"){
 return localized(DESIRED_EMOTION_CLUSTERS,locale);
}
export function listEmotionalVectorMatrix(locale="ru"){
 const lang=localeOf(locale);
 return EMOTIONAL_VECTOR_MATRIX.map(x=>({...x,
  label:nowById.get(x.currentClusterId).labels[lang]+" → "+
   wantById.get(x.desiredClusterId).labels[lang]}));
}
export function getEmotionalClusterForState(stateId,side="current"){
 return (side==="current"?nowByState:side==="desired"?wantByState:new Map()).get(stateId)||null;
}
export function getEmotionalVector(a,b){
 return matrixIndex.get(a+">"+b)||null;
}
export function getEmotionalVectorByStates(from,to){
 const a=nowByState.get(from),b=wantByState.get(to);
 return a&&b?getEmotionalVector(a.id,b.id):null;
}
const optional=x=>x===undefined||x===null||x==="";
const between=(x,low,high)=>Number.isInteger(x)&&x>=low&&x<=high;
/**
 * Current emotional charge Q = valence (-3..+3) × intensity (0..10).
 * Indicative resource R = clamp(10 × energy (0..10) + Q, 0, 100).
 * Valence is subjective; a suggested value is always labeled editorial.
 * Missing inputs stay null, and all three dimensions remain visible.
 * @param {{currentStateId?: string|null, currentClusterId?: string|null,
 *   valence?: number|null, intensity?: number|null, energy?: number|null}} [input]
 */
export function calculateEmotionalRelief({
 currentStateId=null,currentClusterId=null,valence=null,intensity=null,energy=null
}={}){
 const cluster=currentClusterId?nowById.get(currentClusterId):nowByState.get(currentStateId);
 if(currentClusterId&&!cluster||
  !optional(valence)&&!between(valence,-3,3)||
  !optional(intensity)&&!between(intensity,0,10)||
  !optional(energy)&&!between(energy,0,10))
  return {status:"invalid_input",version:EMOTION_MATRIX_VERSION};
 const v=optional(valence)?cluster?.suggestedValence??null:valence;
 const valenceSource=optional(valence)?cluster?"editorial_suggestion":"unknown":"self_report";
 const emotionalCharge=v!==null&&!optional(intensity)?v*intensity:null;
 const resourceIndex=emotionalCharge!==null&&!optional(energy)?
  Math.max(0,Math.min(100,energy*10+emotionalCharge)):null;
 return {status:resourceIndex===null?"incomplete":"calculated",
  version:EMOTION_MATRIX_VERSION,currentClusterId:cluster?.id??null,
  valence:v,valenceSource,intensity:optional(intensity)?null:intensity,
  energy:optional(energy)?null:energy,emotionalCharge,resourceIndex,
  presentationHint:(!optional(energy)&&energy<=3)||(!optional(intensity)&&intensity>=8)?
   "gentle":"client_choice",nonClinical:true};
}
export function auditEmotionalVectorMatrix(){
 const errors=[];
 for(const [groups,idx,side] of [
  [CURRENT_EMOTION_CLUSTERS,nowByState,"current"],
  [DESIRED_EMOTION_CLUSTERS,wantByState,"desired"]
 ]){
  if(groups.length!==8||new Set(groups.map(x=>x.id)).size!==8)errors.push(side+":clusters");
  const n=groups.reduce((sum,x)=>sum+x.stateIds.length,0);
  if(n!==24||idx.size!==24)errors.push(side+":coverage");
  for(const x of groups){
   if(!between(x.suggestedValence,-3,3))errors.push(side+":valence:"+x.id);
   if(!x.stateIds.includes(x.representativeStateId))errors.push(side+":representative:"+x.id);
   for(const lang of ["ru","en","es"])if(!x.labels[lang])errors.push(side+":locale:"+x.id);
  }
 }
 if(EMOTIONAL_VECTOR_MATRIX.length!==64||matrixIndex.size!==64)errors.push("matrix:64");
 const covered=EMOTIONAL_VECTOR_MATRIX.filter(x=>x.legacyVectorIds.length);
 if(covered.length!==7||covered.flatMap(x=>x.legacyVectorIds).length!==8)
  errors.push("legacy:8:7");
 return {ok:errors.length===0,errors,
  counts:{currentClusters:8,desiredClusters:8,potentialVectors:64,
   legacyCuratedPairs:8,cellsWithAnyLegacyIdeas:covered.length,
   cellsAwaitingIdeas:64-covered.length}};
}
