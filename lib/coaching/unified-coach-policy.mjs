/**
 * Pure shared Coach Mind policy: no provider, personal storage, account access or inference.
 * The calling channel remains responsible for safety, consent, rate limiting and authorization.
 */
import {mindRoleInstruction} from '../holistic-support/mind-role-router.mjs'
import {understandCoachingTurn} from '../personal-coaching/coaching-turn-understanding.mjs'
import {analyzeCoachingProtocol} from '../personal-coaching/coaching-session-protocol.mjs'
export const UNIFIED_COACH_POLICY_VERSION='hh-unified-coach-policy-v1'
const norm=v=>typeof v==='string'?v.toLowerCase().normalize('NFKC')
  .replace(/ё/g,'е').replace(/[^\p{L}\p{N}\s]/gu,' ').replace(/\s+/gu,' ').trim():''
const lastQuestion=v=>{
  const hits=[...(typeof v==='string'?v:'').matchAll(/(?:^|[.!。\n])\s*([^?？.!。\n]{5,250}[?？])/gu)]
  return hits.length?hits.at(-1)[1].trim():''
}
const tokens=v=>new Set(norm(v).split(' ').filter(x=>x.length>2))
// An explicit client "no advice" boundary remains active for this ephemeral
// conversation until a LATER explicit client invitation to give advice.
// History consists only of consented user turns; assistant words cannot revoke it.
const noAdviceRequest=/(?:\b(?:no advice|without advice|don't advise me|do not give advice|don't suggest exercises|(?:don't|do not)\s+(?:give\s+me|offer(?:\s+me)?)\s+advice)\b|без советов|не дава(?:й|йте)(?:\s+мне)?\s+совет|не советуй(?:те)?|не предлагай упражнения|sin consejos|no me aconsejes|no quiero consejos|no me des consejos)/iu
const inviteAdvice=/(?:\b(?:give me advice|i want advice|please advise(?: me)?|what do you recommend)\b|(?:дай(?:те)? (?:мне )?совет|можно совет|что (?:ты|вы) совету(?:ете|ешь))|(?:dame un consejo|quiero consejos|puedes aconsejarme))/iu
function clientAdviceBoundary(input) {
  const previous=Array.isArray(input.turns)?input.turns
    .filter(row=>row?.role==='user'&&typeof row.content==='string')
    .map(row=>row.content):[]
  let noAdvice=false
  for(const words of [...previous,String(input.message||'')]){
    // Ambiguous turns containing both requests remain no-advice.
    if(noAdviceRequest.test(words))noAdvice=true
    else if(inviteAdvice.test(words))noAdvice=false
  }
  return noAdvice
}

const similar=(a,b)=>{
  const x=norm(a),y=norm(b)
  if(!x||!y)return false
  if(x===y)return true
  const xs=tokens(x),ys=tokens(y)
  if(xs.size<2||ys.size<2)return false
  const common=[...xs].filter(t=>ys.has(t)).length
  return common>=2&&common/(xs.size+ys.size-common)>=.78
}
export function repeatedCoachQuestion(text,turns=[]){
  const q=lastQuestion(text)
  return Boolean(q)&&(Array.isArray(turns)?turns:[]).filter(t=>t?.role==='assistant')
    .slice(-4).some(t=>similar(q,lastQuestion(t.content)))
}
export function coachDialoguePolicy(input={}){
  const locale=['ru','en','es'].includes(input.locale)?input.locale:'en'
  const understanding=understandCoachingTurn(input)
  const phase=analyzeCoachingProtocol(input).phase
  const a=(Array.isArray(input.turns)?input.turns:[])
    .filter(t=>t?.role==='assistant'&&typeof t.content==='string').slice(-2)
  const questionStreak=a.length===2&&a.every(t=>Boolean(lastQuestion(t.content)))
  const act=understanding.act
  const noAdvice=clientAdviceBoundary(input)
  const nextMove=act==='greeting'?'respond_socially':
    act==='correction'?'accept_correction':
    act==='topic_shift'?'reset_topic':
    act==='question_to_coach'?'answer_first':
    act==='clarification_request'?'explain_previous_question':
    act==='gratitude'?'close_gently':
    act==='negation'?'respect_no':
    act==='uncertainty'||act==='hesitation'?'reduce_scope':
    act==='option_reference'?'confirm_option_context':
    act==='affirmation'?'acknowledge_without_commitment':
    noAdvice?'listen_without_advice':
    phase==='review'?'summarize_confirmed':
    phase==='action'?'invite_client_owned_step':'reflect_then_explore'
  return Object.freeze({version:UNIFIED_COACH_POLICY_VERSION,role:'coach',
    locale,conversationAct:act,phase,nextMove,noAdvice,questionStreak,
    allowQuestion:!questionStreak&&act!=='gratitude',
    reasonCode:understanding.needsClarification?'short_reply_without_context':
      questionStreak?'question_streak':act==='correction'?'current_correction_wins':'client_evidence_only'})
}
const unsupportedGreetingProbe=/(?:\b(?:measure (?:the |your )?(?:result|success|progress|outcome)|measurable outcome|desired outcome|define your goals?|what (?:is|are) your goals?|what would (?:success|a successful outcome) look like|how (?:would|will) you (?:measure|know)|what are your constraints)\b|(?:измерит|оценит)[^.!?]{0,85}(?:результат|успех|прогресс|эффективност)|(?:результат|успех)[^.!?]{0,50}(?:измерит|оценит)|(?:желаемый результат|какова ваша цель|какая у вас цель|какую цель хотите|по чему вы сможете измерить|каковы ограничения)|(?:objetivo medible|resultado deseado|medir (?:el |tu )?(?:resultado|exito|progreso)|cu[aá]l es tu objetivo|cu[aá]les son tus objetivos))/iu
// This is an output validation gate, not a psychological assessment.
export function prematureGoalProbe(reply,input={}){
  return coachDialoguePolicy(input).conversationAct==='greeting'&&unsupportedGreetingProbe.test(reply||'')
}
export function sharedCoachMindInstruction(locale){
  return locale==='ru'||locale==='en'?mindRoleInstruction('coach',locale):''
}
export function coachDialogueGuidance(p){
  return ['Unified Holistic Intelligence Coach Mind, not a separate model; channel authorization is unchanged.',
    'Latest client act='+p.conversationAct+'; evidence-led phase='+p.phase+
      '; next move='+p.nextMove+'; reason='+p.reasonCode+'.',
    'Current client correction or new topic supersedes earlier assumptions. Answer direct questions first.',
    'Bare yes/no is not an agreement or authorization. Never fabricate diagnoses, insights or plans.',
    p.conversationAct==='greeting'?'Greeting only: respond socially, never with measurable outcomes, success metrics, constraints, goal intake or coaching pressure. Do not fabricate human experiences. No question is required.':'',
    p.noAdvice?'Client requested no advice: listen without suggestions or sales.':'',
    p.questionStreak?'Two consecutive coach turns already asked questions: do NOT ask a third.':'',
    COACH_FORWARD_DIALOGUE_RULE,
    'At most one new, non-repeated question; often zero. Partial outcomes are valid.']
    .filter(Boolean).join(' ')
}
export const COACH_FORWARD_DIALOGUE_RULE='FORWARD DIALOGUE INVARIANT: ordinary fatigue, sadness, anxiety, a brief answer, hesitation, gratitude, silence or unclear transcription do not mean the client wants to end. Never offer a break, pause, stop, postponement, ending or return later on your own, including in a choice or an empathetic response. Reflect the actual words and ask one relevant authorized question; if unclear, ask what was meant. Do not ask repeated questions or force consent. Honor an explicit client request to pause, stop, skip or decline immediately, actual safety needs and authorized session completion. A quiet moment or a pause in speech is not an offer to suspend the session.'
// High-confidence unsolicited session-exit offers only; not a general safety classifier.
export function unsolicitedCoachExitOffer(text){
 return /(?:\b(?:we (?:can|could|may) (?:take a break|pause|stop here|end (?:the|this) session|continue another day|come back later)|(?:would you like|do you want|would you prefer) to (?:pause|stop here|take a break|end (?:the|this) session)|continue or (?:pause|stop|take a break))\b|(?:мож(?:но|ем|ете)\s+(?:сделать паузу|остановиться|прерваться|закончить сессию|отложить (?:разговор|сессию)|вернуться (?:к (?:этому|разговору) )?позже)|(?:хотите|предпочитаете)\s+(?:сделать паузу|остановиться|прервать сессию)|продолжить или[^.!?]{0,55}(?:сделать паузу|остановиться|прерваться))|\b(?:podemos (?:pausar|hacer una pausa|terminar la sesi[oó]n|dejarlo para (?:m[aá]s tarde|otro d[ií]a))|(?:prefieres|quieres) (?:pausar|hacer una pausa|terminar la sesi[oó]n)|continuar o (?:pausar|hacer una pausa))\b)/iu.test(String(text||''))
}
const reflection={en:'I am listening to what matters to you.',
  ru:'Я внимательно слушаю то, что для вас важно.',
  es:'Escucho con atención lo que te importa.'}
const alternatives={
  en:['Which detail would be most useful to clarify?', 'What part of this matters most to you?', 'What would you like to understand about this?'],
  ru:['Какую деталь было бы полезно прояснить?', 'Какая часть ситуации для вас сейчас важнее всего?', 'Что вам хотелось бы понять в этой ситуации?'],
  es:['¿Qué detalle ayudaría a aclararlo?', '¿Qué parte de esto te importa más ahora?', '¿Qué te gustaría comprender de esta situación?']
}
export function nonRepeatingOfflineCoachText(input,question,p=coachDialoguePolicy(input)){
  if(!p.allowQuestion)return reflection[p.locale]
  if(!unsolicitedCoachExitOffer(question)&&!repeatedCoachQuestion(question,input.turns))return question
  return alternatives[p.locale].find(q=>!repeatedCoachQuestion(q,input.turns))||reflection[p.locale]
}
