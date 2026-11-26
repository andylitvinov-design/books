// Protocol Validation Gate — deterministic server-side reducer; no model calls.
// A trusted transport/storage adapter must establish delivery, final input and
// durable ACK. This module alone is not a persistence or provider integration.
import {coachProtocolEvidenceVeto} from './coach-protocol-relevance.mjs'
export function protocolAnswerClass(value){
 if(typeof value!=='string'||!value.trim()||value.length>1200)return 'invalid'
 const s=value.trim().normalize('NFKC').replace(/\s+/gu,' ').replace(/[.!¡]+$/gu,'').trim()
 if(/^(?:skip(?: this question)?|i (?:prefer not to|don't want to) answer|пропустим(?: этот вопрос)?|пропустить(?: вопрос)?|не хочу отвечать|не буду отвечать|omitir(?: la pregunta)?|prefiero no responder|no quiero responder)$/iu.test(s))return 'skip'
 if(/^(?:yes|yes,? (?:correct|exactly|that's right)|correct|exactly|that's right|да|да,? (?:верно|правильно|точно|всё верно)|верно|правильно|точно|sí|sí,? (?:correcto|exacto|así es)|correcto|exacto|así es)$/iu.test(s))return 'affirm'
 if(/^(?:no|no,? (?:that's wrong|incorrect)|нет|нет,? (?:неверно|не так|неправильно)|неверно|не так|no,? (?:incorrecto|no es así))$/iu.test(s))return 'deny'
 if(/[?¿？]/u.test(s)||/^(?:repeat|say (?:it |that )?again|i (?:didn't|can't) hear|пожалуйста повторите|повтори(?:те)?|не расслышал[аи]?|не слышно|ещ[её] раз|otra vez|rep(?:ite|ita)|no (?:oí|escuché))(?:$|[\s,:])/iu.test(s))return 'control'
 if(/^(?:maybe|i (?:do not|don't) know|not sure|perhaps|okay|ok|sure|возможно|может быть|не знаю|не уверен[а]?|наверное|хорошо|ага|ну да|quizás|tal vez|no sé|no estoy segur[oa]|vale)(?:$|[\s,:])/iu.test(s)||/^(?:yes|да|sí|no|нет)\s*[,—-]?\s+(?:but|но|pero)\b/iu.test(s)||/^(?:да|нет)\s*[,—-]?\s+но(?:\s|$)/iu.test(s))return 'ambiguous'
 if(/^[“«"„]/u.test(s)||/^(?:he|she|they|my \w+)\s+(?:said|says|told me)|^(?:он|она|они|моя мама|мой друг)\s+(?:сказал[аи]?|говорит)|^(?:él|ella|ellos|mi \w+)\s+(?:dijo|dice)/iu.test(s))return 'ambiguous'
 if(/(?:sk-or-v1-|github_pat_|-----BEGIN .+ PRIVATE KEY-----|Bearer\s+[A-Za-z0-9._-]{24,})/iu.test(s))return 'invalid'
 if(coachProtocolEvidenceVeto(value))return 'control'
 return 'candidate'
}

function validGateId(value){return typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9_.:-]{0,119}$/u.test(value)}

function gateError(){throw Error('COACH_PROTOCOL_GATE_INVALID')}

export function createCoachProtocolGate({sessionId,courseSessionId,fields}){
 if(!validGateId(sessionId)||!validGateId(courseSessionId)||!Array.isArray(fields)||!fields.length||fields.length>64)gateError()
 const definitions=fields.map(f=>{
  if(!f||!validGateId(f.id)||!['text','rating','choice'].includes(f.kind))gateError()
  if(f.kind==='rating'&&(!Number.isInteger(f.min)||!Number.isInteger(f.max)||f.min>f.max||f.min<0||f.max>100))gateError()
  if(f.kind==='choice'&&(!Array.isArray(f.options)||!f.options.length||f.options.length>20||f.options.some(v=>typeof v!=='string'||!v.trim()||v.length>100)||new Set(f.options).size!==f.options.length))gateError()
  return {id:f.id,kind:f.kind,...(f.kind==='rating'?{min:f.min,max:f.max}:f.kind==='choice'?{options:[...f.options]}:{})}
 })
 if(new Set(definitions.map(f=>f.id)).size!==definitions.length)gateError()
 return {version:'hh-coach-protocol-gate-v1',sessionId,courseSessionId,fields:definitions,revision:0,pending:null,accepted:{},history:[],lastEvent:null}
}

export function coachProtocolGateNext(state){
 if(state.pending)return {fieldId:state.pending.fieldId,phase:state.pending.phase}
 const field=state.fields.find(f=>!Object.hasOwn(state.accepted,f.id))
 return field?{fieldId:field.id,phase:'issue'}:null
}

export function transitionCoachProtocolGate(state,event){
 // INTERNAL SERVER ADAPTER CONTRACT ONLY: never pass untrusted browser/model
 // event objects, history, delivery claims, or ACKs straight into this reducer.
 if(!state||state.version!=='hh-coach-protocol-gate-v1'||!event||event.sessionId!==state.sessionId||event.courseSessionId!==state.courseSessionId||!validGateId(event.id)||!validGateId(event.coachId))gateError()
 const serialized=JSON.stringify(event)
 if(state.lastEvent?.id===event.id){if(state.lastEvent.serialized!==serialized)gateError();return state}
 if(event.expectedRevision!==state.revision||state.history.some(e=>e.id===event.id)||state.history.length>=2048)gateError()
 const next=JSON.parse(JSON.stringify(state)),p=next.pending
 const field=next.fields.find(f=>f.id===event.fieldId)
 if(!field)gateError()
 const requirePending=(phase)=>{if(!p||p.fieldId!==field.id||p.questionId!==event.questionId||p.phase!==phase)gateError()}
 const toSave=(status,method,quote,value,sourceId,confirmationId=null)=>{next.pending={...p,phase:'awaiting_save',candidate:{status,method,quote,value,sourceId,confirmationId,coachId:event.coachId,receipt:event.id}}}
 switch(event.type){
  case 'issue':{
   const target=coachProtocolGateNext(next)
   if(!target||target.fieldId!==field.id||!['issue','clarify'].includes(target.phase)||!validGateId(event.questionId)||next.history.some(e=>e.type==='issue'&&e.questionId===event.questionId))gateError()
   next.pending={fieldId:field.id,questionId:event.questionId,phase:'awaiting_delivery',coachId:event.coachId}
   break
  }
  case 'delivery':{
   requirePending('awaiting_delivery')
   if(event.final!==true||event.interrupted===true){next.pending={...p,phase:'clarify'};break}
   if(!validGateId(event.deliveryId))gateError()
   next.pending={...p,phase:'awaiting_answer',deliveryId:event.deliveryId};break
  }
  case 'answer':{
   requirePending('awaiting_answer')
   if(event.deliveryId!==p.deliveryId||event.final!==true||!validGateId(event.turnId)||next.history.some(e=>e.turnId===event.turnId))gateError()
   const kind=protocolAnswerClass(event.text)
   if(kind==='skip'){toSave('skipped_by_client','explicit_skip',event.text.trim(),null,event.turnId);break}
   if(kind!=='candidate'){next.pending={...p,phase:'clarify'};break}
   const quote=event.text.trim()
   if(field.kind==='rating'){
    if(!/^(?:0|[1-9]\d{0,2})$/u.test(quote)||Number(quote)<field.min||Number(quote)>field.max){next.pending={...p,phase:'clarify'};break}
    toSave('confirmed','automatic_format',quote,Number(quote),event.turnId);break
   }
   if(field.kind==='choice'){
    const option=field.options.find(v=>v===quote)
    if(option===undefined){next.pending={...p,phase:'clarify'};break}
    toSave('confirmed','automatic_format',quote,option,event.turnId);break
   }
   // An explicit field-bound typed form action can be accepted as a literal
   // self-report. Free speech, ASR and narrative extraction require an echo.
   if(event.explicitFieldEntry===true){toSave('confirmed','explicit_field_entry',quote,quote,event.turnId);break}
   next.pending={...p,phase:'awaiting_echo',candidate:{quote,sourceId:event.turnId,coachId:event.coachId}};break
  }
  case 'echo_delivery':{
   requirePending('awaiting_echo')
   if(event.final!==true||event.interrupted===true||event.quote!==p.candidate.quote){next.pending={...p,phase:'awaiting_echo'};break}
   if(!validGateId(event.deliveryId)||event.deliveryId===p.deliveryId)gateError()
   next.pending={...p,phase:'awaiting_confirmation',echoDeliveryId:event.deliveryId};break
  }
  case 'confirmation':{
   requirePending('awaiting_confirmation')
   if(event.deliveryId!==p.echoDeliveryId||event.final!==true||!validGateId(event.turnId)||next.history.some(e=>e.turnId===event.turnId))gateError()
   const kind=protocolAnswerClass(event.text)
   if(kind==='affirm'){toSave('confirmed','explicit_verbal_confirmation',p.candidate.quote,p.candidate.quote,p.candidate.sourceId,event.turnId);break}
   if(kind==='skip'){toSave('skipped_by_client','explicit_skip',event.text.trim(),null,event.turnId);break}
   // A denial, correction, compound yes/no, uncertainty or irrelevant speech
   // never confirms the candidate. Ask again on the same field, not the next.
   next.pending={...p,phase:'clarify',candidate:null};break
  }
  case 'save_ack':{
   requirePending('awaiting_save')
   if(event.receipt!==p.candidate.receipt||!Number.isInteger(event.durableRevision)||event.durableRevision<1)gateError()
   const last=next.history.filter(e=>e.type==='save_ack').at(-1)
   if(last&&event.durableRevision<=last.durableRevision)gateError()
   next.accepted[field.id]={...p.candidate,fieldId:field.id,questionId:p.questionId,durableRevision:event.durableRevision,ackId:event.id}
   next.pending=null;break
  }
  case 'reopen':{
   // An explicitly client-requested correction revokes the active projection
   // immediately; prior accepted evidence remains in append-only history.
   if(!Object.hasOwn(next.accepted,field.id)||!validGateId(event.turnId)||event.explicitCorrection!==true||p?.phase==='awaiting_save'||next.history.some(e=>e.turnId===event.turnId))gateError()
   delete next.accepted[field.id];next.pending=null;break
  }
  default:gateError()
 }
 next.revision++
 next.history.push({...event,serialized:undefined})
 next.lastEvent={id:event.id,serialized}
 return next
}

export function courseAnswerVerificationAdvisory(kind){
 if(kind==='skip')return ' Client explicitly requests a skip; respect it. No invented answer; keep status open until the application acknowledges the skip.'
 if(kind==='candidate')return ' Check the current field against the actual client words; reflect only the possible answer and ask one specific confirmation if uncertain. Do not jump to the next checkpoint or claim a save.'
 return ' The current field has no clear answer yet. Respect the client request, then clarify this same field only if appropriate; do not mark it confirmed or advance.'
}
