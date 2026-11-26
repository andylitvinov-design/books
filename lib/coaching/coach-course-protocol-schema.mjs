// Course-level checkpoints are distinct from persona method evidence.
 // Sources: coach-program-topics.mjs, clarity-program.mjs, business-daybook.mjs,
 // SEVEN_STEPS_TO_DREAM_V2_20261123.md and my-coach-zero-session-profile.md.
 // These are editorial report slots, not evidence of question delivery or completion.
// Existing coaching session IDs retain their original four-session meaning.
import {LEGACY_BUSINESS_SYLLABUS} from '../app/business-daybook.mjs'
import {coachProtocolEvidenceVeto} from './coach-protocol-relevance.mjs'
import {protocolAnswerClass,courseAnswerVerificationAdvisory} from './coach-protocol-validation-gate.mjs'
import {coachInformationChecklist} from './coach-information-checklist.mjs'
import {authoredCheckpointQuestion,checkpointQuestionMatches,checkpointConfirmationMatches,checkpointAnswerMismatch} from './coach-course-question-binding.mjs'
import {CLARITY_RESULT_FIELDS,CLARITY_LEGACY_FIELDS,claritySpecialField,clarityRatingDefinition,clarityRatingPair} from './clarity-session-fields.mjs'
export const COACH_COURSE_PROTOCOL_SCHEMA_VERSION='hh-coach-course-report-v1'
export const COACH_COURSE_FIELD_REVIEW_VERSION='hh-coach-course-review-v1'
const langs=['en','ru','es']
const f=(id,en,ru,es)=>Object.freeze({id,label:Object.freeze({en,ru,es})})
const field=Object.freeze({
 life_balance:f('life_balance','Life balance / current and desired ratings','Баланс жизни: текущие и желаемые оценки','Equilibrio vital: valoraciones actuales y deseadas'),
 meaning_axes:f('meaning_axes','Meaning axes and values','Смысловые оси и ценности','Ejes de sentido y valores'),
 symptoms:f('symptoms','Self-reported symptoms and impact','Симптомы со слов клиента и их влияние','Síntomas autoinformados e impacto'),
 situation:f('situation','Current situation','Текущая ситуация','Situación actual'),
 request:f('request','Client request','Запрос клиента','Petición del cliente'),
 wishes:f('wishes','Wishes and needs','Желания и потребности','Deseos y necesidades'),
 facts:f('facts','Facts and examples','Факты и примеры','Hechos y ejemplos'),
 feelings:f('feelings','Feelings','Чувства','Emociones'),
 needs:f('needs','Needs','Потребности','Necesidades'),
 support:f('support','Available support','Доступная поддержка','Apoyo disponible'),
 wellbeing:f('wellbeing','Current wellbeing (self-report)','Текущее самочувствие (самооценка)','Bienestar actual (autoinforme)'),
 practices:f('practices','Chosen gentle practices','Выбранные бережные практики','Prácticas suaves elegidas'),
 resources:f('resources','Personal and external resources','Личные и внешние ресурсы','Recursos personales y externos'),
 changes:f('changes','Observed changes','Наблюдаемые изменения','Cambios observados'),
 direction:f('direction','Chosen direction','Выбранное направление','Dirección elegida'),
 goal:f('goal','Desired result / goal','Желаемый результат / цель','Resultado deseado / meta'),
 why:f('why','Personal meaning and motivation','Личный смысл и мотивация','Sentido personal y motivación'),
 success:f('success','Success criteria','Критерии успеха','Criterios de éxito'),
 boundaries:f('boundaries','Values and boundaries','Ценности и границы','Valores y límites'),
 horizon:f('horizon','Time horizon','Горизонт времени','Horizonte temporal'),
 baseline:f('baseline','Starting point','Исходная точка','Punto de partida'),
 plan:f('plan','Action plan','План действий','Plan de acción'),
 levels:f('levels','Minimum / working / extended action','Минимум / рабочий / расширенный шаг','Acción mínima / habitual / ampliada'),
 timing:f('timing','Timing and conditions','Сроки и условия','Tiempo y condiciones'),
 contingency:f('contingency','Alternative / if–then plan','Запасной план / если — то','Alternativa / plan si–entonces'),
 strengths:f('strengths','Strengths and prior successes','Сильные стороны и успешный опыт','Fortalezas y logros previos'),
 limits:f('limits','Real limitations','Реальные ограничения','Limitaciones reales'),
 obstacle:f('obstacle','Obstacle in client words','Препятствие словами клиента','Obstáculo en palabras del cliente'),
 trigger:f('trigger','Trigger or pattern','Триггер или привычный паттерн','Desencadenante o patrón'),
 options:f('options','Alternative possibilities','Альтернативные возможности','Posibilidades alternativas'),
 tradeoffs:f('tradeoffs','Benefits, costs and risks','Польза, цена и риски','Beneficios, costes y riesgos'),
 experiment:f('experiment','Chosen experiment and check criteria','Выбранный эксперимент и критерии проверки','Experimento elegido y criterios de revisión'),
 progress:f('progress','Evidence of progress','Подтверждения прогресса','Evidencia de progreso'),
 adjust:f('adjust','Plan adjustments','Корректировка плана','Ajustes del plan'),
 learning:f('learning','Learning and reflection','Осознания и выводы','Aprendizaje y reflexión'),
 review:f('review','Next review','Следующая сверка','Próxima revisión'),
 next:f('next','Voluntary next step','Добровольный следующий шаг','Próximo paso voluntario')
})
const byCourse=Object.freeze({
 ...CLARITY_RESULT_FIELDS,
 clarity_discover:['situation','wishes','needs'],
 clarity_understand:['facts','feelings','needs','support'],
 clarity_support:['wellbeing','practices','resources'],
 clarity_direction:['changes','direction','next'],
 goal_result:['baseline','goal','success','horizon','boundaries'],
 goal_motivation:['goal','why','boundaries'],
 goal_plan:['plan','timing','levels','contingency','next'],
 goal_resources:['strengths','resources','limits','next'],
 goal_obstacles:['obstacle','trigger','limits','contingency','experiment'],
 goal_possibilities:['options','tradeoffs','experiment','review'],
 goal_acceleration:['progress','adjust','next','review'],
 goal_integration:['progress','learning','direction','next'],
 life_direction:['situation','wishes','direction','goal'],
 inner_compass:['why','boundaries','needs'],
 main_vector:['direction','goal','success'],
 strengths_resources:['strengths','resources','limits'],
 obstacles_patterns:['obstacle','trigger','contingency'],
 new_possibilities:['options','tradeoffs','experiment'],
 actions_steps:['plan','timing','levels','next'],
 integration:['progress','learning','direction','next']
})
const businessIds=Object.freeze({
 business_strategy:['business_reality','strategic_options','goal_success'],
 business_design:['function_map','target_structure','leadership_validation'],
 business_transformation:['feedback_evidence','change_portfolio','transition_plan'],
 business_execution:['accountability_people','controls_metrics','launch_review']
})
export function coachCourseProtocolSchema(courseSessionId,locale='en',{includeLegacy=false}={}){
 if(typeof courseSessionId!=='string')return null
 const lang=langs.includes(locale)?locale:'en'
 let checkpoints,source
 if(Object.hasOwn(businessIds,courseSessionId)){
   const index=Object.keys(businessIds).indexOf(courseSessionId)
   checkpoints=LEGACY_BUSINESS_SYLLABUS[lang][index][2].map(([label,instruction],i)=>({id:businessIds[courseSessionId][i],label,instruction}))
   source='business-daybook'
 }else if(Object.hasOwn(byCourse,courseSessionId)){
   const ids=byCourse[courseSessionId]
   const legacy=includeLegacy&&CLARITY_LEGACY_FIELDS[courseSessionId]||[]
   checkpoints=[...ids,...legacy].map(key=>({...((claritySpecialField(key,lang))||{id:field[key].id,label:field[key].label[lang]}),...(legacy.includes(key)?{archived:true}:{})}))
   source=courseSessionId.startsWith('clarity_')?'clarity-syllabus':courseSessionId.startsWith('goal_')?'seven-steps-and-goal-catalogue':'eight-session-catalogue'
 }else return null // Session 0 and meaning-axis profile use their own versioned schemas.
 return Object.freeze({version:COACH_COURSE_PROTOCOL_SCHEMA_VERSION,courseSessionId,source,
   checkpoints:Object.freeze(checkpoints.map(row=>Object.freeze({...row,question:authoredCheckpointQuestion(row,lang)})))})
}
// Compact, editorial guidance for the existing next-turn voice checkpoint.
 // The selected course is a preference, not a verified focus or an answer.
export function coachCourseCheckpointGuidance(courseSessionId,locale,opening,directive,turns=[],message=''){
 if(!opening?.completed||opening.declined||
    !['goal','challenge','self_exploration'].includes(opening.answers?.focus?.kind)||
    ['topic_shift','correction','negation','clarification_request','question_to_coach','gratitude'].includes(directive?.conversationAct))return ''
 const schema=coachCourseProtocolSchema(courseSessionId,locale)
 if(!schema)return ''
 // Advisory only: recent caller history cannot prove delivery or persistence.
 const last=Array.isArray(turns)?turns.at(-1):null
 const current=last?.role==='assistant'&&last.interrupted!==true?schema.checkpoints.find(row=>checkpointQuestionMatches(row,locale,last.content?.trim())):null
 if(current)return ' Current field: '+current.label+'.'+courseAnswerVerificationAdvisory(coachProtocolEvidenceVeto(message)||checkpointAnswerMismatch(current.id,message)?'control':protocolAnswerClass(message))
 return ' If client still confirms this topic, checkpoints: '+schema.checkpoints.map(row=>row.label).join('; ')+
   '. Ask one relevant unaddressed point; never repeat answered questions, force the topic, or infer completion.'
}
export function coachCourseProtocolGuidance(courseSessionId,locale){
 const schema=coachCourseProtocolSchema(courseSessionId,locale)
 if(!schema)return ''
 return 'After the client confirms this exact session focus, use the following topic-specific report checkpoints within the existing Director-authorized move and safety gates: '+
   schema.checkpoints.map(row=>row.label+(row.instruction?' — '+row.instruction:'')).join('; ')+
   '. Cover the checkpoints naturally over the session, one relevant question at a time; do not repeat answered questions or pressure the client to complete every field. If useful, one optional explicit checkpoint question is: '+schema.checkpoints.map(row=>row.question).join(' / ')+'. Choose only one if it fits; natural alternatives are fine. Do not claim a checkpoint was verified, or a commitment made, because of the selected topic, model suggestion or conversation length. Unclear or missing evidence stays open.'
}
// These are candidates from the visible conversation, never server-issued
// delivery proof. A user may explicitly select a verbatim source in the
// existing reviewed report. No model output can select or confirm a field.
const fallbackKeys=Object.freeze({situation:'situation',goal:'goal',why:'motivation',obstacle:'obstacles',resources:'resources',support:'resources',next:'nextSteps'})
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)
const invalid=()=>{throw Error('MY_COACH_PROTOCOL_INVALID')}
const controls=/^(?:yes|no|okay|ok|sure|maybe|i don't know|да|нет|хорошо|возможно|не знаю|sí|no|vale|quizás|no sé)[.!?\s]*$/iu
const secrets=/(?:sk-or-v1-|github_pat_|-----BEGIN .+ PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{24,})/iu
function eligibleQuote(value){
 return typeof value==='string'&&value.trim().length>=10&&value.length<=1200&&
  !controls.test(value.trim())&&!secrets.test(value)&&!coachProtocolEvidenceVeto(value)
}
// Short literal answers may be explicitly confirmed by the client in a bound form.
// Keep the legacy manual candidate list unchanged; this is not an automatic fact.
function eligibleShortGuidedQuote(value){return typeof value==='string'&&value.trim().length<10&&protocolAnswerClass(value)==='candidate'&&!secrets.test(value)}
export function coachCourseReviewQuotes(turns){
 return (Array.isArray(turns)?turns:[]).flatMap((row,turnIndex)=>
   row?.role==='user'&&eligibleQuote(row.content)?[{turnIndex,quote:row.content.trim()}]:[])
}
// Numeric review requires the exact adjacent axis question. A pair from a
// different axis may never be assigned manually or by lexical fallback.
export function coachCourseFieldReviewQuotes(courseSessionId,fieldId,turns){
 if(!clarityRatingDefinition(fieldId))return coachCourseReviewQuotes(turns)
 return (Array.isArray(turns)?turns:[]).flatMap((row,turnIndex)=>{
  const prompt=turns[turnIndex-1]
  return row?.role==='user'&&clarityRatingPair(fieldId,row.content)&&prompt?.role==='assistant'&&prompt.interrupted!==true&&langs.some(l=>{
   const field=coachCourseProtocolSchema(courseSessionId,l)?.checkpoints.find(f=>f.id===fieldId)
   return field&&checkpointQuestionMatches(field,l,prompt.content)
  })?[{turnIndex,quote:row.content.trim()}]:[]
 })
}
export function normalizeCoachCourseFieldReview(value,courseSessionId,turns){
 if(value===undefined||value===null)return null
 const schema=coachCourseProtocolSchema(courseSessionId,'en',{includeLegacy:true})
 if(!schema||!plain(value)||Object.keys(value).length!==3||
    value.version!==COACH_COURSE_FIELD_REVIEW_VERSION||value.courseSessionId!==courseSessionId||
    !Array.isArray(value.events)||value.events.length<1||value.events.length>64)invalid()
 const allowed=new Set(schema.checkpoints.map(row=>row.id))
 const events=value.events.map((event,index)=>{
  if(!plain(event)||!([5,6].includes(Object.keys(event).length))||Object.keys(event).some(k=>!['fieldId','status','turnIndex','quote','revision','binding'].includes(k))||!allowed.has(event.fieldId)||
     event.revision!==index+1||!['confirmed','skipped_by_client','not_explored'].includes(event.status))invalid()
  if(event.status==='confirmed'){
   if(!Number.isInteger(event.turnIndex)||event.turnIndex<0||
     turns[event.turnIndex]?.role!=='user'||!(eligibleQuote(event.quote)||eligibleShortGuidedQuote(event.quote))||
     turns[event.turnIndex].content.trim()!==event.quote||
     (clarityRatingDefinition(event.fieldId)&&!coachCourseFieldReviewQuotes(courseSessionId,event.fieldId,turns).some(q=>q.turnIndex===event.turnIndex&&q.quote===event.quote)))invalid()
  }else if(event.turnIndex!==null||event.quote!=='')invalid()
  let binding
  if(Object.hasOwn(event,'binding')){
   const b=event.binding
   if(event.status!=='confirmed'||!plain(b)||Object.keys(b).length!==2||
      b.questionTurnIndex!==event.turnIndex-1||b.confirmationTurnIndex!==event.turnIndex+2||
      b.questionTurnIndex<0)invalid()
   const question=turns[b.questionTurnIndex],echo=turns[event.turnIndex+1],confirmation=turns[b.confirmationTurnIndex]
   if(question?.role!=='assistant'||question.interrupted===true||echo?.role!=='assistant'||echo.interrupted===true||
      confirmation?.role!=='user'||protocolAnswerClass(confirmation.content)!=='affirm'||
      checkpointAnswerMismatch(event.fieldId,event.quote))invalid()
   if(!langs.some(lang=>{
    const row=coachCourseProtocolSchema(courseSessionId,lang,{includeLegacy:true}).checkpoints.find(x=>x.id===event.fieldId)
    return checkpointQuestionMatches(row,lang,question.content)&&checkpointConfirmationMatches(row,question.content,event.quote,lang,echo.content)
   }))invalid()
   // Transcript linkage is not standalone server provenance; server-issued
   // gates additionally match the entire encrypted draft during promotion.
   binding={questionTurnIndex:b.questionTurnIndex,confirmationTurnIndex:b.confirmationTurnIndex}
  }
  return {fieldId:event.fieldId,status:event.status,turnIndex:event.turnIndex,quote:event.quote,revision:index+1,...(binding?{binding}:{})}
 })
 return {version:COACH_COURSE_FIELD_REVIEW_VERSION,courseSessionId,events}
}
export function appendCoachCourseFieldReview(value,courseSessionId,turns,fieldId,choice){
 const previous=normalizeCoachCourseFieldReview(value,courseSessionId,turns)
 const events=previous?.events||[]
 const match=typeof choice==='string'&&/^turn:(0|[1-9]\d*)$/u.exec(choice)
 const source=match?coachCourseFieldReviewQuotes(courseSessionId,fieldId,turns).find(row=>row.turnIndex===Number(match[1])):null
 if(match&&!source)invalid()
 if(!source&&!['open','skip'].includes(choice))invalid()
 const event={fieldId,status:source?'confirmed':choice==='skip'?'skipped_by_client':'not_explored',
   turnIndex:source?.turnIndex??null,quote:source?.quote??'',revision:events.length+1}
 const last=events.findLast(row=>row.fieldId===fieldId)
 if(last&&last.status===event.status&&last.turnIndex===event.turnIndex)return previous
 return normalizeCoachCourseFieldReview({version:COACH_COURSE_FIELD_REVIEW_VERSION,courseSessionId,events:[...events,event]},courseSessionId,turns)
}
export function coachCourseProtocolRows(courseSessionId,turns=[],review=null,locale='en'){
 const schema=coachCourseProtocolSchema(courseSessionId,locale)
 if(!schema)return []
 const normalized=normalizeCoachCourseFieldReview(review,courseSessionId,turns)
 const legacy=coachCourseProtocolSchema(courseSessionId,locale,{includeLegacy:true}).checkpoints.filter(row=>row.archived&&normalized?.events.some(event=>event.fieldId===row.id))
 const checklist=coachInformationChecklist(turns)
 return [...schema.checkpoints,...legacy].map(row=>{
   const eligible=coachCourseFieldReviewQuotes(courseSessionId,row.id,turns)
   const selected=normalized?.events.findLast(event=>event.fieldId===row.id)
   const base={id:row.id,label:row.label,question:row.question,status:'not_explored',quote:'',turnIndex:null,questionTurnIndex:null,source:null,revision:selected?.revision??null,...(row.archived?{archived:true}:{})}
   if(selected?.status==='confirmed')return {...base,status:'confirmed',quote:selected.quote,turnIndex:selected.turnIndex,source:'client_reviewed_quote',...(selected.binding?{question:turns[selected.binding.questionTurnIndex].content,questionTurnIndex:selected.binding.questionTurnIndex,confirmationTurnIndex:selected.binding.confirmationTurnIndex,confirmationQuote:turns[selected.binding.confirmationTurnIndex].content}:{})}
   if(selected?.status==='skipped_by_client')return {...base,status:'skipped_by_client',source:'client_selected_skip'}
   if(selected?.status==='not_explored')return {...base,source:'client_selected_open'}
   // Exact visible prompt + adjacent eligible client utterance is useful but
   // cannot prove the Director issued it, it was heard, or the answer is final.
   const exact=eligible.findLast(answer=>{
     const prompt=turns[answer.turnIndex-1]
     return prompt?.role==='assistant'&&prompt.interrupted!==true&&!checkpointAnswerMismatch(row.id,answer.quote)&&langs.some(l=>checkpointQuestionMatches(coachCourseProtocolSchema(courseSessionId,l,{includeLegacy:true}).checkpoints.find(x=>x.id===row.id),l,prompt.content.trim()))
   })
   if(exact)return {...base,status:'needs_confirmation',quote:exact.quote,turnIndex:exact.turnIndex,questionTurnIndex:exact.turnIndex-1,source:'visible_prompt_candidate'}
   const cue=checklist.find(x=>x.key===fallbackKeys[row.id])?.quote
   const lexical=cue?eligible.findLast(answer=>answer.quote.startsWith(cue)):null
   return lexical&&!checkpointAnswerMismatch(row.id,lexical.quote)?{...base,status:'needs_confirmation',quote:lexical.quote,turnIndex:lexical.turnIndex,source:'lexical_candidate'}:base
 })
}
export function coachCourseProtocolOverview(courseSessionId,title,locale='en',turns=[],review=null){
 const schema=coachCourseProtocolSchema(courseSessionId,locale)
 if(!schema)return ''
 const lang=langs.includes(locale)?locale:'en'
 const copy={
  en:{title:'Session checkpoints',not_explored:'No question-bound answer verified in this record',needs_confirmation:'Needs confirmation · candidate',confirmed:'Client-reviewed quote (not server-issued question proof)',skipped_by_client:'Skipped by client',source:'Client turn'},
  ru:{title:'Контрольные пункты сессии',not_explored:'В этой записи нет проверенного ответа на данный вопрос',needs_confirmation:'Требует уточнения · предварительно',confirmed:'Цитата подтверждена клиентом (не доказательство серверного вопроса)',skipped_by_client:'Пропущено клиентом',source:'Реплика клиента'},
  es:{title:'Puntos de la sesión',not_explored:'No hay una respuesta vinculada a esta pregunta y verificada en el registro',needs_confirmation:'Requiere confirmación · provisional',confirmed:'Cita revisada por el cliente (no prueba de pregunta del servidor)',skipped_by_client:'Omitido por el cliente',source:'Turno del cliente'}
 }[lang]
 return [copy.title+' · '+title,...coachCourseProtocolRows(courseSessionId,turns,review,lang).map(row=>
  row.label+': '+copy[row.status]+(row.confirmationTurnIndex!=null?' — '+row.question:'')+(row.quote?' — “'+row.quote+'” ('+copy.source+' '+(row.turnIndex+1)+')':''))].join('\n')
}

// This is an application transport boundary, not a statement that the answers are true.
export function coachCourseGateHandoffRequired({enabled,autosave,courseSessionId,locale,opening}={}){
 return Boolean(enabled===true&&autosave===true&&opening?.completed===true&&opening.declined!==true&&
  ['goal','challenge','self_exploration'].includes(opening.answers?.focus?.kind)&&coachCourseProtocolSchema(courseSessionId,locale))
}
