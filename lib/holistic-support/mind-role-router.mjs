/**
 * Holistic Intelligence: deterministic presentation-role router.
 * Secretary and Coach are prompt policies for ONE configured language model,
 * not model identifiers, authorizations, psychological assessments or memory stores.
 * No I/O, no network, no access to private client records.
 */
export const MIND_ROLE_ROUTER_VERSION = "hi-unified-qwen-roles-v2";
const GOALS = new Set(["energy", "relationships", "money", "goals", "meaning"]);
const normalize = value => typeof value === "string"
  ? value.toLocaleLowerCase().normalize("NFKC").replace(/ё/g, "е").trim().slice(0, 3000)
  : "";
const SERVICE = /(?:цен[аыуе]|стоимост|сколько стоит|прайс|оплат|записат|запись на|расписан|брониров|заказ|подписк|аккаунт|кабинет|войти|вход на сайт|ошибк|техническ|не работает|не приходит письм|доступ|где найти|где мой|как (?:купить|заказать|записаться|сохранить|скачать)|\b(?:price|pricing|costs?|payment|refund|booking|appointment|calendar|schedule|subscription|account|login|sign in|support ticket|technical|error|bug|not working|can't log in|cannot log in|where can i find|download)\b|\b(?:book|pay|cancel|order)\s+(?:a |an |the |my |our |your )?(?:session|appointment|consultation|subscription|order|booking|course|class)\b)/iu;
const COACH = /(?:моя цель|мою цель|свою цель|целей|цель на|мотивац|прокрастинац|не могу решит|сложно выбрать|не знаю чего хочу|застрял|застряла|не понимаю чего хочу|хочу изменит|хочу разобраться|не знаю с чего начать|трудно решит|мне трудно|мне сложно|мне страшно|боюсь выступать|отношени[яйх]|чувствую себя|мне тревожно|мне тяжело|я растерян|я растеряна|\b(?:my goal|my goals|set goals|motivat|procrastinat|feel stuck|feeling stuck|i'm stuck|i am stuck|hard to decide|can't decide|cannot decide|not sure what i want|want to change|want to understand myself|my relationship|my relationships|i feel|feeling lost|how do i start changing|i am afraid|i'm afraid|i struggle with|struggling with|i want to (?:build|improve|change|start|become|write|learn))\b)/iu;
const DECLINE_COACH = /(?:не хочу (?:коучинг|совет|советов|упражнен|обсуждать чувства)|без коучинга|без советов|не надо давать советы|просто ответь|только факты|не советуй|\b(?:no coaching|don't coach me|do not coach me|just answer|facts only|no advice|not looking for coaching|just the facts)\b)/iu;
const FOLLOW_UP = /^(?:да|ага|нет|ок|хорошо|а (?:как|что|почему|если)|как|почему|зачем|и что|что дальше|дальше|подробнее|продолжи|\b(?:yes|no|ok|okay|sure|why|how|what next|tell me more|continue|and then|what about that|can you explain)\b)[\s.!?,…]*$/iu;
const DECLINE_BOOKING = /(?:не хочу (?:записываться|записаться|бронировать)|не надо записывать|\b(?:do not|don't|don't want to|do not want to|not|no need to)\s+(?:book|schedule|make an appointment)\b)/iu;
const CHANGE_TOPIC = /(?:другая тема|сменим тему|поменяем тему|не об этом|новая тема|\b(?:change (?:the )?topic|new topic|something else|not about that|switch topics)\b)/iu;
const STOP = /^(?:стоп|хватит|закончим|не хочу продолжать|\b(?:stop|that's enough|end chat|goodbye|bye)\b)[.! ]*$/iu;
const ROLE_INSTRUCTIONS = Object.freeze({
  secretary: 'You are Secretary Mind, the practical information role of ONE Holistic House AI. Start by answering the actual question; be kind and direct. Answer using only verified trusted context for prices, bookings, availability and links. If the answer is unknown, say so and ask one concrete question, not a psychological question. Do not claim to have booked, paid, sent, saved, changed or checked anything you have not done. No unsolicited coaching or sales.',
  coach: 'You are Coach Mind, the goal-dialogue role of the SAME Holistic House AI, not a human or therapist. First recognize only what the user explicitly said, without interpreting hidden motives. If the desired result is unclear, ask ONE gentle question about it BEFORE offering advice, without prescribing a step. If clear, offer at most ONE tiny optional action; let the person decline. Avoid diagnosis, treatment promises, sales, canned pep talks and multiple questions. Respect a stop or correction.',
  general: "Stay with the existing neutral Holistic House AI guide role; do not activate experimental specialist prompt policies for this locale.",
});
/** Route an editorial role only; downstream safety, consent and access decisions win. */
export function routeMindRole({message = "", history = [], locale = "en", selectedGoal = null} = {}) {
  const version = MIND_ROLE_ROUTER_VERSION;
  // Spanish remains on the existing generic behavior; this pilot covers RU/EN only.
  if (locale !== "ru" && locale !== "en") return {role: "general", reason: "locale_not_enabled", version};
  const text = normalize(message);
  if (STOP.test(text) || DECLINE_COACH.test(text)) return {role:'secretary',reason:'client_boundary',version};
  if (CHANGE_TOPIC.test(text)) return {role:'secretary',reason:'client_topic_change',version};
  if (!text) return {role: "secretary", reason: "empty", version};
  const coach = COACH.test(text), service = SERVICE.test(text);
  if (service && !(coach && DECLINE_BOOKING.test(text)))
    return {role:'secretary',reason:'explicit_service_question',version};
  if (coach) return {role:'coach',reason:'explicit_coaching_topic',version};
  if (FOLLOW_UP.test(text) && Array.isArray(history)) {
    for (const turn of history.slice(-6).reverse()) {
      if (turn?.role !== "user" || typeof turn.text !== "string") continue;
      const earlier = normalize(turn.text);
      if (STOP.test(earlier) || DECLINE_COACH.test(earlier) || CHANGE_TOPIC.test(earlier) || SERVICE.test(earlier))
        return {role: "secretary", reason: "user_follow_up", version};
      if (COACH.test(earlier)) return {role: "coach", reason: "user_follow_up", version};
    }
  }
  if (GOALS.has(selectedGoal)) return {role: "coach", reason: "chosen_goal", version};
  return {role: "secretary", reason: "conservative_default", version};
}
const EXAMPLES = Object.freeze({
  ru: {
    secretary: 'Style example (not a fact source): User: «Не открывается кабинет». Assistant: «Понимаю. На каком шаге появляется ошибка?»',
    coach: 'Style example (not user evidence): User: «Не знаю, с чего начать». Assistant: «Похоже, сейчас непросто выбрать направление. Что вам хотелось бы изменить в первую очередь?»',
  },
  en: {
    secretary: 'Style example (not a fact source): User: "The sign-in button does nothing." Assistant: "Got it. What happens when you tap it?"',
    coach: 'Style example (not user evidence): User: "I feel stuck." Assistant: "It sounds hard to get moving. What would you most like to change first?"',
  },
});
export function mindRoleInstruction(role,locale) {
  const instruction = ROLE_INSTRUCTIONS[role] || ROLE_INSTRUCTIONS.general;
  return EXAMPLES[locale]?.[role] ? instruction + ' ' + EXAMPLES[locale][role] : instruction;
}
