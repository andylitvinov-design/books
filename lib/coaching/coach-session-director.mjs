/**
 * My Coach session director v2 — pure, server-reviewed per-turn contract.
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
import {coachConfirmedEvidence} from './director-evidence.mjs'

export const COACH_SESSION_DIRECTOR_VERSION='hh-coach-session-director-v2'
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
  const evidence=coachConfirmedEvidence(input)
  const stageCheck=assessStageReadiness(stage,evidence)
  const supportedStages=Object.freeze(['goal','reality','options','action','review']
    .filter(name=>assessStageReadiness(name,evidence).ready))
  const base=selectNextBestAction({stage,message:input.message||'',locale:input.locale||'en'})
  const latest=String(input.message||'')
  const hasClientAction=selectedAction.test(latest)&&!actionNegation.test(latest)
  const settings=persona.settings||{}
  const timebox=coachTimeboxState(input.elapsedSeconds??null)
  // Client questions/corrections/refusals win. Otherwise the Director picks
  // ONE method-aligned move. At the 18-minute target, it invites a close
  // rather than claiming the session has been completed.
  const priority=initialAct[act]
  const interventionId=priority||
    (policy.noAdvice?'listen_without_advice':policy.questionStreak?'reflect_without_question':
      ['closing','flexible_close'].includes(timebox.phase)?'invite_reflective_close':
      (phase==='action'&&!evidence.optionsExplored)?'surface_options':
      moves[phase]||base.intervention)
  const canOfferAction=Boolean(!policy.noAdvice&&
    !['greeting','topic_shift','correction','gratitude'].includes(act)&&
    (phase==='review'||phase==='action')&&hasClientAction&&
    evidence.clientActionApproved&&evidence.timingSpecified&&evidence.feasibilityChecked)
  return Object.freeze({
    version:COACH_SESSION_DIRECTOR_VERSION,
    personaId:registered.id,personaVersion:COACH_PERSONA_VERSION,
    methodId,methodStepId:methodId+':'+phase,
    methodShape:methodSteps[methodId],methodLocked:true,
    locale:input.locale||'en',phase,stage,interventionId,conversationAct:act,
    canOfferAction,allowQuestion:policy.allowQuestion,timebox,
    // Client-supplied milestone flags, never derived from assistant output or
    // treated as a durable consent/progress record.
    evidence,supportedStages,
    readiness:Object.freeze({ready:stageCheck.ready,missing:[...stageCheck.missing]}),
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
    'Locked primary method='+directive.methodId+'; method roadmap='+directive.methodShape+'.',
    'Never silently change the method because of a keyword, obstacle or mood.',
    'Current PROVISIONAL phase='+directive.phase+'; candidate method step='+directive.methodStepId+'.',
    'MANDATORY next conversational move='+directive.interventionId+'. The Director, NOT the voice/language model, owns direction. Choose fresh words, a specific observation and at most one helpful question within this move; a relevant statement with no question is usually fine.',
    'Priority: answer the LATEST client request first. Correction, topic change, stop, pause, refusal and safety override any proposed technique. No questionnaire or forced intervention.',
    coachTimeboxPrompt(directive.timebox),
    'The CLIENT-REPORTED readiness indicators are NOT verified completion: '+
      directive.readiness.missing.join(', ')+'. Never claim a stage, goal, insight, commitment or outcome is confirmed by assistant text, keywords, elapsed time or an unqualified yes.',
    'At most ONE question, never a repeated question. When the Director asks to reflect or close, invite the client to choose whether to pause, close or continue. Never announce that time is up.',
    directive.canOfferAction?
      'You may mention ONLY the actual user-authored, previously considered, time-bound and feasible next step; do not mark it agreed for the client.':
      'Do NOT suggest a plan, deadline, exercise or commitment. Do not disguise an unsolicited plan inside message text.',
    'Return the existing three-string JSON schema. Never return private Director metadata or claims about verification.'
  ].join(' ')
}

const messagePressure=/(?:\b(?:you (?:must|have to)|the session is over|time is up|we (?:have )?solved (?:your|this) problem|you have committed to)\b|(?:вы (?:должны|обязаны)|время вышло|сессия закончена|мы решили (?:вашу|эту) проблему|вы обязались)|\b(?:tienes que|se acab[oó] el tiempo|la sesi[oó]n ha terminado|ya resolvimos)\b)/iu
const unsolicitedAdvice=/(?:\b(?:you should|i recommend you|you need to|just do)\b|(?:вам следует|тебе стоит|я советую вам|просто сделайте)|\b(?:deber[ií]as|te recomiendo|simplemente haz)\b)/iu
const questionFocus=Object.freeze({
  clarify_goal:/(?:\b(?:goal|matter|important|focus|hope|want|topic|explore)\b|(?:цель|важн|хотел|проясн|обсуд|запрос|тему)|\b(?:objetivo|importa|quieres|tema|aclarar)\b)/iu,
  ground_in_example:/(?:\b(?:when|last time|example|moment|happen|specific|situation)\b|(?:когда|случа|пример|момент|ситуац|конкрет|последн)|\b(?:cu[aá]ndo|ejemplo|momento|situaci[oó]n|ocurri[oó])\b)/iu,
  explore_primary_barrier:/(?:\b(?:stop|hard|block|obstacle|difficult|got in the way)\b|(?:меш|сложн|останав|препятств|трудн|помеш)|\b(?:impide|dif[ií]cil|obst[aá]culo|bloquea)\b)/iu,
  surface_options:/(?:\b(?:option|alternative|possibilit|different way|could|choose)\b|(?:вариант|возможн|иначе|другой путь|выбор|могли бы)|\b(?:opci[oó]n|alternativ|posibilidad|podr[ií]as|elegir)\b)/iu,
  explore_client_owned_step:/(?:\b(?:step|next|choose|feasible|try|ready|small action)\b|(?:шаг|выбер|готов|попроб|посильн|реальн)|\b(?:paso|elegir|probar|preparad|viable)\b)/iu,
  confirm_client_summary:/(?:\b(?:take away|summary|reflect|clearer|learned|understand)\b|(?:итог|ясн|понял|забер|вывод|проясн)|\b(?:resumen|aclar|aprend|entend)\b)/iu,
  invite_reflective_close:/(?:\b(?:close|pause|continue|take away|clearer|summary|wrap up)\b|(?:итог|заверш|продолж|пауз|яснее|проясн)|\b(?:cerrar|pausar|continuar|resumen|aclarar)\b)/iu,
  recontract:/(?:\b(?:instead|topic|change|focus|discuss|talk about)\b|(?:тема|другое|обсуд|поговор|важн)|\b(?:tema|cambiar|hablar|enfocar)\b)/iu,
  repair_misunderstanding:/(?:\b(?:meant|clarify|correct|instead|misunderstood)\b|(?:поправ|имели в виду|не так|уточн|ошиб)|\b(?:aclarar|quise decir|corregir|entend[ií])\b)/iu
})
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
function redirectQuestion(message,question){
  // Preserve the model's specific reflection, but do not let its OWN
  // incompatible question steer the conversation. No extra model call.
  const slices=message.match(/[^.!?？。\n]+[.!?？。]?/gu)||[]
  let swapped=false
  const result=slices.map(part=>{
    if(!/[?？]/u.test(part))return part.trim()
    swapped=true
    return question
  }).filter(Boolean).join(' ').trim()
  return swapped?result.slice(0,700):message
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
  if(!directive.allowQuestion&&/[?？]/u.test(message))
      throw Error('COACHING_BRAIN_RESPONSE_INVALID')
  // The Director controls the intent of new questions. Natural aligned
  // questions are unchanged; a clearly mismatched question is rewritten
  // with one short, reviewed prompt. Direct client questions, correction and
  // genuine casual talk stay flexible, never forced into an interview.
  const expected=questionFocus[directive.interventionId]
  if(expected&&/[?？]/u.test(message)){
    const question=message.split(/[.!。\n]+/u).find(x=>/[?？]/u.test(x))||message
    if(!expected.test(question)){
      message=redirectQuestion(message,approvedQuestion[directive.locale||'en']?.[directive.interventionId]||
        approvedQuestion.en[directive.interventionId])
    }
  }
  if(!directive.canOfferAction && (reply.planSuggestion||reply.evidenceQuote))
    return {...reply,message,planSuggestion:'',evidenceQuote:''}
  return message!==reply.message?{...reply,message}:reply
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
/** Provider-free, method-locked and safe for the same voice output channel. */
export function directedCoachOfflineReply(input,directive,reason='model_unavailable'){
  if(!directive||!getCoachPersona(directive.personaId))throw Error('COACHING_BRAIN_INPUT_INVALID')
  const locale=['ru','en','es'].includes(input?.locale)?input.locale:'en'
  const message=offlineStatement[locale][directive.interventionId]||
    offlineStatement[locale].reduce_scope
  const question=directive.allowQuestion?
    approvedQuestion[locale][directive.interventionId]||'':''
  return {
    version:'hh-coach-directed-offline-v1',mode:'offline',method:directive.methodId,
    stage:directive.stage,reflection:message,question,hypothesis:'',
    planSuggestion:'',evidenceQuote:'',offlineReason:reason
  }
}
