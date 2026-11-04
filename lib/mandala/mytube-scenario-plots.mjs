/**
 * Editorial plots are different stories inside a scenario, not its four storyboard beats.
 * Lazy-load only the selected category to avoid downloading 1,024 plots on initial mobile view.
 * A plot is NOT a media/rights binding; actual MP4 selection remains in the existing director.
 */
import taxonomy from "../../data/video-catalog/mytube-content-taxonomy-4x4x4-v2.json" with { type: "json" };

export const MYTUBE_PLOT_COUNTS = Object.freeze({
  categories: 4, subcategories: 16, topics: 64, scenarios: 256,
  plotsPerScenario: 4, totalPlots: 1024, storyBeatsPerPlot: 4,
});
const LANGUAGES = ["ru", "en", "es"];
const MODES = ["grounded_dilemma", "symbolic_quest", "relational_mirror", "branching_future"];
const MODE_LABELS = Object.freeze({
  ru: { grounded_dilemma:"История из жизни", symbolic_quest:"Символическая притча",
    relational_mirror:"История двух персонажей", branching_future:"Развилка и альтернативный финал" },
  en: { grounded_dilemma:"Real-life story", symbolic_quest:"Symbolic parable",
    relational_mirror:"Two-character story", branching_future:"Branching alternative ending" },
  es: { grounded_dilemma:"Historia cotidiana", symbolic_quest:"Parábola simbólica",
    relational_mirror:"Historia de dos personajes", branching_future:"Bifurcación y final alternativo" },
});
const scenarioIndex = new Map();
for (const category of taxonomy.categories) {
  for (const subcategory of category.subcategories) {
    for (const topic of subcategory.topics) {
      for (const scenario of topic.scenarios) {
        if (scenarioIndex.has(scenario.id)) throw new Error("Duplicate MyTube scenario ID: " + scenario.id);
        scenarioIndex.set(scenario.id, {categoryId:category.id, subcategoryId:subcategory.id, topicId:topic.id});
      }
    }
  }
}
const categoryImporters = {
  "goals-money": () => import("../../data/video-catalog/mytube-plots-goals-money-v1.json", { with: { type: "json" } }),
  "love-relationships": () => import("../../data/video-catalog/mytube-plots-love-relationships-v1.json", { with: { type: "json" } }),
  "energy-confidence": () => import("../../data/video-catalog/mytube-plots-energy-confidence-v1.json", { with: { type: "json" } }),
  "stress-anxiety": () => import("../../data/video-catalog/mytube-plots-stress-anxiety-v1.json", { with: { type: "json" } }),
};
const loaded = new Map();
async function loadCategory(categoryId) {
  const importer = categoryImporters[categoryId];
  if (!importer) return null;
  if (!loaded.has(categoryId)) {
    const request = importer().then((module) => module.default).catch((error) => {
      loaded.delete(categoryId);
      throw error;
    });
    loaded.set(categoryId, request);
  }
  return loaded.get(categoryId);
}

export function getMyTubePlotCount(scenarioId) {
  return scenarioIndex.has(scenarioId) ? 4 : 0;
}

export async function listMyTubePlots(scenarioId, locale = "ru") {
  const owner = scenarioIndex.get(scenarioId);
  if (!owner) return [];
  const lang = LANGUAGES.includes(locale) ? locale : "ru";
  const source = await loadCategory(owner.categoryId);
  const plots = source?.plotsByScenario?.[scenarioId];
  // Incomplete editorial content must not be silently replaced by generic placeholder plots.
  if (!Array.isArray(plots) || plots.length !== 4 ||
      plots.some((plot) => !Array.isArray(plot.beats?.[lang]) || plot.beats[lang].length !== 4)) return [];
  return plots.map((plot) => ({
    id: plot.id, scenarioId, topicId: owner.topicId, subcategoryId: owner.subcategoryId,
    categoryId:owner.categoryId, plotMode:plot.plotMode,
    modeLabel:MODE_LABELS[lang][plot.plotMode] ?? plot.plotMode,
    label:plot.label[lang], synopsis:plot.synopsis[lang],
    transformationIdea:plot.transformationIdea[lang],
    beats:[...plot.beats[lang]], visualCues:[...plot.beats.en],
    sourceStatus:plot.sourceStatus,
    conceptOnly:true, canExport:false,
  }));
}

export async function auditMyTubePlots() {
  const errors = [];
  const ids = new Set();
  const titles = Object.fromEntries(LANGUAGES.map((lang) => [lang,new Set()]));
  const outlines = Object.fromEntries(LANGUAGES.map((lang) => [lang,new Set()]));
  let plotCount = 0;
  if (scenarioIndex.size !== 256) errors.push("expected 256 canonical scenarios");
  for (const category of taxonomy.categories) {
    const source = await loadCategory(category.id);
    if (!source || source.schemaVersion !== "mytube-plot-variants-v1" ||
        source.categoryId !== category.id) errors.push("invalid plot source: " + category.id);
    const canonicalScenarioIds = category.subcategories.flatMap((sub) =>
      sub.topics.flatMap((topic) => topic.scenarios.map((scenario) => scenario.id)));
    for (const id of Object.keys(source?.plotsByScenario ?? {}))
      if (!canonicalScenarioIds.includes(id)) errors.push("orphan plot scenario: " + id);
    if (canonicalScenarioIds.length !== 64) errors.push("wrong scenarios per category: " + category.id);
    for (const scenarioId of canonicalScenarioIds) {
      const entries = source?.plotsByScenario?.[scenarioId];
      if (!Array.isArray(entries) || entries.length !== 4) {
        errors.push("four distinct plots required: " + scenarioId);
        continue;
      }
      const perScenarioModes = new Set();
      const perScenarioOpenings = Object.fromEntries(LANGUAGES.map((lang) => [lang,new Set()]));
      for (let index=0; index<4; index++) {
        const plot = entries[index];
        plotCount++;
        if (plot.id !== `${scenarioId}-p${index+1}` || ids.has(plot.id))
          errors.push("duplicate or unstable plot id: " + plot.id);
        ids.add(plot.id);
        if (plot.scenarioId !== scenarioId || plot.categoryId !== category.id ||
            plot.topicId !== scenarioIndex.get(scenarioId)?.topicId ||
            plot.subcategoryId !== scenarioIndex.get(scenarioId)?.subcategoryId)
          errors.push("wrong plot ownership: " + plot.id);
        if (!MODES.includes(plot.plotMode) || perScenarioModes.has(plot.plotMode))
          errors.push("plots need distinct dramatic mechanisms: " + scenarioId);
        perScenarioModes.add(plot.plotMode);
        if (plot.canExport !== false || plot.sourceStatus !== "editorial_only_unbound")
          errors.push("unsafe automatic export of editorial plot: " + plot.id);
        for (const lang of LANGUAGES) {
          const label = plot.label?.[lang]?.trim(), synopsis=plot.synopsis?.[lang]?.trim();
          const arc = plot.transformationIdea?.[lang]?.trim(), beats=plot.beats?.[lang];
          if (!label || !synopsis || !arc || !Array.isArray(beats) ||
              beats.length !== 4 || beats.some((beat) => typeof beat !== "string" || beat.length < 24)) {
            errors.push("incomplete localized plot: " + lang + ":" + plot.id);
            continue;
          }
          const title = label.toLocaleLowerCase(lang);
          if (titles[lang].has(title)) errors.push("duplicate plot title: " + lang + ":" + plot.id);
          titles[lang].add(title);
          const sequence = beats.join(" → ").toLocaleLowerCase(lang);
          if (outlines[lang].has(sequence)) errors.push("duplicate plot storyboard: " + lang + ":" + plot.id);
          outlines[lang].add(sequence);
          const opening = beats[0].toLocaleLowerCase(lang);
          if (perScenarioOpenings[lang].has(opening)) errors.push("reused plot opening: " + lang + ":" + scenarioId);
          perScenarioOpenings[lang].add(opening);
        }
      }
      if (perScenarioModes.size !== 4) errors.push("not four plot modes: " + scenarioId);
    }
  }
  if (plotCount !== 1024 || ids.size !== 1024) errors.push("expected exactly 1024 unique plots");
  return {
    ok: errors.length === 0,
    counts: {categories:taxonomy.categories.length, scenarios:scenarioIndex.size, plots:plotCount,
      storyBeats:plotCount*4},
    uniquePlotTitles:Object.fromEntries(LANGUAGES.map((lang) => [lang,titles[lang].size])),
    uniquePlotStoryboards:Object.fromEntries(LANGUAGES.map((lang) => [lang,outlines[lang].size])),
    errors,
  };
}
