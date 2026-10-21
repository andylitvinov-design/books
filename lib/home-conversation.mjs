import { detectIdeasQuestionLocale, matchIdeasTopic } from "./ideas-guidance.mjs";

// A local, privacy-preserving guide. This is NOT an LLM or a diagnostic service.
// No free-text input is placed in a URL, sent to a provider, or recorded here.
export const homeGuideGoals = Object.freeze(["understand", "tests", "practice", "consult", "ideas"]);

const immediateHelp = [
  /\b(suicid\w*|kill myself|end my life|hurt myself)\b/i,
  /(?:хочу|собираюсь|планирую)\s+(?:умереть|покончить с собой)/i,
  /(?:суицид|самоубийств)/i,
  /\b(suicidarme|matarme|quitarme la vida)\b/i,
];

export function resolveHomeGuideQuestion(input, fallbackLocale = "en") {
  const question = String(input ?? "").trim().slice(0, 500);
  const lang = detectIdeasQuestionLocale(question, fallbackLocale);
  if (immediateHelp.some(pattern => pattern.test(question))) {
    return { lang, topic: null, matched: false, urgent: true };
  }
  const match = matchIdeasTopic(question);
  return { lang, topic: match.topic, matched: match.matched, urgent: false };
}

export function homeGuideDestinations({ goal, topic, locale }) {
  if (!homeGuideGoals.includes(goal)) throw new Error("Unknown guide goal");
  const pageLocale = ["ru", "en", "es"].includes(locale) ? locale : "en";
  // Some private test routes do not offer an ES interface yet; reuse EN.
  const testLocale = pageLocale === "es" ? "en" : pageLocale;
  const main = {
    understand: "/" + pageLocale + "/services/free-situation-review",
    tests: "/" + testLocale + "/client/tests",
    practice: "/" + pageLocale + "/academy",
    consult: "/" + pageLocale + "/services#consultation",
    ideas: "/" + pageLocale + "/books",
  };
  const secondary = topic === "work" && goal !== "consult"
    ? "/" + pageLocale + "/explore/business"
    : goal === "ideas"
      ? "/" + pageLocale + "/services/free-situation-review"
      : "/" + pageLocale + "/books";
  return { primary: main[goal], secondary };
}
