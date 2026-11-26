// First-party server-issued thematic form, not audio-delivery proof.
// Only the existing authenticated draft store calls this transition.
import {createCoachProtocolGate,coachProtocolGateNext,transitionCoachProtocolGate,protocolAnswerClass} from './coach-protocol-validation-gate.mjs'
import {coachCourseProtocolSchema,normalizeCoachCourseFieldReview,COACH_COURSE_FIELD_REVIEW_VERSION} from './coach-course-protocol-schema.mjs'
import {recoverPrivateOpeningScope} from '../personal-coaching/private-draft-resume.mjs'
import {coachingBrainSafety,coachingBrainBoundary} from '../personal-coaching/coaching-brain.mjs'
import {coachProtocolCanAppend} from '../personal-coaching/protocol-capture.mjs'
import {checkpointClarification,checkpointConfirmation,checkpointLiveAnswerMismatch} from './coach-course-question-binding.mjs'
const invalid=()=>{throw Error('COACH_COURSE_GATE_INVALID')}
const common=['action','id','revision','consent','requestId']
const shapes=Object.freeze({'course-gate-start':common,'course-gate-answer':[...common,'promptId','content'],'course-gate-correct':[...common,'fieldId']})
const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
export function coachCourseGateRequest(input){
 if(!input||typeof input!=='object'||Array.isArray(input)||!Object.hasOwn(shapes,input.action)||
    Object.keys(input).length!==shapes[input.action].length||shapes[input.action].some(k=>!Object.hasOwn(input,k))||
    !uuid.test(input.id||'')||!uuid.test(input.requestId||'')||input.consent!==true||
    !Number.isInteger(input.revision)||input.revision<1||input.revision>=9999)invalid()
 if(input.action==='course-gate-answer'&&(typeof input.promptId!=='string'||input.promptId.length>120||
    typeof input.content!=='string'||input.content!==input.content.trim()||!input.content||input.content.length>900||
    protocolAnswerClass(input.content)==='invalid'))invalid()
 if(input.action==='course-gate-correct'&&(typeof input.fieldId!=='string'||input.fieldId.length>100))invalid()
 return input
}
export function coachCourseGateView(value){
 const state=value?.courseGate
 if(!state)return null
 return {prompt:state.prompt,review:state.review,paused:state.paused===true,
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
 const schema=coachCourseProtocolSchema(value.courseSessionId,old.locale)
 if(!schema||!Array.isArray(old.turns)||!old.turns.length)invalid()
 const copy=copies[old.locale];if(!copy)invalid()
 let state=value.courseGate?JSON.parse(JSON.stringify(value.courseGate)):null
 if(input.action==='course-gate-start'){
  if(state||old.opening?.completed!==true||old.opening?.declined===true||
     !['goal','challenge','self_exploration'].includes(old.opening?.focus)||!recoverPrivateOpeningScope(old).matched)invalid()
  state={gate:createCoachProtocolGate({sessionId:old.id,courseSessionId:value.courseSessionId,
    fields:schema.checkpoints.map(f=>({id:f.id,kind:'text'}))}),prompt:null,review:null,paused:false}
 }else if(!state||state.paused||state.gate.sessionId!==old.id||state.gate.courseSessionId!==value.courseSessionId)invalid()
 const turns=old.turns.map(t=>({...t}))
 const apply=(type,fieldId,extra={})=>{
  const g=state.gate
  state.gate=transitionCoachProtocolGate(g,{id:'e:'+String(g.revision+1),type,fieldId,sessionId:old.id,
    courseSessionId:value.courseSessionId,coachId:old.personaId,expectedRevision:g.revision,...extra})
 }
 const add=(role,content,mode)=>{
  const row={role,content,...(role==='assistant'?{mode:mode||'offline'}:{})}
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
  const row=coachCourseProtocolSchema(value.courseSessionId,old.locale,{includeLegacy:true}).checkpoints.find(x=>x.id===target.fieldId);if(!row)invalid()
  const questionId='q:'+String(state.gate.revision+1)
  apply('issue',row.id,{questionId})
  setPrompt(row.id,'answer',target.phase==='clarify'?checkpointClarification(row,old.locale):row.question)
 }
 const review=(fieldId,status,quote='',turnIndex=null,binding=null)=>{
  const events=state.review?.events||[]
  state.review=normalizeCoachCourseFieldReview({version:COACH_COURSE_FIELD_REVIEW_VERSION,
    courseSessionId:value.courseSessionId,events:[...events,{fieldId,status,quote,turnIndex,revision:events.length+1,...(binding?{binding}:{})}]},value.courseSessionId,turns)
 }
 const accept=()=>{
  const p=state.gate.pending
  if(!p||p.phase!=='awaiting_save')invalid()
  const c=p.candidate
  if(c.status==='confirmed'){
   const index=Number(c.sourceId.slice(2))
   if(!Number.isInteger(index)||turns[index]?.role!=='user'||turns[index].content!==c.quote)invalid()
   const confirmationTurnIndex=Number(c.confirmationId?.slice(2))
   if(!Number.isInteger(confirmationTurnIndex)||confirmationTurnIndex!==index+2)invalid()
   review(p.fieldId,'confirmed',c.quote,index,{questionTurnIndex:index-1,confirmationTurnIndex})
  }else review(p.fieldId,'skipped_by_client')
  apply('save_ack',p.fieldId,{questionId:p.questionId,receipt:c.receipt,durableRevision:value.revision+1})
  issue()
 }
 if(input.action==='course-gate-start')issue()
 else if(input.action==='course-gate-correct'){
  if(!Object.hasOwn(state.gate.accepted,input.fieldId))invalid()
  apply('reopen',input.fieldId,{turnId:'correction:'+String(state.gate.revision+1),explicitCorrection:true})
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
  if(safety||boundary?.boundary==='stop'||(boundary&&protocolAnswerClass(content)!=='skip')){
   const guard=safety||boundary
   add('assistant',[guard.reflection,guard.question].filter(Boolean).join(' '),guard.mode)
   state.prompt=null;state.paused=true
  }else{
   // A first-party form submission to the displayed, server-issued prompt
   // establishes typed delivery. Never accept a browser-provided delivery flag.
   const deliveryId='display:'+String(prompt.turnIndex)
   if(prompt.kind==='answer'){
    apply('delivery',p.fieldId,{questionId:p.questionId,deliveryId,final:true})
    apply('answer',p.fieldId,{questionId:p.questionId,deliveryId,turnId,text:content,final:true,relevance:checkpointLiveAnswerMismatch(p.fieldId,content)?'mismatch':'unverified'})
   }else if(prompt.kind==='confirm'){
    apply('echo_delivery',p.fieldId,{questionId:p.questionId,deliveryId,quote:p.candidate.quote,final:true})
    apply('confirmation',p.fieldId,{questionId:p.questionId,deliveryId,turnId,text:content,final:true,relevance:checkpointLiveAnswerMismatch(p.fieldId,p.candidate.quote)?'mismatch':'unverified'})
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
