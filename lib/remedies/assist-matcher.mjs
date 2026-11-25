// Educational archive matching only. Not a medical triage, diagnosis or treatment recommendation.
// The browser does not transmit symptom text to Qwen or a third-party service.
import { getRemedySymptoms, isBachEssence, remedySymptomSlugs } from "../../data/remedy-symptoms.js";

const STOP = new Set("и или но без при для после перед когда если меня моем моей есть очень сильно постоянно иногда обычно просто сейчас чувствую хочу чтобы нужно проблема себя вы он она было были этот этом from after during before with when while there their very really have feel want because just here that this into more less some been being your them they what where como para pero una uno con por los las del que estoy siento tengo sobre algo desde antes cuando donde mucho muy poco esto esa este esta el la a an the in on at to by of is are was were be for no not sin mi me yo dolor".split(/\s+/));
const CONCEPTS = [
  ["anxiety", "тревог|тревож|волнени|нервнича|боюсь|страх|испуг|беспокой|смущен|стыд|anxiet|anxious|fear|nervou|worr|embarrass|shame|ansiedad|miedo|temor|verguenza|nervios|preocup"],
  ["social", "общени|общат|людьми|людях|люд|толпе|толп|незнаком|публик|выступлен|контакт|company|crowd|people|social|public|speak|stranger|personas|gente|multitud|hablar|publico"],
  ["tremor", "дрож|тремор|вздраг|тряс|подерг|trembl|shak|shiver|twitch|tembl|sacud"],
  ["tightness", "сжат|сдавл|стеснен|напряжени|напряж|спазм|tight|tense|tension|constrict|pressure|spasm|opresion|tension|espasmo"],
  ["chest", "груд|сердц|палпитац|heartbeat|chest|heart|palpitat|pecho|corazon|palpitac"],
  ["digestion", "живот|желуд|тошн|рвот|запор|понос|диаре|вздут|отрыж|стул|stomach|nause|vomit|constipat|diarr|bloat|abdomen|heces|estomag|estren|nause|vomit|hincha"],
  ["sleep", "сон|сна|сне|спать|засып|бессон|sleep|insomn|asleep|dorm|sueno|insomnio"],
  ["exhaustion", "устал|истощ|слаб|утомл|обессил|fatigue|exhaust|weak|tired|fatiga|agotam|debil|cansan"],
  ["dizziness", "головокруж|темнеет|dizz|vertig|mareo|vertig"],
  ["head", "голов|виск|мигрен|headach|temple|migraine|cabeza|cefale|migra"],
  ["throat", "горл|гортан|глот|голос|кашел|кашл|нос|throat|laryn|cough|voice|nose|garganta|tos|laringe|voz|nariz"],
  ["temperature", "жар|зяб|озноб|холод|тепл|температур|fever|cold|chill|heat|warm|fiebre|frio|calor|escalofr"],
  ["skin", "кож|зуд|сыпь|припух|отек|skin|itch|rash|swell|piel|picor|hinch"],
  ["urination", "моч|мочеиспуск|urina|miccion"],
  ["breath", "дыха|дыхани|одыш|breath|respir|aliento"],
  ["food", "ед[аыуе]|пищ|milk|meal|food|eating|comida|leche|alimento"],
  ["timing", "утром|вечер|ноч|morning|night|evening|manana|noche|tarde"],
  ["pain", "бол[ьи]|ломот|болезнен|pain|ache|sore|dolor|duele"],
].map(([key, expression]) => [key, new RegExp(expression, "iu")]);

function normalize(value) {
  return String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/ё/g, "е");
}
function tokens(value) {
  const words = (normalize(value).match(/[\p{L}]{3,}/gu) || []).filter((word) => !STOP.has(word));
  return [...new Set(words.map((word) => word.length >= 7 ? word.slice(0, 5) : word.length >= 5 ? word.slice(0, 4) : word))]
    .filter((word) => word.length >= 3 && !STOP.has(word));
}
function concepts(value) {
  const plain = normalize(value);
  return CONCEPTS.filter(([, pattern]) => pattern.test(plain)).map(([id]) => id);
}
export function containsUrgentSymptoms(value) {
  const text = normalize(value);
  return /suicid|kill myself|self.harm|убить себя|покончить с собой|самоповрежд|хочу умереть|quiero morir|hacerme dano|chest pain|heart attack|dolor (?:en el )?pecho|боль в груди|болит грудь|сильн.{0,15}бол.{0,20}груд|cannot breath|can.t breath|difficulty breathing|shortness of breath|не могу дышать|трудно дышать|задыхаюсь|dificultad para respirar|no puedo respirar|потер.{0,4}сознани|без сознани|unconscious|fainting|perdida de conocimiento|stroke|инсульт|судорог|convulsion|сильн.{0,10}кровотеч|heavy bleeding|sangrado abundante/iu.test(text);
}
export function rankRemedyDescriptions(query, profiles, limit = 3) {
  const request = String(query || "").slice(0, 280).trim();
  if (containsUrgentSymptoms(request)) return { status: "urgent", matches: [] };
  const queryTokens = tokens(request), queryConcepts = concepts(request);
  if (request.length < 9 || queryTokens.length < 2) return { status: "insufficient", matches: [] };
  const candidates = [];
  for (const profile of profiles) {
    if (!profile.slug || !Array.isArray(profile.symptoms) || profile.symptoms.length !== 4 || isBachEssence(profile.slug)) continue;
    const evidence = [], anchors = new Set();
    for (const symptom of profile.symptoms) {
      const wordSet = new Set(tokens(symptom)), tagSet = new Set(concepts(symptom));
      const lexical = queryTokens.filter((word) => wordSet.has(word)), semantic = queryConcepts.filter((tag) => tagSet.has(tag));
      const score = lexical.length * 2 + semantic.length * 1.1;
      if (score < 1.1) continue;
      lexical.forEach((word) => anchors.add("word:" + word));
      semantic.forEach((tag) => anchors.add("concept:" + tag));
      evidence.push({ symptom, score });
    }
    const score = evidence.reduce((sum, row) => sum + row.score, 0);
    if (anchors.size < 2 || score < 3.5) continue;
    evidence.sort((a, b) => b.score - a.score);
    candidates.push({ slug: profile.slug, score, matchedSymptoms: evidence.slice(0, 2).map((row) => row.symptom) });
  }
  candidates.sort((a, b) => b.score - a.score || b.matchedSymptoms.length - a.matchedSymptoms.length || a.slug.localeCompare(b.slug));
  return { status: candidates.length ? "matches" : "insufficient",
    matches: candidates.slice(0, Math.max(0, Math.min(limit, 3))).map(({ score, ...candidate }) => candidate) };
}
export function matchRemedyDescriptions(query, locale = "ru", limit = 3) {
  if (!["ru", "en", "es"].includes(locale)) return { status: "insufficient", matches: [] };
  const profiles = remedySymptomSlugs.map((slug) => ({ slug, symptoms: getRemedySymptoms(slug, locale) }));
  return rankRemedyDescriptions(query, profiles, limit);
}
