import {COACH_PROFILE_AXES,COACH_PROFILE_VERSION} from '../coaching/coach-profile-intake.mjs'

// Original voluntary self-check, not a psychometric questionnaire or diagnosis.
// These four spheres map into the existing Life Plan areas; no parallel goal store.
const L=(en,ru,es)=>Object.freeze({en,ru,es})
export const VECTOR_SELECTION_VERSION='hh-daybook-vector-selection-v1'
export const VECTOR_SPHERES_VERSION='hh-life-four-spheres-v1'
export const VECTOR_SPHERES=Object.freeze([
 {id:'body',areaKey:'body_health',name:L('Body & energy','Тело и энергия','Cuerpo y energía'),detail:L('health, rest and physical wellbeing','здоровье, отдых и физическое самочувствие','salud, descanso y bienestar físico')},
 {id:'work',areaKey:'career_business',name:L('Work & achievement','Дело и достижения','Trabajo y logros'),detail:L('work, money and practical results','работа, деньги и практические результаты','trabajo, dinero y resultados prácticos')},
 {id:'relationships',areaKey:'relationships',name:L('Contact & relationships','Контакты и отношения','Contacto y relaciones'),detail:L('family, friendship and close relationships','семья, дружба и близкие отношения','familia, amistad y relaciones cercanas')},
 {id:'growth',areaKey:'meaning_purpose',name:L('Meaning & future','Смысл и будущее','Sentido y futuro'),detail:L('values, imagination and your direction in life','ценности, воображение и направление жизни','valores, imaginación y tu rumbo en la vida')},
].map(Object.freeze))
export const VECTOR_AXES=COACH_PROFILE_AXES
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value))
const exactKeys=(value,keys)=>plain(value)&&Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key))
const score=value=>Number.isInteger(value)&&value>=0&&value<=10
const pair=value=>exactKeys(value,['current','desired'])&&score(value.current)&&score(value.desired)
const ratings=(value,items)=>exactKeys(value,items.map(item=>item.id))&&items.every(item=>pair(value[item.id]))

/** A complete, versioned snapshot belongs to one saved goal, not to an AI prompt. */
export function normalizeVectorSelection(value){
 if(!exactKeys(value,['version','sphereVersion','axisVersion','recordedAt','sphereId','axisId','statement','spheres','axes'])||
   value.version!==VECTOR_SELECTION_VERSION||value.sphereVersion!==VECTOR_SPHERES_VERSION||value.axisVersion!==COACH_PROFILE_VERSION||
   !VECTOR_SPHERES.some(item=>item.id===value.sphereId)||!VECTOR_AXES.some(item=>item.id===value.axisId)||
   typeof value.statement!=='string'||!value.statement.trim()||[...value.statement].length>1000||/\u0000/.test(value.statement)||
   typeof value.recordedAt!=='string'||value.recordedAt.length>40||!/^\d{4}-\d\d-\d\dT/.test(value.recordedAt)||!Number.isFinite(Date.parse(value.recordedAt))||
   !ratings(value.spheres,VECTOR_SPHERES)||!ratings(value.axes,VECTOR_AXES))return null
 return {version:VECTOR_SELECTION_VERSION,sphereVersion:VECTOR_SPHERES_VERSION,axisVersion:COACH_PROFILE_VERSION,
  recordedAt:new Date(value.recordedAt).toISOString(),sphereId:value.sphereId,axisId:value.axisId,statement:value.statement.trim(),
  spheres:Object.fromEntries(VECTOR_SPHERES.map(({id})=>[id,{current:value.spheres[id].current,desired:value.spheres[id].desired}])),
  axes:Object.fromEntries(VECTOR_AXES.map(({id})=>[id,{current:value.axes[id].current,desired:value.axes[id].desired}]))}
}
export function emptyVectorSelectionDraft(id){
 const empty=items=>Object.fromEntries(items.map(item=>[item.id,{current:'',desired:''}]))
 return {id,spheres:empty(VECTOR_SPHERES),axes:empty(VECTOR_AXES),sphereId:'',axisId:'',statement:'',why:''}
}
export function vectorDraftPairComplete(value){
 return plain(value)&&['current','desired'].every(key=>typeof value[key]==='string'&&/^(?:10|[0-9])$/.test(value[key]))
}
export function vectorDraftTrackComplete(value,items){
 return exactKeys(value,items.map(item=>item.id))&&items.every(item=>vectorDraftPairComplete(value[item.id]))
}
export function vectorSelectionFromDraft(draft,recordedAt=new Date().toISOString()){
 if(!plain(draft)||!vectorDraftTrackComplete(draft.spheres,VECTOR_SPHERES)||!vectorDraftTrackComplete(draft.axes,VECTOR_AXES))return null
 const convert=value=>Object.fromEntries(Object.entries(value).map(([id,row])=>[id,{current:Number(row.current),desired:Number(row.desired)}]))
 return normalizeVectorSelection({version:VECTOR_SELECTION_VERSION,sphereVersion:VECTOR_SPHERES_VERSION,axisVersion:COACH_PROFILE_VERSION,
  recordedAt,sphereId:draft.sphereId,axisId:draft.axisId,statement:draft.statement,spheres:convert(draft.spheres),axes:convert(draft.axes)})
}
export function vectorSelectionGoalDraft(draft,recordedAt=new Date().toISOString()){
 const vectorSelection=vectorSelectionFromDraft(draft,recordedAt)
 if(!vectorSelection)return null
 const sphere=VECTOR_SPHERES.find(item=>item.id===vectorSelection.sphereId)
 return {id:draft.id,revision:0,areaKey:sphere.areaKey,title:vectorSelection.statement,why:draft.why,obstacles:'',
  desiredOutcome:vectorSelection.statement,axes:[vectorSelection.axisId],status:'active',confirmed:true,targetDate:null,
  milestones:[],firstStep:'',fallbackStep:'',vectorSelection}
}
