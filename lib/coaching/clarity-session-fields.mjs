// Versioned Clarity question plan. Canonical profile axis names and strict
// self-rating parser are shared with the existing development-vectors model.
import {OUTER_VECTOR_ITEMS,INNER_VECTOR_ITEMS} from '../profile/development-vectors.mjs'
import {coachProfileScorePair} from './coach-profile-intake.mjs'
import {clarityDayOneScenario} from './clarity-day-one-scenario.mjs'
import {clarityScenarioVersion,clarityVersionedScenario,clarityMetricScore,clarityPracticeStatus} from './clarity-course-scenarios.mjs'
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
// v5 outer wheel asks for one current rating. Keep the v2 pair parser strict
// for old reviewed records and for the inner-axes course. Never synthesize desired.
const ratingWords=[
 ['zero','ноль','cero'],['one','один','одна','uno','una'],['two','два','две','dos'],['three','три','tres'],
 ['four','четыре','cuatro'],['five','пять','cinco'],['six','шесть','seis'],['seven','семь','siete'],
 ['eight','восемь','ocho'],['nine','девять','nueve'],['ten','десять','diez']
]
export function clarityCurrentRating(fieldId,quote){
 if(clarityRatingDefinition(fieldId)?.track!=='outer'||typeof quote!=='string'||quote.length>300)return null
 const s=quote.trim().toLowerCase().replace(/[.!?]+$/u,'').trim()
 const m=/^(?:(?:сейчас|на данный момент|now|currently|ahora|actualmente)\s*[:=]?\s*)?([\p{L}]+|10|[0-9])(?:\s+(?:балл(?:а|ов)?|points?|puntos?))?(?:\s+(?:из|out of|de)\s+10)?$/u.exec(s)
 if(!m)return null
 const current=/^(?:10|[0-9])$/u.test(m[1])?Number(m[1]):ratingWords.findIndex(words=>words.includes(m[1]))
 return current>=0&&current<=10?{current,desired:null}:null
}
export function clarityRatingAnswer(fieldId,quote){
 return clarityRatingPair(fieldId,quote)||clarityCurrentRating(fieldId,quote)
}
export function clarityCurrentQuestion(fieldId,locale='en'){
 if(clarityRatingDefinition(fieldId)?.track!=='outer')return null
 return clarityDayOneScenario(locale).fields.find(f=>f.id===fieldId)?.question||null
}
export function clarityRatingForQuestion(fieldId,quote,question){
 const isCurrent=['en','ru','es'].some((lang,i)=>{
  const q=clarityCurrentQuestion(fieldId,lang)
  return q&&(question===q||question===['Let me clarify the same question. ','Уточню тот же вопрос. ','Aclaremos la misma pregunta. '][i]+q)
 })
 // The mode is question-bound, not inferred from the answer. "5/10" in a
 // current-only conversation must be clarified, not converted to a desired 10.
 return isCurrent?clarityCurrentRating(fieldId,quote):clarityRatingPair(fieldId,quote)
}
const custom={
 review_homework:{label:L('Practice and homework check-in','Практика и домашнее задание','Revisión de práctica y tarea'),question:L('How did your practice and homework go since the last session?','Как получилось выполнить практику и домашнее задание после прошлой сессии?','¿Cómo te fue con la práctica y la tarea desde la última sesión?')},
 dream_image:{label:L('Your dream without limitations','Образ мечты без ограничений','Tu sueño sin límites'),question:L('If everything were possible, what inspiring life would you love to see yourself living?','Если бы всё было возможно, какой образ жизни и будущего по-настоящему вдохновлял бы вас?','Si todo fuera posible, ¿qué imagen de vida y futuro te inspiraría de verdad?')}
}
export function claritySpecialField(fieldId,locale='en',{legacyPair=false}={}){
 const lang=language(locale),rating=clarityRatingDefinition(fieldId)
 if(rating){
  const name=rating.label[lang]
  return {id:fieldId,label:name,question:(!legacyPair&&clarityCurrentQuestion(fieldId,lang))||L('For '+name+', what is your current and desired rating from 0 to 10?',''+name+': какие оценки от 0 до 10 вы ставите сейчас и какие хотели бы иметь?','Para '+name+', ¿qué valoraciones actual y deseada das del 0 al 10?')[lang]}
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
// Method outcome is distinct from field coverage, provider completion and
// entitlement. Only session-confirmed evidence qualifies; Daybook reflections
// remain useful but cannot retrospectively confirm an in-session method.
export function clarityMethodOutcome(day,rows=[]){
 const id='clarity_day_'+day,version=clarityScenarioVersion(id)
 if(!version||!Array.isArray(rows))return null
 const active=rows.filter(r=>r&&!r.archived)
 const versioned=day===1?active.some(r=>r.id==='balance_consent'):active.some(r=>r.scenarioVersion===version)
 if(!versioned)return null
 const row=key=>active.find(r=>r.id===key&&(day===1||r.scenarioVersion===version))
 const confirmed=key=>{const r=row(key);return r?.status==='confirmed'&&typeof r.quote==='string'&&Boolean(r.quote.trim())&&['client_reviewed_quote','server_verified'].includes(r.source)}
 const decision=key=>confirmed(key)?row(key).methodDecision:null
 const reviewed=confirmed('reviewed_summary')&&row('reviewed_summary').reviewDecision==='accepted'
 const missing=keys=>keys.filter(k=>!confirmed(k))
 const finish=(required,outcome,extra=[])=>{const coreMissing=[...new Set([...missing(required),...extra,...(reviewed?[]:['reviewed_summary'])])];return {outcome:coreMissing.length?'partial':outcome,coreMissing,reviewed}}
 if(day===1)return finish(['situation','impact','priority','needs'],'situation_map')
 if(day===2){
  const permission=decision('practice_consent'),practice=permission==='accepted'&&confirmed('test_status')?clarityPracticeStatus(row('test_status').quote):permission==='declined'?'declined':null
  if(['declined','listening_only'].includes(practice))return finish(['episode','needs'],'support_only')
  const required=['episode','needs','selected_support','transfer_action','timing_or_condition','helpfulness_indicator']
  if(['attempted','stopped'].includes(practice))required.push('test_status','test_observation')
  if(practice==='planned')required.push('test_status')
  if(practice==='attempted')return finish(required,'support_tried')
  if(practice==='stopped')return finish(required,'support_stopped')
  if(practice==='planned')return finish(required,'support_planned')
  return finish(required,'partial',['test_status'])
 }
 const readiness=decision('goal_status')
 if(['declined','deferred'].includes(readiness))return finish(['priority','goal_status'],readiness==='deferred'?'goal_deferred':'goal_exploring')
 const keys=['priority','goal_status','goal','why','success','next','timing']
 if(readiness!=='accepted')return finish(keys,'partial',['goal_status'])
 const full=finish([...keys,'baseline','horizon'],'goal_plan')
 if(!full.coreMissing.length)return full
 const minimum=finish(keys,'goal_partial_plan')
 return minimum.coreMissing.length?full:{...minimum,coreMissing:full.coreMissing}
}
export function claritySemanticResult(day,rows,locale='en'){
 const lang=language(locale)
 const accepted=id=>{
  const row=rows.find(r=>r.id===id&&!r.archived)
  return row&&['confirmed','self_reported'].includes(row.status)&&typeof row.quote==='string'&&row.quote.trim()?row:null
 }
 const node=id=>{
  const row=accepted(id),field=rows.find(r=>r.id===id)
  return {id,label:field?.label||claritySpecialField(id,lang)?.label||id,value:row?.quote||null,source:row?.source||null,...(row?.methodDecision?{methodDecision:row.methodDecision}:{}),...(row?.status?{status:row.status}:{})}
 }
 const methodOutcome=clarityMethodOutcome(day,rows)
 const courseId='clarity_day_'+day,scenario=clarityVersionedScenario(courseId,lang)
 const versioned=(day===2||day===3)&&rows.some(r=>r.scenarioVersion===clarityScenarioVersion(courseId))
 if(versioned){
  const known=id=>rows.find(r=>r.id===id&&!r.archived&&r.status==='confirmed')
  const hasInner=day===2&&known('inner_consent')?.methodDecision==='accepted'
  const axes=hasInner?tracks.inner.map(item=>{
   const id='inner_'+item.id,row=accepted(id),pair=row?clarityRatingPair(id,row.quote):null
   return {id,label:item.name[lang],current:pair?.current??null,desired:pair?.desired??null,source:pair?row.source:null}
  }):null
  const practiceDecision=known('practice_consent')?.methodDecision
  const practiceStatus=day===2?(practiceDecision==='declined'?'declined':practiceDecision==='accepted'?clarityPracticeStatus(known('test_status')?.quote):null):null
  const nodes=scenario.fields.filter(f=>f.result===true&&(!f.requiresConsent||known(f.requiresConsent)?.methodDecision==='accepted')&&
   (f.id!=='test_observation'||['attempted','stopped'].includes(practiceStatus))).map(f=>node(f.id))
  const scores=day===2?['optional_scale_before','optional_scale_after']:['confidence']
  const metrics=scores.map(id=>({id,value:clarityMetricScore(id,accepted(id)?.quote)}))
  return {version:scenario.version,kind:day===2?'support':'goal',nodes,metrics,methodOutcome,...(day===2?{practiceStatus}:{}),...(axes?{axes}:{}),...(day===3&&accepted('dream_image')?{dream:node('dream_image')}:{}),
   ...(day===3?{goalStatus:known('goal_status')?.methodDecision==='declined'?'exploring':known('goal_status')?.methodDecision==='deferred'?'deferred':known('goal_status')?.methodDecision==='accepted'&&known('goal')&&known('reviewed_summary')?'chosen':null}:{})}
 }
 if(day===1||day===2){
  const track=day===1?'outer':'inner'
  const v5=day===1&&rows.some(r=>r.id==='balance_consent')
  return {version:CLARITY_RESULT_MODEL_VERSION,kind:track,...(methodOutcome?{methodOutcome}:{}),
   axes:tracks[track].map(item=>{
    const id=track+'_'+item.id,row=accepted(id),pair=row?(v5?clarityCurrentRating(id,row.quote):clarityRatingAnswer(id,row.quote)):null
    return {id,label:item.name[lang],current:pair?.current??null,desired:pair?.desired??null,source:pair?row.source:null}
   }),nodes:(day===1?(v5?['situation','feelings','impact','priority','needs','why','resources','next','learning']:['request','needs']):['strengths','resources','practices']).map(node)}
 }
 if(day===3)return {version:CLARITY_RESULT_MODEL_VERSION,kind:'dream',dream:node('dream_image'),nodes:['goal','why','success','next','timing'].map(node)}
 return null
}
