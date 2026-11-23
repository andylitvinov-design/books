/** Owner-defined Daybook vectors, not a diagnostic instrument. */
import {COACH_PROFILE_AXES,COACH_PROFILE_VERSION} from '../coaching/coach-profile-intake.mjs'
const L=(en,ru,es)=>({en,ru,es})
export const INNER_VECTOR_ITEMS=COACH_PROFILE_AXES
export const OUTER_VECTOR_ITEMS=Object.freeze([
 {id:'body_health',name:L('Body and health','Тело и здоровье','Cuerpo y salud')},
 {id:'emotional_wellbeing',name:L('Emotional wellbeing','Эмоциональное благополучие','Bienestar emocional')},
 {id:'relationships',name:L('Relationships','Отношения','Relaciones')},
 {id:'career_business',name:L('Career and business','Карьера и бизнес','Carrera y negocios')},
 {id:'finance',name:L('Finance','Финансы','Finanzas')},
 {id:'personal_growth',name:L('Personal growth','Личностный рост','Crecimiento personal')},
 {id:'lifestyle',name:L('Lifestyle','Образ жизни','Estilo de vida')},
 {id:'meaning_purpose',name:L('Meaning and purpose','Смысл и предназначение','Sentido y propósito')},
])
const plain=x=>x!==null&&typeof x==='object'&&!Array.isArray(x)
const keys=(x,allowed)=>Object.keys(x).every(k=>allowed.includes(k))
const score=x=>Number.isInteger(x)&&x>=0&&x<=10
const tracks={inner:INNER_VECTOR_ITEMS,outer:OUTER_VECTOR_ITEMS}
export const emptyDevelopmentVectors=()=>({version:1,inner:{focusId:null,ratings:{}},outer:{focusId:null,ratings:{}}})
export function normalizeDevelopmentVectors(x){
 if(!plain(x)||x.version!==1||!keys(x,['version','inner','outer']))return null
 const result={version:1}
 for(const track of ['inner','outer']){
  const v=x[track],known=new Set(tracks[track].map(item=>item.id))
  if(!plain(v)||!keys(v,['focusId','ratings'])||!plain(v.ratings)||
    Object.keys(v.ratings).length>8||Object.keys(v.ratings).some(id=>!known.has(id))||
    (v.focusId!=null&&!known.has(v.focusId)))return null
  const ratings={}
  for(const [id,r] of Object.entries(v.ratings)){
   if(!plain(r)||!keys(r,['current','desired','source','recordedAt'])||
     !score(r.current)||!score(r.desired)||!['self','coach'].includes(r.source)||
     typeof r.recordedAt!=='string'||r.recordedAt.length>40||
     !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(r.recordedAt)||
     !Number.isFinite(Date.parse(r.recordedAt)))return null
   ratings[id]={current:r.current,desired:r.desired,source:r.source,
     recordedAt:new Date(r.recordedAt).toISOString()}
  }
  result[track]={focusId:v.focusId||null,ratings}
 }
 return result
}
export function toVectorDraft(input){
 const x=normalizeDevelopmentVectors(input)||emptyDevelopmentVectors()
 return Object.fromEntries(['inner','outer'].map(track=>[track,{
  focusId:x[track].focusId,
  ratings:Object.fromEntries(Object.entries(x[track].ratings).map(([id,r])=>
   [id,{current:String(r.current),desired:String(r.desired),source:r.source,recordedAt:r.recordedAt}]))
 }]))
}
export function fromVectorDraft(draft,{touched={},now=new Date().toISOString()}={}){
 const result=emptyDevelopmentVectors()
 for(const track of ['inner','outer']){
  if(!plain(draft?.[track])||!plain(draft[track].ratings))return null
  result[track].focusId=draft[track].focusId
  for(const [id,r] of Object.entries(draft[track].ratings)){
   const a=String(r.current??''),b=String(r.desired??'')
   if(a===''&&b==='')continue
   if(!/^(10|[0-9])$/.test(a)||!/^(10|[0-9])$/.test(b))return null
   const changed=touched[track+':'+id]===true
   result[track].ratings[id]={current:Number(a),desired:Number(b),
    source:changed?'self':r.source==='coach'?'coach':'self',
    recordedAt:changed?now:r.recordedAt||now}
  }
 }
 return normalizeDevelopmentVectors(result)
}
/** Client-reviewed, separately saved session protocol only; never AI prose.
 * v1 uses a fixed eight-axis prefix; v2 has sparse independently named axes.
 * The editor only imports complete pairs into a DRAFT; saving is explicit.
 * A v2 partial score may be completed in a coaching session or manually later,
 * but is not silently converted to a complete rating here.
 */
export function ratingsFromCoachProtocol(protocol){
 const p=protocol?.profileCheckin
 if(!plain(p)||!Array.isArray(p.ratings)||p.ratings.length>8)return null
 const newer=p.version==='hh-coach-profile-intake-v2'
 if(!newer&&p.version!==COACH_PROFILE_VERSION)return null
 if(newer&&(p.completed!==false||
   protocol?.provenance!=='client_reviewed_dialogue'))return null
 const completedAt=typeof protocol?.completedAt==='string'&&
   /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(protocol.completedAt)&&
   Number.isFinite(Date.parse(protocol.completedAt))
   ?new Date(protocol.completedAt).toISOString():null
 if(newer&&!completedAt)return null
 const known=new Set(INNER_VECTOR_ITEMS.map(x=>x.id))
 const seen=new Set(),result={}
 for(let i=0;i<p.ratings.length;i++){
  const row=p.ratings[i]
  if(!plain(row))return null
  const id=row.axis
  if(newer){
   if(!known.has(id)||seen.has(id))return null
   seen.add(id)
   if(!['rated','partial','skipped'].includes(row.kind))return null
   if(row.kind==='skipped')continue
   if(row.kind==='partial'){
    if(!((score(row.current)&&row.desired===null)||
      (score(row.desired)&&row.current===null)))return null
    continue
   }
  }else{
   // Keep the legacy strict prefix; a changed axis order is not a valid v1.
   if(id!==INNER_VECTOR_ITEMS[i].id)return null
   if(row.kind==='skipped')continue
   if(row.kind!=='rated')return null
  }
  if(!score(row.current)||!score(row.desired))return null
  result[id]={current:String(row.current),desired:String(row.desired),
   source:'coach',recordedAt:completedAt||new Date().toISOString()}
 }
 return Object.keys(result).length?result:null
}
export function coachVectorSummary(input,locale='en',track='inner'){
 const x=normalizeDevelopmentVectors(input)
 if(!x||!tracks[track])return ''
 const lang=['en','ru','es'].includes(locale)?locale:'en'
 const heading=track==='inner'
  ?L('My inner meaning axes','Мои смысловые оси','Mis ejes de sentido')[lang]
  :L('My external life goals','Мои жизненные цели','Mis metas de vida')[lang]
 const note=L('These are my self-ratings, not a diagnosis. Please discuss their meaning.',
  'Это мои самооценки, не диагноз. Прошу обсудить их смысл.',
  'Son autoevaluaciones, no un diagnóstico. Me gustaría hablar de su significado.')[lang]
 const lines=tracks[track].filter(item=>x[track].ratings[item.id]).map(item=>{
  const r=x[track].ratings[item.id]
  const d=r.desired-r.current
  return item.name[lang]+': '+r.current+' → '+r.desired+' (Δ '+(d>0?'+':'')+d+')'+
   (x[track].focusId===item.id?' ★':'')
 })
 return lines.length?[heading,note,...lines].join('\n').slice(0,1800):''
}
