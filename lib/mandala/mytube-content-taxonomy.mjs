/**
 * Search-led MyTube 4 × 4 × 4 content taxonomy.
 * Editorial metadata only: it does not create media, diagnose users, or unlock export.
 */
import taxonomy from "../../data/video-catalog/mytube-content-taxonomy-4x4x4-v1.json" with { type: "json" };

export const MYTUBE_TAXONOMY_VERSION = taxonomy.schemaVersion;
export const MYTUBE_TAXONOMY_COUNTS = Object.freeze({
  categories: taxonomy.hierarchy.categories,
  subcategories: taxonomy.hierarchy.categories * taxonomy.hierarchy.subcategoriesPerCategory,
  topics: taxonomy.hierarchy.totalTopics,
  scenarios: taxonomy.hierarchy.totalScenarios,
});

const localeOf = (locale) => ["ru", "en", "es"].includes(locale) ? locale : "ru";
const findCategory = (id) => taxonomy.categories.find((item) => item.id === id) ?? null;

export function listMyTubeCategories(locale = "ru") {
  const lang = localeOf(locale);
  return taxonomy.categories.map(({ id, label }) => ({ id, label: label[lang] }));
}

export function listMyTubeSubcategories(categoryId, locale = "ru") {
  const category = findCategory(categoryId);
  if (!category) return [];
  const lang = localeOf(locale);
  return category.subcategories.map(({ id, label }) => ({ id, label: label[lang] }));
}

export function listMyTubeTopics(categoryId, subcategoryId, locale = "ru") {
  const category = findCategory(categoryId);
  const subcategory = category?.subcategories.find((item) => item.id === subcategoryId);
  if (!subcategory) return [];
  const lang = localeOf(locale);
  return subcategory.topics.map(({ id, label, searchIntent }) => ({
    id, label: label[lang], searchTerms: [...searchIntent[lang]],
  }));
}

export function getMyTubeTopic(topicId) {
  for (const category of taxonomy.categories) {
    for (const subcategory of category.subcategories) {
      const topic = subcategory.topics.find((item) => item.id === topicId);
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
    id: scenario.id,
    label: scenario.label[lang],
    archetype: scenario.archetype,
    creativeBrief: scenario.creativeBrief[lang],
    sourceStatus: found.topic.scenarios.length ? taxonomy.rules.scenarioSourceStatus : "unknown",
    canExport: false,
  }));
}

export function resolveMyTubeTopic(query, locale = "ru") {
  const lang = localeOf(locale);
  const normalized = String(query ?? "").trim().toLocaleLowerCase(lang);
  if (!normalized) return null;
  const matches = [];
  for (const category of taxonomy.categories) {
    for (const subcategory of category.subcategories) {
      for (const topic of subcategory.topics) {
        const terms = [topic.label[lang], ...topic.searchIntent[lang]];
        if (terms.some((term) => term.toLocaleLowerCase(lang) === normalized)) {
          matches.push({ categoryId: category.id, subcategoryId: subcategory.id, topicId: topic.id });
        }
      }
    }
  }
  return matches.length === 1 ? matches[0] : null;
}

export function auditMyTubeTaxonomy() {
  const errors = [];
  const categoryIds = new Set();
  const subcategoryIds = new Set();
  const topicIds = new Set();
  const scenarioIds = new Set();
  const scenarioTitles = { ru: new Set(), en: new Set(), es: new Set() };
  let subcategoryCount = 0;
  let topicCount = 0;
  let scenarioCount = 0;

  for (const category of taxonomy.categories) {
    if (categoryIds.has(category.id)) errors.push(`duplicate category id: ${category.id}`);
    categoryIds.add(category.id);
    if (category.subcategories.length !== 4) errors.push(`category ${category.id} must have 4 subcategories`);
    for (const locale of ["ru", "en", "es"]) {
      if (!category.label[locale]) errors.push(`missing ${locale} category label: ${category.id}`);
    }
    for (const subcategory of category.subcategories) {
      subcategoryCount++;
      if (subcategoryIds.has(subcategory.id)) errors.push(`duplicate subcategory id: ${subcategory.id}`);
      subcategoryIds.add(subcategory.id);
      if (subcategory.topics.length !== 4) errors.push(`subcategory ${subcategory.id} must have 4 topics`);
      for (const locale of ["ru", "en", "es"]) {
        if (!subcategory.label[locale]) errors.push(`missing ${locale} subcategory label: ${subcategory.id}`);
      }
      for (const topic of subcategory.topics) {
        topicCount++;
        if (topicIds.has(topic.id)) errors.push(`duplicate topic id: ${topic.id}`);
        topicIds.add(topic.id);
        if (topic.scenarios.length !== 4) errors.push(`topic ${topic.id} must have 4 scenarios`);
        for (const locale of ["ru", "en", "es"]) {
          if (!topic.label[locale] || !Array.isArray(topic.searchIntent[locale]) || topic.searchIntent[locale].length < 2) {
            errors.push(`incomplete ${locale} topic metadata: ${topic.id}`);
          }
        }
        for (const scenario of topic.scenarios) {
          scenarioCount++;
          if (scenarioIds.has(scenario.id)) errors.push(`duplicate scenario id: ${scenario.id}`);
          scenarioIds.add(scenario.id);
          for (const locale of ["ru", "en", "es"]) {
            const title = scenario.label[locale]?.trim();
            if (!title || !scenario.creativeBrief[locale]) errors.push(`incomplete ${locale} scenario: ${scenario.id}`);
            else if (scenarioTitles[locale].has(title)) errors.push(`duplicate ${locale} scenario title: ${title}`);
            else scenarioTitles[locale].add(title);
          }
        }
      }
    }
  }

  if (categoryIds.size !== 4) errors.push("taxonomy must contain exactly 4 categories");
  if (subcategoryCount !== 16) errors.push("taxonomy must contain exactly 16 subcategories");
  if (topicCount !== 64) errors.push("taxonomy must contain exactly 64 topics");
  if (scenarioCount !== 256) errors.push("taxonomy must contain exactly 256 scenarios");
  return {
    ok: errors.length === 0,
    counts: { categories: categoryIds.size, subcategories: subcategoryCount, topics: topicCount, scenarios: scenarioCount },
    uniqueScenarioTitles: Object.fromEntries(Object.entries(scenarioTitles).map(([locale, values]) => [locale, values.size])),
    errors,
  };
}
