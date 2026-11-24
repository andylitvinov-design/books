import {COACH_PROFILE_AXES,COACH_PROFILE_VERSION} from '../coaching/coach-profile-intake.mjs'

// Voluntary self-ratings, not a psychometric questionnaire or diagnosis.
// Four spheres and their focuses use the existing Life Plan areas and goal store.
const L=(en,ru,es)=>Object.freeze({en,ru,es})
export const VECTOR_SELECTION_LEGACY_VERSION='hh-daybook-vector-selection-v1'
export const VECTOR_SELECTION_VERSION='hh-daybook-vector-selection-v2'
export const VECTOR_SPHERES_VERSION='hh-life-four-spheres-v1'
export const VECTOR_SPHERES=Object.freeze([
 {id:'body',areaKey:'body_health',name:L('Body & energy','Тело и энергия','Cuerpo y energía'),detail:L('health, rest and physical wellbeing','здоровье, отдых и физическое самочувствие','salud, descanso y bienestar físico'),context:L('in my wellbeing','в самочувствии','en mi bienestar')},
 {id:'work',areaKey:'career_business',name:L('Work & achievement','Дело и достижения','Trabajo y logros'),detail:L('work, money and practical results','работа, деньги и практические результаты','trabajo, dinero y resultados prácticos'),context:L('in work and achievement','в деле и достижениях','en el trabajo y los logros')},
 {id:'relationships',areaKey:'relationships',name:L('Contact & relationships','Контакты и отношения','Contacto y relaciones'),detail:L('family, friendship and close relationships','семья, дружба и близкие отношения','familia, amistad y relaciones cercanas'),context:L('in relationships','в отношениях','en las relaciones')},
 {id:'growth',areaKey:'meaning_purpose',name:L('Meaning & future','Смысл и будущее','Sentido y futuro'),detail:L('values, imagination and your direction in life','ценности, воображение и направление жизни','valores, imaginación y tu rumbo en la vida'),context:L('in my future','в моём будущем','en mi futuro')},
].map(Object.freeze))
export const VECTOR_FOCUSES=Object.freeze([
 {id:'body_health',sphereId:'body',name:L('Health & energy','Здоровье и энергия','Salud y energía'),context:L('in my health','в здоровье','en mi salud')},
 {id:'emotional_wellbeing',sphereId:'body',name:L('Emotional wellbeing','Эмоциональное состояние','Bienestar emocional'),context:L('in my emotional wellbeing','в эмоциональном состоянии','en mi bienestar emocional')},
 {id:'lifestyle',sphereId:'body',name:L('Rest & lifestyle','Отдых и образ жизни','Descanso y estilo de vida'),context:L('in everyday life','в повседневной жизни','en la vida cotidiana')},
 {id:'career_business',sphereId:'work',name:L('Work & business','Работа и дело','Trabajo y negocio'),context:L('in my work','в работе','en mi trabajo')},
 {id:'finance',sphereId:'work',name:L('Money','Деньги','Dinero'),context:L('in my finances','в деньгах','en mis finanzas')},
 {id:'relationships',sphereId:'relationships',name:L('Relationships','Отношения','Relaciones'),context:L('in relationships','в отношениях','en las relaciones')},
 {id:'personal_growth',sphereId:'growth',name:L('Personal growth','Личностный рост','Crecimiento personal'),context:L('in personal growth','в личностном росте','en el crecimiento personal')},
 {id:'meaning_purpose',sphereId:'growth',name:L('Meaning & purpose','Смысл и предназначение','Sentido y propósito'),context:L('in my life direction','в выборе своего пути','en mi rumbo de vida')},
].map(Object.freeze))
export const VECTOR_AXES=COACH_PROFILE_AXES
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)&&[Object.prototype,null].includes(Object.getPrototypeOf(value))
const exactKeys=(value,keys)=>plain(value)&&Object.keys(value).length===keys.length&&Object.keys(value).every(key=>keys.includes(key))
const score=value=>Number.isInteger(value)&&value>=0&&value<=10
const pair=value=>exactKeys(value,['current','desired'])&&score(value.current)&&score(value.desired)
const ratings=(value,items)=>exactKeys(value,items.map(item=>item.id))&&items.every(item=>pair(value[item.id]))
const focusFor=value=>VECTOR_FOCUSES.find(item=>item.id===value?.focusId&&item.sphereId===value?.sphereId)
const legacy=value=>value?.version===VECTOR_SELECTION_LEGACY_VERSION

/** V1 keeps the complete original questionnaire; V2 stores only the two chosen ratings. */
export function normalizeVectorSelection(value){
 if(!plain(value))return null
 const isLegacy=legacy(value),keys=['version','sphereVersion','axisVersion','recordedAt','sphereId','axisId','statement','spheres','axes']
 if(!isLegacy)keys.push('focusId')
 const spheres=isLegacy?VECTOR_SPHERES:VECTOR_SPHERES.filter(item=>item.id===value.sphereId)
 const axes=isLegacy?VECTOR_AXES:VECTOR_AXES.filter(item=>item.id===value.axisId)
 if(!exactKeys(value,keys)||(!isLegacy&&value.version!==VECTOR_SELECTION_VERSION)||
   value.sphereVersion!==VECTOR_SPHERES_VERSION||value.axisVersion!==COACH_PROFILE_VERSION||
   !VECTOR_SPHERES.some(item=>item.id===value.sphereId)||!VECTOR_AXES.some(item=>item.id===value.axisId)||!isLegacy&&!focusFor(value)||
   typeof value.statement!=='string'||!value.statement.trim()||[...value.statement].length>1000||/\u0000/.test(value.statement)||
   typeof value.recordedAt!=='string'||value.recordedAt.length>40||!/^\d{4}-\d\d-\d\dT/.test(value.recordedAt)||!Number.isFinite(Date.parse(value.recordedAt))||
   !ratings(value.spheres,spheres)||!ratings(value.axes,axes))return null
 return {version:value.version,sphereVersion:VECTOR_SPHERES_VERSION,axisVersion:COACH_PROFILE_VERSION,
  recordedAt:new Date(value.recordedAt).toISOString(),sphereId:value.sphereId,...(!isLegacy?{focusId:value.focusId}:{}),axisId:value.axisId,statement:value.statement.trim(),
  spheres:Object.fromEntries(spheres.map(({id})=>[id,{current:value.spheres[id].current,desired:value.spheres[id].desired}])),
  axes:Object.fromEntries(axes.map(({id})=>[id,{current:value.axes[id].current,desired:value.axes[id].desired}]))}
}
export function vectorSelectionAreaKey(value){
 return legacy(value)?VECTOR_SPHERES.find(item=>item.id===value.sphereId)?.areaKey:focusFor(value)?.id
}
/** A suggestion describes the intersection; it never replaces the client's own wording. */
export function vectorCombinationLabel(value,locale='en'){
 const lang=['en','ru','es'].includes(locale)?locale:'en'
 const axis=VECTOR_AXES.find(item=>item.id===value?.axisId)
 const context=legacy(value)?VECTOR_SPHERES.find(item=>item.id===value.sphereId)?.context:focusFor(value)?.context
 return axis&&context?axis.name[lang]+' '+context[lang]:''
}
export function emptyVectorSelectionDraft(id,version=VECTOR_SELECTION_VERSION){
 const empty=items=>Object.fromEntries(items.map(item=>[item.id,{current:'',desired:''}]))
 const isLegacy=version===VECTOR_SELECTION_LEGACY_VERSION
 return {id,version,spheres:isLegacy?empty(VECTOR_SPHERES):{},axes:isLegacy?empty(VECTOR_AXES):{},sphereId:'',...(!isLegacy?{focusId:''}:{}),axisId:'',statement:'',why:''}
}
export function vectorDraftPairComplete(value){
 return exactKeys(value,['current','desired'])&&['current','desired'].every(key=>typeof value[key]==='string'&&/^(?:10|[0-9])$/.test(value[key]))
}
export function vectorDraftTrackComplete(value,items){
 return exactKeys(value,items.map(item=>item.id))&&items.every(item=>vectorDraftPairComplete(value[item.id]))
}
export function vectorDraftStepComplete(draft,step){
 if(!plain(draft)||draft.version!==VECTOR_SELECTION_VERSION)return false
 if(step===0)return Boolean(focusFor(draft))&&vectorDraftTrackComplete(draft.spheres,[{id:draft.sphereId}])
 if(step===1)return VECTOR_AXES.some(item=>item.id===draft.axisId)&&vectorDraftTrackComplete(draft.axes,[{id:draft.axisId}])
 return false
}
export function vectorSelectionFromDraft(draft,recordedAt=new Date().toISOString()){
 if(!plain(draft))return null
 // An old all-sphere draft has no version field; retain its original semantics.
 const version=draft.version??VECTOR_SELECTION_LEGACY_VERSION,isLegacy=version===VECTOR_SELECTION_LEGACY_VERSION
 if(isLegacy?(!vectorDraftTrackComplete(draft.spheres,VECTOR_SPHERES)||!vectorDraftTrackComplete(draft.axes,VECTOR_AXES)):
  (!vectorDraftStepComplete(draft,0)||!vectorDraftStepComplete(draft,1)))return null
 const convert=value=>Object.fromEntries(Object.entries(value).map(([id,row])=>[id,{current:Number(row.current),desired:Number(row.desired)}]))
 return normalizeVectorSelection({version,sphereVersion:VECTOR_SPHERES_VERSION,axisVersion:COACH_PROFILE_VERSION,
  recordedAt,sphereId:draft.sphereId,...(!isLegacy?{focusId:draft.focusId}:{}),axisId:draft.axisId,statement:draft.statement,spheres:convert(draft.spheres),axes:convert(draft.axes)})
}
export function vectorSelectionGoalDraft(draft,recordedAt=new Date().toISOString()){
 const vectorSelection=vectorSelectionFromDraft(draft,recordedAt)
 if(!vectorSelection)return null
 return {id:draft.id,revision:0,areaKey:vectorSelectionAreaKey(vectorSelection),title:vectorSelection.statement,why:draft.why,obstacles:'',
  desiredOutcome:vectorSelection.statement,axes:[vectorSelection.axisId],status:'active',confirmed:true,targetDate:null,
  milestones:[],firstStep:'',fallbackStep:'',vectorSelection}
}
