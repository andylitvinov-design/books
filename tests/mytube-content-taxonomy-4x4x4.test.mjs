import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const taxonomy = JSON.parse(readFileSync(
  new URL("../data/video-catalog/mytube-content-taxonomy-4x4x4-v1.json", import.meta.url),
  "utf8",
));

test("MyTube taxonomy has the exact 4x4x4x4 shape", () => {
  assert.equal(taxonomy.categories.length, 4);
  for (const category of taxonomy.categories) {
    assert.equal(category.subcategories.length, 4, category.id);
    for (const subcategory of category.subcategories) {
      assert.equal(subcategory.topics.length, 4, subcategory.id);
      for (const topic of subcategory.topics) {
        assert.equal(topic.scenarios.length, 4, topic.id);
      }
    }
  }
});

test("topic IDs, localized names and search phrases are unique and complete", () => {
  const ids = new Set();
  const labels = Object.fromEntries(["ru", "en", "es"].map(locale => [locale, new Set()]));
  const phrases = Object.fromEntries(["ru", "en", "es"].map(locale => [locale, new Set()]));
  for (const category of taxonomy.categories) {
    for (const subcategory of category.subcategories) {
      for (const topic of subcategory.topics) {
        assert.ok(!ids.has(topic.id), `duplicate topic ID: ${topic.id}`);
        ids.add(topic.id);
        for (const locale of ["ru", "en", "es"]) {
          const label = topic.label[locale]?.trim().toLocaleLowerCase(locale);
          assert.ok(label, `missing ${locale} label for ${topic.id}`);
          assert.ok(!labels[locale].has(label), `duplicate ${locale} topic label: ${label}`);
          labels[locale].add(label);
          assert.ok(topic.searchIntent[locale]?.length, `missing ${locale} search phrases for ${topic.id}`);
          for (const phrase of topic.searchIntent[locale]) {
            const normalized = phrase.trim().toLocaleLowerCase(locale);
            assert.ok(normalized, `empty search phrase for ${topic.id}`);
            assert.ok(!phrases[locale].has(normalized), `duplicate ${locale} search phrase: ${normalized}`);
            phrases[locale].add(normalized);
          }
        }
        const scenarioIds = new Set();
        for (const scenario of topic.scenarios) {
          assert.ok(!scenarioIds.has(scenario.id), `duplicate scenario ID: ${scenario.id}`);
          scenarioIds.add(scenario.id);
          for (const locale of ["ru", "en", "es"]) {
            assert.ok(scenario.label[locale], `missing ${locale} scenario label: ${scenario.id}`);
            assert.ok(scenario.creativeBrief[locale], `missing ${locale} creative brief: ${scenario.id}`);
          }
        }
      }
    }
  }
  assert.equal(ids.size, 64);
});

test("methods remain separate from need-based categories", () => {
  assert.ok(taxonomy.rules.methodsAreSeparateFilters.includes("meditation"));
  assert.ok(taxonomy.rules.methodsAreSeparateFilters.includes("hypnosis"));
  assert.ok(taxonomy.rules.methodsAreSeparateFilters.includes("reiki"));
});
