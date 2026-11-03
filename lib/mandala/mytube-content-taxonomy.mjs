/**
 * Canonical search-led MyTube 4 × 4 × 4 content hierarchy.
 * Scenario records are editorial concepts; they do not imply playable media.
 */
import taxonomy from "../../data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json" with { type: "json" };

export const MYTUBE_TAXONOMY_VERSION = taxonomy.schemaVersion;
export const MYTUBE_TAXONOMY_COUNTS = Object.freeze({ ...taxonomy.hierarchy });
const LOCALES = ["ru", "en", "es"];
const localeOf = (locale) => LOCALES.includes(locale) ? locale : "ru";
const findCategory = (id) => taxonomy.categories.find((row) => row.id === id) ?? null;

export function listMyTubeCategories(locale = "ru") {
  const lang = localeOf(locale);
  return taxonomy.categories.map(({ id, label, subcategories }) => ({
    id, label: label[lang], subcategoryCount: subcategories.length,
  }));
}
export function listMyTubeSubcategories(categoryId, locale = "ru") {
  const category = findCategory(categoryId);
  if (!category) return [];
  const lang = localeOf(locale);
  return category.subcategories.map(({ id, label, chooseWhen, topics }) => ({
    id, label: label[lang], chooseWhen: chooseWhen[lang], topicCount: topics.length,
  }));
}
export function listMyTubeTopics(categoryId, subcategoryId, locale = "ru") {
  const category = findCategory(categoryId);
  const subcategory = category?.subcategories.find((row) => row.id === subcategoryId);
  if (!subcategory) return [];
  const lang = localeOf(locale);
  return subcategory.topics.map(({ id, label, searchIntent, scenarios }) => ({
    id, label: label[lang], searchTerms: [...searchIntent[lang]], legacyTags: [...(subcategory.topics.find((row) => row.id === id)?.legacyTags || [])],
    scenarioCount: scenarios.length,
  }));
}
export function getMyTubeTopic(topicId) {
  for (const category of taxonomy.categories) {
    for (const subcategory of category.subcategories) {
      const topic = subcategory.topics.find((row) => row.id === topicId);
      if (topic) return { category, subcategory, topic };
    }
  }
  return null;
}
export function listMyTubeScenarios(topicId, locale = "ru") {
  const found = getMyTubeTopic(topicId);
  if (!found) return [];
  const lang = localeOf(locale);
  return found.topic.scenarios.map((scenario) => ({
    id: scenario.id, topicId, categoryId: found.category.id,
    subcategoryId: found.subcategory.id, label: scenario.label[lang],
    archetype: scenario.archetype, creativeBrief: scenario.creativeBrief[lang],
    sourceStatus: taxonomy.rules.scenarioSourceStatus, canExport: false,
  }));
}
export function resolveMyTubeTopic(query, locale = "ru") {
  const lang = localeOf(locale);
  const normalized = String(query ?? "").trim().toLocaleLowerCase(lang);
  if (!normalized) return null;
  const matches = [];
  for (const category of taxonomy.categories) for (const subcategory of category.subcategories)
    for (const topic of subcategory.topics) {
      const terms = [topic.label[lang], ...topic.searchIntent[lang]];
      if (terms.some((term) => term.trim().toLocaleLowerCase(lang) === normalized))
        matches.push({ categoryId: category.id, subcategoryId: subcategory.id, topicId: topic.id });
    }
  return matches.length === 1 ? matches[0] : null;
}
export function getMyTubeCategory(categoryId) {
  return findCategory(categoryId);
}
export function getMyTubeTaxonomy() {
  return taxonomy;
}
export function auditMyTubeTaxonomy() {
  const errors = [];
  const ids = { categories: new Set(), subcategories: new Set(), topics: new Set(), scenarios: new Set() };
  const labels = Object.fromEntries(LOCALES.map((locale) => [locale, new Set()]));
  const phrases = Object.fromEntries(LOCALES.map((locale) => [locale, new Set()]));
  const scenarioLabels = Object.fromEntries(LOCALES.map((locale) => [locale, new Set()]));
  let subcategoryCount = 0, topicCount = 0, scenarioCount = 0;
  for (const category of taxonomy.categories) {
    if (ids.categories.has(category.id)) errors.push("duplicate_category:" + category.id);
    ids.categories.add(category.id);
    for (const locale of LOCALES) if (!category.label[locale]) errors.push("missing_category_locale:" + category.id + ":" + locale);
    if (category.subcategories.length !== 4) errors.push("subcategory_count:" + category.id);
    for (const subcategory of category.subcategories) {
      subcategoryCount++;
      if (ids.subcategories.has(subcategory.id)) errors.push("duplicate_subcategory:" + subcategory.id);
      ids.subcategories.add(subcategory.id);
      for (const locale of LOCALES) if (!subcategory.label[locale] || !subcategory.chooseWhen[locale]) errors.push("missing_subcategory_locale:" + subcategory.id + ":" + locale);
      if (subcategory.topics.length !== 4) errors.push("topic_count:" + subcategory.id);
      for (const topic of subcategory.topics) {
        topicCount++;
        if (ids.topics.has(topic.id)) errors.push("duplicate_topic:" + topic.id);
        ids.topics.add(topic.id);
        if (topic.scenarios.length !== 4) errors.push("scenario_count:" + topic.id);
        if (!Array.isArray(topic.legacyTags) || topic.legacyTags.length === 0) errors.push("missing_legacy_crosswalk:" + topic.id);
        for (const locale of LOCALES) {
          const name = topic.label[locale]?.trim().toLocaleLowerCase(locale);
          if (!name || !Array.isArray(topic.searchIntent[locale]) || topic.searchIntent[locale].length < 2) errors.push("topic_locale:" + topic.id + ":" + locale);
          else {
            if (labels[locale].has(name)) errors.push("duplicate_topic_label:" + locale + ":" + name);
            labels[locale].add(name);
            for (const phrase of topic.searchIntent[locale]) {
              const key = phrase.trim().toLocaleLowerCase(locale);
              if (!key || phrases[locale].has(key)) errors.push("duplicate_search_phrase:" + locale + ":" + key);
              phrases[locale].add(key);
            }
          }
        }
        for (const scenario of topic.scenarios) {
          scenarioCount++;
          if (ids.scenarios.has(scenario.id)) errors.push("duplicate_scenario:" + scenario.id);
          ids.scenarios.add(scenario.id);
          for (const locale of LOCALES) {
            const title = scenario.label[locale]?.trim().toLocaleLowerCase(locale);
            if (!title || !scenario.creativeBrief[locale]) errors.push("scenario_locale:" + scenario.id + ":" + locale);
            else {
              if (scenarioLabels[locale].has(title)) errors.push("duplicate_scenario_label:" + locale + ":" + title);
              scenarioLabels[locale].add(title);
            }
          }
        }
      }
    }
  }
  if (ids.categories.size !== 4 || subcategoryCount !== 16 || topicCount !== 64 || scenarioCount !== 256) errors.push("hierarchy_count_mismatch");
  return { ok: errors.length === 0, counts: { categories: ids.categories.size, subcategories: subcategoryCount, topics: topicCount, scenarios: scenarioCount }, errors };
}
