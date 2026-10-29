/**
 * Holistic Intelligence / Psychologist Mind v1.
 *
 * Pure, deterministic psychoeducational program + conversation planner.
 * Not a diagnosis, licensed therapist, autonomous trauma treatment, or LLM.
 * No network, database, analytics, provider calls, storage, sales, or model fees.
 *
 * SECURITY: access/safety must be established by a trusted host/server.
 * NEVER populate access or safety from unauthenticated browser JSON.
 */
import { interpretSupportUtterance } from "./guide-dialogue.mjs";
import { compareVoluntaryCheckins } from "./client-reasoning-core.mjs";

export const PSYCHOLOGIST_MIND_VERSION = "psychologist-mind-v1";
export const PSYCHOLOGIST_FOCI = Object.freeze([
  "stress", "relationships", "self_worth", "meaning", "trauma_support",
]);
export const PSYCHOLOGIST_APPROACHES = Object.freeze({
  cbt: Object.freeze({ id: "cbt", clinicalTreatment: false, purpose: "thought_behavior_skills" }),
  act: Object.freeze({ id: "act", clinicalTreatment: false, purpose: "values_flexibility" }),
  dbt_skills: Object.freeze({ id: "dbt_skills", clinicalTreatment: false, purpose: "distress_tolerance_skills" }),
  interpersonal: Object.freeze({ id: "interpersonal", clinicalTreatment: false, purpose: "relationship_skills" }),
  psychodynamic: Object.freeze({ id: "psychodynamic", clinicalTreatment: true, purpose: "clinician_formulation" }),
  kip: Object.freeze({ id: "kip", clinicalTreatment: true, purpose: "guided_imagery_psychotherapy" }),
  emdr: Object.freeze({ id: "emdr", clinicalTreatment: true, purpose: "specialist_trauma_treatment" }),
  cpt: Object.freeze({ id: "cpt", clinicalTreatment: true, purpose: "specialist_trauma_treatment" }),
  prolonged_exposure: Object.freeze({ id: "prolonged_exposure", clinicalTreatment: true, purpose: "specialist_trauma_treatment" }),
});
export const PSYCHOLOGIST_METHODS = Object.freeze({
  goal_contract: Object.freeze({ approach: "cbt", selfGuided: true }),
  present_orientation: Object.freeze({ approach: "dbt_skills", selfGuided: true }),
  resource_inventory: Object.freeze({ approach: "act", selfGuided: true }),
  map_trigger_response: Object.freeze({ approach: "cbt", selfGuided: true }),
  values_clarification: Object.freeze({ approach: "act", selfGuided: true }),
  thought_reflection: Object.freeze({ approach: "cbt", selfGuided: true }),
  self_compassion: Object.freeze({ approach: "act", selfGuided: true }),
  boundary_rehearsal: Object.freeze({ approach: "interpersonal", selfGuided: true }),
  small_behavior_experiment: Object.freeze({ approach: "cbt", selfGuided: true }),
  mindful_choice: Object.freeze({ approach: "act", selfGuided: true }),
  resource_imagery: Object.freeze({ approach: "act", selfGuided: true, imageryConsent: true,
    note: "non_regressive_resourcing_not_full_KIP" }),
  progress_review: Object.freeze({ approach: "cbt", selfGuided: true }),
  kip_clinical: Object.freeze({ approach: "kip", selfGuided: false }),
  psychodynamic_interpretation: Object.freeze({ approach: "psychodynamic", selfGuided: false }),
  emdr_processing: Object.freeze({ approach: "emdr", selfGuided: false }),
  cpt_trauma_processing: Object.freeze({ approach: "cpt", selfGuided: false }),
  exposure_processing: Object.freeze({ approach: "prolonged_exposure", selfGuided: false }),
});
const FOCI = new Set(PSYCHOLOGIST_FOCI);
const LOCALES = new Set(["en", "ru", "es"]);
const STYLES = new Set(["warm", "concise", "structured"]);
const PHASES = new Set(["intake", "exploration", "checkin", "practice_intro", "reflection", "next"]);
const SENSITIVE_FLAGS = new Set(["psychosis", "mania", "acute_dissociation", "unsafe_home",
  "severe_impairment", "intoxication", "minor", "clinical_complexity"]);
const URGENT_FLAGS = new Set(["imminent_danger", "self_harm_imminent"]);
const SAFE_RESOURCES = new Set(["supportive_person", "rest", "nature", "movement",
  "quiet_space", "creative_activity", "personal_routine"]);
const SAFE_TRIGGERS = new Set(["criticism", "uncertainty", "conflict", "overload", "change"]);
const SAFE_REACTIONS = new Set(["withdraw", "ruminate", "freeze", "overwork", "avoid"]);
const SAFE_AVOID = new Set(["resource_imagery", "present_orientation", "thought_reflection",
  "boundary_rehearsal", "small_behavior_experiment", "self_compassion"]);
const asArray = x => Array.isArray(x) ? x : [];
const distinct = xs => [...new Set(xs)];
const allowed = (xs, registry, max = 8) => distinct(asArray(xs).filter(x => typeof x === "string" &&
  registry.has(x))).slice(0, max);
const localeOf = x => LOCALES.has(x) ? x : "en";
const boundedMinutes = value => Number.isInteger(value) ? Math.max(8, Math.min(60, value)) : 20;

const COPY = Object.freeze({
  en: {
    focus: { stress: "stress and daily reactions", relationships: "relationships and boundaries",
      self_worth: "self-worth and self-criticism", meaning: "values and meaning",
      trauma_support: "trauma-related concerns" },
    titles: { orientation: "Understanding your request", support: "Resources and stability",
      pattern: "Noticing a recurring pattern", imagery: "Developing personal resources",
      beliefs: "Exploring familiar thoughts", boundaries: "Boundaries and communication",
      self_talk: "A kinder inner dialogue", values: "Values and direction",
      options: "Exploring alternatives", practice: "A small safe experiment",
      transfer: "Trying skills in daily life", integration: "Review and next steps" },
    safety: "This may need urgent human support. I am not an emergency service. If you are in immediate danger, contact local emergency services. You may also reach a trusted person or crisis service.",
    review: "This request needs a qualified professional's assessment. I cannot guide trauma processing or intensive clinical methods on my own.",
    preflight: "Before planning exercises, an appropriate safety check is needed.",
    clarify: "Which area would you like to focus on: daily stress, relationships, self-worth, or life direction?",
    pause: "Your feedback suggests this may be too much right now. We should pause the plan and consider a qualified professional's support.",
    open: "We can explore this gently, without making assumptions about what caused it.",
    checkin: "You can pause, skip this part, or change the pace at any time.",
    reflection: "Your own sense of what was helpful or uncomfortable matters more than a preset interpretation.",
    next: "We can keep the next step small and optional.",
    questions: { intake: "What would be a small, meaningful change for you?",
      exploration: "Could you describe one recent example, if you wish?",
      checkin: "How are you feeling about continuing right now?",
      practice_intro: "Would you like to try a gentle exercise, or skip it?",
      reflection: "What felt useful, neutral, or uncomfortable?",
      next: "Would you prefer to continue, adapt the plan, or stop?" },
  },
  ru: {
    focus: { stress: "стресс и повседневные реакции", relationships: "отношения и границы",
      self_worth: "самооценка и самокритика", meaning: "ценности и смысл",
      trauma_support: "переживания, связанные с травмой" },
    titles: { orientation: "Понимание вашего запроса", support: "Ресурсы и устойчивость",
      pattern: "Наблюдение за повторяющейся реакцией", imagery: "Укрепление внутренних ресурсов",
      beliefs: "Исследование привычных мыслей", boundaries: "Границы и общение",
      self_talk: "Более бережный внутренний диалог", values: "Ценности и направление",
      options: "Поиск альтернатив", practice: "Небольшой безопасный эксперимент",
      transfer: "Применение навыков в жизни", integration: "Итоги и следующие шаги" },
    safety: "Возможно, сейчас необходима срочная помощь человека. Я не экстренная служба. При непосредственной опасности обратитесь в местную экстренную службу; по возможности свяжитесь с близким человеком или кризисной службой.",
    review: "Для этого запроса нужна оценка квалифицированного специалиста. Я не провожу самостоятельно переработку травматического опыта или интенсивную клиническую терапию.",
    preflight: "Прежде чем планировать упражнения, нужна соответствующая проверка безопасности.",
    clarify: "Что сейчас важнее: повседневный стресс, отношения, самооценка или жизненное направление?",
    pause: "По вашей обратной связи нагрузка может быть чрезмерной. Программу стоит приостановить и при необходимости обратиться к квалифицированному специалисту.",
    open: "Можем бережно исследовать эту тему, не делая предположений о её причинах.",
    checkin: "Вы можете сделать паузу, пропустить упражнение или изменить темп в любой момент.",
    reflection: "Ваше собственное ощущение полезного и неприятного важнее заранее заданной трактовки.",
    next: "Следующий шаг может быть небольшим и необязательным.",
    questions: { intake: "Какое небольшое изменение было бы для вас значимым?",
      exploration: "Хотели бы вы привести один недавний пример?",
      checkin: "Как вы сейчас относитесь к продолжению?",
      practice_intro: "Хотите попробовать мягкое упражнение или пропустить его?",
      reflection: "Что было полезным, нейтральным или некомфортным?",
      next: "Вы предпочитаете продолжить, изменить программу или остановиться?" },
  },
  es: {
    focus: { stress: "el estrés y las reacciones cotidianas",
      relationships: "las relaciones y los límites",
      self_worth: "la autoestima y la autocrítica",
      meaning: "los valores y el sentido",
      trauma_support: "experiencias relacionadas con el trauma" },
    titles: { orientation: "Comprender tu objetivo", support: "Recursos y estabilidad",
      pattern: "Reconocer una reacción repetida", imagery: "Desarrollar recursos",
      beliefs: "Explorar pensamientos habituales", boundaries: "Límites y comunicación",
      self_talk: "Un diálogo interior más amable", values: "Valores y dirección",
      options: "Explorar alternativas", practice: "Un pequeño experimento seguro",
      transfer: "Llevar las habilidades a la vida diaria", integration: "Revisión y próximos pasos" },
    safety: "Esto puede necesitar ayuda humana urgente. No soy un servicio de emergencia. Si hay peligro inmediato, contacta con emergencias locales o un servicio de crisis y busca a alguien de confianza.",
    review: "Esta solicitud necesita la valoración de un profesional cualificado. No puedo guiar por mi cuenta el procesamiento del trauma ni métodos clínicos intensivos.",
    preflight: "Antes de proponer ejercicios, hace falta una comprobación adecuada de seguridad.",
    clarify: "¿Qué es prioritario: estrés cotidiano, relaciones, autoestima o dirección vital?",
    pause: "Tu respuesta indica que quizá sea demasiado por ahora. Conviene pausar el plan y considerar el apoyo de un profesional cualificado.",
    open: "Podemos explorar esto con cuidado, sin dar por hecho cuáles son sus causas.",
    checkin: "Puedes hacer una pausa, omitir el ejercicio o cambiar el ritmo cuando quieras.",
    reflection: "Tu experiencia de lo útil o incómodo importa más que una interpretación predeterminada.",
    next: "El siguiente paso puede ser pequeño y opcional.",
    questions: { intake: "¿Qué pequeño cambio sería importante para ti?",
      exploration: "¿Te gustaría compartir un ejemplo reciente?",
      checkin: "¿Cómo te sientes con la idea de continuar ahora?",
      practice_intro: "¿Prefieres probar un ejercicio suave u omitirlo?",
      reflection: "¿Qué fue útil, neutral o incómodo?",
      next: "¿Prefieres continuar, adaptar el plan o detenerte?" },
  },
});

/** Each track contains exactly eight reviewed support session outlines. */
const PATHWAYS = Object.freeze({
  stress: [
    ["orientation", ["goal_contract"]], ["support", ["present_orientation", "resource_inventory"]],
    ["pattern", ["map_trigger_response"]], ["imagery", ["resource_imagery", "resource_inventory"]],
    ["beliefs", ["thought_reflection"]], ["practice", ["small_behavior_experiment"]],
    ["transfer", ["mindful_choice"]], ["integration", ["progress_review"]],
  ],
  relationships: [
    ["orientation", ["goal_contract"]], ["support", ["resource_inventory"]],
    ["pattern", ["map_trigger_response"]], ["boundaries", ["boundary_rehearsal"]],
    ["self_talk", ["self_compassion"]], ["practice", ["small_behavior_experiment"]],
    ["transfer", ["mindful_choice"]], ["integration", ["progress_review"]],
  ],
  self_worth: [
    ["orientation", ["goal_contract"]], ["support", ["self_compassion"]],
    ["pattern", ["map_trigger_response"]], ["imagery", ["resource_imagery", "resource_inventory"]],
    ["beliefs", ["thought_reflection"]], ["options", ["values_clarification"]],
    ["practice", ["small_behavior_experiment"]], ["integration", ["progress_review"]],
  ],
  meaning: [
    ["orientation", ["goal_contract"]], ["values", ["values_clarification"]],
    ["support", ["resource_inventory"]], ["options", ["mindful_choice"]],
    ["pattern", ["map_trigger_response"]], ["practice", ["small_behavior_experiment"]],
    ["transfer", ["mindful_choice"]], ["integration", ["progress_review"]],
  ],
  // A clinician-only REVIEW DRAFT, NOT an 8-session PTSD treatment protocol.
  trauma_support: [
    ["orientation", ["goal_contract"]], ["support", ["resource_inventory"]],
    ["support", ["present_orientation"]], ["pattern", ["map_trigger_response"]],
    ["values", ["values_clarification"]], ["options", ["mindful_choice"]],
    ["transfer", ["resource_inventory"]], ["integration", ["progress_review"]],
  ],
});

const traumaMention = /травм|птср|флешбэк|психотравм|trauma|ptsd|flashbacks?|post[- ]traumatic|traum[aá]tic|trauma psicolog/iu;
const focusCues = Object.freeze({
  stress: /стресс|тревог|тревож|перегруз|выгоран|напряжен|stress|anxiet|anxious|overwhelm|burnout|ansiedad|estres|agotad/iu,
  relationships: /отношен|партнер|партнёр|границ|ссор|relat|partner|boundary|conflict|pareja|relacion|limites/iu,
  self_worth: /самооцен|самокрит|стыд|неуверен|self[- ]worth|self[- ]esteem|self[- ]critic|shame|autoestima|autocrit|verg[uü]enza/iu,
  meaning: /смысл|ценност|жизненн.*цел|meaning|values|purpose|life direction|sentido|valores|prop[oó]sito/iu,
});
function rawIsUrgent(value, lang) {
  const raw = typeof value === "string" ? value.slice(0, 4000) : "";
  // The existing localized guide preflight is reused, including long input.
  // Overlap helps avoid missing a phrase at a chunk boundary.
  for (let i = 0; i < raw.length; i += 180) {
    if (interpretSupportUtterance(raw.slice(i, i + 240), lang).kind === "safety") return true;
  }
  return false;
}
function detectedFocus(text) {
  if (traumaMention.test(text)) return "trauma_support";
  const hits = Object.entries(focusCues).filter(([, regex]) => regex.test(text)).map(([key]) => key);
  // Multiple plausible topics are not collapsed into a confident conclusion.
  return hits.length === 1 ? hits[0] : null;
}
function takePreference(input, remembered, allowedValues) {
  return allowedValues.has(input) ? input : allowedValues.has(remembered) ? remembered : null;
}
function resolveContext({ locale = "en", intent = {}, safety = {}, access = {},
  consent = {}, profile = {}, feedback = {} } = {}) {
  const lang = localeOf(locale);
  const t = COPY[lang];
  const raw = typeof intent.rawUtterance === "string" ? intent.rawUtterance.slice(0, 4000) : "";
  const flags = new Set(asArray(safety.flags));
  const base = { version: PSYCHOLOGIST_MIND_VERSION, locale: lang, mode: intent.mode === "practitioner_draft" ?
    "practitioner_draft" : "self_guided", focus: null, style: "warm",
    contextUsed: { profile: false, agentMemory: false, verifiedTestResults: false },
    confirmedResources: [], confirmedTrigger: null, confirmedReaction: null,
    avoidMethods: [], imageryEnabled: false, minutes: boundedMinutes(intent.durationMinutes) };
  if (safety.status === "urgent" || intent.safetyStop === true ||
    [...flags].some(x => URGENT_FLAGS.has(x)) || rawIsUrgent(raw, lang)) {
    return { ...base, status: "safety_handoff", message: t.safety };
  }
  if (safety.status === "human_review" || [...flags].some(x => SENSITIVE_FLAGS.has(x)) ||
    safety.isMinor === true) {
    return { ...base, status: "human_review_required", message: t.review };
  }
  if (safety.status !== "clear") return { ...base, status: "safety_check_required", message: t.preflight };
  if (feedback.discomfort === true || feedback.worsening === true) {
    return { ...base, status: "paused_for_review", message: t.pause };
  }

  const authorized = access.authenticated === true && access.ownerScoped === true;
  const profileUsed = authorized && consent.profilePersonalization === true;
  const memoryUsed = profileUsed && consent.agentMemory === true;
  const explicitFocus = FOCI.has(intent.focus) ? intent.focus : null;
  const sourceFocus = detectedFocus(raw);
  const rememberedFocus = memoryUsed && FOCI.has(profile.confirmedFocus) ? profile.confirmedFocus : null;
  const focus = explicitFocus || sourceFocus || rememberedFocus;
  const rememberedStyle = memoryUsed ? profile.preferredStyle : undefined;
  const style = takePreference(intent.style, rememberedStyle, STYLES) || "warm";
  const resources = allowed(profileUsed && consent.confirmedResources === true ?
    profile.confirmedResourceCodes : [], SAFE_RESOURCES, 7);
  const avoidMethods = distinct([
    ...allowed(intent.avoidMethods, SAFE_AVOID),
    ...(memoryUsed ? allowed(profile.avoidMethods, SAFE_AVOID) : []),
  ]);
  const imageryEnabled = consent.resourceImagery === true &&
    !avoidMethods.includes("resource_imagery") &&
    intent.noImagery !== true && !(memoryUsed && profile.noImagery === true);
  const next = { ...base, focus, style, confirmedResources: resources,
    contextUsed: { profile: profileUsed, agentMemory: memoryUsed, verifiedTestResults: false },
    confirmedTrigger: SAFE_TRIGGERS.has(intent.confirmedTrigger) ? intent.confirmedTrigger : null,
    confirmedReaction: SAFE_REACTIONS.has(intent.confirmedReaction) ? intent.confirmedReaction : null,
    avoidMethods, imageryEnabled };
  if ((raw && traumaMention.test(raw)) || intent.requestedTraumaProcessing === true ||
    focus === "trauma_support") {
    if (next.mode !== "practitioner_draft" || access.verifiedPractitioner !== true) {
      return { ...next, status: "human_review_required", message: t.review };
    }
  }
  if (next.mode === "practitioner_draft" && (!authorized || access.verifiedPractitioner !== true)) {
    return { ...next, status: "human_review_required", message: t.review };
  }
  if (!focus) return { ...next, status: "needs_focus", message: t.clarify };
  return { ...next, status: next.mode === "practitioner_draft" ? "clinician_draft" : "ready",
    message: null };
}
function formulateCase(context) {
  const hypotheses = context.confirmedTrigger && context.confirmedReaction
    ? [{ id: "possible_trigger_response_loop", evidence: ["client_confirmed_trigger",
      "client_confirmed_reaction"], tentative: true, confirmWithClient: true }]
    : [];
  return {
    model: "5P", presentingFocus: context.focus, predisposing: "unknown",
    precipitating: context.confirmedTrigger || "unknown",
    perpetuating: "not_established", protectiveResources: context.confirmedResources,
    hypotheses, diagnosis: null, traumaInferred: false,
    sourcePriority: ["current_confirmed_request", "consented_confirmed_profile",
      "tentative_hypothesis"],
  };
}
function buildSessions(context) {
  const t = COPY[context.locale];
  return PATHWAYS[context.focus].map(([titleKey, candidates], i) => {
    const ids = candidates.filter(id => {
      const meta = PSYCHOLOGIST_METHODS[id];
      return Boolean(meta?.selfGuided) &&
        !context.avoidMethods.includes(id) &&
        (!meta.imageryConsent || context.imageryEnabled);
    });
    return {
      number: i + 1, id: context.focus + ":session:" + (i + 1),
      title: t.titles[titleKey], objectiveCode: titleKey, focus: context.focus,
      methodIds: ids, approachIds: distinct(ids.map(id => PSYCHOLOGIST_METHODS[id].approach)),
      durationMinutes: context.minutes, editable: true, optional: true,
      stage: i === 0 ? "orientation" : i === 7 ? "integration" : "practice",
      requiresHumanApproval: context.mode === "practitioner_draft",
      canPauseOrSkip: true, needsSessionSafetyCheck: true,
      baselinePromptKey: "session_current_state",
      followupPromptKey: "session_current_state",
      videoAssetId: null, audioAssetId: null, mediaPublished: false,
    };
  });
}
/** Draft a coherent eight-step SUPPORT route. No session is an autonomous clinical treatment. */
export function buildPsychologyProgram(input = {}) {
  const context = resolveContext(input);
  const base = { version: context.version, locale: context.locale, mode: context.mode,
    status: context.status, focus: context.focus, message: context.message,
    contextUsed: context.contextUsed, formulation: null, primaryApproach: null,
    sessions: [], requiresHumanReview: context.status !== "ready",
    publishable: false, saved: false, modelUsed: false, clinicalTreatment: false };
  if (!["ready", "clinician_draft"].includes(context.status)) return base;
  const route = {
    stress: "cbt", relationships: "interpersonal", self_worth: "cbt",
    meaning: "act", trauma_support: "clinician_assessment",
  };
  return { ...base, formulation: formulateCase(context),
    primaryApproach: route[context.focus],
    sessions: buildSessions(context), reviewBeforeDelivery: true,
    requiresHumanReview: context.mode === "practitioner_draft",
    publishable: false,
    // Content editor + clinical approval + rights/published assets are separate gates.
    releaseGate: "review_and_content_approval_required" };
}
const DIALOGUE_CUES = Object.freeze({
  en: {
    stopped: "We can stop here. Nothing else will start automatically.",
    uncertain: "It's fine not to have an answer yet. We can take this slowly.",
    why: "This question is linked to your chosen goal and the next optional session step, not to a diagnosis.",
  },
  ru: {
    stopped: "Можем остановиться здесь. Ничего не запустится автоматически.",
    uncertain: "Необязательно сразу знать ответ. Можно двигаться постепенно.",
    why: "Этот вопрос связан с выбранной вами целью и следующим необязательным шагом, а не с диагнозом.",
  },
  es: {
    stopped: "Podemos detenernos aquí. No se iniciará nada automáticamente.",
    uncertain: "No tienes que encontrar una respuesta ahora. Podemos avanzar despacio.",
    why: "La pregunta se relaciona con el objetivo que elegiste y el siguiente paso opcional, no con un diagnóstico.",
  },
});
function conversationCue(value) {
  const text = typeof value === "string" ? value.trim().slice(0, 4000).toLowerCase() : "";
  if (!text) return null;
  if (/(?:мне стало хуже|становится хуже|после упражнения хуже|it made me worse|getting worse|feel worse|me siento peor|estoy peor)/iu.test(text)) return "worsening";
  if (/(?:^|\s)(?:стоп|останови(?:сь|те)?|хватит|прекрат[иь]|stop|pause|quit|para|detente|basta)(?:[.!?\s]|$)/iu.test(text)) return "stop";
  if (/(?:не знаю|не уверен|затрудняюсь|not sure|i don't know|i do not know|no s[eé]|no estoy seguro)/iu.test(text)) return "uncertain";
  if (/(?:^|\s)(?:почему|зачем|why|por qu[eé])(?:[?!\s]|$)/iu.test(text)) return "why";
  return null;
}
/**
 * One bounded client step. A stop or worse-after-session message takes
 * precedence over continuing an earlier session. The source text is not
 * echoed or stored.
 */
export function buildPsychologyDialogueTurn(input = {}) {
  const intent = input.intent || {};
  const text = typeof input.text === "string" ? input.text : intent.rawUtterance;
  const cue = conversationCue(text);
  const request = { ...input, intent: { ...intent, rawUtterance: text },
    feedback: { ...input.feedback, worsening: cue === "worsening" ||
      input.feedback?.worsening === true } };
  const context = resolveContext(request);
  const t = COPY[context.locale];
  const base = { version: context.version, locale: context.locale,
    status: context.status, focus: context.focus, message: context.message,
    question: null, sessionNumber: null, suggestedMethodIds: [],
    requiresHumanReview: context.status !== "ready", canStartExercise: false,
    modelUsed: false, saved: false, clinicalTreatment: false };
  if (!["ready", "needs_focus"].includes(context.status)) return base;
  if (cue === "stop") return { ...base, status: "client_paused",
    message: DIALOGUE_CUES[context.locale].stopped };
  if (context.status === "needs_focus") {
    return { ...base, question: { key: "choose_focus", text: t.clarify } };
  }
  const program = buildPsychologyProgram(request);
  if (program.status !== "ready") return { ...base, status: program.status,
    message: program.message };
  const number = Number.isInteger(input.state?.sessionNumber) &&
    input.state.sessionNumber >= 1 && input.state.sessionNumber <= 8
    ? input.state.sessionNumber : 1;
  const phase = PHASES.has(input.state?.phase) ? input.state.phase : "intake";
  const current = program.sessions[number - 1];
  const lead = phase === "reflection" ? t.reflection : phase === "next" ? t.next :
    phase === "checkin" || phase === "practice_intro" ? t.checkin : t.open;
  const brief = context.style === "concise";
  const message = cue === "uncertain" ? DIALOGUE_CUES[context.locale].uncertain :
    cue === "why" ? DIALOGUE_CUES[context.locale].why :
    brief ? lead : lead + " " + current.title + ".";
  const observation = input.consent?.processFeedback === true ?
    compareVoluntaryCheckins(input.state?.beforeCheckin, input.state?.afterCheckin) : null;
  return {
    ...base, status: "dialogue", message,
    question: { key: phase, text: t.questions[phase] },
    sessionNumber: number, currentObjective: current.objectiveCode,
    suggestedMethodIds: current.methodIds, canStartExercise: false,
    voluntaryComparison: observation,
    // A future LLM can rephrase reviewed strings; it may not change
    // risk status, session, consent, or approved method IDs.
    dialogueContract: { source: "psychologist_mind_policy", needsExplicitStart: true,
      mayAskOneQuestion: true, mayDiagnose: false, mayInterpretTrauma: false },
  };
}
/** Single dispatch entry point for the parent Holistic Intelligence agent. */
export function consultPsychologistMind({ task = "program", ...input } = {}) {
  if (task === "program") return buildPsychologyProgram(input);
  if (task === "dialogue") return buildPsychologyDialogueTurn(input);
  return { version: PSYCHOLOGIST_MIND_VERSION, status: "unsupported_task",
    modelUsed: false, saved: false };
}
