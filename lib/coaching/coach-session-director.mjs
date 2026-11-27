/**
 * My Coach session director v4 — pure, server-reviewed per-turn contract.
 *
 * Distinct from the encrypted guided-session state machine: My Coach is a
 * deliberately ephemeral conversation. Client-provided history is context,
 * never authoritative consent or a persisted progress record.
 * No model call, new session store, inference bill or user transcript logging.
 */
import {getCoachPersona,resolveCoachMethodId,COACH_PERSONA_VERSION} from './persona-registry.mjs'
import {coachDialoguePolicy} from './unified-coach-policy.mjs'
import {analyzeCoachingProtocol} from '../personal-coaching/coaching-session-protocol.mjs'
import {selectCoachMethodStep,approvedMethodQuestion,approvedMethodStatement,vetoMethodStepQuestion,COACH_METHOD_PROTOCOL_VERSION} from './method-protocol-v4.mjs'
import {coachTimeboxState,coachTimeboxPrompt} from './session-timebox.mjs'
import {coachCourseScenarioFirst,COACH_COURSE_SCENARIO_FIRST_INSTRUCTION} from './coach-course-journey.mjs'
import {coachCourseIndependentQuestion} from './coach-course-protocol-schema.mjs'
import {coachOpeningProgress} from './coach-opening-protocol.mjs'
import {coachConfirmedEvidence} from './director-evidence.mjs'
import {selectCoachDialogueVariant} from './coach-dialogue-selector.mjs'
import {coachMethodStagePlan} from './method-protocol-v4.mjs'
import {isShortCoachFragment} from './natural-dialogue-quality.mjs'
import {planEmpathyTurn} from '../holistic-support/empathy-mind.mjs'
import {insertCoachCharacterLine} from './coach-character-signature.mjs'
import {hasCoachSignatureSpeech} from './coach-signature-speech.mjs'
import {coachPersonalityTurn,coachPersonalityTurnGuidance} from './coach-personality-dialogue.mjs'

export const COACH_SESSION_DIRECTOR_VERSION='hh-coach-session-director-v4'
const methodSteps=Object.freeze({
  grow:'Goal → Reality → Options → Way forward',
  tgrow:'Topic → Goal → Reality → Options → Way forward',
  woop:'Wish → Outcome → internal Obstacle → client-owned If/Then Plan',
  oskar:'Outcome → Scaling → Know-how → Affirm and action → Review',
  solution_focused:'preferred future → observed exceptions → available strengths → small experiment',
  appreciative_inquiry:'specific positive experience → strengths → possibilities → chosen experiment'
})
// Method-specific, evidence-ordered stages are provided by method-protocol-v4.
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
  // The chosen method comes from authenticated session state, not browser
  // history, phrases or AI guesses.
  const methodId=input.authoritativeMethodId===undefined
    ?resolveCoachMethodId(registered.id)
    :resolveCoachMethodId(registered.id,input.authoritativeMethodId)
  if(!methodId||!methodSteps[methodId])throw Error('COACHING_BRAIN_INPUT_INVALID')
  const policy=coachDialoguePolicy(input)
  const noAdvice=input.authoritativeEvidence
    ?input.authoritativeNoAdvice===true
    :policy.noAdvice
  // Empathy is phrasing guidance only. The server Director alone authorizes
  // stage, method step, one question, user-approved actions and safety.
  const empathy=planEmpathyTurn({
    message:input?.message,locale:input?.locale,role:'coach',
    history:Array.isArray(input?.turns)?input.turns.slice(-8).map(x=>({role:x?.role,text:x?.content})):[],
    safety:{status:'clear'}
  })
  const protocol=analyzeCoachingProtocol(input)
  const act=policy.conversationAct
  // Lexical phase is provisional, not an authorization to complete a stage.
  const provisionalPhase=['greeting','topic_shift'].includes(act)?'contract':protocol.phase
  const sharedEvidence=input.authoritativeEvidence||coachConfirmedEvidence(input)
  const selected=selectCoachMethodStep(methodId,input,sharedEvidence)
  const evidence=selected.signals
  const stageLimit=selected.stage
  const stage=selected.stage
  const phase=selected.phase
  const readinessMissing=selected.missing
  const supportedStages=selected.supportedSteps
  // Estimated durations are advisory only; client evidence owns progression.
  const stagePlan=coachMethodStagePlan(methodId,selected.stepId)
  const latest=String(input.message||'')
  const hasClientAction=selectedAction.test(latest)&&!actionNegation.test(latest)
  const settings=persona.settings||{}
  const timebox=coachTimeboxState(input.elapsedSeconds??null)
  const scenarioFirst=coachCourseScenarioFirst(input.courseSessionId)
  // Reuse the existing opening reader, only for conversational question
  // selection; this never authorizes a provider, practice, save or clock.
  const courseOpening=scenarioFirst?coachOpeningProgress({turns:[...(Array.isArray(input.openingHistory)?input.openingHistory:(input.turns||[]).filter(t=>t?.role==='user').map(t=>t.content)),latest],locale:input.locale,personaId:registered.id,priorSession:input.openingPrior,allowPrior:input.allowOpeningPrior}):null
  const scenarioActive=Boolean(courseOpening?.completed&&!courseOpening.declined&&!courseOpening.pendingNameCorrection&&['goal','challenge','self_exploration'].includes(courseOpening.answers?.focus?.kind))
  // Client questions/corrections/refusals win. Otherwise the Director picks
  // ONE method-aligned move. At the 18-minute target, it invites a close
  // rather than claiming the session has been completed.
  const priority=initialAct[act]
  const interventionId=priority||
    (noAdvice?'listen_without_advice':policy.questionStreak?'reflect_without_question':
      timebox.offerWrapUp?'invite_reflective_close':selected.interventionId)
  const personality=coachPersonalityTurn({personaId:registered.id,settings:{...registered.defaults,...settings},stage,interventionId,empathy,noAdvice,timebox,locale:input.locale,recentTurns:input.turns,sessionSignature:true,characterSeenIds:input.characterSeenIds,storyWelcome:/(?:мне нравятся притчи|люблю притчи|i like (?:short )?parables|i enjoy (?:short )?stories|me gustan las parábolas)/iu.test(latest)})
  const clientOwnedAction=methodId==='woop'
    ?evidence.ifThenPlan&&hasClientAction
    :evidence.clientActionApproved&&evidence.timingSpecified&&evidence.feasibilityChecked&&hasClientAction
  const canOfferAction=Boolean(!noAdvice&&
    !['greeting','topic_shift','correction','gratitude'].includes(act)&&
    (phase==='review'||phase==='action')&&clientOwnedAction)
  return Object.freeze({
    version:COACH_SESSION_DIRECTOR_VERSION,
    personaId:registered.id,personaVersion:COACH_PERSONA_VERSION,
    methodId,methodStepId:selected.methodStepId,methodProtocolVersion:COACH_METHOD_PROTOCOL_VERSION,
    methodShape:methodSteps[methodId],methodLocked:true,
    ...(scenarioFirst?{courseScenarioFirst:true,courseScenarioActive:scenarioActive,courseSessionId:input.courseSessionId}:{}),
    stageTiming:stagePlan?Object.freeze({
      recommendedSeconds:stagePlan.current.recommendedSeconds,
      nominalStartSeconds:stagePlan.current.nominalStartSeconds,
      nominalEndSeconds:stagePlan.current.nominalEndSeconds,
      sessionTargetSeconds:stagePlan.targetSeconds,
      advisoryOnly:true,advanceByClock:false
    }):null,
    locale:input.locale||'en',phase,stage,interventionId,conversationAct:act,
    canOfferAction,allowQuestion:policy.allowQuestion,timebox,
    ...(personality?{personality}:{}),
    serverAuthority:Boolean(input.authoritativeEvidence),sessionTurnCount:input.sessionTurnCount??0,
    empathyReflection:empathy?.move==='answer_directly'?null:empathy?.reflection||null,
    // Client-supplied milestone flags, never derived from assistant output or
    // treated as a durable consent/progress record.
    evidence,supportedStages,stageLimit,provisionalPhase,
    readiness:Object.freeze({ready:readinessMissing.length===0,missing:readinessMissing}),
    style:Object.freeze({
      warmth:settings.warmth||registered.defaults.warmth,
      directness:settings.directness||registered.defaults.directness,
      pace:settings.pace||registered.defaults.pace,
      depth:settings.depth||registered.defaults.depth
    })
  })
}

/**
 * The model may choose phrasing and level of warmth; it must not select a
 * different coaching intervention or declare a completed stage. This prompt
 * never sends client history a second time or changes the model/schema.
 */
export function coachSessionDirectivePrompt(directive){
  return [
    'SERVER-OWNED COACHING SESSION CONTRACT version='+directive.version+'.',
    'Persona='+directive.personaId+' / '+directive.personaVersion+
      '. Express the move naturally in this persona voice, pace, warmth and directness.',
    directive.courseScenarioFirst?COACH_COURSE_SCENARIO_FIRST_INSTRUCTION:'Locked primary method='+directive.methodId+'; method roadmap='+directive.methodShape+'.',
    directive.courseScenarioFirst?'The locked personal method '+directive.methodId+' is a secondary delivery and evidence-checking tool, not the course roadmap. Do not impose its questions or time windows.':'Never silently change the method because of a keyword, obstacle or mood.',
    directive.courseScenarioFirst?'Do not insert a personal-method stage just because its evidence is missing. Follow the selected course checkpoint and respond to the current client within all consent and safety gates.':directive.methodId==='grow'||directive.methodId==='tgrow'?
      'Five conversational themes: Contact and request → Goal → Reality → Possibilities → Decision and integration. These themes are NOT five required questions. Recognize existing client answers; never repeat a covered topic. The actual GROW/TGROW method and Director evidence, not these labels, authorize the next move.':
      'Use ONLY the selected alternative method sequence. Never insert an unrelated GROW stage or mechanically ask five questions. A natural conversation can skip a question already answered.',
    directive.courseScenarioFirst?'Personal-method evidence still limits unsolicited advice and claims of action or progress; it does not select a competing course question.':'Method protocol='+directive.methodProtocolVersion+'; current PROVISIONAL phase='+directive.provisionalPhase+
      '; AUTHORIZED phase='+directive.phase+'; stage CEILING='+directive.stageLimit+
      '; candidate method step='+directive.methodStepId+'. Do not move beyond the authorized phase based on keywords.',
    directive.courseScenarioFirst?'Director conversational move='+directive.interventionId+'. Respect answer-first, refusal, repair, listening, question limits and closing. For ordinary exploration, use one eligible course checkpoint, not a personal-method question. Do not invent progress.':'MANDATORY next conversational move='+directive.interventionId+'. The Director, NOT the voice/language model, owns direction. Choose fresh words, a specific observation and at most one helpful question within this move; a relevant statement with no question is usually fine.',
    'Priority: answer the LATEST client request first. Correction, topic change, stop, pause, refusal and safety override any proposed technique. No questionnaire or forced intervention.',
    directive.empathyReflection?'Empathy Mind advisory: only an explicitly self-reported feeling was recognized. Optional faithful reflection: '+directive.empathyReflection+' Avoid mind-reading, canned reassurance and a second question. The Director intervention remains mandatory.':'',
    coachPersonalityTurnGuidance(directive.personality),
    coachTimeboxPrompt(directive.timebox),
    directive.evidence.workingFocusEstablished&&!directive.evidence.goalConfirmed?
      'The client described a WORKING focus through their own subsequent example; explore tentatively, but never claim they explicitly confirmed a final goal.':'',
    (directive.courseScenarioFirst?'For the personal-method safety/evidence checks (not a required course question): ':'For the method-specific step '+directive.methodStepId+', evidence still missing: ')+
      directive.readiness.missing.join(', ')+'. Never claim a stage, goal, insight, commitment or outcome is confirmed by assistant text, keywords, elapsed time or an unqualified yes.',
    'At most ONE question, never a repeated question. When the Director asks to reflect or close, invite the client to choose whether to pause, close or continue. Never announce that time is up.',
    directive.canOfferAction?
      'You may mention ONLY the actual user-authored, previously considered, time-bound and feasible next step; do not mark it agreed for the client.':
      'Do NOT suggest a plan, deadline, exercise or commitment. Do not disguise an unsolicited plan inside message text.',
    'Return the approved JSON schema: three legacy strings (message, planSuggestion, evidenceQuote) and clientEvidence {kind,quote} for a single soft client-authored hint, or {kind:"none",quote:""}. Never present hints as facts, plans, consent or completion. Never return private Director metadata.'
  ].join(' ')
}

const messagePressure=/(?:\b(?:you (?:must|have to)|the session is over|time is up|we (?:have )?solved (?:your|this) problem|you have committed to)\b|(?:вы (?:должны|обязаны)|время вышло|сессия закончена|мы решили (?:вашу|эту) проблему|вы обязались)|\b(?:tienes que|se acab[oó] el tiempo|la sesi[oó]n ha terminado|ya resolvimos)\b)/iu
const unsolicitedAdvice=/(?:\b(?:you should|i recommend you|you need to|just do)\b|(?:вам следует|тебе стоит|я советую вам|просто сделайте)|\b(?:deber[ií]as|te recomiendo|simplemente haz)\b)/iu
// Only an affirmatively detected premature action/commitment question is a
// reason to replace model phrasing. Missing a keyword is NOT a semantic error.
// Keep this narrow; general insight/reflection questions are open-ended.
const earlyCoachingMoves=new Set([
  'clarify_goal','ground_in_example','explore_primary_barrier','surface_options',
  'clarify_topic','clarify_wish','imagine_outcome','explore_internal_obstacle',
  'ask_scale','explore_know_how','explore_exceptions','explore_strengths','explore_positive_experience'
])
const prematureCommitmentQuestion=/(?:\b(?:what|which) (?:small |first |next )?(?:step|action) (?:will|are) you (?:take|do|try)|\bwhat will you do tomorrow\b|\bwhen (?:will you|are you going to) (?:start|act|do|complete)\b|\b(?:will you|can you) commit to\b|(?:какой (?:первый |следующий |небольшой )?(?:шаг|действие) (?:вы|ты) (?:сдела(?:ете|ешь)|предприм(?:ете|ешь)|попробу(?:ете|ешь))|что (?:вы|ты) (?:сдела(?:ете|ешь)|предприм(?:ете|ешь)) завтра|когда (?:вы|ты) (?:сдела(?:ете|ешь)|начн(?:ёте|ете|ёшь|ешь)))|(?:qu[eé] paso (?:vas a dar|dar[aá]s|har[aá]s)|qu[eé] har[aá]s ma[nñ]ana|cu[aá]ndo (?:vas a empezar|lo har[aá]s)|te comprometes a))/iu

// High-confidence wrong-move questions only: allow novel, ambiguous language.
const prematureOptionsQuestion=/(?:\b(?:what (?:are|could be) (?:your |the )?(?:options|alternatives)|which (?:options|alternatives) (?:would|will|could) you)|(?:какие (?:ещ[её] |другие )?(?:варианты|альтернативы) (?:вы|ты)(?: сами)? (?:видите|видишь|рассматриваете|рассматриваешь))|(?:qu[eé] (?:opciones|alternativas) (?:ves|consideras|tienes)))/iu
const unverifiedCompletionClaim=/(?:\b(?:you have (?:already |now )?(?:committed|decided|chosen)|we (?:have )?(?:completed|achieved) your goal)\b|(?:вы (?:уже )?(?:решили|обязались|выбрали окончательно)|мы (?:уже )?достигли (?:вашей )?цели)|(?:ya (?:te comprometiste|decidiste)|hemos logrado tu objetivo))/iu
function crossesStageBoundary(question,directive,courseOwnedQuestion=false){
  const move=directive.interventionId
  if(earlyCoachingMoves.has(move)&&prematureCommitmentQuestion.test(question))return true
  if(!courseOwnedQuestion&&earlyCoachingMoves.has(move)&&move!=='surface_options'&&
    prematureOptionsQuestion.test(question))return true
  if(move==='invite_reflective_close'&&
    (prematureCommitmentQuestion.test(question)||prematureOptionsQuestion.test(question)))return true
  return false
}
const approvedQuestion=Object.freeze({
  en:Object.freeze({
    clarify_goal:'Which part of this matters most to you right now?',
    ground_in_example:'Can you describe one recent concrete moment when this happened?',
    explore_primary_barrier:'What made that particular moment difficult?',
    surface_options:'What alternatives feel possible to you?',
    explore_client_owned_step:'Is there a small step you would want to choose, or would you rather pause?',
    confirm_client_summary:'What feels clearer to you now?',
    invite_reflective_close:'Would you prefer to reflect on what is clearer, pause or continue?',
    recontract:'What would you like to talk about instead?',
    repair_misunderstanding:'What did you mean instead?'
  }),
  ru:Object.freeze({
    clarify_goal:'Что в этой теме для вас сейчас важнее всего?',
    ground_in_example:'Можете вспомнить один недавний конкретный случай?',
    explore_primary_barrier:'Что именно тогда было самым сложным?',
    surface_options:'Какие варианты вы сами видите?',
    explore_client_owned_step:'Хотите выбрать небольшой шаг или сейчас лучше сделать паузу?',
    confirm_client_summary:'Что для вас сейчас стало яснее?',
    invite_reflective_close:'Хотите подвести итог, сделать паузу или продолжить?',
    recontract:'О чём вам хотелось бы поговорить вместо этого?',
    repair_misunderstanding:'Что вы на самом деле имели в виду?'
  }),
  es:Object.freeze({
    clarify_goal:'¿Qué aspecto de esto te importa más ahora?',
    ground_in_example:'¿Puedes recordar un momento concreto y reciente?',
    explore_primary_barrier:'¿Qué hizo difícil ese momento?',
    surface_options:'¿Qué alternativas te parecen posibles?',
    explore_client_owned_step:'¿Quieres elegir un paso pequeño o prefieres hacer una pausa?',
    confirm_client_summary:'¿Qué te queda más claro ahora?',
    invite_reflective_close:'¿Prefieres resumir lo que has aclarado, pausar o continuar?',
    recontract:'¿De qué te gustaría hablar en su lugar?',
    repair_misunderstanding:'¿Qué querías decir en realidad?'
  })
})
function retainReflectionOrApprovedQuestion(message,approved){
  // Preserve the model's own meaningful reflection, with no invented text.
  // If its entire response is the premature question, use a single reviewed
  // stage-aligned question instead of sending an empty response.
  const segments=message.match(/[^.!?？。\n]+[.!?？。]?/gu)||[]
  const reflection=segments.filter(part=>!/[?？]/u.test(part))
    .map(part=>part.trim()).filter(Boolean).join(' ').trim()
  return reflection.length>=12?reflection.slice(0,700):approved
}

/** Post-generation veto. Voice engines receive ONLY this checked text. */
export function enforceCoachSessionDirective(reply,directive){
  if(!directive || reply?.mode!=='ai')return reply
  let message=String(reply.message||'')
  if(messagePressure.test(message) ||
    (['contract','discovery'].includes(directive.phase)&&goalIntakePressure.test(message)))
      throw Error('COACHING_BRAIN_RESPONSE_INVALID')
  if((directive.interventionId==='listen_without_advice' ||
      !directive.canOfferAction&&directive.interventionId!=='answer_first')&&
    unsolicitedAdvice.test(message))
      throw Error('COACHING_BRAIN_RESPONSE_INVALID')
  if(!directive.evidence?.clientActionApproved&&unverifiedCompletionClaim.test(message))
      throw Error('COACHING_BRAIN_RESPONSE_INVALID')
  if(!directive.allowQuestion&&/[?？]/u.test(message))
      throw Error('COACHING_BRAIN_RESPONSE_INVALID')
  // The Director owns direction, not the model's vocabulary. A useful,
  // naturally phrased question must NOT be rewritten merely for failing a
  // keyword heuristic. Intervene only for positively identified premature
  // action questions during earlier discovery phases.
  if(/[?？]/u.test(message)){
    const question=(message.match(/[^.!?？。\n]*[?？]/gu)||[])[0]||''
    const courseOwnedQuestion=directive.courseScenarioActive===true&&!OFFLINE_PRIORITY_MOVES.has(directive.interventionId)&&coachCourseIndependentQuestion(directive.courseSessionId,directive.locale,question)
    if(crossesStageBoundary(question,directive,courseOwnedQuestion)||vetoMethodStepQuestion(question,directive,{courseOwnedQuestion})){
      message=retainReflectionOrApprovedQuestion(message,
        (directive.courseScenarioFirst?briefOfflineClarification[directive.locale]||briefOfflineClarification.en:'')||
        approvedMethodQuestion(directive.locale,directive.interventionId)||
        approvedQuestion[directive.locale||'en']?.[directive.interventionId]||
        approvedQuestion.en[directive.interventionId]||approvedQuestion.en.clarify_goal)
    }
  }
  if(!directive.canOfferAction && (reply.planSuggestion||reply.evidenceQuote))
    return {...reply,message,planSuggestion:'',evidenceQuote:''}
  return message!==reply.message?{...reply,message}:reply
}

// Only full checked replies, never early provisional streaming sentences.
export function finalizeCoachCharacterReply(reply,directive){
 const turn=directive?.personality
 if(reply?.mode!=='ai'||turn?.characterReply?.priority!=='early_target'||hasCoachSignatureSpeech(directive.personaId,[{role:'assistant',content:reply.message}]))return reply
 const message=insertCoachCharacterLine(reply.message,turn)
 if(message===reply.message)return reply
 try{const checked=enforceCoachSessionDirective({...reply,message},directive);return checked.message===message?checked:reply}catch{return reply}
}

const offlineStatement=Object.freeze({
  en:Object.freeze({
    respond_socially:"Hello. I'm listening.",recontract:"Of course, let's change the topic.",
    repair_misunderstanding:"Thank you for correcting me. I don't want to assume what you meant.",
    answer_first:"I can look at this with you, though I don't want to pretend to have all the facts.",
    explain_question:"I can put that in simpler words.",allow_close:"We can leave the conversation here.",
    respect_no:"Understood. There is no need to push.",
    reduce_scope:"It is fine not to know yet.",listen_without_advice:"I can listen without offering advice.",
    reflect_without_question:"We do not need another question right now.",
    invite_reflective_close:"We can take stock without rushing or inventing a result.",
    confirm_client_summary:"Let's reflect only on what you yourself have said.",
    clarify_goal:"Let's start with what matters most to you.",
    ground_in_example:"One actual moment may help us make sense of this.",
    explore_primary_barrier:"Let's look at what made this difficult.",
    surface_options:"You are free to explore more than one option.",
    explore_client_owned_step:"You can choose a step, or decide not to take one."
  }),
  ru:Object.freeze({
    respond_socially:'Привет! Я слушаю.',recontract:'Конечно, давайте сменим тему.',
    repair_misunderstanding:'Спасибо за поправку. Не хочу приписывать вам то, чего вы не говорили.',
    answer_first:'Могу вместе с вами рассмотреть варианты, но не буду делать вид, что знаю все обстоятельства.',
    explain_question:'Могу сказать проще.',allow_close:'Мы можем на этом остановиться.',
    respect_no:'Понял, настаивать не буду.',reduce_scope:'Пока не знать — нормально.',
    listen_without_advice:'Могу просто выслушать, без советов.',
    reflect_without_question:'Необязательно сейчас отвечать на новый вопрос.',
    invite_reflective_close:'Можно отметить главное, не торопясь и не выдумывая итог.',
    confirm_client_summary:'Давайте опираться только на то, что вы сами рассказали.',
    clarify_goal:'Начнём с того, что важно именно вам.',
    ground_in_example:'Один настоящий эпизод может помочь разобраться.',
    explore_primary_barrier:'Посмотрим, что именно сделало этот момент трудным.',
    surface_options:'Можно рассмотреть несколько вариантов, не решая за вас.',
    explore_client_owned_step:'Вы можете выбрать небольшой шаг или пока не выбирать ничего.'
  }),
  es:Object.freeze({
    respond_socially:'Hola, te escucho.',recontract:'Claro, podemos cambiar de tema.',
    repair_misunderstanding:'Gracias por corregirme. No quiero atribuirte algo que no dijiste.',
    answer_first:'Podemos explorar opciones sin fingir que conozco todos los detalles.',
    explain_question:'Puedo expresarlo de una manera más sencilla.',
    allow_close:'Podemos dejar la conversación aquí.',respect_no:'Entiendo, no insistiré.',
    reduce_scope:'No pasa nada si todavía no lo sabes.',
    listen_without_advice:'Puedo escuchar sin darte consejos.',
    reflect_without_question:'No hace falta responder otra pregunta ahora.',
    invite_reflective_close:'Podemos reflexionar sin apresurarnos ni inventar un resultado.',
    confirm_client_summary:'Partamos solo de lo que has dicho.',
    clarify_goal:'Empecemos con lo que más te importa.',
    ground_in_example:'Un momento real puede ayudarnos a entenderlo.',
    explore_primary_barrier:'Veamos qué hizo difícil ese momento.',
    surface_options:'Puedes explorar varias opciones sin decidir aún.',
    explore_client_owned_step:'Puedes elegir un paso pequeño o dejarlo para después.'
  })
})
// Priority conversational moves bypass method selection entirely. This is the
// same existing server-owned Directive; only its authorized question rendering
// uses the deterministic, persona-specific editorial bank when providers fail.
const OFFLINE_PRIORITY_MOVES=new Set([
  'respond_socially','recontract','repair_misunderstanding','answer_first',
  'explain_question','allow_close','respect_no','reduce_scope',
  'listen_without_advice','reflect_without_question','invite_reflective_close'
])
const OFFLINE_NO_QUESTION_MOVES=new Set([
  'respond_socially','recontract','repair_misunderstanding','allow_close',
  'respect_no','listen_without_advice','reflect_without_question'
])
const briefOfflineClarification=Object.freeze({
  en:'Could you tell me a little more about what you mean?',
  ru:'Можете чуть подробнее сказать, что имеете в виду?',
  es:'¿Me cuentas un poco más sobre lo que quieres decir?'
})
/** Provider-free, method-locked, persona-shaped reply for the same voice channel. */
export function directedCoachOfflineReply(input,directive,reason='model_unavailable'){
  if(!directive||!getCoachPersona(directive.personaId))throw Error('COACHING_BRAIN_INPUT_INVALID')
  const locale=['ru','en','es'].includes(input?.locale)?input.locale:'en'
  const move=directive.interventionId
  const dialogue=coachDialoguePolicy(input)
  const short=isShortCoachFragment(input,dialogue.conversationAct)
  const chosen=selectCoachDialogueVariant(input,directive,dialogue,{shortFragment:short})
  const methodMove=!OFFLINE_PRIORITY_MOVES.has(move)
  const courseOffline=directive.courseScenarioFirst&&methodMove
  const original=courseOffline?({en:'Let us stay with what matters in this session.',ru:'Давайте останемся с тем, что важно в этой встрече.',es:'Sigamos con lo que importa en esta sesión.'}[locale]):offlineStatement[locale][move]||
    approvedMethodStatement(locale,move)||
    offlineStatement[locale].reduce_scope
  // Method-stage reply gives context, the existing persona voice gives tone.
  // These authored examples never override consent or infer client feelings.
  const originalReflection=courseOffline?original:methodMove&&chosen.stageCue
    ?chosen.stageCue+(chosen.personaCue?' '+chosen.personaCue:'')
    :methodMove&&chosen.personaCue?original+' '+chosen.personaCue:original
  // In a provider-free session, respond to an explicit feeling without
  // changing Director-owned questions or allowing unsolicited techniques.
  const reflection=directive.empathyReflection&&
    !['respond_socially','answer_first','recontract','repair_misunderstanding'].includes(move)
    ?directive.empathyReflection:originalReflection
  const oldQuestion=approvedMethodQuestion(locale,move)||approvedQuestion[locale][move]||''
  let question=''
  if(directive.allowQuestion&&dialogue.allowQuestion&&!dialogue.noAdvice){
    // Preserve the reviewed timebox question and explicit direct requests.
    // Consent, refusal, topic correction, social chat and listening without
    // advice do not silently restart intake or force method-stage questions.
    if(move==='invite_reflective_close')question=oldQuestion
    else if(OFFLINE_NO_QUESTION_MOVES.has(move))question=''
    else if(methodMove&&!courseOffline){
      question=short?briefOfflineClarification[locale]:chosen.question||''
    }else if(!short&&move==='explain_question'){
      question=oldQuestion
    }
  }
  return {
    version:'hh-coach-directed-offline-v1',mode:'offline',method:directive.methodId,
    stage:directive.stage,reflection:directive.personality?.characterReply?.priority==='early_target'&&!hasCoachSignatureSpeech(directive.personaId,[{role:'assistant',content:reflection}])?insertCoachCharacterLine(reflection,directive.personality):reflection,question,hypothesis:'',
    planSuggestion:'',evidenceQuote:'',offlineReason:reason
  }
}

// Scripted text rehearsal shares the Director's local-only policy; it does not advance coaching-method stages.
export {createCoachRehearsal,coachRehearsalView,advanceCoachRehearsal,coachRehearsalFeedback} from './coach-rehearsal.mjs'
