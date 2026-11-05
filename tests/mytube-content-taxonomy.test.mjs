import test from "node:test";
import assert from "node:assert/strict";
import {listMyTubeScenarioMotifs,auditMyTubeCreativeChoices} from "../lib/mandala/mytube-creative-choices.mjs";
import {
  auditMyTubeTaxonomy, MYTUBE_TAXONOMY_COUNTS, listMyTubeCategories,
  listMyTubeSubcategories, listMyTubeTopics, listMyTubeScenarios,
  resolveMyTubeTopic, getMyTubeTopic,
} from "../lib/mandala/mytube-content-taxonomy.mjs";

test("agreed MyTube taxonomy is exactly 4 × 4 × 4 × 4", () => {
  const audit = auditMyTubeTaxonomy();
  assert.equal(audit.ok, true, audit.errors.join("\n"));
  assert.deepEqual(audit.counts, { categories: 4, subcategories: 16, topics: 64, scenarios: 256 });
  assert.equal(MYTUBE_TAXONOMY_COUNTS.totalScenarios, 256);
  assert.deepEqual(audit.uniqueScenarioTitles, {ru: 256, en: 256, es: 256});
  assert.deepEqual(audit.uniqueScenarioOutlines, {ru: 256, en: 256, es: 256});
});

test("all labels and choice hints are localized in RU, EN and ES", () => {
  for (const locale of ["ru", "en", "es"]) {
    const categories = listMyTubeCategories(locale);
    assert.equal(categories.length, 4);
    for (const category of categories) {
      const subs = listMyTubeSubcategories(category.id, locale);
      assert.equal(subs.length, 4);
      for (const sub of subs) {
        assert.ok(sub.chooseWhen);
        const topics = listMyTubeTopics(category.id, sub.id, locale);
        assert.equal(topics.length, 4);
        for (const topic of topics) {
          assert.ok(topic.label);
          assert.ok(Array.isArray(topic.legacyTags) && topic.legacyTags.length > 0);
          assert.equal(topic.scenarioCount, 4);
          assert.equal(listMyTubeScenarios(topic.id, locale).length, 4);
        }
      }
    }
  }
});

test("scenario cards carry their topic and remain non-exportable until media is verified", () => {
  const scenarios = listMyTubeScenarios("stress-relief", "ru");
  assert.equal(scenarios.length, 4);
  assert.ok(scenarios.every((item) => item.topicId === "stress-relief" && item.canExport === false));
});

test("localized search seeds resolve to one canonical topic", () => {
  assert.deepEqual(resolveMyTubeTopic("достижение целей", "ru"), {
    categoryId: "goals-money", subcategoryId: "goal-achievement", topicId: "goal-setting",
  });
  assert.deepEqual(resolveMyTubeTopic("panic attacks", "en"), {
    categoryId: "stress-anxiety", subcategoryId: "anxiety-fears", topicId: "panic-attacks",
  });
  assert.deepEqual(resolveMyTubeTopic("baja autoestima", "es"), {
    categoryId: "energy-confidence", subcategoryId: "confidence-calm", topicId: "low-self-esteem",
  });
  assert.equal(resolveMyTubeTopic("ambiguous partial", "en"), null);
  assert.equal(getMyTubeTopic("missing"), null);
});

test("every localized topic has four different original four-beat storyboards", () => {
  for (const locale of ["ru","en","es"]) {
    const titles = new Set();
    const outlines = new Set();
    for (const category of listMyTubeCategories(locale)) {
      for (const sub of listMyTubeSubcategories(category.id, locale)) {
        for (const topic of listMyTubeTopics(category.id, sub.id, locale)) {
          const stories = listMyTubeScenarios(topic.id, locale);
          assert.equal(stories.length, 4);
          assert.equal(new Set(stories.map(s => s.label)).size, 4, topic.id);
          assert.equal(new Set(stories.map(s => s.sceneOutline[0])).size, 4, topic.id);
          for (const story of stories) {
            assert.equal(story.topicId, topic.id);
            assert.equal(story.subcategoryId, sub.id);
            assert.equal(story.categoryId, category.id);
            assert.equal(story.conceptOnly, true);
            assert.equal(story.canExport, false);
            assert.equal(story.sceneOutline.length, 4);
            assert.ok(story.sceneOutline.every(s => s.length >= 8));
            assert.equal(story.creativeBrief, story.sceneOutline.join(" → "));
            assert.ok(!/^(?:Новый маршрут|Точка опоры|Новый взгляд|Первый шаг|A New Path|A Place to Stand)$/i.test(story.label));
            assert.ok(!titles.has(story.label.toLocaleLowerCase(locale)), story.id);
            assert.ok(!outlines.has(story.creativeBrief.toLocaleLowerCase(locale)), story.id);
            titles.add(story.label.toLocaleLowerCase(locale));
            outlines.add(story.creativeBrief.toLocaleLowerCase(locale));
          }
        }
      }
    }
    assert.equal(titles.size, 256);
    assert.equal(outlines.size, 256);
  }
  assert.deepEqual(listMyTubeScenarios("life-purpose", "ru").map(s => s.label), [
    "Чужой компас", "Три искры", "Мастерская смыслов", "Пробный маршрут",
  ]);
  assert.deepEqual(listMyTubeScenarios("business-decisions", "ru").map(s => s.label), [
    "Три варианта на столе", "Цифры и ценности", "Совет клиента, решение команды", "Решение с запасным выходом",
  ]);
  assert.deepEqual(listMyTubeScenarios("anxiety-no-reason", "ru").map(s => s.label), [
    "Облако без объяснения", "Сигнал без сообщения", "Ориентир без причины", "Можно попросить помощи",
  ]);
});


test("every one of the 256 scenarios has its own meaningful five-motif composition",()=>{
  const audit=auditMyTubeCreativeChoices();
  assert.equal(audit.ok,true,audit.errors.join("\n"));
  assert.deepEqual(audit.mappingDiversity,{ordered:256,unordered:256});
  assert.deepEqual(audit.counts,{scenarios:256,motifs:46,styles:10,suggestions:1280});
  const mapping=new Map();
  for(const category of listMyTubeCategories("en")){
    for(const sub of listMyTubeSubcategories(category.id,"en")){
      for(const topic of listMyTubeTopics(category.id,sub.id,"en")){
        for(const scenario of listMyTubeScenarios(topic.id,"en")){
          const choices=listMyTubeScenarioMotifs(scenario.id,"en");
          assert.equal(choices.length,5,scenario.id);
          assert.equal(new Set(choices.map(item=>item.id)).size,5,scenario.id);
          assert.ok(choices.every(item=>item.label&&item.meaning));
          const ids=choices.map(item=>item.id);
          mapping.set(scenario.id,ids);
          for(const locale of ["ru","es"])
            assert.deepEqual(listMyTubeScenarioMotifs(scenario.id,locale).map(item=>item.id),ids);
        }
      }
    }
  }
  assert.equal(mapping.size,256);
  assert.equal(new Set([...mapping.values()].map(a=>a.join("|"))).size,256);
  assert.equal(new Set([...mapping.values()].map(a=>[...a].sort().join("|"))).size,256);
  // The literal image in the title takes priority; themes and arc remain represented.
  assert.equal(mapping.get("life-purpose-s1")[0],"compass");
  assert.equal(mapping.get("life-purpose-s2")[0],"fire");
  assert.equal(mapping.get("stress-relief-s1")[0],"rain");
  assert.equal(mapping.get("stress-relief-s3")[0],"hands");
  assert.equal(mapping.get("income-growth-s4")[0],"stream");
  assert.ok(mapping.get("low-energy-s2").includes("nest"));
  assert.notDeepEqual(mapping.get("life-purpose-s1"),mapping.get("finding-self-s1"));
});

test("scenario motif expansion stays editorial and must not change plot or footage rights",()=>{
  const unknown=listMyTubeScenarioMotifs("invented-scenario","ru");
  assert.deepEqual(unknown,[]);
  const one=listMyTubeScenarioMotifs("panic-attacks-s1","ru");
  assert.ok(one.every(m=>m.status==="editorial_symbol_not_verified_footage"));
  assert.ok(one.every(m=>m.recommended=== (m.rank===1)));
  assert.equal(listMyTubeScenarios("panic-attacks","ru").length,4);
});
