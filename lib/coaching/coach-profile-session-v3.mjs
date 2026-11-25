/**
 * Shared deterministic profile-track reducer for the existing Coaching Director.
 *
 * This is NOT a second coach, model, database, consent mechanism or autonomous
 * writer. The authenticated server must supply its own issued-question ledger,
 * reviewed baseline and finalized client transcript. Never deserialize a
 * browser-supplied state as authoritative. No provider call or I/O here.
 */
import {OUTER_VECTOR_ITEMS,INNER_VECTOR_ITEMS} from '../profile/development-vectors.mjs'
import {coachProfileScorePair} from './coach-profile-intake.mjs'
import {coachProfileSingleScore} from './coach-profile-review.mjs'
import {coachProtocolControlUtterance} from './coach-protocol-relevance.mjs'

export const COACH_PROFILE_SESSION_V3='hh-coach-profile-session-v3'
export const MEANING_AXES_COACH_SESSION_ID='meaning_axes_inner_growth'
export const INTRODUCTORY_PROFILE_SESSION_ID='introductory'
const tracks=Object.freeze({
 [INTRODUCTORY_PROFILE_SESSION_ID]:Object.freeze({track:'outer',items:OUTER_VECTOR_ITEMS}),
 [MEANING_AXES_COACH_SESSION_ID]:Object.freeze({track:'inner',items:INNER_VECTOR_ITEMS}),
})
const idPattern=/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu
const turnIdPattern=/^[a-z0-9][a-z0-9._:-]{0,95}$/iu
const score=v=>Number.isInteger(v)&&v>=0&&v<=10
const language=v=>['ru','en','es'].includes(v)?v:'en'
const words=(en,ru,es)=>({en,ru,es})
const allowedBaselineSources=new Set(['client_reviewed_dialogue','owner_saved_profile'])
const clean=v=>typeof v==='string'?v.trim():''
const timestamp=v=>typeof v==='string'&&/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d/.test(v)&&Number.isFinite(Date.parse(v))?new Date(v).toISOString():null
const invalid=()=>{throw Error('COACH_PROFILE_SESSION_INVALID')}
const clone=v=>JSON.parse(JSON.stringify(v))
const fresh=()=>({value:null,status:'not_explored',source:null})
const freezeDeep=v=>{
 if(v&&typeof v==='object'){Object.values(v).forEach(freezeDeep);Object.freeze(v)}
 return v
}
export function coachProfileTrackForCourse(courseSessionId){
 return Object.hasOwn(tracks,courseSessionId)?tracks[courseSessionId].track:null
}
export function createCoachProfileSessionV3({sessionId,courseSessionId,locale='en',approvedBaseline=[]}={}){
 if(typeof sessionId!=='string'||!idPattern.test(sessionId)||!coachProfileTrackForCourse(courseSessionId)||
   !Array.isArray(approvedBaseline)||approvedBaseline.length>8)invalid()
 const definition=tracks[courseSessionId]
 const rows=Object.fromEntries(definition.items.map(axis=>[axis.id,{current:fresh(),desired:fresh()}]))
 const seen=new Set()
 // The caller has already verified owner + explicit private profile access.
 // Baseline values retain their historical provenance; never invent a new quote.
 for(const row of approvedBaseline){
  if(!row||!Object.hasOwn(rows,row.axis)||seen.has(row.axis))invalid()
  seen.add(row.axis)
  for(const slot of ['current','desired']){
   const value=row[slot]
   if(value===undefined||value===null)continue
   if(!score(value.value)||!allowedBaselineSources.has(value.source)||
     !timestamp(value.recordedAt))invalid()
   rows[row.axis][slot]={value:value.value,status:'confirmed',
    source:{kind:value.source,recordedAt:timestamp(value.recordedAt)}}
  }
 }
 return freezeDeep({version:COACH_PROFILE_SESSION_V3,sessionId:sessionId.toLowerCase(),
  courseSessionId,track:definition.track,locale:language(locale),revision:0,rows,
  priority:{status:'not_explored',axisIds:[],source:null},priorityPhase:false,correction:null,history:[],
  usedTurnIds:[],closed:false})
}
const openSlot=v=>v.status==='not_explored'||v.status==='needs_confirmation'
const settled=v=>!openSlot(v)
function questionText(state,axis,slot){
 const lang=state.locale,title=axis?.name[lang]||''
 if(slot==='priority'&&state.track==='inner')return words(
  'Which one meaning axis matters most to you now? Name it, or you may skip.',
  'Какая одна ось смысла сейчас для вас наиболее важна? Назовите её или пропустите вопрос.',
  '¿Qué eje de sentido te importa más ahora? Nómbralo u omite la pregunta.'
 )[lang]
 if(slot==='priority')return words(
  'Which one or two of these life areas matter most to you right now? You can name them or skip.',
  'Какая одна или две жизненные сферы сейчас для вас приоритетны? Назовите их или пропустите вопрос.',
  '¿Qué una o dos áreas de tu vida son prioritarias ahora? Puedes nombrarlas u omitir la pregunta.'
 )[lang]
 if(slot==='pair')return words(
  title+': from 0 to 10, where are you now and where would you like to be? You may skip.',
  title+': от 0 до 10, сколько сейчас и сколько хотелось бы? Можно пропустить.',
  title+': del 0 al 10, ¿dónde estás ahora y dónde te gustaría estar? Puedes omitir.'
 )[lang]
 if(slot==='current')return words(
  title+': from 0 to 10, what is your current rating? You may skip.',
  title+': как вы оцениваете эту сферу сейчас, от 0 до 10? Можно пропустить.',
  title+': del 0 al 10, ¿cuál es tu valoración actual? Puedes omitir.'
 )[lang]
 return words(
  title+': what rating would you like, from 0 to 10? You may skip.',
  title+': какой оценки от 0 до 10 вам хотелось бы? Можно пропустить.',
  title+': del 0 al 10, ¿qué valoración desearías? Puedes omitir.'
 )[lang]
}
/** Exactly one question. IDs are tied to the logical session + current revision. */
export function coachProfileQuestionV3(state){
 if(state.closed)return null
 const definition=tracks[state.courseSessionId]
 if(!definition||definition.track!==state.track)invalid()
 let axis=null,slot=null
 if(state.correction){
  axis=definition.items.find(x=>x.id===state.correction.axis)
  slot=state.correction.slot
 }else if(state.priorityPhase){
  if(openSlot(state.priority))slot='priority'
  else if(state.track==='outer'){
   axis=definition.items.find(x=>state.priority.axisIds.includes(x.id)&&openSlot(state.rows[x.id].desired))
   if(axis)slot='desired'
  }
 }else if(state.track==='outer'){
  axis=definition.items.find(x=>openSlot(state.rows[x.id].current))
  if(axis)slot='current'
  else if(openSlot(state.priority))slot='priority'
  else{
   axis=definition.items.find(x=>state.priority.axisIds.includes(x.id)&&openSlot(state.rows[x.id].desired))
   if(axis)slot='desired'
  }
 }else{
  axis=definition.items.find(x=>openSlot(state.rows[x.id].current)||openSlot(state.rows[x.id].desired))
  if(axis){
   const r=state.rows[axis.id]
   slot=openSlot(r.current)&&openSlot(r.desired)?'pair':openSlot(r.current)?'current':'desired'
  }else if(openSlot(state.priority))slot='priority'
 }
 if(!slot)return null
 return freezeDeep({id:state.sessionId+':'+state.track+':'+(axis?.id||'priority')+':'+slot+':'+state.revision,
  sessionId:state.sessionId,courseSessionId:state.courseSessionId,track:state.track,
  axis:axis?.id||null,slot,revision:state.revision,text:questionText(state,axis,slot)})
}
const explicitSkip=/^(?:skip|pass|rather not say|prefer not to answer|пропустить|пропустим|не хочу отвечать|не буду отвечать|omitir|paso|prefiero no responder)[.!]*$/iu
const uncertain=/^(?:not sure|i don't know|не знаю|затрудняюсь|не уверен[а]?|no sé|no estoy segur[oa])[.!]*$/iu
const questions=/[?？¿]/u
const otherSpeech=/(?:\b(?:he|she|they|my (?:friend|partner))\s+(?:said|says|told me)\b|(?:он|она|они|моя подруга|мой друг)\s+(?:сказал[аи]?|говорит)|\b(?:él|ella|mi amiga|mi amigo)\s+(?:dijo|dice))/iu
const prohibited=value=>!value||questions.test(value)||coachProtocolControlUtterance(value)||
 otherSpeech.test(value)||/^["“«„]/u.test(value)
const presentLabel=/^(?:сейчас|текущая оценка|now|currently|current(?: score)?|ahora|actualmente|actual)\b/iu
const desiredLabel=/^(?:хочу|хотелось бы|желаемая оценка|desired(?: score)?|want|i want|quiero|deseo)\b/iu
// Avoid \b at Cyrillic word ends; accept only a complete labelled token.
function singleForSlot(quote,slot){
 const labelledCurrent=/^(?:сейчас|текущая оценка)(?:\s|:|=)/iu.test(quote)||presentLabel.test(quote)
 const labelledDesired=/^(?:хочу|хотелось бы|желаемая оценка)(?:\s|:|=)/iu.test(quote)||desiredLabel.test(quote)
 if((slot==='current'&&labelledDesired)||(slot==='desired'&&labelledCurrent))return null
 const token=quote.replace(/^(?:текущая оценка|хотелось бы|желаемая оценка|actual|want|i want|deseo)\s*[:=]?\s*/iu,'')
 return coachProfileSingleScore(token)
}
function selectPriorities(quote,items,locale,max){
 // Match complete canonical labels before considering separators. Splitting
 // on "and"/"и"/"y" first corrupts Body and health, Тело и здоровье, etc.
 // Accept at most one unambiguous interpretation of an explicit selection.
 const norm=x=>clean(x).toLowerCase().normalize('NFC').replace(/[.!]+$/u,'').replace(/\s+/gu,' ')
 const value=norm(quote)
 const candidates=items.map(item=>({id:item.id,labels:[...new Set([norm(item.id),norm(item.name[locale])])]}))
 const matches=new Map()
 const add=ids=>matches.set([...ids].sort().join('|'),ids)
 for(const first of candidates){
  for(const label of first.labels){
   if(value===label)add([first.id])
   if(max!==2||!value.startsWith(label))continue
   const rest=value.slice(label.length)
   const separator=rest.match(/^(?:\s*[,;]\s*|\s+(?:and|и|y)\s+)/u)
   if(!separator)continue
   const secondLabel=rest.slice(separator[0].length)
   for(const second of candidates)if(second.id!==first.id&&second.labels.includes(secondLabel))add([first.id,second.id])
  }
 }
 return matches.size===1?[...matches.values()][0]:null
}
function sourceFor(question,turn,quote){
 return {kind:'client_answer',sourceTurnId:turn.id,questionId:question.id,
  quote,recordedAt:timestamp(turn.recordedAt)}
}
function applySlot(state,axis,slot,value,status,source){
 const old=state.rows[axis][slot]
 if(old.status==='confirmed'||old.status==='skipped_by_client'){
  // No loss of the earlier verified value while a correction is uncertain.
  if(status==='needs_confirmation')return
  state.history.push({axis,slot,previous:old,replacedBy:source})
 }
 state.rows[axis][slot]={value,status,source}
}
/**
 * Server reducer only. The supplied question must come from the authenticated
 * Director's own ledger, not a client body. The turn must be a finalized
 * user-authored transcript row linked by that ledger to the issued question.
 * Invalid answers stay in the underlying transcript and do not advance.
 */
export function applyCoachProfileAnswerV3(state,issuedQuestion,turn){
 const question=coachProfileQuestionV3(state)
 if(!question||!issuedQuestion||issuedQuestion.id!==question.id||
   issuedQuestion.sessionId!==question.sessionId||issuedQuestion.courseSessionId!==question.courseSessionId||
   issuedQuestion.track!==question.track||issuedQuestion.axis!==question.axis||
   issuedQuestion.slot!==question.slot||issuedQuestion.revision!==question.revision||
   issuedQuestion.text!==question.text)invalid()
 if(!turn||turn.role!=='user'||turn.final!==true||turn.interim===true||
   typeof turn.id!=='string'||!turnIdPattern.test(turn.id)||turn.questionId!==question.id||
   !timestamp(turn.recordedAt)||typeof turn.content!=='string'||turn.content.length>1200||
   state.usedTurnIds.includes(turn.id)||state.usedTurnIds.length>=160)invalid()
 const next=clone(state),quote=clean(turn.content),source=sourceFor(question,turn,quote)
 next.usedTurnIds.push(turn.id);next.revision++
 const skip=!prohibited(quote)&&explicitSkip.test(quote)
 const valid=!prohibited(quote)&&!uncertain.test(quote)
 if(question.slot==='priority'){
  const chosen=valid&&!skip?selectPriorities(quote,tracks[next.courseSessionId].items,next.locale,next.track==='inner'?1:2):null
  next.priority=chosen?{status:'confirmed',axisIds:chosen,source}:
   skip?{status:'skipped_by_client',axisIds:[],source}:{status:'needs_confirmation',axisIds:[],source}
 }else{
  const slots=question.slot==='pair'?['current','desired']:[question.slot]
  if(skip&&state.correction){
   // Explicitly abandoning a correction keeps the old verified value.
   next.correction=null
  }else if(skip){
   for(const slot of slots)applySlot(next,question.axis,slot,null,'skipped_by_client',source)
   next.correction=null
  }else{
   const pair=valid&&question.slot==='pair'?coachProfileScorePair(quote):null
   const values=question.slot==='pair'?(pair?.kind==='rated'?[pair.current,pair.desired]:[]):valid?[singleForSlot(quote,question.slot)]:[]
   const accepted=values.length===slots.length&&values.every(score)
   if(accepted){
    for(let i=0;i<slots.length;i++)applySlot(next,question.axis,slots[i],values[i],'confirmed',source)
    next.correction=null
   }else if(!state.correction){
    for(const slot of slots)applySlot(next,question.axis,slot,null,'needs_confirmation',source)
   }
  }
 }
 return freezeDeep(next)
}
/** The existing server Director may move from numeric intake to priorities
 * when the agreed phase budget expires, or on the client's explicit request.
 * Never infer scores or mark the unfinished wheel complete. This is a ledger
 * event, not consent, a timer, or an autonomous stage transition.
 */
export function requestCoachProfilePriorityV3(state){
 if(state.closed||state.correction||state.priorityPhase)invalid()
 const next=clone(state);next.priorityPhase=true;next.revision++
 return freezeDeep(next)
}
/** A caller must first authorize a client's explicit correction action.
 * The prior confirmed value is retained until a valid answer is received.
 */
export function requestCoachProfileCorrectionV3(state,axis,slot){
 if(state.closed||!Object.hasOwn(state.rows,axis)||!['current','desired'].includes(slot)||
   state.rows[axis][slot].status!=='confirmed')invalid()
 const next=clone(state);next.correction={axis,slot};next.revision++
 return freezeDeep(next)
}
export function closeCoachProfileSessionV3(state){
 const next=clone(state);next.closed=true;next.correction=null;next.revision++
 return freezeDeep(next)
}
/** A versioned snapshot contains measured values, not a synthetic wheel.
 * Completeness means collected relevant ratings, not a reviewed report.
 * Outer desired values are optional outside the client's chosen priorities.
 */
export function coachProfileSnapshotV3(state){
 const rows=tracks[state.courseSessionId].items.map(({id})=>({
  axis:id,current:state.rows[id].current,desired:state.rows[id].desired
 }))
 const pending=coachProfileQuestionV3({...state,closed:false})
 const collected=rows.every(row=>row.current.status==='confirmed'&&
  (state.track==='inner'?row.desired.status==='confirmed':
   !state.priority.axisIds.includes(row.axis)||row.desired.status==='confirmed'))
 return freezeDeep({version:COACH_PROFILE_SESSION_V3,sessionId:state.sessionId,
  courseSessionId:state.courseSessionId,track:state.track,revision:state.revision,
  status:collected&&!pending?'complete':'partial',closed:state.closed,
  priority:clone(state.priority),ratings:clone(rows),corrections:clone(state.history)})
}
/** Exact server replay of issued-question/turn pairs. A proposed client
 * snapshot is never evidence; use the replay result and compare at save.
 */
export function replayCoachProfileSessionV3(initial,events){
 if(!Array.isArray(events)||events.length>160)invalid()
 let state=initial
 for(const event of events){
  if(event?.kind==='answer')state=applyCoachProfileAnswerV3(state,event.question,event.turn)
  else if(event?.kind==='correction')state=requestCoachProfileCorrectionV3(state,event.axis,event.slot)
  else if(event?.kind==='prioritize')state=requestCoachProfilePriorityV3(state)
  else if(event?.kind==='close')state=closeCoachProfileSessionV3(state)
  else invalid()
 }
 return state
}
