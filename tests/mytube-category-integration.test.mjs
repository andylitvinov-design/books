import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const taxonomy = JSON.parse(readFileSync(
  new URL("../data/video-catalog/mytube-content-taxonomy-4x4x4-v1.json", import.meta.url),
  "utf8",
));
const discovery = readFileSync(new URL("../components/video-discovery.tsx", import.meta.url), "utf8");
const director = readFileSync(new URL("../components/mandala-auto-video-director.tsx", import.meta.url), "utf8");
const library = readFileSync(new URL("../components/library-hub.tsx", import.meta.url), "utf8");

test("MyTube public navigation uses the canonical category → subcategory → topic tree", () => {
  assert.match(discovery, /listMyTubeCategories\(locale\)/);
  assert.match(discovery, /listMyTubeSubcategories\(myTubeCategory,locale\)/);
  assert.match(discovery, /listMyTubeTopics\(myTubeCategory,myTubeSubcategory,locale\)/);
  assert.match(discovery, /data-mytube-category=\{item.id\}/);
  assert.match(discovery, /data-mytube-subcategory=\{item.id\}/);
  assert.match(discovery, /data-mytube-topic=\{item.id\}/);
  assert.equal(taxonomy.categories.length, 4);
  assert.equal(taxonomy.categories.reduce((n, c) => n + c.subcategories.length, 0), 16);
  assert.equal(taxonomy.categories.reduce((n, c) => n + c.subcategories.reduce((m, s) => m + s.topics.length, 0), 0), 64);
});

test("site library category cards reuse the same localized master tree and preserve legacy landing routes", () => {
  assert.match(library, /listMyTubeCategories\(locale\)/);
  assert.match(library, /categoryRoute/);
  for (const route of ["business", "love", "energy", "stress"]) {
    assert.ok(library.includes('"'+route+'"'), "missing compatibility route: "+route);
  }
  assert.match(library, /id:'public-growth-'\+category\.id/);
});

test("Auto Video Director scenario cards are generated from the selected canonical topic", () => {
  assert.match(director, /listMyTubeCategories\(locale\)/);
  assert.match(director, /listMyTubeSubcategories\(selectedCategoryId,locale\)/);
  assert.match(director, /listMyTubeTopics\(selectedCategoryId,selectedSubcategoryId,locale\)/);
  assert.match(director, /listMyTubeScenarios\(selectedTopicId,locale\)/);
  assert.match(director, /taxonomyScenarios\[index\]\?\.label/);
  assert.match(director, /taxonomyScenarios\[index\]\?\.creativeBrief/);
  assert.doesNotMatch(director, /popularTopicOrder|videoGoalCategories|chooseReadyGoal/);
});
