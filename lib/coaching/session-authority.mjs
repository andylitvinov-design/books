/**
 * Server-owned, short-lived My Coach session anchor.
 * Authenticated HttpOnly encrypted cookie; NO transcript or personal statement
 * is retained. Each client turn contributes only allowlisted boolean milestones.
 * A stateless cookie is not a cross-device/session DB and cannot defeat a
 * deliberate replay by someone controlling the browser's cookie jar.
 */
import {randomBytes,createCipheriv,createDecipheriv,hkdfSync} from 'node:crypto'
import {coachConfirmedEvidence} from './director-evidence.mjs'
import {methodSignals} from './method-protocol-v4.mjs'
import {resolveCoachMethodId} from './persona-registry.mjs'
import {verifyCoachSemanticHint} from './semantic-evidence.mjs'
import {understandCoachingTurn} from '../personal-coaching/coaching-turn-understanding.mjs'

export const COACH_SESSION_COOKIE='hh-my-coach-session-v1'
export const COACH_SESSION_AUTHORITY_VERSION='hh-my-coach-server-session-v1'
export const COACH_SESSION_TTL_SECONDS=7200
const flags=Object.freeze([
  'goalRestated','goalConfirmed','keyFactsCaptured','constraintsReviewed',
  'optionsExplored','clientActionApproved','timingSpecified','feasibilityChecked',
  'summaryReviewed','workingFocusEstablished','topicNamed','desiredOutcome',
  'internalObstacle','clientScale','existingStrength','pastException',
  'positiveExperience','ifThenPlan'
])
const clearEvidence=()=>Object.fromEntries(flags.map(key=>[key,false]))
const adviceBlocked=/(?:\b(?:no advice|without advice|don't advise me|do not give advice|don't suggest exercises)\b|без советов|не дава(?:й|йте) совет|не советуй|не предлагай упражнения|sin consejos|no me aconsejes|no quiero consejos)/iu
const adviceInvited=/(?:\b(?:give me advice|i want advice|please advise(?: me)?|what do you recommend)\b|(?:дай(?:те)? (?:мне )?совет|можно совет|что (?:ты|вы) совету(?:ете|ешь))|(?:dame un consejo|quiero consejos|puedes aconsejarme))/iu
const affirmativeAction=/(?:\b(?:i will|i'll|i have decided to|i'm going to)\b|(?:я (?:сделаю|начну|попробую|выбираю)|я решил(?:а)? (?:начать|сделать))|(?:voy a|he decidido))/iu
const negatedChoice=/(?:\b(?:i will not|i won't|not ready|maybe|perhaps|i am not going to)\b|(?:я не (?:буду|готов|сделаю|начну)|может быть|пока не готов)|(?:no voy a|no quiero|quizás|tal vez))/iu
const standAloneTime=/^(?:tomorrow|next week|on monday|on friday|this weekend|завтра|в понедельник|в пятницу|на следующей неделе|сегодня вечером|mañana|el lunes|el viernes|la próxima semana)[.!?\s]*$/iu
const standAloneFeasible=/^(?:i can do this|it is realistic|this feels doable|это реально|мне по силам|это выполнимо|я могу это сделать|es realista|lo puedo hacer|es viable)[.!?\s]*$/iu
const continueIntent=/^(?:let'?s continue|i (?:want to|would like to) continue|please continue|давай(?:те)? продолжим|хочу продолжить|продолжим|можем продолжить|sigamos|quiero continuar|vamos a continuar)[.!?\s]*$/iu
const deferClosingActs=new Set([
 'question_to_coach','correction','topic_shift','negation','gratitude','clarification_request'
])
const deferClosingBoundary=/(?:\b(?:stop|pause|end the session|kill myself|suicid|self[- ]?harm|want to die)\b|(?:останови|пауза|хочу закончить|не хочу продолжать|покончить с собой|суицид|хочу умереть)|(?:quiero terminar|necesito una pausa|suicidio|quiero morir|hacerme da[nñ]o))/iu

function secret(config){
  if(!Buffer.isBuffer(config?.encryptionKey)||config.encryptionKey.length!==32)
    throw Error('COACH_SESSION_CONFIG_INVALID')
  return Buffer.from(hkdfSync('sha256',config.encryptionKey,
    Buffer.from('hh-coach-cookie-v1'),Buffer.from('session-state-aes-gcm'),32))
}
const aad=actor=>{
  if(typeof actor?.id!=='string'||typeof actor?.claims?.session_id!=='string')
    throw Error('COACH_SESSION_ACCOUNT_INVALID')
  return Buffer.from(actor.id+'|'+actor.claims.session_id)
}
export function newCoachSession(actor,personaId,now=Date.now(),requestedMethodId=null){
  aad(actor)
  const methodId=resolveCoachMethodId(personaId,requestedMethodId)
  if(!methodId)throw Error('COACH_SESSION_INPUT_INVALID')
  if(!/^[a-z][a-z_]{1,28}$/u.test(String(personaId||''))||
    !Number.isSafeInteger(now)||now<0)throw Error('COACH_SESSION_INPUT_INVALID')
  return Object.freeze({
    v:1,personaId,methodId,startedAt:now,turnCount:0,episode:0,
    closeOffered:false,noAdvice:false,evidence:clearEvidence(),
    nonce:randomBytes(12).toString('base64url')
  })
}
function validState(s,personaId,now){
  return Boolean(s&&s.v===1&&s.personaId===personaId&&
    resolveCoachMethodId(personaId,s.methodId)===s.methodId&&
    /^[A-Za-z0-9_-]{16}$/u.test(s.nonce||'')&&
    Number.isSafeInteger(s.startedAt)&&s.startedAt<=now&&
    now-s.startedAt<=COACH_SESSION_TTL_SECONDS*1000&&
    Number.isSafeInteger(s.turnCount)&&s.turnCount>=0&&s.turnCount<=120&&
    Number.isSafeInteger(s.episode)&&s.episode>=0&&s.episode<=12&&
    typeof s.closeOffered==='boolean'&&typeof s.noAdvice==='boolean'&&
    s.evidence&&typeof s.evidence==='object'&&!Array.isArray(s.evidence)&&
    Object.keys(s.evidence).length===flags.length&&
    flags.every(key=>typeof s.evidence[key]==='boolean'))
}
/** Bind an opaque cookie to the verified Supabase auth session, not client JSON. */
export function sealCoachSession(state,config,actor){
  if(!validState(state,state?.personaId,Date.now()))throw Error('COACH_SESSION_INPUT_INVALID')
  const iv=randomBytes(12)
  const cipher=createCipheriv('aes-256-gcm',secret(config),iv)
  cipher.setAAD(aad(actor))
  const payload=Buffer.concat([cipher.update(JSON.stringify(state),'utf8'),cipher.final()])
  return [iv.toString('base64url'),payload.toString('base64url'),
    cipher.getAuthTag().toString('base64url')].join('.')
}
/** Invalid/expired/wrong-account cookies never become authoritative evidence. */
export function openCoachSession(token,config,actor,personaId,now=Date.now()){
  if(!token)return null
  if(typeof token!=='string'||token.length>4096||
    !/^[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]{20,3900}\.[A-Za-z0-9_-]{22}$/u.test(token))return null
  try{
    const [iv,data,tag]=token.split('.').map(v=>Buffer.from(v,'base64url'))
    if(iv.length!==12||tag.length!==16)return null
    const decipher=createDecipheriv('aes-256-gcm',secret(config),iv)
    decipher.setAAD(aad(actor));decipher.setAuthTag(tag)
    const decoded=Buffer.concat([decipher.update(data),decipher.final()])
    if(decoded.length>2400)return null
    const state=JSON.parse(decoded.toString('utf8'))
    return validState(state,personaId,now)?Object.freeze(state):null
  }catch{return null}
}
/**
 * Incremental evidence derives from the LATEST message actually received by
 * the server; caller-supplied turns and AI utterances can never set a milestone.
 */

// A verified same-call LLM semantic hint may contribute ONE soft user signal
// to the server-owned flags, but can never approve action, consent or review.
// The verbatim quote is checked against the LATEST server-received message;
// neither the quote nor the transcript is saved in the encrypted cookie.
const softKindToFlag=Object.freeze({
  goal_focus:'goalRestated',desired_outcome:'desiredOutcome',
  concrete_example:'keyFactsCaptured',constraint:'constraintsReviewed',
  internal_obstacle:'internalObstacle',past_exception:'pastException',
  existing_strength:'existingStrength',positive_experience:'positiveExperience'
})
export function recordCoachSemanticEvidence(state,message,candidate,now=Date.now()){
  if(!validState(state,state?.personaId,now))throw Error('COACH_SESSION_INPUT_INVALID')
  const act=understandCoachingTurn({message,locale:'en'}).act
  if(['correction','topic_shift'].includes(act))return state
  const hint=verifyCoachSemanticHint(candidate,message)
  const field=hint&&softKindToFlag[hint.kind]
  if(!field)return state
  const evidence={...state.evidence,[field]:true}
  if(hint.kind==='concrete_example'&&state.evidence.goalRestated)
    evidence.workingFocusEstablished=true
  return Object.freeze({...state,evidence:Object.freeze(evidence)})
}

export function advanceCoachSession(state,{message='',locale='en'}={},now=Date.now()){
  if(!validState(state,state?.personaId,now))throw Error('COACH_SESSION_INPUT_INVALID')
  if(typeof message!=='string'||message.length>1600||!['ru','en','es'].includes(locale))
    throw Error('COACH_SESSION_INPUT_INVALID')
  const act=understandCoachingTurn({message,locale}).act
  const prior=(act==='topic_shift'||act==='correction')?clearEvidence():state.evidence
  const shared=coachConfirmedEvidence({message,locale,turns:[]})
  const current=methodSignals({message,locale,turns:[]},shared)
  let episode=state.episode,startedAt=state.startedAt,turnCount=state.turnCount,
    closeOffered=state.closeOffered,noAdvice=state.noAdvice
  const oldElapsed=Math.floor((now-startedAt)/1000)
  if(oldElapsed>=1200&&continueIntent.test(message)&&episode<12){
    episode+=1;startedAt=now;turnCount=0;closeOffered=false
  }
  const base=(startedAt===now&&episode!==state.episode)?clearEvidence():prior
  const evidence=clearEvidence()
  for(const key of flags)evidence[key]=base[key]===true||current[key]===true
  const affirmative=affirmativeAction.test(message)&&!negatedChoice.test(message)
  evidence.clientActionApproved=Boolean(base.clientActionApproved||
    (affirmative&&(base.optionsExplored||current.optionsExplored)))
  evidence.timingSpecified=Boolean(base.timingSpecified||current.timingSpecified||
    (base.clientActionApproved&&standAloneTime.test(message)))
  evidence.feasibilityChecked=Boolean(base.feasibilityChecked||current.feasibilityChecked||
    (base.clientActionApproved&&standAloneFeasible.test(message)))
  evidence.workingFocusEstablished=Boolean(base.workingFocusEstablished||
    current.workingFocusEstablished||current.goalConfirmed||
    (base.goalRestated&&current.keyFactsCaptured))
  if(adviceBlocked.test(message))noAdvice=true
  else if(adviceInvited.test(message))noAdvice=false
  const elapsedSeconds=Math.min(COACH_SESSION_TTL_SECONDS,Math.floor((now-startedAt)/1000))
  // Priority turns (direct questions, refusals, safety and corrections) must
  // not consume the *single* 20-minute closing invitation before it is spoken.
  const closingOfferDue=elapsedSeconds>=1200&&!closeOffered&&
    !deferClosingActs.has(act)&&!deferClosingBoundary.test(message)
  if(closingOfferDue)closeOffered=true
  return Object.freeze({
    session:Object.freeze({
      ...state,startedAt,episode,turnCount:Math.min(120,turnCount+1),
      closeOffered,noAdvice,evidence:Object.freeze(evidence)
    }),
    elapsedSeconds,closingOfferDue,
    authoritativeEvidence:Object.freeze(evidence),authoritativeNoAdvice:noAdvice
  })
}
