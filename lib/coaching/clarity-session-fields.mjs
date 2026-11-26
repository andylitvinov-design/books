// Versioned Clarity question plan. Canonical profile axis names and strict
// self-rating parser are shared with the existing development-vectors model.
import {OUTER_VECTOR_ITEMS,INNER_VECTOR_ITEMS} from '../profile/development-vectors.mjs'
import {coachProfileScorePair} from './coach-profile-intake.mjs'
export const CLARITY_RESULT_MODEL_VERSION='hh-clarity-result-v2'
const L=(en,ru,es)=>({en,ru,es})
const language=l=>['en','ru','es'].includes(l)?l:'en'
const tracks={outer:OUTER_VECTOR_ITEMS,inner:INNER_VECTOR_ITEMS}
const definitions=Object.fromEntries(Object.entries(tracks).flatMap(([track,items])=>items.map(item=>{
 const id=track+'_'+item.id
 return [id,{id,track,axisId:item.id,label:item.name}]
})))
export function clarityRatingDefinition(fieldId){
 return typeof fieldId==='string'&&Object.hasOwn(definitions,fieldId)?definitions[fieldId]:null
}
export function clarityRatingPair(fieldId,quote){
 if(!clarityRatingDefinition(fieldId)||typeof quote!=='string'||quote.length>300)return null
 const parsed=coachProfileScorePair(quote)
 return parsed?.kind==='rated'?{current:parsed.current,desired:parsed.desired}:null
}
const custom={
 review_homework:{label:L('Practice and homework check-in','Практика и домашнее задание','Revisión de práctica y tarea'),question:L('How did your practice and homework go since the last session?','Как получилось выполнить практику и домашнее задание после прошлой сессии?','¿Cómo te fue con la práctica y la tarea desde la última sesión?')},
 dream_image:{label:L('Your dream without limitations','Образ мечты без ограничений','Tu sueño sin límites'),question:L('If everything were possible, what inspiring life would you love to see yourself living?','Если бы всё было возможно, какой образ жизни и будущего по-настоящему вдохновлял бы вас?','Si todo fuera posible, ¿qué imagen de vida y futuro te inspiraría de verdad?')}
}
export function claritySpecialField(fieldId,locale='en'){
 const lang=language(locale),rating=clarityRatingDefinition(fieldId)
 if(rating){
  const name=rating.label[lang]
  return {id:fieldId,label:name,question:L('For '+name+', what is your current and desired rating from 0 to 10?',''+name+': какие оценки от 0 до 10 вы ставите сейчас и какие хотели бы иметь?','Para '+name+', ¿qué valoraciones actual y deseada das del 0 al 10?')[lang]}
 }
 if(Object.hasOwn(custom,fieldId))return {id:fieldId,label:custom[fieldId].label[lang],question:custom[fieldId].question[lang]}
 return null
}
export const CLARITY_RESULT_FIELDS=Object.freeze({
 clarity_day_1:Object.freeze(['request',...OUTER_VECTOR_ITEMS.map(item=>'outer_'+item.id),'needs']),
 clarity_day_2:Object.freeze(['changes','review_homework',...INNER_VECTOR_ITEMS.map(item=>'inner_'+item.id),'strengths','resources','practices']),
 clarity_day_3:Object.freeze(['changes','review_homework','dream_image','goal','why','success','next','timing'])
})
// Historical reviewed rows remain visible, but do not enlarge the new question plan.
export const CLARITY_LEGACY_FIELDS=Object.freeze({
 clarity_day_1:Object.freeze(['life_balance','meaning_axes','strengths']),
 clarity_day_2:Object.freeze(['situation','symptoms','feelings','obstacle']),
 clarity_day_3:Object.freeze(['direction','baseline'])
})
export function claritySemanticResult(day,rows,locale='en'){
 const lang=language(locale)
 const accepted=id=>{
  const row=rows.find(r=>r.id===id&&!r.archived)
  return row&&['confirmed','self_reported'].includes(row.status)&&typeof row.quote==='string'&&row.quote.trim()?row:null
 }
 const node=id=>{
  const row=accepted(id),field=rows.find(r=>r.id===id)
  return {id,label:field?.label||claritySpecialField(id,lang)?.label||id,value:row?.quote||null,source:row?.source||null}
 }
 if(day===1||day===2){
  const track=day===1?'outer':'inner'
  return {version:CLARITY_RESULT_MODEL_VERSION,kind:track,
   axes:tracks[track].map(item=>{
    const id=track+'_'+item.id,row=accepted(id),pair=row?clarityRatingPair(id,row.quote):null
    return {id,label:item.name[lang],current:pair?.current??null,desired:pair?.desired??null,source:pair?row.source:null}
   }),nodes:(day===1?['request','needs']:['strengths','resources','practices']).map(node)}
 }
 if(day===3)return {version:CLARITY_RESULT_MODEL_VERSION,kind:'dream',dream:node('dream_image'),nodes:['goal','why','success','next','timing'].map(node)}
 return null
}
