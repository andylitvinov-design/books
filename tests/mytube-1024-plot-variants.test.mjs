import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {getMyTubeTaxonomy, listMyTubeScenarios} from "../lib/mandala/mytube-content-taxonomy.mjs";
import {
  MYTUBE_PLOT_COUNTS, getMyTubePlotCount, listMyTubePlots, auditMyTubePlots,
} from "../lib/mandala/mytube-scenario-plots.mjs";

const LANGS = ["ru", "en", "es"];
const taxonomy = getMyTubeTaxonomy();
const topics = taxonomy.categories.flatMap((category) =>
  category.subcategories.flatMap((subcategory) => subcategory.topics.map((topic) => ({
    category, subcategory, topic,
  }))));

test("MyTube has four separate plots inside every one of its 256 scenarios", async () => {
  const audit = await auditMyTubePlots();
  assert.equal(audit.ok, true, audit.errors.join("\n"));
  assert.deepEqual(audit.counts, {categories:4,scenarios:256,plots:1024,storyBeats:4096});
  assert.equal(MYTUBE_PLOT_COUNTS.totalPlots, 1024);
  assert.equal(MYTUBE_PLOT_COUNTS.plotsPerScenario, 4);
  for (const lang of LANGS) {
    assert.equal(audit.uniquePlotTitles[lang], 1024);
    assert.equal(audit.uniquePlotStoryboards[lang], 1024);
  }
});

test("scenario -> four plots is stable, localized, and separate from scenario's four beats", async () => {
  assert.equal(topics.length, 64);
  for (const {category, subcategory, topic} of topics) {
    const original = listMyTubeScenarios(topic.id, "ru");
    assert.equal(original.length, 4);
    for (const scenario of topic.scenarios) {
      assert.equal(getMyTubePlotCount(scenario.id), 4);
      for (const lang of LANGS) {
        const plots = await listMyTubePlots(scenario.id, lang);
        assert.equal(plots.length, 4, `${scenario.id}/${lang}`);
        assert.deepEqual(plots.map((p) => p.id), [1,2,3,4].map((n) => `${scenario.id}-p${n}`));
        assert.deepEqual(plots.map((p) => p.plotMode),
          ["grounded_dilemma", "symbolic_quest", "relational_mirror", "branching_future"]);
        assert.equal(new Set(plots.map((p) => p.label)).size, 4);
        assert.equal(new Set(plots.map((p) => p.beats[0])).size, 4);
        for (const plot of plots) {
          assert.equal(plot.scenarioId, scenario.id);
          assert.equal(plot.topicId, topic.id);
          assert.equal(plot.subcategoryId, subcategory.id);
          assert.equal(plot.categoryId, category.id);
          assert.equal(plot.beats.length, 4);
          assert.ok(plot.beats.every((beat) => beat.length > 24));
          assert.ok(plot.synopsis.length > 30 && plot.transformationIdea.length > 30);
          assert.ok(plot.modeLabel);
          assert.equal(plot.sourceStatus, "editorial_only_unbound");
          assert.equal(plot.conceptOnly, true);
          assert.equal(plot.canExport, false, "narrative plots do not certify MP4 sources");
          assert.notDeepEqual(plot.beats, scenario.storyboard?.[lang],
            "a plot cannot just copy the four beats of its parent scenario");
        }
      }
    }
  }
});

test("unknown scenarios fail closed; plot language falls back to RU", async () => {
  assert.equal(getMyTubePlotCount("unknown-scenario"), 0);
  assert.deepEqual(await listMyTubePlots("unknown-scenario", "ru"), []);
  assert.deepEqual(await listMyTubePlots("life-purpose-s1", "fr"),
    await listMyTubePlots("life-purpose-s1", "ru"));
});

test("visual examples express four genuinely different plot mechanisms", async () => {
  for (const id of ["life-purpose-s1", "breakup-recovery-s2", "business-decisions-s3",
                    "burnout-s2", "panic-attacks-s1", "inner-child-s4"]) {
    const plots = await listMyTubePlots(id, "ru");
    assert.equal(plots.length, 4);
    assert.equal(new Set(plots.map((p) => p.plotMode)).size, 4);
    assert.equal(new Set(plots.map((p) => p.synopsis)).size, 4);
    assert.ok(plots.some((p) => p.plotMode === "symbolic_quest"));
    assert.ok(plots.every((p) => !/гарантированное излечение|вылечит навсегда/i.test(p.synopsis)));
  }
});

test("client presents scenario then lazy plots, resets on upstream change, and never claims plot-media equivalence", () => {
  const director = readFileSync(new URL("../components/mandala-auto-video-director.tsx", import.meta.url), "utf8");
  const loader = readFileSync(new URL("../lib/mandala/mytube-scenario-plots.mjs", import.meta.url), "utf8");
  assert.match(director, /data-mytube-scenario=\{scenario.id\}/);
  assert.match(director, /listMyTubePlots\(selectedScenarioId,locale\)/);
  assert.match(director, /data-mytube-plot-choices/);
  assert.match(director, /data-mytube-plot=\{plot.id\}/);
  assert.match(director, /aria-pressed=\{selectedPlotId===plot.id\}/);
  assert.match(director, /data-mytube-selected-plot-outline/);
  assert.match(director, /data-mytube-plot-media-disclaimer/);
  assert.ok(director.includes('setSelectedScenarioId(scenarioId);setSelectedPlotId("");'));
  assert.ok(director.includes('setSelectedScenarioId("");setSelectedPlotId("");'));
  assert.match(director, /timelineForTopic\(selectedTopicId,selectedScenarioId,recommended\)/);
  assert.doesNotMatch(director, /onApply\([^)]*selectedPlotId/);
  assert.match(loader, /import\("\.\.\/\.\.\/data\/video-catalog\/mytube-plots-goals-money-v1\.json"/);
  assert.match(loader, /import\("\.\.\/\.\.\/data\/video-catalog\/mytube-plots-stress-anxiety-v1\.json"/);
});
