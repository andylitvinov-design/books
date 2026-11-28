// First-party server-issued thematic form, not audio-delivery proof.
// Only the existing authenticated draft store calls this transition.
import {createCoachProtocolGate,coachProtocolGateNext,transitionCoachProtocolGate,protocolAnswerClass,coachMethodConsentDecision} from './coach-protocol-validation-gate.mjs'
import {coachCourseProtocolSchema,coachCourseProtocolRows,normalizeCoachCourseFieldReview,clarityDayOneReviewPrompt,COACH_COURSE_FIELD_REVIEW_VERSION} from './coach-course-protocol-schema.mjs'
import {recoverPrivateOpeningScope} from '../personal-coaching/private-draft-resume.mjs'
import {coachingBrainSafety,coachingBrainBoundary} from '../personal-coaching/coaching-brain.mjs'
import {coachProtocolCanAppend} from '../personal-coaching/protocol-capture.mjs'
import {checkpointClarification,checkpointConfirmation,checkpointLiveAnswerMismatch} from './coach-course-question-binding.mjs'
import {clarityScenarioVersion,clarityReviewVersionForScenario,clarityScenarioGateFields} from './clarity-course-scenarios.mjs'
import {thematicScenarioVersion,THEMATIC_EXPANDED_REVIEW_VERSION} from './session-blueprint.mjs'
import {PUBLIC_COACH_PERSONA_IDS} from './persona-registry.mjs'
import {coachCourseHandoffEligible} from './coach-course-continuity.mjs'
import {clarityCourseDay} from './clarity-course.mjs'
const invalid=()=>{throw Error('COACH_COURSE_GATE_INVALID')}
const common=['action','id','revision','consent','requestId']
const shapes=Object.freeze({'course-gate-start':common,'course-gate-answer':[...common,'promptId','content'],'course-gate-correct':[...common,'fieldId'],'course-gate-continue':[...common,'coachId','resumeConfirmed']})
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
export function coachCourseGateRequest(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!Object.hasOwn(shapes,input.action)||
    shapes[input.action].some(k=>!Object.hasOwn(input,k))||
    Object.keys(input).some(k=>!shapes[input.action].includes(k)&&!(['course-gate-answer','course-gate-correct'].includes(input.action)&&k==='coachId'))||
    (input.coachId!==undefined&&!PUBLIC_COACH_PERSONA_IDS.includes(input.coachId))||
    (input.action==='course-gate-continue'&&input.resumeConfirmed!==true)||
    !uuid.test(input.id||'')||!uuid.test(input.requestId||'')||input.consent!==true||
    !Number.isInteger(input.revision)||input.revision<1||input.revision>=9999)invalid()
 if(input.action==='course-gate-answer'&&(typeof input.promptId!=='string'||input.promptId.length>120||
    typeof input.content!=='string'||input.content!==input.content.trim()||!input.content||input.content.length>900||
    protocolAnswerClass(input.content)==='invalid'))invalid()
 if(input.action==='course-gate-correct'&&(typeof input.fieldId!=='string'||input.fieldId.length>100))invalid()
 return input
}
// Recap is computed from acknowledged rows only, inside the owner-scoped
// draft. No LLM call, provider replay, new session ID or timing claim.
export function coachCourseResumeRecap(value){
 const state=value?.courseGate,p=value?.protocol
 if(!p||!coachCourseHandoffEligible(p.courseSessionId,state))return null
 const copy=({en:['Previously confirmed','No verified answers yet.','Next unresolved question','Continue this same coaching session?','Additional verified answers are retained.'],
 ru:['Ранее подтверждено','Проверенных ответов пока нет.','Следующий незавершённый вопрос','Продолжим эту же коучинговую сессию?','Остальные проверенные ответы сохранены.'],
 es:['Confirmado anteriormente','Todavía no hay respuestas verificadas.','Siguiente pregunta pendiente','¿Continuamos esta misma sesión?','Se conservan las demás respuestas verificadas.']})[p.locale]||['Previously confirmed','No verified answers yet.','Next unresolved question','Continue this same coaching session?','Additional verified answers are retained.']
 const rows=coachCourseProtocolRows(p.courseSessionId,p.turns,state.review,p.locale,{scenarioVersion:state.scenarioVersion||null})
 // Prefer the most recently acknowledged answers, including later corrections.
 const confirmed=rows.filter(r=>r.status==='confirmed'&&r.quote).sort((a,b)=>(a.revision??a.turnIndex??0)-(b.revision??b.turnIndex??0))
 const pendingId=state.prompt?.fieldId||coachProtocolGateNext(state.gate)?.fieldId
 const pending=rows.find(r=>r.id===pendingId)
 const pendingText=pending?(state.prompt?.fieldId===pending.id&&state.prompt.text?state.prompt.text:pending.question):''
 return [confirmed.length?copy[0]+': '+confirmed.slice(-4).map(r=>r.label.slice(0,65)+': '+r.quote.slice(0,95)).join('; ')+'.':copy[1],
  confirmed.length>4?copy[4]:'',pending?copy[2]+': '+pending.label.slice(0,120)+(pendingText?' — '+pendingText.slice(0,180):'')+'.':'',copy[3]].filter(Boolean).join(' ')
}
export function coachCourseGateView(value){
 const state=value?.courseGate
 if(!state)return null
 return {prompt:state.prompt,review:state.review,paused:state.paused===true,...(state.scenarioVersion?{scenarioVersion:state.scenarioVersion}:{}),...(coachCourseHandoffEligible(value.courseSessionId,state)||state.activeCoachId?{activeCoachId:state.activeCoachId||value.protocol.personaId,resumeText:coachCourseResumeRecap(value),crossCoach:coachCourseHandoffEligible(value.courseSessionId,state)}:{}),
  completed:!state.prompt&&!state.paused&&!coachProtocolGateNext(state.gate),
  acceptedCount:Object.keys(state.gate.accepted).length,total:state.gate.fields.length}
}
const copies={
 en:{clarify:label=>'Could you clarify what you want recorded for “'+label+'”?',echo:(label,quote)=>'For “'+label+'”, I have recorded provisionally: “'+quote+'”. Is that what you want recorded?',done:'The selected checkpoints have been reviewed. You may correct an answer or finish.'},
 ru:{clarify:label=>'Что именно вы хотите зафиксировать по теме «'+label+'»?',echo:(label,quote)=>'По теме «'+label+'» я предварительно записал: «'+quote+'». Это верно?',done:'Ответы по этим пунктам проверены. Можно уточнить ответ или завершить сессию.'},
 es:{clarify:label=>'¿Qué quieres registrar exactamente sobre «'+label+'»?',echo:(label,quote)=>'Sobre «'+label+'», anoté provisionalmente: «'+quote+'». ¿Es correcto?',done:'Se han revisado estos puntos. Puedes corregir una respuesta o terminar.'}
}
// The storage adapter computes this on a locked row. It must persist the
// returned gate, review and transcript atomically BEFORE returning the prompt.
// The internal save receipt uses the transaction's next revision, not a caller ACK.
export function coachCourseGateTransition(value,input,serverNow){
 coachCourseGateRequest(input)
 const old=value?.protocol
 if(!old||old.id!==input.id||value.revision!==input.revision||
    old.courseSessionId!==value.courseSessionId||value.profileDirectorV3||old.lifeBalanceCheckin||old.meaningAxesCheckin)invalid()
 const scenarioVersion=value.courseGate?.scenarioVersion||(input.action==='course-gate-start'?(clarityScenarioVersion(value.courseSessionId)||thematicScenarioVersion(value.courseSessionId)):null)
 const clarityVersioned=Boolean(scenarioVersion&&scenarioVersion===clarityScenarioVersion(value.courseSessionId))
 const reviewVersion=clarityVersioned?clarityReviewVersionForScenario(value.courseSessionId,scenarioVersion):scenarioVersion?THEMATIC_EXPANDED_REVIEW_VERSION:COACH_COURSE_FIELD_REVIEW_VERSION
 const schema=coachCourseProtocolSchema(value.courseSessionId,old.locale,{scenarioVersion})
 if(!schema||!Array.isArray(old.turns)||!old.turns.length)invalid()
 const copy=copies[old.locale];if(!copy)invalid()
 let state=value.courseGate?JSON.parse(JSON.stringify(value.courseGate)):null
 if(input.action==='course-gate-start'){
  if(state||old.opening?.completed!==true||old.opening?.declined===true||
     !['goal','challenge','self_exploration'].includes(old.opening?.focus)||!recoverPrivateOpeningScope(old).matched)invalid()
  state={gate:createCoachProtocolGate({sessionId:old.id,courseSessionId:value.courseSessionId,
    fields:clarityVersioned?clarityScenarioGateFields(value.courseSessionId):schema.checkpoints.map(f=>({id:f.id,kind:'text'}))}),prompt:null,review:scenarioVersion?{version:reviewVersion,courseSessionId:value.courseSessionId,events:[]}:null,paused:false,...(scenarioVersion?{scenarioVersion}:{})}
 }else if(!state||state.paused||state.gate.sessionId!==old.id||state.gate.courseSessionId!==value.courseSessionId)invalid()
 const handoff=coachCourseHandoffEligible(value.courseSessionId,state)
 if(input.action==='course-gate-continue'&&!handoff)invalid()
 if(handoff){
  state.activeCoachId??=value.privateCoachId||old.personaId
  state.visitId??=input.requestId
  if(!PUBLIC_COACH_PERSONA_IDS.includes(state.activeCoachId))invalid()
  if(input.action!=='course-gate-continue'&&((input.coachId!==undefined&&input.coachId!==state.activeCoachId)||(state.hasContinued&&input.coachId!==state.activeCoachId)))invalid()
 }else if(input.coachId!==undefined)invalid()
 const turns=old.turns.map(t=>({...t}))
 const apply=(type,fieldId,extra={})=>{
  const g=state.gate
  state.gate=transitionCoachProtocolGate(g,{id:'e:'+String(g.revision+1),type,fieldId,sessionId:old.id,
    courseSessionId:value.courseSessionId,coachId:state.activeCoachId||old.personaId,expectedRevision:g.revision,...extra})
 }
 const add=(role,content,mode)=>{
  const row={role,content,...(role==='assistant'?{mode:mode||'offline'}:{}),
   ...(handoff&&clarityCourseDay(value.courseSessionId)?{coachId:state.activeCoachId,visitId:state.visitId,...(role==='assistant'?{authorPersonaId:state.activeCoachId}:{})}:
     handoff&&role==='assistant'?{coachId:state.activeCoachId}:{})}
  if(!coachProtocolCanAppend(turns,[row]))invalid()
  turns.push(row);return turns.length-1
 }
 const setPrompt=(fieldId,kind,text)=>{
  const p=state.gate.pending
  const id='prompt:'+String(state.gate.revision)+':'+String(turns.length)
  const turnIndex=add('assistant',text)
  state.prompt={id,fieldId,kind,questionId:p.questionId,text,turnIndex}
 }
 const issue=()=>{
  const target=coachProtocolGateNext(state.gate)
  if(!target){state.prompt=null;add('assistant',copy.done);return}
  if(!['issue','clarify'].includes(target.phase))invalid()
  const row=coachCourseProtocolSchema(value.courseSessionId,old.locale,{includeLegacy:true,scenarioVersion}).checkpoints.find(x=>x.id===target.fieldId);if(!row)invalid()
  const questionId='q:'+String(state.gate.revision+1)
  apply('issue',row.id,{questionId})
  const reviewField=state.gate.fields.find(f=>f.id===row.id)?.kind==='review'
  const text=reviewField?clarityDayOneReviewPrompt(row.id,coachCourseProtocolRows(value.courseSessionId,turns,state.review,old.locale),old.locale,target.phase==='clarify',value.courseSessionId):
   target.phase==='clarify'?checkpointClarification(row,old.locale):row.question
  if(!text)invalid()
  setPrompt(row.id,'answer',text)
 }
 const review=(fieldId,status,quote='',turnIndex=null,binding=null)=>{
  const events=state.review?.events||[]
  state.review=normalizeCoachCourseFieldReview({version:reviewVersion,
    courseSessionId:value.courseSessionId,events:[...events,{fieldId,status,quote,turnIndex,revision:events.length+1,...(binding?{binding}:{})}]},value.courseSessionId,turns)
 }
 const accept=()=>{
  const p=state.gate.pending
  if(!p||p.phase!=='awaiting_save')invalid()
  const c=p.candidate
  if(c.status==='confirmed'){
   const index=Number(c.sourceId.slice(2))
   if(!Number.isInteger(index)||turns[index]?.role!=='user'||turns[index].content!==c.quote)invalid()
   if(c.method==='explicit_method_consent'&&scenarioVersion)review(p.fieldId,'confirmed',c.quote,index,{questionTurnIndex:index-1,decision:c.value})
   else if(c.method==='explicit_review_acceptance'&&scenarioVersion)review(p.fieldId,'confirmed',c.quote,index,{questionTurnIndex:index-1,review:'accepted'})
   else{
   const confirmationTurnIndex=Number(c.confirmationId?.slice(2))
   if(!Number.isInteger(confirmationTurnIndex)||confirmationTurnIndex!==index+2)invalid()
   review(p.fieldId,'confirmed',c.quote,index,{questionTurnIndex:index-1,confirmationTurnIndex})
   }
  }else review(p.fieldId,'skipped_by_client')
  apply('save_ack',p.fieldId,{questionId:p.questionId,receipt:c.receipt,durableRevision:value.revision+1})
  issue()
 }
 if(input.action==='course-gate-start')issue()
 else if(input.action==='course-gate-continue'){
  const recap=coachCourseResumeRecap(value)
  if(!recap)invalid()
  state.activeCoachId=input.coachId;state.visitId=input.requestId;state.hasContinued=true
  add('assistant',recap)
  add('user',({en:'Yes, continue this session.',ru:'Да, продолжим эту сессию.',es:'Sí, continuemos esta sesión.'})[old.locale])
  if(state.gate.pending)apply('continue_pending',state.gate.pending.fieldId,{explicitContinuation:true})
  issue()
 }else if(input.action==='course-gate-correct'){
  if(!Object.hasOwn(state.gate.accepted,input.fieldId))invalid()
  const previous=Object.keys(state.gate.accepted)
  apply('reopen',input.fieldId,{turnId:'correction:'+String(state.gate.revision+1),explicitCorrection:true})
  // Reverse order invalidates dependent reviews before their source fields.
  for(const id of previous.reverse())if(id!==input.fieldId&&!Object.hasOwn(state.gate.accepted,id))review(id,'not_explored')
  review(input.fieldId,'not_explored');issue()
 }else{
  const prompt=state.prompt,p=state.gate.pending
  if(!prompt||!p||prompt.id!==input.promptId||prompt.questionId!==p.questionId||
     prompt.fieldId!==p.fieldId||turns[prompt.turnIndex]?.role!=='assistant'||
     turns[prompt.turnIndex].content!==prompt.text||prompt.turnIndex!==turns.length-1)invalid()
  const content=input.content
  const guardInput={locale:old.locale,message:content,turns}
  const safety=coachingBrainSafety(guardInput),boundary=coachingBrainBoundary(guardInput)
  const turnId='t:'+String(add('user',content))
  const methodDecision=scenarioVersion&&state.gate.fields.find(f=>f.id===p.fieldId)?.kind==='consent'&&prompt.kind==='answer'?coachMethodConsentDecision(content):null
  const reviewResponse=scenarioVersion&&state.gate.fields.find(f=>f.id===p.fieldId)?.kind==='review'&&['affirm','deny','skip'].includes(protocolAnswerClass(content))
  if(safety||boundary?.boundary==='stop'||(boundary&&protocolAnswerClass(content)!=='skip'&&!methodDecision&&!reviewResponse)){
   const guard=safety||boundary
   add('assistant',[guard.reflection,guard.question].filter(Boolean).join(' '),guard.mode)
   state.prompt=null;state.paused=true
  }else{
   // A first-party form submission to the displayed, server-issued prompt
   // establishes typed delivery. Never accept a browser-provided delivery flag.
   const deliveryId='display:'+String(prompt.turnIndex)
   if(prompt.kind==='answer'){
    apply('delivery',p.fieldId,{questionId:p.questionId,deliveryId,final:true})
    apply('answer',p.fieldId,{questionId:p.questionId,deliveryId,turnId,text:content,final:true,relevance:checkpointLiveAnswerMismatch(p.fieldId,content,prompt.text)?'mismatch':'unverified'})
   }else if(prompt.kind==='confirm'){
    apply('echo_delivery',p.fieldId,{questionId:p.questionId,deliveryId,quote:p.candidate.quote,final:true})
    apply('confirmation',p.fieldId,{questionId:p.questionId,deliveryId,turnId,text:content,final:true,relevance:checkpointLiveAnswerMismatch(p.fieldId,p.candidate.quote,turns[prompt.turnIndex-2]?.content)?'mismatch':'unverified'})
   }else invalid()
   const pending=state.gate.pending
   if(pending.phase==='awaiting_save')accept()
   else if(pending.phase==='awaiting_echo'){
    const row=schema.checkpoints.find(x=>x.id===pending.fieldId)
    setPrompt(row.id,'confirm',checkpointConfirmation(turns[prompt.turnIndex].content,pending.candidate.quote,old.locale))
   }else if(pending.phase==='clarify')issue()
   else invalid()
  }
 }
 state.lastRequest=JSON.stringify(input)
 return {courseGate:state,protocol:{...old,turnLayout:'chronological',completedAt:serverNow,turns}}
}
export function coachCourseGateRetry(value,input){
 return Boolean(value?.courseGate&&value.revision===input.revision+1&&value.courseGate.lastRequest===JSON.stringify(input))
}
export function coachCourseGateArchiveMatches(value,protocol){
 if(!value?.courseGate)return true
 return value.protocol.turns.length===protocol.turns.length&&
  JSON.stringify(value.courseGate.review||null)===JSON.stringify(protocol.courseFieldReview||null)
}
