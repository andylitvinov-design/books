// Holistic Support local conversation cues. Reuse the reviewed home guide's
// privacy/safety/topic parser; this is NOT an LLM and never makes network calls.
import { resolveHomeGuideQuestion } from "../home-conversation.mjs";

/** @type {Array<[string, RegExp]>} */
const topicPatterns = [
  ["love", /отношен|любов|близост|партнер|партнёр|общен|relat|partner|love|pareja|relacion|amor|vinculo/u],
  ["money", /деньг|денег|доход|зарплат|бизнес|работ(?:а|ы|е|у|ой|ах|ам)(?![а-яё])|рабоч|карьер|финанс|money|income|job|career|business|workplace|at work|my work|dinero|trabajo|negocio|ingreso/u],
  ["meaning", /смысл|ценност|призван|направлен|meaning|purpose|values|sentido|proposito|valores/u],
  ["meaning", /цел[ьяие]|фокус|план|мотивац|откладыв|focus|goal|plan|motivat|procrastin|objetiv|meta|planes/u],
  ["energy", /энерги|устал|сил[ыу]|сон|стресс|напряжен|тревог|energy|tired|stress|sleep|exhaust|energia|cansad|estres|sueno/u],
];
/** @type {Array<[string, RegExp]>} */
const formatPatterns = [
  ["mandala", /мандал|mandala/u],
  ["healing", /рейки|рэйки|reiki/u],
  ["consultation", /сесси|консультац|мастер[ау]?|психотерап|session|consult|practitioner|sesion|consulta|profesional/u],
  ["tests", /тест|опрос|диагностик|test|quiz|assessment|cuestionario|prueba/u],
  ["courses", /курс|программ|урок|обучени|course|lesson|academy|curso|programa|leccion/u],
  ["meditation", /видео|медитац|ролик|посмотр|video|meditat|watch|meditacion|ver video/u],
];
const yes = /^(?:да|согласен|согласна|подходит|верно|ага|ок|хорошо|yes|yeah|sure|ok|okay|agree|si|claro|vale|de acuerdo)[.! ]*$/u;
const no = /^(?:нет|не согласен|не согласна|другая тема|другое|no|not really|different|otro tema|otra cosa)[.! ]*$/u;
const switchTopic = /(?:сменить|поменять|друг[а-я]*\s+тем|изменить\s+тем|change\s+(?:the\s+)?topic|another topic|different topic|cambiar\s+(?:el\s+)?tema|otro tema)/u;
const switchFormat = /(?:друг[а-я]*\s+формат|изменить\s+формат|change\s+(?:the\s+)?format|other format|otro formato|cambiar formato)/u;

function normalize(text) {
  return String(text ?? "").trim().toLocaleLowerCase().replace(/ё/g, "е")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

/**
 * Editorial, local cues from free text. Ambiguous text is not treated as
 * consent, a health conclusion, a booking, or an exact content match.
 */
export function interpretSupportUtterance(raw, locale = "en") {
  const text = String(raw ?? "").trim().slice(0, 240);
  if (!text) return { kind: "empty" };
  const parsed = resolveHomeGuideQuestion(text, locale);
  if (parsed.urgent) return { kind: "safety", text };
  const n = normalize(text);
  if (switchTopic.test(n)) return { kind: "switch-topic", text };
  if (switchFormat.test(n)) return { kind: "switch-format", text };
  if (yes.test(n)) return { kind: "agree", text };
  if (no.test(n)) return { kind: "disagree", text };
  const topic = topicPatterns.find(([, rule]) => rule.test(n))?.[0]
    ?? ({ relationships: "love", work: "money", resources: "energy", stress: "energy" }[parsed.topic] || null);
  const format = formatPatterns.find(([, rule]) => rule.test(n))?.[0]
    ?? (parsed.interest === "reiki" ? "healing" : parsed.interest === "courses" ? "courses" : null);
  let question = null;
  if (/(?:почему|зачем|why|por que|porque)\b/u.test(n) ||
      /^(?:почему|зачем|why\b|por que\b)/u.test(n)) question = "why";
  else if (/стоим|цен[аыу]|сколько сто|платн|цена|cost|price|pay|cuanto cuesta|precio|pagar/u.test(n)) question = "price";
  else if (/что.*(лучше|выбрать)|видео.*или.*тест|which.*(better|choose)|video.*or.*test|que.*(elegir|mejor)/u.test(n)) question = "compare";
  else if (/ты.*(человек|настоящ|ии|бот)|are you (real|human|ai|a bot)|eres (real|humano|una ia)/u.test(n)) question = "identity";
  else if (/что.*дальше|как.*работ|как.*выбира|how.*work|what.*next|como.*funciona|que sigue/u.test(n)) question = "process";
  return { kind: "text", text, topic, format, question };
}

/** @param {string} raw @returns {number | null | undefined} */
export function parseSupportMinutes(raw) {
  const n = normalize(raw);
  if (/позже|не сейчас|нет времени|later|not now|another day|mas tarde|otro dia/u.test(n)) return null;
  const m = n.match(/(?:^|\s)(\d{1,3})(?:\s*(?:мин|минут|minutes?|mins?|minutos?))?(?:\b|$)/u);
  if (m) {
    const v = Number(m[1]);
    return Number.isInteger(v) && v >= 1 && v <= 180 ? v : undefined;
  }
  /** @type {Array<[number, RegExp]>} */
  const words = [
    [5, /^(?:пять|five|cinco)(?:\s|$)/u],
    [10, /^(?:десять|ten|diez)(?:\s|$)/u],
    [15, /^(?:пятнадцать|fifteen|quince)(?:\s|$)/u],
    [20, /^(?:двадцать|twenty|veinte)(?:\s|$)/u],
    [30, /^(?:тридцать|thirty|treinta)(?:\s|$)/u],
  ];
  return words.find(([, rule]) => rule.test(n))?.[0];
}

/** @param {{ available: string[], minutes: number | null, need: string, preferred?: string }} params @returns {string | null} */
export function chooseSupportFormat({ available, minutes, need, preferred }) {
  const enabled = Array.isArray(available) ? available : [];
  if (enabled.length === 0) return null;
  if (preferred && enabled.includes(preferred)) return preferred;
  const n = normalize(need);
  if (/понять|оценить|измерить|разобрат|understand|measure|assess|evaluar|comprender/u.test(n) &&
    enabled.includes("tests")) return "tests";
  if (minutes !== null && minutes !== undefined && minutes <= 10 &&
    enabled.includes("meditation")) return "meditation";
  return ["tests", "meditation", "courses", "mandala", "healing", "consultation"]
    .find(item => enabled.includes(item)) ?? enabled[0];
}
