// Course-level checkpoints are distinct from persona method evidence.
 // Sources: coach-program-topics.mjs, clarity-program.mjs, business-daybook.mjs,
 // SEVEN_STEPS_TO_DREAM_V2_20261123.md and my-coach-zero-session-profile.md.
 // These are editorial report slots, not evidence of question delivery or completion.
// Existing coaching session IDs retain their original four-session meaning.
import {LEGACY_BUSINESS_SYLLABUS} from '../app/business-daybook.mjs'
import {goalScenarioGuidance,goalScenarioTimeGuidance} from './goal-session-scenarios.mjs'
import {sessionBlueprint,sessionBlueprintGuidance,thematicScenarioVersion,THEMATIC_EXPANDED_VERSION,THEMATIC_EXPANDED_REVIEW_VERSION,THEMATIC_TRANSCRIPT_REVIEW_VERSION,normalizeThematicConversationVersion,thematicConversationTimeGuidance} from './session-blueprint.mjs'
import {coachProtocolEvidenceVeto} from './coach-protocol-relevance.mjs'
import {protocolAnswerClass,coachMethodConsentDecision,courseAnswerVerificationAdvisory} from './coach-protocol-validation-gate.mjs'
import {coachInformationChecklist} from './coach-information-checklist.mjs'
import {authoredCheckpointQuestion,checkpointQuestionMatches,checkpointConfirmationMatches,checkpointAnswerMismatch,checkpointLiveAnswerMismatch,checkpointConfirmation} from './coach-course-question-binding.mjs'
import {CLARITY_RESULT_FIELDS,CLARITY_LEGACY_FIELDS,claritySpecialField,clarityRatingDefinition,clarityRatingForQuestion} from './clarity-session-fields.mjs'
import {clarityDayOneModelGuidance,clarityDayOneTimeGuidance,clarityDayOneScenario,clarityDayOneGateFields,clarityDayOneReviewOf,CLARITY_DAY_ONE_VERSION,CLARITY_DAY_ONE_REVIEW_VERSION,COACH_SHARED_SESSION_FLOW} from './clarity-day-one-scenario.mjs'
import {clarityScenarioVersion,clarityScenarioReviewVersion,clarityReviewVersionForScenario,clarityVersionedScenario,clarityScenarioGateFields,clarityScenarioReviewOf,clarityScenarioGuidance,clarityScenarioTimeGuidance,clarityScenarioEvidenceAllowed,clarityScenarioEvidenceSource} from './clarity-course-scenarios.mjs'
export const COACH_COURSE_PROTOCOL_SCHEMA_VERSION='hh-coach-course-report-v1'
export const COACH_COURSE_FIELD_REVIEW_VERSION='hh-coach-course-review-v1'
const langs=['en','ru','es']
const f=(id,en,ru,es)=>Object.freeze({id,label:Object.freeze({en,ru,es})})
const field=Object.freeze({
 life_balance:f('life_balance','Life balance / current and desired ratings','Баланс жизни: текущие и желаемые оценки','Equilibrio vital: valoraciones actuales y deseadas'),
 meaning_axes:f('meaning_axes','Meaning axes and values','Смысловые оси и ценности','Ejes de sentido y valores'),
 symptoms:f('symptoms','Self-reported symptoms and impact','Симптомы со слов клиента и их влияние','Síntomas autoinformados e impacto'),
 future_scene:f("future_scene","Ordinary day in the desired future","Обычный день в желаемом будущем","Un día normal en el futuro deseado"),
 resource_observation:f("resource_observation","Resource trial or intended trial","Проба ресурса или план пробы","Prueba del recurso o plan de prueba"),
 stop_rule:f("stop_rule","Personal stop rule","Условие остановки","Condición para detenerse"),
 decision_rule:f("decision_rule","Decision after experiment","Правило решения после пробы","Criterio de decisión tras la prueba"),
 sustainable_pace:f("sustainable_pace","Sustainable workload","Посильный темп","Ritmo sostenible"),
 outcome_status:f("outcome_status","Actual outcome and remaining work","Фактический результат и незавершённое","Resultado real y lo pendiente"),
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
 goal_result:['baseline','goal','why','success','horizon','boundaries','next','timing'],
 goal_motivation:['goal','future_scene','why','boundaries','next','timing'],
 goal_plan:['plan','timing','levels','success','contingency','next','review'],
 goal_resources:['strengths','resources','limits','next','practices','resource_observation'],
 goal_obstacles:['obstacle','trigger','limits','facts','contingency','stop_rule','experiment'],
 goal_possibilities:['options','tradeoffs','experiment','review','stop_rule','decision_rule'],
 goal_acceleration:['progress','adjust','learning','next','sustainable_pace','review'],
 goal_integration:['progress','outcome_status','learning','changes','resources','direction','next','review'],
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
export function coachCourseProtocolSchema(courseSessionId,locale='en',{includeLegacy=false,scenarioVersion=null}={}){
 if(typeof courseSessionId!=='string')return null
 const lang=langs.includes(locale)?locale:'en'
 let checkpoints,source
 const expanded=scenarioVersion!==null&&scenarioVersion===thematicScenarioVersion(courseSessionId)
 if(scenarioVersion!==null&&!expanded&&scenarioVersion!==clarityScenarioVersion(courseSessionId))return null
 if(scenarioVersion!==null&&!expanded){
   const gates=new Map(clarityScenarioGateFields(courseSessionId).map(row=>[row.id,row]))
   checkpoints=clarityVersionedScenario(courseSessionId,lang).fields.filter(row=>row.stage!=='contact').map(row=>({
    id:row.id,label:row.label||claritySpecialField(row.id,lang)?.label||field[row.id]?.label[lang]||row.question,
    question:row.question,progressStage:row.progressStage,scenarioVersion,
    ...(scenarioVersion!==CLARITY_DAY_ONE_VERSION?{kind:gates.get(row.id)?.kind||row.kind,priority:row.priority,homeworkEligible:row.homework===true,...(row.requiresConsent?{requiresConsent:row.requiresConsent}:{})}:{}),
    ...(!gates.has(row.id)?{requiresSeparateReview:true}:{})
   }))
   source=scenarioVersion
 }else if(Object.hasOwn(businessIds,courseSessionId)){
   const index=Object.keys(businessIds).indexOf(courseSessionId)
   checkpoints=LEGACY_BUSINESS_SYLLABUS[lang][index][2].map(([label,instruction],i)=>({id:businessIds[courseSessionId][i],label,instruction}))
   source='business-daybook'
 }else if(Object.hasOwn(byCourse,courseSessionId)){
   const ids=byCourse[courseSessionId]
   const legacy=includeLegacy&&CLARITY_LEGACY_FIELDS[courseSessionId]||[]
   checkpoints=[...ids,...legacy].map(key=>({...((claritySpecialField(key,lang))||{id:field[key].id,label:field[key].label[lang]}),...(legacy.includes(key)?{archived:true}:{})}))
   source=courseSessionId.startsWith('clarity_')?'clarity-syllabus':courseSessionId.startsWith('goal_')?'seven-steps-and-goal-catalogue':'eight-session-catalogue'
 }else return null // Session 0 and meaning-axis profile use their own versioned schemas.
 if(expanded){
   const blueprint=sessionBlueprint(courseSessionId,lang,{expanded:true})
   const existing=new Map(checkpoints.map(row=>[row.id,{...row,question:authoredCheckpointQuestion(row,lang)}]))
   for(const field of blueprint.additionalCheckpoints)existing.set(field.id,field)
   checkpoints=blueprint.stages.flatMap(stage=>stage.fields.map(id=>{const row=existing.get(id);if(!row)throw Error('THEMATIC_BLUEPRINT_INVALID');return {...row,progressStage:stage.id,scenarioVersion}}))
   source=scenarioVersion
 }
 return Object.freeze({version:COACH_COURSE_PROTOCOL_SCHEMA_VERSION,courseSessionId,source,
   checkpoints:Object.freeze(checkpoints.map(row=>Object.freeze({...row,...(!scenarioVersion&&!clarityScenarioVersion(courseSessionId)?{progressStage:sessionBlueprint(courseSessionId,lang)?.stages.find(s=>s.fields.includes(row.id))?.id}:{}),question:authoredCheckpointQuestion(row,lang)})))})
}
// Compact, editorial guidance for the existing next-turn voice checkpoint.
 // The selected course is a preference, not a verified focus or an answer.
// Only independently eligible, exact authored questions can bypass a personal
// method's topic-specific wording veto. This is not consent or stage evidence.
export function coachCourseIndependentQuestion(courseSessionId,locale,question,conversationVersion=null){
 const version=clarityScenarioVersion(courseSessionId)||normalizeThematicConversationVersion(courseSessionId,conversationVersion)
 const schema=coachCourseProtocolSchema(courseSessionId,locale,{scenarioVersion:version})
 if(!schema||typeof question!=='string')return false
 const gates=clarityScenarioVersion(courseSessionId)?new Map(clarityScenarioGateFields(courseSessionId).map(row=>[row.id,row])):null
 return schema.checkpoints.some(row=>{
   const gate=gates?.get(row.id)
   return !row.requiresSeparateReview&&!row.requiresConsent&&(!gates||Boolean(gate))&&
    !gate?.requiresConsent&&gate?.kind!=='review'&&row.kind!=='review'&&
    checkpointQuestionMatches(row,locale,question.trim())
 })
}
export function coachCourseCheckpointGuidance(courseSessionId,locale,opening,directive,turns=[],message=''){
 if(!opening?.completed||opening.declined||
    !['goal','challenge','self_exploration'].includes(opening.answers?.focus?.kind)||
    ['topic_shift','correction','negation','clarification_request','question_to_coach','gratitude'].includes(directive?.conversationAct))return ''
 const conversationVersion=normalizeThematicConversationVersion(courseSessionId,directive?.courseScenarioVersion)
 const schema=coachCourseProtocolSchema(courseSessionId,locale,{scenarioVersion:clarityScenarioVersion(courseSessionId)||conversationVersion})
 if(!schema)return ''
 const elapsed=directive?.timebox?.elapsedSeconds
 const versioned=Boolean(clarityScenarioVersion(courseSessionId))
 const timing=versioned?(Number.isFinite(elapsed)&&elapsed>=0?clarityScenarioTimeGuidance(courseSessionId,elapsed):''):goalScenarioTimeGuidance(courseSessionId,elapsed)||thematicConversationTimeGuidance(courseSessionId,locale,elapsed,conversationVersion)
 // Closing takes priority over starting or repeating a checkpoint. The time
 // hint itself never proves that the session ended or a field was saved.
 if(timing&&elapsed>=(versioned?(courseSessionId==='clarity_day_1'?960:1020):1080))return timing
 // Advisory only: recent caller history cannot prove delivery or persistence.
 const last=Array.isArray(turns)?turns.at(-1):null
 const current=last?.role==='assistant'&&last.interrupted!==true?schema.checkpoints.find(row=>!row.requiresSeparateReview&&checkpointQuestionMatches(row,locale,last.content?.trim())):null
 if(current){
  const kind=coachProtocolEvidenceVeto(message)||checkpointAnswerMismatch(current.id,message)?'control':protocolAnswerClass(message)
  // The same localized question/echo contract is used by transcript capture.
  // Avoid embedding sensitive or long client quotes into sideband guidance.
  const candidateEcho=kind==='candidate'&&message.trim().length<=120?checkpointConfirmation(last.content.trim(),message.trim(),locale):''
  const echo=candidateEcho.length<=275?candidateEcho:''
  const advisory=' Current field: '+current.label+'.'+(echo?' Ask exactly this confirmation, then wait for explicit assent; do not claim a save: '+echo:courseAnswerVerificationAdvisory(kind))
  const transition=' Finish or leave this field open before a natural transition.'
  if(!timing||advisory.length+transition.length>450)return advisory
  const phase=' '+timing.trim().split('. ')[0]+'.'
  return advisory+(advisory.length+phase.length+transition.length<=450?phase:'')+transition
 }
 if(timing)return timing
 // Without an active-time hint, a versioned scenario still has an ordered
 // plan in its system instructions. Do not send its entire long field list
 // over the live sideband or imply that the active clock has started.
 if(versioned)return ' Active time unverified. Respond to the client first; follow the approved scenario order and ask one relevant unanswered eligible checkpoint only after explicit start. Respect consent, skips and safety; do not assume a minute or mark completion.'
 return ' If client still confirms this topic, checkpoints: '+schema.checkpoints.map(row=>row.label).join('; ')+
   '. Ask one relevant unaddressed point; never repeat answered questions, force the topic, or infer completion.'
}
export function coachCourseProtocolGuidance(courseSessionId,locale,conversationVersion=null){
 const expanded=Boolean(normalizeThematicConversationVersion(courseSessionId,conversationVersion))
 const schema=coachCourseProtocolSchema(courseSessionId,locale,{scenarioVersion:expanded?conversationVersion:null})
 if(!schema)return ''
 if(clarityScenarioVersion(courseSessionId))return COACH_SHARED_SESSION_FLOW+'\n'+clarityScenarioGuidance(courseSessionId,locale)
 return COACH_SHARED_SESSION_FLOW+'\nAfter the client confirms this exact session focus, use the following topic-specific report checkpoints within the existing Director-authorized move and safety gates: '+
   schema.checkpoints.map(row=>row.label+(row.instruction?' — '+row.instruction:'')).join('; ')+
   '. '+goalScenarioGuidance(courseSessionId)+' '+sessionBlueprintGuidance(courseSessionId,locale,{expanded})+' First two active conversational minutes: invite and actually address the concrete client topic with the character’s viewpoint and a grounded reason; never substitute a generic phrase for this substantive reaction. This applies before administrative opening gates finish, with consent and safety intact. Continue varied brief character reactions in 2–4 and 4–7 active minutes and later when relevant; never force a signature. Never replace or count a required checkpoint with a signature. Cover the checkpoints naturally over the session, one relevant question at a time; do not repeat answered questions or pressure the client to complete every field. For a checkpoint you intend to capture, use its exact authored question as the entire question turn (choose one, only when relevant): '+schema.checkpoints.map(row=>row.question).join(' / ')+'. Natural reflections and other questions are welcome outside the capture turn. After a clear candidate, echo the exact question and the client’s literal answer using the localized confirmation template, then wait for explicit assent before proceeding. Do not treat a paraphrased question or echo as verified evidence. Do not claim a checkpoint was verified, or a commitment made, because of the selected topic, model suggestion or conversation length. Unclear or missing evidence stays open.'
}
// These are candidates from the visible conversation, never server-issued
// delivery proof. A user may explicitly select a verbatim source in the
// existing reviewed report. No model output can select or confirm a field.
const fallbackKeys=Object.freeze({situation:'situation',goal:'goal',why:'motivation',obstacle:'obstacles',resources:'resources',support:'resources',next:'nextSteps'})
const plain=value=>value!==null&&typeof value==='object'&&!Array.isArray(value)
const invalid=()=>{throw Error('MY_COACH_PROTOCOL_INVALID')}
const controls=/^(?:yes|no|okay|ok|sure|maybe|i don't know|да|нет|хорошо|возможно|не знаю|sí|no|vale|quizás|no sé)[.!?\s]*$/iu
const secrets=/(?:sk-or-v1-|github_pat_|-----BEGIN .+ PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{24,})/iu
function eligibleQuote(value,historicalReview=false){
 return typeof value==='string'&&value.trim().length>=10&&value.length<=1200&&
  !controls.test(value.trim())&&!secrets.test(value)&&!coachProtocolEvidenceVeto(value,{historicalReview})
}
// Short literal answers may be explicitly confirmed by the client in a bound form.
// Keep the legacy manual candidate list unchanged; this is not an automatic fact.
function eligibleShortGuidedQuote(value){return typeof value==='string'&&value.trim().length<10&&protocolAnswerClass(value)==='candidate'&&!secrets.test(value)}
export function coachCourseReviewQuotes(turns){
 return (Array.isArray(turns)?turns:[]).flatMap((row,turnIndex)=>
   row?.role==='user'&&eligibleQuote(row.content)?[{turnIndex,quote:row.content.trim()}]:[])
}
// Numeric review requires the exact adjacent axis question and its rating mode.
// A score from a different axis may never be assigned by lexical fallback.
export function coachCourseFieldReviewQuotes(courseSessionId,fieldId,turns){
 if(!clarityRatingDefinition(fieldId))return coachCourseReviewQuotes(turns)
 return (Array.isArray(turns)?turns:[]).flatMap((row,turnIndex)=>{
  const prompt=turns[turnIndex-1]
  return row?.role==='user'&&prompt?.role==='assistant'&&prompt.interrupted!==true&&clarityRatingForQuestion(fieldId,row.content,prompt.content)&&langs.some(l=>{
   const field=coachCourseProtocolSchema(courseSessionId,l)?.checkpoints.find(f=>f.id===fieldId)
   return field&&checkpointQuestionMatches(field,l,prompt.content)
  })?[{turnIndex,quote:row.content.trim()}]:[]
 })
}
// v5 review events are question-bound, not arbitrary manual transcript selections.
// Empty events preserve the chosen version when a client stops before answering.
// The encrypted draft adapter additionally validates the entire persisted gate.
export function coachReviewScenarioVersion(review){
 if([THEMATIC_EXPANDED_REVIEW_VERSION,THEMATIC_TRANSCRIPT_REVIEW_VERSION].includes(review?.version))return thematicScenarioVersion(review.courseSessionId)
 return review&&clarityScenarioReviewVersion(review.courseSessionId)===review.version?clarityScenarioVersion(review.courseSessionId):null
}
// Bounded deterministic snapshot: use canonical authored labels and literal
// verified excerpts; validate the same snapshot at archive readback.
export function clarityDayOneReviewPrompt(id,rows,locale='en',clarify=false,courseSessionId='clarity_day_1'){
 const lang=langs.includes(locale)?locale:'en',dependencies=clarityScenarioReviewOf(courseSessionId,id)
 if(!dependencies.length)return null
 const known=dependencies.flatMap(key=>{
  const row=rows.find(r=>r.id===key&&r.status==='confirmed'&&typeof r.quote==='string'&&r.quote.trim())
  if(!row)return []
  if(key.startsWith('outer_')){
   const rating=clarityRatingForQuestion(key,row.quote,row.question)
   return rating&&rating.current!==null?[{label:row.label,value:String(rating.current)+'/10'}]:[]
  }
  return [{label:row.label,value:row.quote.replace(/\s+/gu,' ').trim()}]
 })
 if(!known.length)return null
 const short=(value,max)=>String(value).length>max?String(value).slice(0,max-1)+'…':String(value)
 const copy=({en:['Recorded life balance','Brief verified session excerpts','fields remain without verified answers','Does this reflect what you said?','Correct a recorded answer or skip the review if you prefer.'],
 ru:['Записанный баланс жизни','Краткие выдержки из проверенных итогов','пунктов без проверенных ответов','Это отражает ваши ответы?','Можно уточнить записанный ответ или пропустить сверку.'],
 es:['Equilibrio vital registrado','Extractos breves de respuestas verificadas','puntos sin respuestas verificadas','¿Esto refleja tus respuestas?','Puedes corregir una respuesta u omitir la revisión.']})[lang]
 const visible=courseSessionId==='clarity_day_1'?known:known.slice(0,14)
 const body=visible.map(row=>short(row.label,26)+': '+short(row.value,24)).join('; ')
 const head=id==='balance_review'?copy[0]:copy[1]
 const extra=visible.length<known.length?({en:' Other verified answers remain in the protocol.',ru:' Другие проверенные ответы сохранены в протоколе.',es:' Las demás respuestas verificadas permanecen en el protocolo.'})[lang]:''
 return head+': '+body+'.'+extra+' '+(dependencies.length-known.length)+' '+copy[2]+'. '+copy[3]+(clarify?' '+copy[4]:'')
}
function normalizeClarityDayOneReview(value,courseSessionId,turns){
 const version=clarityScenarioVersion(courseSessionId),reviewVersion=clarityScenarioReviewVersion(courseSessionId)
 if(!version||!plain(value)||Object.keys(value).length!==3||value.version!==reviewVersion||value.courseSessionId!==courseSessionId||
    !Array.isArray(value.events)||value.events.length>64||!Array.isArray(turns))invalid()
 const schema=l=>coachCourseProtocolSchema(courseSessionId,l,{scenarioVersion:version}).checkpoints
 const definitions=new Map(clarityScenarioGateFields(courseSessionId).map(row=>[row.id,row]))
 const allowed=new Set(definitions.keys()),consents=new Map()
 const accepted=new Set(),used=new Set(),active=new Map()
 const events=value.events.map((event,index)=>{
  if(!plain(event)||![5,6].includes(Object.keys(event).length)||Object.keys(event).some(k=>!['fieldId','status','turnIndex','quote','revision','binding'].includes(k))||
     !allowed.has(event.fieldId)||event.revision!==index+1||!['confirmed','skipped_by_client','not_explored'].includes(event.status))invalid()
  const id=event.fieldId,def=definitions.get(id),isConsent=def.kind==='consent',isReview=def.kind==='review'
  if(def.requiresConsent&&consents.get(def.requiresConsent)!=='accepted')invalid()
  if(event.status!=='not_explored'&&!clarityScenarioEvidenceAllowed(courseSessionId,id,key=>active.get(key)))invalid()
  if(!isReview&&[...definitions.values()].some(r=>r.kind==='review'&&accepted.has(r.id)&&(isConsent||r.reviewOf.includes(id))))invalid()
  if(event.status!=='confirmed'){
   if(event.turnIndex!==null||event.quote!==''||Object.hasOwn(event,'binding')||(isConsent&&event.status==='skipped_by_client'))invalid()
   if(event.status==='not_explored'){
    if(!accepted.has(id)||[...accepted].some(key=>clarityScenarioEvidenceSource(courseSessionId,key)===id))invalid()
    accepted.delete(id);active.delete(id)
    if(isConsent){if([...accepted].some(key=>definitions.get(key)?.requiresConsent===id))invalid();consents.delete(id)}
   }else{
    if(accepted.has(id))invalid()
    accepted.add(id)
   }
   return {fieldId:id,status:event.status,turnIndex:null,quote:'',revision:index+1}
  }
  const b=event.binding,n=event.turnIndex,q=turns[n-1],a=turns[n]
  if(accepted.has(id)||!Number.isInteger(n)||n<1||used.has(n)||!plain(b)||Object.keys(b).length!==2||b.questionTurnIndex!==n-1||
     q?.role!=='assistant'||q.interrupted===true||a?.role!=='user'||a.interim===true||a.unanswered===true||
     typeof a.content!=='string'||typeof event.quote!=='string'||a.content.trim()!==event.quote)invalid()
  const matches=langs.filter(l=>{
   if(!isReview)return checkpointQuestionMatches(schema(l).find(r=>r.id===id),l,q.content)
   const rows=[...active.values()].map(r=>({id:r.fieldId,label:schema(l).find(f=>f.id===r.fieldId)?.label||r.fieldId,status:'confirmed',quote:r.quote,question:turns[r.binding.questionTurnIndex]?.content}))
   return [clarityDayOneReviewPrompt(id,rows,l,false,courseSessionId),clarityDayOneReviewPrompt(id,rows,l,true,courseSessionId)].includes(q.content)
  })
  if(!matches.length)invalid()
  let binding
  if(isReview){
   if(b.review!=='accepted'||protocolAnswerClass(event.quote)!=='affirm')invalid()
   binding={questionTurnIndex:n-1,review:'accepted'}
  }else if(isConsent){
   const decision=coachMethodConsentDecision(event.quote)
   if(!decision||b.decision!==decision)invalid()
   consents.set(id,decision)
   binding={questionTurnIndex:n-1,decision}
  }else{
   const echo=turns[n+1],confirm=turns[n+2]
   if(protocolAnswerClass(event.quote)!=='candidate'||checkpointLiveAnswerMismatch(id,event.quote,q.content)||
      b.confirmationTurnIndex!==n+2||echo?.role!=='assistant'||echo.interrupted===true||
      confirm?.role!=='user'||confirm.unanswered===true||confirm.interim===true||protocolAnswerClass(confirm.content)!=='affirm'||
      !matches.some(l=>checkpointConfirmationMatches(schema(l).find(r=>r.id===id),q.content,event.quote,l,echo.content)))invalid()
   binding={questionTurnIndex:n-1,confirmationTurnIndex:n+2}
  }
  used.add(n);accepted.add(id)
  const verified={fieldId:id,status:'confirmed',turnIndex:n,quote:event.quote,revision:index+1,binding}
  active.set(id,verified);return verified
 })
 return {version:reviewVersion,courseSessionId,events}
}

export function normalizeCoachCourseFieldReview(value,courseSessionId,turns){
 if(value===undefined||value===null)return null
 if(clarityScenarioReviewVersion(courseSessionId)===value?.version)return normalizeClarityDayOneReview(value,courseSessionId,turns)
 const transcript=value?.version===THEMATIC_TRANSCRIPT_REVIEW_VERSION
 const expanded=(value?.version===THEMATIC_EXPANDED_REVIEW_VERSION||transcript)&&Boolean(thematicScenarioVersion(courseSessionId))
 const scenarioVersion=expanded?THEMATIC_EXPANDED_VERSION:null
 const schema=coachCourseProtocolSchema(courseSessionId,'en',{includeLegacy:true,scenarioVersion})
 if(!schema||!plain(value)||Object.keys(value).length!==3||
    value.version!==(expanded?(transcript?THEMATIC_TRANSCRIPT_REVIEW_VERSION:THEMATIC_EXPANDED_REVIEW_VERSION):COACH_COURSE_FIELD_REVIEW_VERSION)||value.courseSessionId!==courseSessionId||
    !Array.isArray(value.events)||value.events.length<(expanded?0:1)||value.events.length>64)invalid()
 const allowed=new Set(schema.checkpoints.map(row=>row.id))
 const events=value.events.map((event,index)=>{
  if(!plain(event)||!([5,6].includes(Object.keys(event).length))||Object.keys(event).some(k=>!['fieldId','status','turnIndex','quote','revision','binding'].includes(k))||!allowed.has(event.fieldId)||
     event.revision!==index+1||!['confirmed','skipped_by_client','not_explored'].includes(event.status))invalid()
  if(transcript&&(event.status!=='confirmed'||event.binding?.confirmationTurnIndex===turns.length-1))invalid()
  if(event.status==='confirmed'){
   if(expanded&&(!event.binding||turns[event.turnIndex]?.unanswered===true||turns[event.turnIndex]?.interim===true))invalid()
   if(!Number.isInteger(event.turnIndex)||event.turnIndex<0||
     turns[event.turnIndex]?.role!=='user'||!(eligibleQuote(event.quote,true)||eligibleShortGuidedQuote(event.quote))||
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
      confirmation?.role!=='user'||(expanded&&(confirmation.unanswered===true||confirmation.interim===true))||protocolAnswerClass(confirmation.content)!=='affirm'||
      checkpointAnswerMismatch(event.fieldId,event.quote))invalid()
   if(!langs.some(lang=>{
    const row=coachCourseProtocolSchema(courseSessionId,lang,{includeLegacy:true,scenarioVersion}).checkpoints.find(x=>x.id===event.fieldId)
    return checkpointQuestionMatches(row,lang,question.content)&&checkpointConfirmationMatches(row,question.content,event.quote,lang,echo.content)
   }))invalid()
   // Transcript linkage is not standalone server provenance; server-issued
   // gates additionally match the entire encrypted draft during promotion.
   binding={questionTurnIndex:b.questionTurnIndex,confirmationTurnIndex:b.confirmationTurnIndex}
  }
  return {fieldId:event.fieldId,status:event.status,turnIndex:event.turnIndex,quote:event.quote,revision:index+1,...(binding?{binding}:{})}
 })
 return {version:expanded?(transcript?THEMATIC_TRANSCRIPT_REVIEW_VERSION:THEMATIC_EXPANDED_REVIEW_VERSION):COACH_COURSE_FIELD_REVIEW_VERSION,courseSessionId,events}
}
export function appendCoachCourseFieldReview(value,courseSessionId,turns,fieldId,choice){
 const previous=normalizeCoachCourseFieldReview(value,courseSessionId,turns)
 if(coachReviewScenarioVersion(previous))invalid() // corrections must use the versioned gate
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
function clarityDayOneProtocolRows(courseSessionId,turns,review,locale,scenarioVersion){
 const schema=coachCourseProtocolSchema(courseSessionId,locale,{scenarioVersion})
 if(!schema)invalid()
 const normalized=normalizeCoachCourseFieldReview(review,courseSessionId,turns)
 if(normalized&&coachReviewScenarioVersion(normalized)!==scenarioVersion)invalid()
 return schema.checkpoints.map(row=>{
  const event=normalized?.events.findLast(e=>e.fieldId===row.id)
  const base={id:row.id,label:row.label,question:row.question,status:'not_explored',quote:'',turnIndex:null,questionTurnIndex:null,source:null,revision:event?.revision??null,
   progressStage:row.progressStage,scenarioVersion,...(scenarioVersion!==CLARITY_DAY_ONE_VERSION?{kind:row.kind,priority:row.priority,homeworkEligible:row.homeworkEligible,...(row.requiresConsent?{requiresConsent:row.requiresConsent}:{})}:{}),...(row.requiresSeparateReview?{requiresSeparateReview:true}:{})}
  if(event?.status==='skipped_by_client')return {...base,status:'skipped_by_client',source:'client_selected_skip'}
  if(event?.status==='not_explored')return {...base,source:'client_selected_open'}
  if(event?.status!=='confirmed')return base
  const b=event.binding
  const rating=clarityRatingDefinition(row.id)?clarityRatingForQuestion(row.id,event.quote,turns[b.questionTurnIndex].content):null
  return {...base,status:'confirmed',quote:event.quote,turnIndex:event.turnIndex,source:'client_reviewed_quote',...(rating?{current:rating.current,desired:rating.desired}:{}),
   question:turns[b.questionTurnIndex].content,questionTurnIndex:b.questionTurnIndex,...(turns[event.turnIndex]?.coachId?{coachId:turns[event.turnIndex].coachId,visitId:turns[event.turnIndex].visitId}:{}),
   ...(b.decision?{methodDecision:b.decision}:b.review?{reviewDecision:b.review}:{confirmationTurnIndex:b.confirmationTurnIndex,confirmationQuote:turns[b.confirmationTurnIndex].content})}
 })
}

// A server-issued expanded gate must read back its exact plan and review version.
export function coachExpandedGateReadbackMatches(courseSessionId,locale,turns,step){
 if(!step||!Array.isArray(turns))return false
 const version=step.scenarioVersion||null
 if(version!==THEMATIC_EXPANDED_VERSION)return coachReviewScenarioVersion(step.review)!==THEMATIC_EXPANDED_VERSION
 if(thematicScenarioVersion(courseSessionId)!==version)return false
 try{
  const review=normalizeCoachCourseFieldReview(step.review,courseSessionId,turns)
  const schema=coachCourseProtocolSchema(courseSessionId,locale,{scenarioVersion:version})
  if(!schema||review?.version!==THEMATIC_EXPANDED_REVIEW_VERSION||coachReviewScenarioVersion(review)!==version||step.total!==schema.checkpoints.length||!Number.isInteger(step.acceptedCount)||step.acceptedCount<0||step.acceptedCount>step.total)return false
  const latest=new Map(review.events.map(e=>[e.fieldId,e]))
  if([...latest.values()].filter(e=>e.status==='confirmed'||e.status==='skipped_by_client').length!==step.acceptedCount)return false
  const q=step.prompt
  if(q!==null){
   if(step.paused||step.completed||!schema.checkpoints.some(f=>f.id===q?.fieldId)||!Number.isInteger(q.turnIndex)||q.turnIndex!==turns.length-1||turns[q.turnIndex]?.role!=='assistant'||turns[q.turnIndex].content!==q.text)return false
  }else if(!step.paused&&(!step.completed||step.acceptedCount!==step.total))return false
  return true
 }catch{return false}
}
export function coachCourseProtocolRows(courseSessionId,turns=[],review=null,locale='en',{scenarioVersion=coachReviewScenarioVersion(review)}={}){
 const expanded=scenarioVersion!==null&&scenarioVersion===thematicScenarioVersion(courseSessionId)
 if(scenarioVersion!==null&&!expanded)return clarityDayOneProtocolRows(courseSessionId,turns,review,locale,scenarioVersion)
 const schema=coachCourseProtocolSchema(courseSessionId,locale,{scenarioVersion})
 if(!schema)return []
 const normalized=normalizeCoachCourseFieldReview(review,courseSessionId,turns)
 if(normalized&&coachReviewScenarioVersion(normalized)!==scenarioVersion)invalid()
 const legacy=expanded?[]:coachCourseProtocolSchema(courseSessionId,locale,{includeLegacy:true}).checkpoints.filter(row=>row.archived&&normalized?.events.some(event=>event.fieldId===row.id))
 const checklist=coachInformationChecklist(turns)
 return [...schema.checkpoints,...legacy].map(row=>{
   const eligible=coachCourseFieldReviewQuotes(courseSessionId,row.id,turns)
   const selected=normalized?.events.findLast(event=>event.fieldId===row.id)
   const base={id:row.id,label:row.label,question:row.question,status:'not_explored',quote:'',turnIndex:null,questionTurnIndex:null,source:null,revision:selected?.revision??null,...(row.progressStage?{progressStage:row.progressStage}:{}),...(expanded?{scenarioVersion}:{}),...(row.archived?{archived:true}:{})}
   if(selected?.status==='confirmed')return {...base,status:'confirmed',quote:selected.quote,turnIndex:selected.turnIndex,source:'client_reviewed_quote',...(clarityRatingDefinition(row.id)?{question:turns[selected.turnIndex-1].content,questionTurnIndex:selected.turnIndex-1}:{}),...(selected.binding?{question:turns[selected.binding.questionTurnIndex].content,questionTurnIndex:selected.binding.questionTurnIndex,confirmationTurnIndex:selected.binding.confirmationTurnIndex,confirmationQuote:turns[selected.binding.confirmationTurnIndex].content}:{})}
   if(selected?.status==='skipped_by_client')return {...base,status:'skipped_by_client',source:'client_selected_skip'}
   if(selected?.status==='not_explored')return {...base,source:'client_selected_open'}
   // Exact visible prompt + adjacent eligible client utterance is useful but
   // cannot prove the Director issued it, it was heard, or the answer is final.
   const exact=eligible.findLast(answer=>{
     const prompt=turns[answer.turnIndex-1]
     return prompt?.role==='assistant'&&prompt.interrupted!==true&&!checkpointAnswerMismatch(row.id,answer.quote)&&langs.some(l=>checkpointQuestionMatches(coachCourseProtocolSchema(courseSessionId,l,{includeLegacy:true,scenarioVersion}).checkpoints.find(x=>x.id===row.id),l,prompt.content.trim()))
   })
   if(exact)return {...base,status:'needs_confirmation',quote:exact.quote,turnIndex:exact.turnIndex,questionTurnIndex:exact.turnIndex-1,source:'visible_prompt_candidate'}
   if(expanded)return base
   const cue=checklist.find(x=>x.key===fallbackKeys[row.id])?.quote
   const lexical=cue?eligible.findLast(answer=>answer.quote.startsWith(cue)):null
   return lexical&&!checkpointAnswerMismatch(row.id,lexical.quote)?{...base,status:'needs_confirmation',quote:lexical.quote,turnIndex:lexical.turnIndex,source:'lexical_candidate'}:base
 })
}
export function coachCourseProtocolOverview(courseSessionId,title,locale='en',turns=[],review=null,{scenarioVersion=coachReviewScenarioVersion(review)}={}){
 const schema=coachCourseProtocolSchema(courseSessionId,locale,{scenarioVersion})
 if(!schema)return ''
 const lang=langs.includes(locale)?locale:'en'
 const copy={
  en:{title:'Session checkpoints',not_explored:'No question-bound answer verified in this record',needs_confirmation:'Needs confirmation · candidate',confirmed:'Client-reviewed quote (not server-issued question proof)',skipped_by_client:'Skipped by client',source:'Client turn'},
  ru:{title:'Контрольные пункты сессии',not_explored:'В этой записи нет проверенного ответа на данный вопрос',needs_confirmation:'Требует уточнения · предварительно',confirmed:'Цитата подтверждена клиентом (не доказательство серверного вопроса)',skipped_by_client:'Пропущено клиентом',source:'Реплика клиента'},
  es:{title:'Puntos de la sesión',not_explored:'No hay una respuesta vinculada a esta pregunta y verificada en el registro',needs_confirmation:'Requiere confirmación · provisional',confirmed:'Cita revisada por el cliente (no prueba de pregunta del servidor)',skipped_by_client:'Omitido por el cliente',source:'Turno del cliente'}
 }[lang]
 return [copy.title+' · '+title,...coachCourseProtocolRows(courseSessionId,turns,review,lang,{scenarioVersion}).map(row=>
  row.label+': '+copy[row.status]+(row.confirmationTurnIndex!=null||row.reviewDecision?' — '+row.question:'')+(row.quote?' — “'+row.quote+'” ('+copy.source+' '+(row.turnIndex+1)+')':''))].join('\n')
}

// This is an application transport boundary, not a statement that the answers are true.
export function coachCourseGateHandoffRequired({enabled,autosave,courseSessionId,locale,opening}={}){
 return Boolean(enabled===true&&autosave===true&&opening?.completed===true&&opening.declined!==true&&
  ['goal','challenge','self_exploration'].includes(opening.answers?.focus?.kind)&&coachCourseProtocolSchema(courseSessionId,locale))
}
