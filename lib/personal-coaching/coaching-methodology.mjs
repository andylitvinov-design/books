/**
 * Coaching Methodology Engine v2.
 *
 * Pure, deterministic decision support for a session controller.
 * It classifies the current coaching task, not the client's personality or diagnosis.
 * No persistence, provider calls, transcript logging, or autonomous stage advancement.
 */
export const METHODOLOGY_VERSION = 'hh-coaching-methodology-v2';

export const GROW_STAGES = Object.freeze([
  'goal', 'reality', 'priority', 'options', 'action', 'review',
]);

export const INTERVENTIONS = Object.freeze([
  'clarify_goal', 'ground_in_example', 'separate_fact_from_assumption',
  'prioritize', 'explore_resources', 'surface_options',
  'explore_ambivalence', 'check_contradiction', 'offer_advice_with_permission',
  'shrink_action', 'check_feasibility', 'repair_misunderstanding',
  'pause_and_check_consent', 'accept_skip', 'close_partially',
]);

const copy = Object.freeze({
  en: {
    clarify_goal: 'What would make this conversation useful for you today?',
    ground_in_example: 'Could you share one recent, concrete example?',
    separate_fact_from_assumption: 'What do you know for certain, and what are you still assuming?',
    prioritize: 'Which one of these matters most in the next seven days?',
    explore_resources: 'What support or resources are already available to you?',
    surface_options: 'What are two or three realistic ways you could approach this?',
    explore_ambivalence: 'What makes you want to move forward, and what gives you pause?',
    check_contradiction: 'Earlier you said one thing, and now another. Is there a real tension here, or has the context changed?',
    offer_advice_with_permission: 'Would you like me to offer one or two options for you to consider?',
    shrink_action: 'What is the smallest useful first step you could take?',
    check_feasibility: 'How confident are you, from 0 to 10, that this step is realistic?',
    repair_misunderstanding: 'I may have misunderstood. How would you put it in your own words?',
    pause_and_check_consent: 'Would you prefer to pause, change the subject, or stop for now?',
    accept_skip: 'We can leave that aside. What would feel useful to explore instead?',
    close_partially: 'We do not need to force a decision. What is one thing that is clearer now?',
  },
  ru: {
    clarify_goal: 'Что сделало бы этот разговор полезным для вас сегодня?',
    ground_in_example: 'Можете привести один недавний конкретный пример?',
    separate_fact_from_assumption: 'Что вам известно точно, а что пока является предположением?',
    prioritize: 'Что из этого важнее всего в ближайшие семь дней?',
    explore_resources: 'Какая поддержка или какие ресурсы уже доступны вам?',
    surface_options: 'Какие два или три реалистичных пути вы видите?',
    explore_ambivalence: 'Что побуждает вас двигаться вперёд, а что заставляет сомневаться?',
    check_contradiction: 'Раньше вы сказали одно, а сейчас другое. Здесь действительно есть противоречие или изменился контекст?',
    offer_advice_with_permission: 'Хотите, я предложу один или два варианта для рассмотрения?',
    shrink_action: 'Какой самый маленький полезный первый шаг вы могли бы сделать?',
    check_feasibility: 'Насколько вы уверены по шкале от 0 до 10, что этот шаг реалистичен?',
    repair_misunderstanding: 'Возможно, я вас неверно понял. Как бы вы сформулировали это своими словами?',
    pause_and_check_consent: 'Вы хотели бы сделать паузу, сменить тему или пока завершить разговор?',
    accept_skip: 'Мы можем оставить эту тему. Что было бы полезно рассмотреть вместо неё?',
    close_partially: 'Необязательно заставлять себя принимать решение. Что стало немного яснее?',
  },
  es: {
    clarify_goal: '¿Qué haría que esta conversación fuera útil para ti hoy?',
    ground_in_example: '¿Puedes compartir un ejemplo concreto y reciente?',
    separate_fact_from_assumption: '¿Qué sabes con certeza y qué estás suponiendo todavía?',
    prioritize: '¿Qué es lo más importante de todo esto durante los próximos siete días?',
    explore_resources: '¿Qué apoyo o recursos tienes ya disponibles?',
    surface_options: '¿Qué dos o tres caminos realistas podrías considerar?',
    explore_ambivalence: '¿Qué te impulsa a avanzar y qué te hace dudar?',
    check_contradiction: 'Antes dijiste una cosa y ahora otra. ¿Hay una tensión real o cambió el contexto?',
    offer_advice_with_permission: '¿Quieres que te proponga una o dos opciones para considerar?',
    shrink_action: '¿Cuál sería el primer paso útil más pequeño que podrías dar?',
    check_feasibility: 'En una escala de 0 a 10, ¿qué tan realista te parece este paso?',
    repair_misunderstanding: 'Puede que no te haya entendido bien. ¿Cómo lo dirías con tus propias palabras?',
    pause_and_check_consent: '¿Prefieres hacer una pausa, cambiar de tema o terminar por ahora?',
    accept_skip: 'Podemos dejar ese tema. ¿Qué te resultaría útil explorar en su lugar?',
    close_partially: 'No hace falta forzar una decisión. ¿Qué está un poco más claro ahora?',
  },
});

const normalizeLocale = value => ['en', 'ru', 'es'].includes(value) ? value : 'en';
const clean = (value, max = 1600) => typeof value === 'string' ? value.trim().slice(0, max) : '';
const contains = (text, patterns) => patterns.some(pattern => pattern.test(text));

const patterns = {
  unclear: [/не знаю|непонятно|не могу сформулировать|unclear|not sure|i (?:do not|don't) know|no sé|no entiendo/i],
  overloaded: [/слишком много|не успеваю|за что хвататься|overwhelm|too much|too many|no llego|demasiadas cosas/i],
  ambivalent: [/боюсь|страшно|сомневаюсь|не уверен|не уверена|не могу начать|afraid|hesitat|not ready|miedo|dudo|no me atrevo/i],
  contradiction: [/с одной стороны.*с другой|одновременно хочу|но при этом|on one hand|but at the same time|por un lado|pero al mismo tiempo/i],
  advice: [/посоветуй|что мне делать|дай совет|what should i do|what i should do|tell me what to do|what do you recommend|give me advice|qué debería hacer|qué hago|dame un consejo|recomiéndame/i],
  vague: [/всё плохо|всё сложно|ничего не получается|everything is|it's complicated|todo está mal|no funciona nada/i],
  stop: [/останови|хочу закончить|не хочу продолжать|stop|end the session|i want to stop|para|quiero terminar/i],
  pause: [/пауза|давай позже|мне нужно остановиться|pause|take a break|necesito una pausa/i],
  distress: [/мне очень тяжело|меня накрывает|невыносимо|i feel overwhelmed emotionally|i can't cope|es insoportable|me siento desbordad/i],
};

const riskPatterns = [
  /suicid|kill myself|self[- ]?harm|end my life|покончить с собой|самоубийств|убить себя|суицид|хочу умереть|quiero morir|hacerme daño|quitarme la vida/i,
];

function validStage(stage) {
  return GROW_STAGES.includes(stage) ? stage : 'goal';
}

/** Determine only the task currently blocking progress; never infer a trait. */
export function classifyCoachingDifficulty({ message = '', clientSignals = {} } = {}) {
  const text = clean(message).toLowerCase();
  if (clientSignals.safetyHold === true || contains(text, riskPatterns)) return 'safety_hold';
  if (clientSignals.stop === true || contains(text, patterns.stop)) return 'stop_request';
  if (clientSignals.pause === true || contains(text, patterns.pause)) return 'pause_request';
  if (clientSignals.correction === true) return 'coach_misunderstanding';
  if (clientSignals.skip === true) return 'declined_question';
  if (clientSignals.contradiction === true || contains(text, patterns.contradiction)) return 'possible_contradiction';
  if (clientSignals.distress === true || contains(text, patterns.distress)) return 'emotional_distress';
  if (clientSignals.asksAdvice === true || contains(text, patterns.advice)) return 'advice_requested';
  if (clientSignals.ambivalence === true || contains(text, patterns.ambivalent)) return 'ambivalence';
  if (clientSignals.overload === true || contains(text, patterns.overloaded)) return 'overload';
  if (clientSignals.unclear === true || contains(text, patterns.unclear)) return 'uncertainty';
  if (clientSignals.vague === true || contains(text, patterns.vague)) return 'insufficient_specificity';
  if (clientSignals.noAgency === true) return 'limited_perceived_control';
  if (clientSignals.actionTooLarge === true) return 'action_too_large';
  return text.length < 3 ? 'insufficient_input' : 'ready_to_explore';
}

/** Explicit client preference always wins; heuristics are fallback only. */
export function chooseCoachingMethod({ preferredMethod = '', difficulty = '', stage = 'goal' } = {}) {
  const methods = ['grow', 'woop', 'oskar', 'solution_focused', 'motivational'];
  if (methods.includes(preferredMethod)) return { method: preferredMethod, reason: 'client_preference' };
  if (difficulty === 'ambivalence') return { method: 'motivational', reason: 'ambivalence_support' };
  if (difficulty === 'action_too_large') return { method: 'woop', reason: 'implementation_plan' };
  if (difficulty === 'overload' || stage === 'priority') return { method: 'grow', reason: 'prioritization' };
  if (difficulty === 'limited_perceived_control') return { method: 'solution_focused', reason: 'available_influence' };
  if (difficulty === 'ready_to_explore' && stage === 'resources') return { method: 'oskar', reason: 'resource_exploration' };
  return { method: 'grow', reason: 'default_goal_to_action' };
}

/** Deeper exploration is allowed only with explicit, current consent. */
export function resolveDepth({ requestedDepth = 'task', consented = false, goalRelevant = false, safetyHold = false } = {}) {
  const allowed = ['task', 'pattern', 'meaning'];
  if (!allowed.includes(requestedDepth)) return { depth: 'task', changed: true, reason: 'unknown_depth' };
  if (safetyHold) return { depth: 'task', changed: requestedDepth !== 'task', reason: 'safety_priority' };
  if (requestedDepth === 'task') return { depth: 'task', changed: false, reason: 'default_depth' };
  if (!consented) return { depth: 'task', changed: true, reason: 'explicit_consent_required' };
  if (!goalRelevant) return { depth: 'task', changed: true, reason: 'not_relevant_to_goal' };
  return { depth: requestedDepth, changed: false, reason: 'client_consented_and_relevant' };
}

/** A stage advances only when its explicit exit conditions are confirmed. */
export function assessStageReadiness(stage, evidence = {}) {
  const key = validStage(stage);
  const requirements = {
    goal: ['goalRestated', 'goalConfirmed'],
    reality: ['keyFactsCaptured', 'constraintsReviewed'],
    priority: ['priorityChosen', 'priorityConfirmed'],
    options: ['optionsExplored'],
    action: ['clientActionApproved', 'timingSpecified', 'feasibilityChecked'],
    review: ['summaryReviewed'],
  }[key];
  const missing = requirements.filter(field => evidence[field] !== true);
  return Object.freeze({
    stage: key,
    ready: missing.length === 0,
    missing: Object.freeze(missing),
    nextStage: missing.length === 0 ? GROW_STAGES[Math.min(GROW_STAGES.indexOf(key) + 1, GROW_STAGES.length - 1)] : key,
  });
}

/** Select exactly one intervention, with stop/safety/correction precedence. */
export function selectNextBestAction({ stage = 'goal', message = '', locale = 'en', signals = {}, depth = 'task', depthConsent = false, goalRelevant = false } = {}) {
  const currentStage = validStage(stage);
  const language = normalizeLocale(locale);
  const difficulty = classifyCoachingDifficulty({ message, clientSignals: signals });
  const selectedMethod = chooseCoachingMethod({ preferredMethod: signals.preferredMethod, difficulty, stage: currentStage });
  const depthResult = resolveDepth({ requestedDepth: depth, consented: depthConsent, goalRelevant, safetyHold: difficulty === 'safety_hold' });

  const mapping = {
    safety_hold: ['pause_and_check_consent', 'safety_interrupt'],
    stop_request: ['accept_skip', 'stop_requested'],
    pause_request: ['pause_and_check_consent', 'paused'],
    coach_misunderstanding: ['repair_misunderstanding', 'repair'],
    declined_question: ['accept_skip', 'skipped'],
    possible_contradiction: ['check_contradiction', 'clarify_tension'],
    emotional_distress: ['pause_and_check_consent', 'check_consent'],
    advice_requested: ['offer_advice_with_permission', 'advice_permission'],
    ambivalence: ['explore_ambivalence', 'ambivalence'],
    overload: ['prioritize', 'prioritization'],
    uncertainty: ['clarify_goal', 'clarification'],
    insufficient_specificity: ['ground_in_example', 'grounding'],
    limited_perceived_control: ['explore_resources', 'agency'],
    action_too_large: ['shrink_action', 'smaller_step'],
    insufficient_input: ['clarify_goal', 'insufficient_input'],
  };
  let [intervention, reason] = mapping[difficulty] || [];
  if (!intervention) {
    if (currentStage === 'goal') intervention = 'clarify_goal';
    else if (currentStage === 'reality') intervention = 'ground_in_example';
    else if (currentStage === 'priority') intervention = 'prioritize';
    else if (currentStage === 'options') intervention = 'surface_options';
    else if (currentStage === 'action') intervention = signals.feasibilityChecked ? 'check_feasibility' : 'shrink_action';
    else intervention = 'close_partially';
    reason = 'stage_default';
  }

  const isTerminal = difficulty === 'safety_hold' || difficulty === 'stop_request';
  return Object.freeze({
    version: METHODOLOGY_VERSION,
    locale: language,
    stage: currentStage,
    method: selectedMethod.method,
    methodReason: selectedMethod.reason,
    difficulty,
    depth: depthResult.depth,
    depthReason: depthResult.reason,
    intervention,
    reason,
    question: copy[language][intervention],
    questionCount: 1,
    shouldWaitForClient: !isTerminal && difficulty !== 'pause_request',
    status: difficulty === 'safety_hold' ? 'safety_hold'
      : difficulty === 'stop_request' ? 'stopped'
      : difficulty === 'pause_request' ? 'paused'
      : difficulty === 'declined_question' ? 'skipped'
      : 'await_client',
  });
}

/** Feasibility feedback reduces pressure and never upgrades a client's commitment. */
export function adjustActionForFeasibility({ confidence, action = '', minimumConfidence = 7 } = {}) {
  if (!Number.isInteger(confidence) || confidence < 0 || confidence > 10) {
    throw new RangeError('confidence must be an integer from 0 to 10');
  }
  const approvedAction = clean(action, 300);
  if (!approvedAction) throw new TypeError('action must be a non-empty client-provided action');
  return Object.freeze({
    confidence,
    action: confidence >= minimumConfidence ? approvedAction : '',
    needsSmallerStep: confidence < 7,
    requiresClientChoice: confidence < 7,
    reason: confidence >= 7 ? 'client_confidence_sufficient' : 'reduce_scope_or_revisit_choice',
  });
}

export function evaluateCoachingPlan({ action, firstStep, timing, obstacle, fallback, clientApproved = false } = {}) {
  const fields = { action, firstStep, timing, obstacle, fallback };
  const missing = Object.entries(fields).filter(([, value]) => !clean(value, 300)).map(([key]) => key);
  return Object.freeze({
    ready: missing.length === 0 && clientApproved === true,
    missing: Object.freeze(missing),
    approvalRequired: clientApproved !== true,
  });
}
