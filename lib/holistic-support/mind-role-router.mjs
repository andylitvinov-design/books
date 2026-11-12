/**
 * Holistic Intelligence: deterministic presentation-role router.
 * Secretary and Coach are prompt policies for ONE configured language model,
 * not model identifiers, authorizations, psychological assessments or memory stores.
 * No I/O, no network, no access to private client records.
 */
export const MIND_ROLE_ROUTER_VERSION = "hi-unified-qwen-roles-v1";
const GOALS = new Set(["energy", "relationships", "money", "goals", "meaning"]);
const normalize = value => typeof value === "string"
  ? value.toLocaleLowerCase().normalize("NFKC").replace(/ё/g, "е").trim().slice(0, 3000)
  : "";
const SERVICE = /(?:цена|стоимост|сколько стоит|прайс|оплат|записат|запись на|расписан|бронир|заказ|подписк|аккаунт|кабинет|войти|вход на сайт|ошибк|техническ|не работает|доступ|где найти|как (?:купить|заказать|записаться|сохранить|скачать)|\b(?:price|pricing|cost|pay|payment|book|booking|appointment|schedule|calendar|order|subscription|account|login|sign in|support ticket|technical|error|bug|not working|where can i find|download|refund)\b)/iu;
const COACH = /(?:моя цель|мою цель|свою цель|целей|мотивац|прокрастинац|не могу решит|сложно выбрать|не знаю чего хочу|застрял|застряла|не понимаю чего хочу|хочу изменит|хочу разобраться|не знаю с чего начать|трудно решит|отношени[яйх]|чувствую себя|мне тревожно|мне тяжело|\b(?:my goal|set goals|motivat|procrastinat|feel stuck|feeling stuck|i'm stuck|i am stuck|hard to decide|can't decide|cannot decide|not sure what i want|want to change|want to understand myself|my relationship|my relationships|i feel|feeling lost|how do i start changing)\b)/iu;
const DECLINE_COACH = /(?:не хочу (?:коучинг|совет|советов|упражнен|обсуждать чувства)|без коучинга|просто ответь|только факты|\b(?:no coaching|don't coach me|do not coach me|just answer|facts only|no advice|not looking for coaching)\b)/iu;
const FOLLOW_UP = /^(?:да|ага|нет|ок|хорошо|а (?:как|что|почему)|как|почему|зачем|и что|что дальше|дальше|подробнее|продолжи|\b(?:yes|no|ok|okay|sure|why|how|what next|tell me more|continue|and then)\b)[\s.!?,…]*$/iu;
const ROLE_INSTRUCTIONS = Object.freeze({
  secretary: "You are Secretary Mind, a service and information role of the same Holistic House AI. Answer the client's direct factual or organizational question using only verified trusted context. If the answer is unavailable, say so and ask at most one focused question. Never initiate coaching, infer motives, invent availability or prices, or claim a booking, payment, message, or file action occurred.",
  coach: "You are Coach Mind, a goal-clarification role of the same Holistic House AI, not a human or therapist. If the person's desired outcome is unclear, ask one gentle concrete goal question BEFORE offering advice. Once the outcome is explicit, reflect it briefly and offer at most one small OPTIONAL next step grounded in the user's own words and trusted choices. Do not diagnose, infer hidden motives, pressure the person, or pretend to provide treatment. Respect corrections, refusals, and the request to stop.",
  general: "Stay with the existing neutral Holistic House AI guide role; do not activate experimental specialist prompt policies for this locale.",
});
/** Route an editorial role only; downstream safety, consent and access decisions win. */
export function routeMindRole({message = "", history = [], locale = "en", selectedGoal = null} = {}) {
  const version = MIND_ROLE_ROUTER_VERSION;
  // Spanish remains on the existing generic behavior; this pilot covers RU/EN only.
  if (locale !== "ru" && locale !== "en") return {role: "general", reason: "locale_not_enabled", version};
  const text = normalize(message);
  if (!text) return {role: "secretary", reason: "empty", version};
  if (DECLINE_COACH.test(text)) return {role: "secretary", reason: "client_boundary", version};
  if (SERVICE.test(text)) return {role: "secretary", reason: "explicit_service_question", version};
  if (COACH.test(text)) return {role: "coach", reason: "explicit_coaching_topic", version};
  if (FOLLOW_UP.test(text) && Array.isArray(history)) {
    for (const turn of history.slice(-6).reverse()) {
      if (turn?.role !== "user" || typeof turn.text !== "string") continue;
      const earlier = normalize(turn.text);
      if (DECLINE_COACH.test(earlier) || SERVICE.test(earlier))
        return {role: "secretary", reason: "user_follow_up", version};
      if (COACH.test(earlier)) return {role: "coach", reason: "user_follow_up", version};
    }
  }
  if (GOALS.has(selectedGoal)) return {role: "coach", reason: "chosen_goal", version};
  return {role: "secretary", reason: "conservative_default", version};
}
export function mindRoleInstruction(role) {
  return ROLE_INSTRUCTIONS[role] || ROLE_INSTRUCTIONS.general;
}
