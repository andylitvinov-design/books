// Public guide learning is limited to coarse navigation categories.
// Never include the visitor's message, account, assessment, IP or voice text.
export const GUIDE_QUALITY_CATEGORIES = Object.freeze([
  "energy", "love", "business", "courses", "site", "other",
]);
export const GUIDE_QUALITY_SIGNALS = Object.freeze(["clarified", "unresolved", "helpful", "unhelpful"]);
export const GUIDE_QUALITY_LOCALES = Object.freeze(["en", "ru", "es"]);

export function validateGuideQualityFeedback(body) {
  if (!body || typeof body !== "object" || Array.isArray(body)) return null;
  const keys = Object.keys(body);
  if (keys.length !== 4 || keys.some(k => !["category", "signal", "locale", "consent"].includes(k))) return null;
  if (body.consent !== true || !GUIDE_QUALITY_CATEGORIES.includes(body.category)
    || !GUIDE_QUALITY_SIGNALS.includes(body.signal)
    || !GUIDE_QUALITY_LOCALES.includes(body.locale)) return null;
  return { category: body.category, signal: body.signal, locale: body.locale };
}

export function validateGuideQualityPriorities(value) {
  if (!value || !Array.isArray(value.categories)) return [];
  return value.categories.filter((category, index, all) =>
    GUIDE_QUALITY_CATEGORIES.includes(category) && category !== "other"
    && all.indexOf(category) === index).slice(0, 4);
}

export function orderGuideClarificationChoices(choices, categories) {
  if (!Array.isArray(choices)) return [];
  const rank = new Map(validateGuideQualityPriorities({ categories })
    .map((category, i) => ["topic-" + category, i]));
  return choices.map((choice, index) => ({ choice, index }))
    .sort((a, b) => (rank.get(a.choice.id) ?? 100) - (rank.get(b.choice.id) ?? 100)
      || a.index - b.index)
    .map(row => row.choice);
}
