import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  listMyTubeScenarios, getMyTubeTopic, auditMyTubeTaxonomy,
} from "../lib/mandala/mytube-content-taxonomy.mjs";

const ROOT = "../data/video-catalog/";
const languageSlots = [["ru",0], ["en",1], ["es",2]];
const categories = ["goals-money", "love-relationships", "energy-confidence", "stress-recovery"];
const readJson = (filename) => JSON.parse(readFileSync(new URL(ROOT + filename, import.meta.url), "utf8"));
const taxonomy = readJson("mytube-content-taxonomy-4x4x4-v1.json");
const sources = categories.map((id) => readJson(`mytube-unique-scenarios-${id}.json`));

test("all 256 concepts have distinct titles, distinct four-beat storyboards and stable IDs in RU EN ES", () => {
  const audit = auditMyTubeTaxonomy();
  assert.equal(audit.ok, true, audit.errors.join("\n"));
  assert.equal(audit.counts.scenarios, 256);
  for (const lang of ["ru", "en", "es"]) {
    assert.equal(audit.uniqueScenarioTitles[lang], 256);
    assert.equal(audit.uniqueScenarioOutlines[lang], 256);
  }
  for (const [categoryIndex, category] of taxonomy.categories.entries()) {
    const source = sources[categoryIndex];
    assert.equal(source.categoryId, category.id);
    assert.equal(source.schemaVersion, "mytube-editorial-scenes-v3");
    const expectedTopicIds = category.subcategories.flatMap((sub) => sub.topics.map((t) => t.id));
    assert.deepEqual(Object.keys(source.topics).sort(), [...expectedTopicIds].sort());
    for (const topicId of expectedTopicIds) {
      const found = getMyTubeTopic(topicId);
      assert.equal(found.category.id, category.id, `wrong category for ${topicId}`);
      assert.equal(source.topics[topicId].length, 4);
      for (const [language, index] of languageSlots) {
        const scenarioCards = listMyTubeScenarios(topicId, language);
        assert.equal(scenarioCards.length, 4, `${topicId}/${language}`);
        assert.equal(new Set(scenarioCards.map((s) => s.label.toLowerCase())).size, 4);
        for (const [scenarioIndex, card] of scenarioCards.entries()) {
          assert.equal(card.id, found.topic.scenarios[scenarioIndex].id, "preserve stable scenario identifiers");
          assert.equal(card.label, source.topics[topicId][scenarioIndex][index]);
          assert.deepEqual(card.sceneOutline, source.topics[topicId][scenarioIndex][index + 3].split(" → "));
          assert.equal(card.sceneOutline.length, 4);
          assert.ok(card.sceneOutline.every((beat) => beat.trim().length >= 8));
          assert.equal(card.creativeBrief, card.sceneOutline.join(" → "));
          assert.equal(card.conceptOnly, true);
          assert.equal(card.canExport, false, "editorial storyboard is not a licensed media binding");
          assert.equal(card.sourceStatus, "editorial_only_unbound");
          assert.doesNotMatch(card.creativeBrief, /Уникальный сценарий для темы|topic-specific journey|End with one small/i);
        }
      }
    }
  }
});

test("nearby categories retain sharply different story meanings", () => {
  const samples = [
    ["burnout", "stress-recovery", /истощ|героя|колодец|выгора/i],
    ["constant-fatigue", "energy-confidence", /батаре|нагруз|пауза|устал/i],
    ["financial-security", "goals-money", /подуш|расход|корзин|план/i],
    ["rebuilding-trust", "love-relationships", /трещин|поступ|границ|зажив/i],
  ];
  for (const [topicId, categoryId, match] of samples) {
    assert.equal(getMyTubeTopic(topicId).category.id, categoryId);
    assert.ok(listMyTubeScenarios(topicId, "ru").some((s) => match.test(s.label)));
  }
  assert.notDeepEqual(
    listMyTubeScenarios("loneliness", "ru").map((s) => s.label),
    listMyTubeScenarios("fear-alone", "ru").map((s) => s.label),
  );
});

test("high-sensitivity subjects offer choice, resources and no promised clinical cure", () => {
  const ids = ["panic-attacks","specific-phobias","childhood-trauma","inner-child","depressed-mood","apathy"];
  for (const id of ids) {
    const entries = listMyTubeScenarios(id, "ru");
    assert.equal(entries.length, 4);
    assert.ok(entries.every((s) => s.canExport === false));
    assert.ok(entries.every((s) => !/вылечит|гарантированно|избавит навсегда/i.test(s.creativeBrief)));
  }
});
