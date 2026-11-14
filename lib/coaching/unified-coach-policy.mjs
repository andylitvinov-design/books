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
  const noAdvice=/(?:\b(?:no advice|without advice|don't advise me|do not give advice)\b|без советов|не дава(?:й|йте) совет|не советуй|sin consejos|no me aconsejes)/iu.test(input.message||'')
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
    'At most one new, non-repeated question; often zero. Partial outcomes are valid.']
    .filter(Boolean).join(' ')
}
const pause={en:'No need to answer another question now. We can pause or leave this open.',
  ru:'Сейчас необязательно отвечать на ещё один вопрос. Можно сделать паузу или оставить тему открытой.',
  es:'No tienes que responder otra pregunta ahora. Podemos pausar o dejarlo abierto.'}
const alternatives={
  en:['Which detail would be most useful to clarify?', 'What part of this matters most to you?', 'Would you prefer to pause or explore one small part?'],
  ru:['Какую деталь было бы полезно прояснить?', 'Какая часть ситуации для вас сейчас важнее всего?', 'Хотите сделать паузу или посмотреть на одну небольшую часть?'],
  es:['¿Qué detalle ayudaría a aclararlo?', '¿Qué parte de esto te importa más ahora?', '¿Prefieres pausar o mirar una parte pequeña?']
}
export function nonRepeatingOfflineCoachText(input,question,p=coachDialoguePolicy(input)){
  if(!p.allowQuestion)return pause[p.locale]
  if(!repeatedCoachQuestion(question,input.turns))return question
  return alternatives[p.locale].find(q=>!repeatedCoachQuestion(q,input.turns))||pause[p.locale]
}
