import aphorismData from "../data/ideas-aphorisms.json" with { type: "json" };

// Client-side guidance for the public Ideas page. No user text is persisted or sent to APIs.
// Aphorisms below are new editorial reflections, not historical quotations.
export const ideaTopics = Object.freeze(["relationships", "stress", "resources", "work", "direction"]);

const stems = {
  relationships: ["отношен", "расстав", "развод", "муж", "жен", "ссор", "любов", "любв", "любл", "близост", "партнер", "партнерш", "семь", "супруг", "довер", "конфликт", "друж", "одиноч", "relationship", "love", "partner", "family", "marriage", "friend", "conflict", "trust", "relacion", "amor", "pareja", "familia", "amistad", "conflicto", "soledad"],
  stress: ["тревог", "тревож", "страш", "бою", "волн", "страх", "паник", "боюс", "стыд", "стыж", "стресс", "нерв", "напряж", "беспокой", "неуверен", "anxiet", "anxious", "afraid", "worried", "stress", "fear", "panic", "asham", "worri", "nervous", "ansiedad", "estres", "miedo", "panico", "verguenz", "preocup"],
  resources: ["ресурс", "отдых", "высп", "энерг", "устал", "выгор", "истощ", "переутом", "сон", "сплю", "сил", "восстанов", "energy", "burnout", "exhaust", "fatigu", "sleep", "tired", "resource", "energia", "agotad", "cansad", "descans", "sueno"],
  work: ["работ", "карьер", "бизнес", "проект", "доход", "деньг", "финанс", "клиент", "предприним", "зарплат", "job", "work", "career", "business", "money", "financ", "income", "client", "project", "trabaj", "carrera", "negocio", "dinero", "ingreso", "proyecto", "empleo"],
  direction: ["выбор", "выбрат", "выбир", "перемен", "решен", "смысл", "будущ", "цель", "путь", "направлен", "изменен", "призван", "choice", "decis", "purpose", "future", "direction", "change", "meaning", "goal", "decision", "proposito", "sentido", "futuro", "direccion", "cambio", "decision", "meta"],
};

function tokensFor(text) {
  return String(text ?? "").slice(0, 500).toLocaleLowerCase().normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "").replace(/ё/g, "е").match(/[\p{L}\p{N}]+/gu) ?? [];
}

export function matchIdeasTopic(question) {
  const tokens = tokensFor(question);
  let topic = "direction";
  let score = 0;
  for (const candidate of ideaTopics) {
    // Count different matched words, not repeated usage of the same word.
    const count = new Set(tokens.filter(token => stems[candidate].some(stem => token.startsWith(stem)))).size;
    if (count > score) { score = count; topic = candidate; }
  }
  return { topic, matched: score > 0 };
}

// Compiled editorial snapshot of the public aphorism table. Neither the query nor
// its inferred topic is sent to a database, search provider, analytics, or LLM.
export const ideasAphorismCatalog = Object.freeze(aphorismData.items);
export const ideasAphorismSources = Object.freeze(aphorismData.sources);

// Answer language is inferred from the question on the device (never sent to a provider).
export function detectIdeasQuestionLocale(question, fallback = "en") {
  const sample = String(question ?? "").slice(0, 500);
  const cyrillic = (sample.match(/[А-Яа-яЁё]/g) ?? []).length;
  const latin = (sample.match(/[A-Za-z]/g) ?? []).length;
  if (cyrillic >= 2 && cyrillic >= latin / 2) return "ru";
  if (!latin) return fallback;
  const normalized = sample.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const words = normalized.match(/[a-z]+/g) ?? [];
  const spanishCues = new Set(["quiero", "tengo", "porque", "como", "necesito", "estoy",
    "puedo", "trabajo", "pareja", "siento", "miedo", "ansiedad", "pregunta", "cambiar",
    "dificil", "sentido", "cansado", "encontrar", "ayuda", "gracias"]);
  const cues = words.filter(word => spanishCues.has(word)).length;
  if (/[¿¡ñáéíóúü]/i.test(sample) || cues >= 2 || (fallback === "es" && cues > 0)) return "es";
  return "en";
}

// Transliteration of classical source labels only; the linked editions are not verbatim quotations.
const localizedSourceLabels = {
  emerson: { ru: ["Ральф Уолдо Эмерсон", "Очерки. Первая серия"], es: ["Ralph Waldo Emerson", "Ensayos, primera serie"] },
  epictetus: { ru: ["Эпиктет", "Энхиридион"], es: ["Epicteto", "Manual de vida (Enquiridión)"] },
  thoreau: { ru: ["Генри Дэвид Торо", "Уолден"], es: ["Henry David Thoreau", "Walden"] },
  seneca: { ru: ["Сенека", "Нравственные письма к Луцилию"], es: ["Séneca", "Cartas morales a Lucilio"] },
  laozi: { ru: ["Лао-цзы", "Дао дэ цзин"], es: ["Laozi", "Tao Te Ching"] },
  marcus: { ru: ["Марк Аврелий", "Наедине с собой"], es: ["Marco Aurelio", "Meditaciones"] },
  dhammapada: { ru: ["Дхаммапада", "Дхаммапада"], es: ["Dhammapada", "Dhammapada"] },
  gibran: { ru: ["Халиль Джебран", "Пророк"], es: ["Khalil Gibran", "El profeta"] },
  montaigne: { ru: ["Мишель де Монтень", "Опыты"], es: ["Michel de Montaigne", "Ensayos"] },
};

const relatedThemes = {
  relationships: ["relationships", "love", "boundaries", "loneliness", "selfworth"],
  stress: ["stress", "acceptance", "courage", "resources", "selfworth"],
  resources: ["resources", "time", "gratitude", "acceptance", "purpose"],
  work: ["work", "time", "direction", "courage", "creativity"],
  direction: ["direction", "purpose", "creativity", "courage", "acceptance"],
  love: ["love", "relationships", "boundaries", "loneliness"],
  boundaries: ["boundaries", "relationships", "selfworth", "courage"],
  selfworth: ["selfworth", "courage", "acceptance", "boundaries"],
  loneliness: ["loneliness", "relationships", "love", "selfworth"],
  grief: ["grief", "acceptance", "love", "gratitude"],
  courage: ["courage", "selfworth", "direction", "stress"],
  acceptance: ["acceptance", "stress", "grief", "gratitude"],
  time: ["time", "resources", "work", "direction"],
  purpose: ["purpose", "direction", "work", "gratitude"],
  gratitude: ["gratitude", "acceptance", "resources", "love"],
  creativity: ["creativity", "purpose", "direction", "work"],
};

const additionalKeywords = {
  relationships: ["предал", "парень", "девуш", "ссор", "breakup", "married", "novio", "novia"],
  stress: ["тревож", "страш", "бою", "волн", "anxious", "afraid", "worried", "nervioso", "preocupado"],
  resources: ["отдых", "высп", "сонл", "слаб", "rest", "exhausted", "agotamiento"],
  work: ["зарплат", "финанс", "salary", "employment", "finanzas"],
  direction: ["выбир", "перемен", "потерял путь", "uncertain", "uncertainty", "incertidumbre"],
  boundaries: ["границ", "отказ", "застав", "давлен", "manipulation", "boundaries", "limites", "presion"],
  selfworth: ["самооцен", "сомнева", "достоин", "уверенн", "confident", "worthy", "myself", "mismo", "misma", "inseguridad"],
  loneliness: ["одинок", "одиноч", "без друзей", "loneliness", "solitario", "solitaria"],
  grief: ["умер", "умерл", "похорон", "покойн", "скорб", "bereav", "fallec", "fallecido"],
  courage: ["смел", "боятьс", "решиться", "bravery", "atreverme", "coraje"],
  acceptance: ["прощ", "обид", "сожал", "perdon", "forgive", "anger", "ira"],
  love: ["любов", "любл", "влюб", "нежн", "любимый", "romantic", "carino", "enamorada"],
  time: ["отклады", "завтра", "опозд", "postpon", "too late", "mañana"],
  purpose: ["призван", "предназнач", "мисси", "calling", "vocacion"],
  gratitude: ["спасибо", "благодар", "радост", "appreciate", "agradecer"],
  creativity: ["творч", "сочин", "созда", "creativ", "creatividad", "inventar"],
};
const themeKeywords = Object.fromEntries(
  [...new Set(ideasAphorismCatalog.map(row => row.topic))].map(theme => {
    const tags = ideasAphorismCatalog.find(row => row.topic === theme)?.keywords ?? [];
    return [theme, [...tags, ...(additionalKeywords[theme] ?? [])].map(word =>
      word.toLocaleLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/ё/g, "е"))];
  }),
);
// Unambiguous language cues take priority over broader adjacent categories.
const decisiveStems = {
  boundaries: ["границ", "лимит", "отказ", "boundar", "limites", "limite"],
  selfworth: ["самооцен", "достоин", "confidence", "confident", "worthy", "autoestima", "уверенн"],
  loneliness: ["одинок", "одиноч", "lonely", "loneliness", "soledad", "solitari"],
  grief: ["утрат", "смерт", "умер", "похорон", "grief", "bereav", "mourning", "duelo", "fallec"],
  purpose: ["предназнач", "призван", "purpose", "proposito", "vocacion"],
  acceptance: ["прощ", "обид", "accept", "forgive", "perdon"],
  creativity: ["творч", "creativ", "inspirac"],
};

export function matchIdeasAphorismTheme(question, topic = "direction") {
  const words = [...new Set(tokensFor(question))];
  let best = topic;
  let bestScore = 0;
  for (const [theme, keywords] of Object.entries(themeKeywords)) {
    const hits = words.filter(word => keywords.some(stem => word.startsWith(stem))).length;
    const decisive = words.filter(word => (decisiveStems[theme] ?? []).some(stem => word.startsWith(stem))).length;
    const score = hits > 0 ? hits * 20 + decisive * 45 + (theme === topic ? 14 : 0) : 0;
    if (score > bestScore) {
      best = theme;
      bestScore = score;
    }
  }
  return best;
}

function stableTieBreaker(question, id) {
  let hash = 2166136261;
  for (const char of question + ":" + id) hash = Math.imul(hash ^ char.charCodeAt(0), 16777619);
  return hash >>> 0;
}

// All further pages are computed from the same ordered matches. Slicing by 3
// never repeats an item; the full request remains local in memory.
export function getIdeasAphorismMatches(question, locale, topic = "direction") {
  const words = [...new Set(tokensFor(question))];
  const normalizedQuestion = words.join(" ");
  const primary = matchIdeasAphorismTheme(question, topic);
  const related = new Set([primary, ...(relatedThemes[primary] ?? []), ...(relatedThemes[topic] ?? [])]);
  const scored = ideasAphorismCatalog
    .filter(row => related.has(row.topic))
    .map(row => {
      const tags = themeKeywords[row.topic] ?? [];
      const matchedTags = words.filter(word => tags.some(tag => word.startsWith(tag))).length;
      const localizedTokens = new Set(tokensFor(row["text_" + locale] ?? row.text_en));
      const overlap = words.filter(word => localizedTokens.has(word)).length;
      const score = (row.topic === primary ? 200 : 0) + (row.topic === topic ? 30 : 0)
        + matchedTags * 24 + overlap * 6;
      const source = row.source_id ? ideasAphorismSources[row.source_id] : null;
      const translatedSource = row.source_id ? localizedSourceLabels[row.source_id]?.[locale] : null;
      return { id: row.id, text: row["text_" + locale] ?? row.text_en, kind: row.kind,
        source: source ? { author: translatedSource?.[0] ?? source.author,
          work: translatedSource?.[1] ?? source.work, url: source.url } : null,
        score, tie: stableTieBreaker(normalizedQuestion, row.id) };
    });
  scored.sort((a, b) => b.score - a.score || a.tie - b.tie || a.id.localeCompare(b.id));
  return scored.map(({ id, text, kind, source }) => ({ id, text, kind, source }));
}

const recommendationOrder = {
  relationships: ["review", "tests", "dao"],
  stress: ["tests", "review", "dao"],
  resources: ["dao", "tests", "review"],
  work: ["review", "tests", "dao"],
  direction: ["review", "dao", "tests"],
};

export function getIdeasAphorisms(topic, locale) {
  return getIdeasAphorismMatches("", locale, topic).slice(0, 3).map(item => item.text);
}

export function getIdeasFreeRecommendations(topic) {
  return [...(recommendationOrder[topic] ?? recommendationOrder.direction)];
}
