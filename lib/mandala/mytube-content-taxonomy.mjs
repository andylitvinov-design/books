/**
 * Search-led MyTube 4 × 4 × 4 content taxonomy.
 * Editorial metadata only: it does not create media, diagnose users, or unlock export.
 */
import taxonomy from "../../data/video-catalog/mytube-content-taxonomy-4x4x4-v1.json" with { type: "json" };
import goalsStories from "../../data/video-catalog/mytube-unique-scenarios-goals-money.json" with { type: "json" };
import loveStories from "../../data/video-catalog/mytube-unique-scenarios-love-relationships.json" with { type: "json" };
import energyStories from "../../data/video-catalog/mytube-unique-scenarios-energy-confidence.json" with { type: "json" };
import stressStories from "../../data/video-catalog/mytube-unique-scenarios-stress-recovery.json" with { type: "json" };

export const MYTUBE_TAXONOMY_VERSION = taxonomy.schemaVersion;
export const MYTUBE_TAXONOMY_COUNTS = Object.freeze({
  categories: taxonomy.hierarchy.categories,
  subcategories: taxonomy.hierarchy.categories * taxonomy.hierarchy.subcategoriesPerCategory,
  topics: taxonomy.hierarchy.totalTopics,
  scenarios: taxonomy.hierarchy.totalScenarios,
});

const localeOf = (locale) => ["ru", "en", "es"].includes(locale) ? locale : "ru";
const findCategory = (id) => taxonomy.categories.find((item) => item.id === id) ?? null;
const STORY_LOCALES = ["ru", "en", "es"];
const editorialStorySources = [goalsStories, loveStories, energyStories, stressStories];
const editorialByCategory = new Map(editorialStorySources.map((source) => [source.categoryId, source]));
// Stable topic/scenario IDs live in the taxonomy; v3 editorial storyboards replace its generic copy.
// Four distinct narrative ideas per topic are NOT media bindings. Render/export still uses actual verified clips.

export function listMyTubeCategories(locale = "ru") {
  const lang = localeOf(locale);
  return taxonomy.categories.map(({ id, label }) => ({ id, label: label[lang], subcategoryCount: taxonomy.categories.find(item => item.id === id)?.subcategories.length ?? 0 }));
}

export function listMyTubeSubcategories(categoryId, locale = "ru") {
  const category = findCategory(categoryId);
  if (!category) return [];
  const lang = localeOf(locale);
  return category.subcategories.map(({ id, label, chooseWhen }) => ({ id, label: label[lang], chooseWhen: chooseWhen?.[lang] ?? "" }));
}

export function listMyTubeTopics(categoryId, subcategoryId, locale = "ru") {
  const category = findCategory(categoryId);
  const subcategory = category?.subcategories.find((item) => item.id === subcategoryId);
  if (!subcategory) return [];
  const lang = localeOf(locale);
  return subcategory.topics.map(({ id, label, searchIntent, scenarios }) => ({
    id, label: label[lang], searchTerms: [...searchIntent[lang]], scenarioCount: scenarios.length,
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
  const localeIndex = STORY_LOCALES.indexOf(lang);
  const storyRows = editorialByCategory.get(found.category.id)?.topics?.[topicId];
  // Never silently reuse generic "Path/Support/New perspective/Next step" placeholders.
  if (!Array.isArray(storyRows) || storyRows.length !== 4) return [];
  return found.topic.scenarios.map((scenario, index) => {
    const story = storyRows[index];
    if (!Array.isArray(story) || story.length !== 6 || !story[localeIndex]) return null;
    const sceneOutline = String(story[localeIndex + 3]).split(" → ").map((beat) => beat.trim());
    return {
      id: scenario.id,
      label: story[localeIndex],
      archetype: scenario.archetype,
      creativeBrief: sceneOutline.join(" → "),
      sceneOutline,
      sourceStatus: taxonomy.rules.scenarioSourceStatus || "editorial_only_unbound",
      conceptOnly: true,
      canExport: false,
    };
  }).filter(Boolean);
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
  const titles = Object.fromEntries(STORY_LOCALES.map((lang) => [lang, new Set()]));
  const outlines = Object.fromEntries(STORY_LOCALES.map((lang) => [lang, new Set()]));
  let subcategoryCount = 0;
  let topicCount = 0;
  let scenarioCount = 0;

  if (editorialByCategory.size !== 4) errors.push("expected exactly four distinct editorial sources");
  for (const category of taxonomy.categories) {
    if (categoryIds.has(category.id)) errors.push(`duplicate category id: ${category.id}`);
    categoryIds.add(category.id);
    if (category.subcategories.length !== 4) errors.push(`category ${category.id} must have four subcategories`);
    const source = editorialByCategory.get(category.id);
    if (!source || source.schemaVersion !== "mytube-editorial-scenes-v3") {
      errors.push(`missing v3 editorial source: ${category.id}`);
    }
    for (const locale of STORY_LOCALES) {
      if (!category.label[locale]) errors.push(`missing ${locale} category label: ${category.id}`);
    }
    const expectedSourceTopics = new Set();
    for (const subcategory of category.subcategories) {
      subcategoryCount++;
      if (subcategoryIds.has(subcategory.id)) errors.push(`duplicate subcategory id: ${subcategory.id}`);
      subcategoryIds.add(subcategory.id);
      if (subcategory.topics.length !== 4) errors.push(`subcategory ${subcategory.id} must have four topics`);
      for (const locale of STORY_LOCALES) {
        if (!subcategory.label[locale]) errors.push(`missing ${locale} subcategory label: ${subcategory.id}`);
      }
      for (const topic of subcategory.topics) {
        topicCount++;
        expectedSourceTopics.add(topic.id);
        if (topicIds.has(topic.id)) errors.push(`duplicate topic id: ${topic.id}`);
        topicIds.add(topic.id);
        if (topic.scenarios.length !== 4) errors.push(`topic ${topic.id} must have four scenario IDs`);
        for (const locale of STORY_LOCALES) {
          if (!topic.label[locale] || !Array.isArray(topic.searchIntent[locale]) || topic.searchIntent[locale].length < 2) {
            errors.push(`incomplete ${locale} topic metadata: ${topic.id}`);
          }
        }
        const rows = source?.topics?.[topic.id];
        if (!Array.isArray(rows) || rows.length !== 4) {
          errors.push(`expected four editorial storyboards for ${topic.id}`);
          continue;
        }
        const topicSceneStarts = Object.fromEntries(STORY_LOCALES.map((lang) => [lang, new Set()]));
        for (const [index, scenario] of topic.scenarios.entries()) {
          scenarioCount++;
          if (scenarioIds.has(scenario.id)) errors.push(`duplicate scenario id: ${scenario.id}`);
          scenarioIds.add(scenario.id);
          const row = rows[index];
          if (!Array.isArray(row) || row.length !== 6) {
            errors.push(`invalid editorial row: ${scenario.id}`);
            continue;
          }
          for (const [localeIndex, locale] of STORY_LOCALES.entries()) {
            const title = row[localeIndex]?.trim();
            const outline = row[localeIndex + 3]?.trim();
            if (!title || !outline) {
              errors.push(`incomplete ${locale} narrative: ${scenario.id}`);
              continue;
            }
            if (titles[locale].has(title.toLowerCase())) errors.push(`duplicate ${locale} title: ${title}`);
            titles[locale].add(title.toLowerCase());
            if (outlines[locale].has(outline.toLowerCase())) errors.push(`duplicate ${locale} storyboard: ${scenario.id}`);
            outlines[locale].add(outline.toLowerCase());
            const beats = outline.split(" → ").map((part) => part.trim());
            if (beats.length !== 4 || beats.some((beat) => beat.length < 8)) {
              errors.push(`four specific visual beats required for ${locale} ${scenario.id}`);
            }
            if (topicSceneStarts[locale].has(beats[0]?.toLowerCase())) {
              errors.push(`same opening within topic: ${locale} ${topic.id}`);
            }
            topicSceneStarts[locale].add(beats[0]?.toLowerCase());
          }
        }
      }
    }
    for (const editorialTopicId of Object.keys(source?.topics ?? {})) {
      if (!expectedSourceTopics.has(editorialTopicId)) {
        errors.push(`editorial topic in wrong category: ${category.id}/${editorialTopicId}`);
      }
    }
    if (Object.keys(source?.topics ?? {}).length !== 16) {
      errors.push(`category ${category.id} must contain 16 editorial topics`);
    }
  }

  if (categoryIds.size !== 4) errors.push("taxonomy must contain exactly four categories");
  if (subcategoryCount !== 16) errors.push("taxonomy must contain exactly 16 subcategories");
  if (topicCount !== 64) errors.push("taxonomy must contain exactly 64 topics");
  if (scenarioCount !== 256) errors.push("taxonomy must contain exactly 256 scenarios");
  return {
    ok: errors.length === 0,
    counts: { categories: categoryIds.size, subcategories: subcategoryCount, topics: topicCount, scenarios: scenarioCount },
    uniqueScenarioTitles: Object.fromEntries(STORY_LOCALES.map((lang) => [lang, titles[lang].size])),
    uniqueScenarioOutlines: Object.fromEntries(STORY_LOCALES.map((lang) => [lang, outlines[lang].size])),
    errors,
  };
}
