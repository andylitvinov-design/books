/**
 * My Coach session director v1 — pure, server-reviewed per-turn contract.
 *
 * Distinct from the encrypted guided-session state machine: My Coach is a
 * deliberately ephemeral conversation. Client-provided history is context,
 * never authoritative consent or a persisted progress record.
 * No model call, new session store, inference bill or user transcript logging.
 */
import {getCoachPersona,COACH_PERSONA_VERSION} from './persona-registry.mjs'
import {coachDialoguePolicy} from './unified-coach-policy.mjs'
import {analyzeCoachingProtocol} from '../personal-coaching/coaching-session-protocol.mjs'
import {selectNextBestAction,assessStageReadiness} from '../personal-coaching/coaching-methodology.mjs'
import {coachTimeboxState,coachTimeboxPrompt} from './session-timebox.mjs'

export const COACH_SESSION_DIRECTOR_VERSION='hh-coach-session-director-v1'
const methods=Object.freeze({
  'GROW':'grow','TGROW':'tgrow','WOOP':'woop','OSKAR':'oskar',
  'Solution-focused':'solution_focused','Appreciative inquiry':'appreciative_inquiry'
})
const methodSteps=Object.freeze({
  grow:'Goal → Reality → Options → Way forward',
  tgrow:'Topic → Goal → Reality → Options → Way forward',
  woop:'Wish → Outcome → internal Obstacle → client-owned If/Then Plan',
  oskar:'Outcome → Scaling → Know-how → Affirm and action → Review',
  solution_focused:'preferred future → observed exceptions → available strengths → small experiment',
  appreciative_inquiry:'specific positive experience → strengths → possibilities → chosen experiment'
})
const phases=Object.freeze({
  contract:'goal',discovery:'reality',exploration:'reality',
  possibilities:'options',action:'action',review:'review'
})
const moves=Object.freeze({
  contract:'clarify_goal',discovery:'ground_in_example',
  exploration:'explore_primary_barrier',possibilities:'surface_options',
  action:'explore_client_owned_step',review:'confirm_client_summary'
})
const initialAct=Object.freeze({
  greeting:'respond_socially',topic_shift:'recontract',correction:'repair_misunderstanding',
  question_to_coach:'answer_first',clarification_request:'explain_question',
  gratitude:'allow_close',negation:'respect_no',uncertainty:'reduce_scope',
  hesitation:'reduce_scope'
})
const selectedAction=/(?:\b(?:i (?:will|shall|am going to)|i've decided to|i have decided to)\b|(?:я (?:сделаю|начну|попробую|отправлю|выбираю)|я решил(?:а)?\s+(?:сделать|начать))|(?:voy a|he decidido))/iu
const actionNegation=/(?:\b(?:i will not|i won't|i am not going to|not ready to)\b|(?:я не (?:буду|сделаю|готов(?:а)?))|(?:no voy a|no quiero))/iu
const goalIntakePressure=/(?:\b(?:you (?:must|have to|need to) (?:commit|decide|take action)|commit to a (?:deadline|plan)|your first step (?:must|will) be)\b|(?:вы (?:должны|обязаны) (?:решить|действовать|начать)|вам необходимо (?:составить план|назвать срок)|теперь (?:составьте план|зафиксируйте срок))|(?:tienes que (?:decidir|actuar)|debes comprometerte))/iu

export function coachSessionDirective(input={},persona={}){
  const registered=getCoachPersona(persona.personaId)
  if(!registered || !Array.isArray(persona.allowedMethods) ||
    persona.allowedMethods[0]!==registered.methods[0])throw Error('COACHING_BRAIN_INPUT_INVALID')
  const methodId=methods[registered.methods[0]]
  if(!methodId || !methodSteps[methodId])throw Error('COACHING_BRAIN_INPUT_INVALID')
  const policy=coachDialoguePolicy(input)
  const protocol=analyzeCoachingProtocol(input)
  const act=policy.conversationAct
  // Lexical phase is provisional, not an authorization to complete a stage.
  const phase=['greeting','topic_shift'].includes(act)?'contract':protocol.phase
  const stage=phases[phase]||'goal'
  const stageCheck=assessStageReadiness(stage,{})
  const base=selectNextBestAction({stage,message:input.message||'',locale:input.locale||'en'})
  const interventionId=initialAct[act]||
    (policy.noAdvice?'listen_without_advice':policy.questionStreak?'reflect_without_question':
      moves[phase]||base.intervention)
  const latest=String(input.message||'')
  const hasClientAction=selectedAction.test(latest)&&!actionNegation.test(latest)
  const canOfferAction=Boolean(!policy.noAdvice&&
    !['greeting','topic_shift','correction','gratitude'].includes(act)&&
    (phase==='review'||(phase==='action'&&hasClientAction)))
  const settings=persona.settings||{}
  const timebox=coachTimeboxState(input.elapsedSeconds??null)
  return Object.freeze({
    version:COACH_SESSION_DIRECTOR_VERSION,
    personaId:registered.id,personaVersion:COACH_PERSONA_VERSION,
    methodId,methodStepId:methodId+':'+phase,
    methodShape:methodSteps[methodId],methodLocked:true,
    phase,stage,interventionId,conversationAct:act,
    canOfferAction,allowQuestion:policy.allowQuestion,timebox,
    readiness:Object.freeze({ready:stageCheck.ready,missing:[...stageCheck.missing]}),
    style:Object.freeze({
      warmth:settings.warmth||registered.defaults.warmth,
      directness:settings.directness||registered.defaults.directness,
      pace:settings.pace||registered.defaults.pace,
      depth:settings.depth||registered.defaults.depth
    })
  })
}

/** A strict one-turn *method* contract; not a fixed script or forced timeline. */
export function coachSessionDirectivePrompt(directive){
  return [
    'SERVER-REVIEWED COACHING SESSION CONTRACT version='+directive.version+'.',
    'Persona='+directive.personaId+' / '+directive.personaVersion+
      '. Retain the persona voice, pace, warmth and directness in natural language.',
    'Locked primary method='+directive.methodId+'; sequence='+directive.methodShape+'.',
    'Never silently change the primary method because of a keyword, obstacle or mood.',
    'Current candidate phase='+directive.phase+'; method step='+directive.methodStepId+
      '; one permitted intervention='+directive.interventionId+'.',
    'Respond to the client first. Express ONLY the selected intervention in the chosen persona voice; do not run a questionnaire.',
    coachTimeboxPrompt(directive.timebox),
    'The readiness gate is NOT a completed stage: '+directive.readiness.missing.join(', ')+
      '. Do not claim confirmation, progress or a commitment from keywords, elapsed time or an assistant question.',
    'A client may correct, redirect, decline, pause or stop. Those wishes outrank method sequence. Never force an action plan.',
    directive.canOfferAction?'An optional client-authored next step may be reflected, never invented or marked accepted.':
      'Do NOT suggest a plan, deadline, exercise or commitment. Ask at most one current-stage question if useful.',
    'Return the existing three-string JSON schema. No controller metadata or private analysis in user-facing text.'
  ].join(' ')
}

/** Keep the original validated text; fail closed on an obvious forced intake/plan. */
export function enforceCoachSessionDirective(reply,directive){
  if(!directive || reply?.mode!=='ai')return reply
  if(['contract','discovery'].includes(directive.phase) &&
    goalIntakePressure.test(String(reply.message||'')))
      throw Error('COACHING_BRAIN_RESPONSE_INVALID')
  if(!directive.canOfferAction && (reply.planSuggestion||reply.evidenceQuote))
    return {...reply,planSuggestion:'',evidenceQuote:''}
  return reply
}
