import test from "node:test";
import assert from "node:assert/strict";
import {
  auditMyTubeTaxonomy, MYTUBE_TAXONOMY_COUNTS,
  listMyTubeCategories, listMyTubeSubcategories, listMyTubeTopics,
  getMyTubeTopic, listMyTubeScenarios, resolveMyTubeTopic,
} from "../lib/mandala/mytube-content-taxonomy.mjs";

test("MyTube taxonomy is exactly 4 × 4 × 4 with four scenarios per topic", () => {
  const audit = auditMyTubeTaxonomy();
  assert.equal(audit.ok, true, audit.errors.join("\n"));
  assert.deepEqual(audit.counts, { categories: 4, subcategories: 16, topics: 64, scenarios: 256 });
  assert.deepEqual(MYTUBE_TAXONOMY_COUNTS, { categories: 4, subcategories: 16, topics: 64, scenarios: 256 });
});

test("all category, subcategory, topic and scenario labels exist in RU/EN/ES", () => {
  for (const locale of ["ru", "en", "es"]) {
    const categories = listMyTubeCategories(locale);
    assert.equal(categories.length, 4);
    for (const category of categories) {
      const subs = listMyTubeSubcategories(category.id, locale);
      assert.equal(subs.length, 4);
      for (const sub of subs) {
        const topics = listMyTubeTopics(category.id, sub.id, locale);
        assert.equal(topics.length, 4);
        for (const topic of topics) {
          assert.ok(topic.label);
          assert.ok(topic.searchTerms.length >= 2);
          const found = getMyTubeTopic(topic.id);
          assert.ok(found);
          const scenarios = listMyTubeScenarios(topic.id, locale);
          assert.equal(scenarios.length, 4);
          assert.equal(new Set(scenarios.map((s) => s.label)).size, 4);
          assert.ok(scenarios.every((s) => s.canExport === false && s.sourceStatus === "editorial_only_unbound"));
        }
      }
    }
  }
});

test("search matching resolves an exact localized label or seed phrase without fuzzy false positives", () => {
  assert.deepEqual(resolveMyTubeTopic("достижение целей", "ru"), {
    categoryId: "goals-money", subcategoryId: "goals-discipline", topicId: "goal-achievement",
  });
  assert.deepEqual(resolveMyTubeTopic("panic attacks", "en"), {
    categoryId: "stress-anxiety", subcategoryId: "panic-fears", topicId: "panic-attacks",
  });
  assert.deepEqual(resolveMyTubeTopic("amor propio", "es"), {
    categoryId: "love-confidence", subcategoryId: "self-worth", topicId: "self-acceptance",
  });
  assert.equal(resolveMyTubeTopic("ambiguous partial"), null);
  assert.equal(resolveMyTubeTopic(""), null);
});

test("unknown IDs do not silently route to another category", () => {
  assert.deepEqual(listMyTubeSubcategories("missing"), []);
  assert.deepEqual(listMyTubeTopics("goals-money", "missing"), []);
  assert.deepEqual(listMyTubeScenarios("missing"), []);
  assert.equal(getMyTubeTopic("missing"), null);
});
