import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { SHAMANICA_GOALS, shamanicaRecommendations } from "../lib/shamanica-recommendations.mjs";
const read = path => readFileSync(new URL("../"+path, import.meta.url), "utf8");

test("Shamanica keeps exactly two quiz-ranked categories with three real service offers each", () => {
  const results=read("app/[locale]/shamanica/results/page.tsx");
  const offers=read("components/services-three-visible-options.tsx");
  assert.match(results,/shamanicaRecommendations\(args\)/);
  assert.match(results,/data-shamanica-priority-groups/);
  assert.match(results,/data-recommended-service=\{id\}/);
  assert.match(results,/data-priority-offer-count="3"/);
  assert.match(results,/ServicesThreeVisibleOptions locale=\{locale\} id=\{offerGroups\[id\]\}/);
  assert.match(offers,/shamanica-artifacts/);
  assert.match(offers,/shamanica-learning/);
  assert.match(offers,/data-service-price/);
  assert.match(offers,/ServicesCardActions/);
  assert.match(offers,/id.startsWith\\("shamanica-"\\) \\? undefined/);
  for (const goal of SHAMANICA_GOALS) {
    const groups=shamanicaRecommendations({goal,method:"unsure",start:"personal"});
    assert.equal(groups.length,2);
    assert.equal(new Set(groups).size,2);
  }
});

test("Shamanica learning offers use published first-party routes and verified price types", () => {
  const offers=read("components/services-three-visible-options.tsx");
  for (const route of ["academy/principles-of-energywork","academy/reiki/tantra-reiki/free-initiation","academy/reiki/yggdrasil","holistic-support#talismans","holistic-support/mandala"])
    assert.ok(offers.includes('path:"'+route+'"'),route);
  assert.match(offers,/price:"quote"/);
  assert.match(offers,/price:"free"/);
});

test("Services quiz uses the same three-offer category blocks without changing other callers", () => {
  const quiz=read("components/services-assist-quiz.tsx");
  const grouped=read("components/assist-top-recommendations.tsx");
  assert.match(quiz,/allowedIds=\{matchingIds\} categoryGroups/);
  assert.match(grouped,/categoryGroups=false/);
  assert.match(grouped,/data-assist-grouped-results/);
  assert.match(grouped,/data-services-priority-category=\{id\}/);
  assert.match(grouped,/data-priority-offer-count="3"/);
  assert.match(grouped,/ServicesThreeVisibleOptions id=\{id\} locale=\{locale\}/);
  assert.match(grouped,/\.filter\(id=>!allowedIds\|\|allowedIds\.includes\(id\)\)/);
});

test("Category entry has a single direct three-offer list while quiz still has two priorities",()=>{
  const page=read("app/[locale]/shamanica/results/page.tsx");
  const client=read("components/shamanica-mobile.tsx");
  assert.match(page,/selectedCategory \? <>/);
  assert.match(page,/data-shamanica-category-offers=\{selectedCategory\}/);
  assert.match(page,/data-shamanica-priority-groups/);
  assert.match(page,/data-priority-offer-count="3"/);
  assert.match(client,/shamanicaCategoryHref\(locale,id\)/);
  for(const group of ["homeopathy","shamanica-artifacts","reiki","magical","shamanica-learning"])
    assert.ok(page.includes('"'+group+'"'),group);
});
