/**
 * Holistic Intelligence — Qwen response contract, RU/EN only.
 * Pure post-generation validation for the EXISTING consented owned-model path.
 * It cannot authorize actions, diagnose, establish consent or infer user's private state.
 * A rejected response falls back to the already trusted server-side rule reply.
 */
export const QWEN_REPLY_GATE_VERSION = 'hh-qwen-reply-gate-ru-en-v1';

const EN = /\b(?:the|you|your|we|would|could|should|want|need|first|step|good|understood|please|let|with|about|talk|manager|here|today|what|how|thanks|this|that|answer|conversation|together)\b/giu;
const ES = /\b(?:entendido|entiendo|terminamos|terminemos|gracias|puedes|quieres|quiero|podemos|ahora|aquí|cuál|cómo|qué|hablar|siguiente|paso|bien|trabajo|nosotros|consulta|por favor)\b/giu;
const STOP = /(?:^|[\s.!?,;:])(?:стоп|хватит|закончим|завершим|на этом всё|на этом все|не хочу (?:больше )?(?:вопросов|советов)|не предлагай|не нужно советов|не надо советов|stop(?: now)?|let'?s (?:end|stop)|end (?:this |our |the )?(?:chat|conversation)|no (?:more )?(?:advice|questions)|don'?t (?:ask|advise)|leave me alone|stop suggesting)(?=[\s.!?,;:]|$)/iu;
const OFFER = /\b(?:you (?:could|should|might|can)|try|schedule|i suggest|i recommend|would you like|let's try|take a step|a good first step)\b|(?:можно|попробуйте|попробуй|советую|рекомендую|давайте сделаем|предлагаю|вам стоит|первый шаг)/iu;
const GOAL = /(?:\b(?:my goal is|i want to|i would like to|i need to|i aim to|i hope to achieve|my objective is|i plan to)\b|(?:моя цель|хочу (?:сделать|обсудить|попросить|выяснить|достичь|подготовить|поговорить)|планирую|мне нужно (?:сделать|обсудить|попросить|подготовить|решить)))/iu;
const CLAIMED_ACTION = /\b(?:i (?:have |already )?(?:booked|scheduled|reserved|sent|saved|paid|ordered) (?:your|the|a|an)|your (?:appointment|payment|booking|order) (?:is|has been) (?:confirmed|completed|booked|paid))\b|(?:я (?:уже )?(?:забронировал|записал вас|отправил|оплатил|сохранил|оформил заказ)|ваша (?:оплата|запись|бронь) (?:подтверждена|оформлена))/iu;

function suspiciousLanguage(locale, reply) {
  const latin = (reply.match(/\p{Script=Latin}/gu) || []).length;
  const cyr = (reply.match(/\p{Script=Cyrillic}/gu) || []).length;
  const e = (reply.match(EN) || []).length;
  const s = (reply.match(ES) || []).length;
  if (locale === 'ru') return cyr < 2 && (latin >= 10 || e >= 2 || s >= 2);
  if (locale === 'en') return (cyr >= 8 && cyr > latin) || (s >= 2 && e === 0 && latin >= 10);
  return false;
}

/** Strip empty model bookkeeping only. Any nonempty thought block remains invalid. */
export function removeEmptyQwenThink(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/^(?:<think>[\s\uFEFF]*<\/think>[\s\uFEFF]*)+/giu, '').trim();
}

/**
 * @returns {{accepted: boolean, text: string|null, reason: string}}
 * Only call AFTER the existing site-level safety / actor / consent decision.
 * The host's acceptNaturalOutput() still checks links, HTML and impersonation.
 */
export function reviewQwenOwnedReply({response, locale, role, userMessage} = {}) {
  const text = removeEmptyQwenThink(response);
  if (locale !== 'ru' && locale !== 'en')
    return {accepted: typeof response === 'string', text: response ?? null, reason: 'locale_unchanged'};
  if (!text || text.length > 1200) return {accepted: false, text: null, reason: 'empty_or_oversized'};
  if (/<\/?(?:think|im_start|im_end|system|assistant|user)(?:\s|>|\/)/iu.test(text))
    return {accepted: false, text: null, reason: 'reasoning_or_role_token_leak'};
  if (suspiciousLanguage(locale,text)) return {accepted: false, text: null, reason: 'clearly_wrong_language'};
  const questionCount = (text.match(/[?？]/gu) || []).length;
  if (questionCount > 1) return {accepted: false, text: null, reason: 'too_many_questions'};
  if (CLAIMED_ACTION.test(text)) return {accepted: false, text: null, reason: 'unverified_action_claim'};
  if (typeof userMessage === 'string' && STOP.test(userMessage) && (questionCount || OFFER.test(text)))
    return {accepted: false, text: null, reason: 'stop_boundary_breach'};
  if (role === 'coach' && typeof userMessage === 'string' &&
      !GOAL.test(userMessage) && OFFER.test(text))
    return {accepted: false, text: null, reason: 'advice_before_goal'};
  return {accepted: true, text, reason: 'passed_limited_heuristics'};
}