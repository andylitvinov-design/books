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
  assert.deepEqual(audit.uniqueScenarioTitles, {ru: 256, en: 256, es: 256});
  assert.deepEqual(audit.uniqueScenarioOutlines, {ru: 256, en: 256, es: 256});
  assert.deepEqual(MYTUBE_TAXONOMY_COUNTS, { categories: 4, subcategories: 16, topics: 64, scenarios: 256 });
});

test("the canonical MyTube and public-site category tree matches the approved four directions", () => {
  const ru = listMyTubeCategories("ru");
  assert.deepEqual(ru.map(item => item.label), [
    "Деньги и развитие", "Любовь и отношения", "Энергия и уверенность", "Стресс и тревога",
  ]);
  const expected = [
    ["Предназначение и развитие", "Достижение целей", "Деньги и изобилие", "Бизнес и карьера"],
    ["Одиночество и расставание", "Поиск любви", "Отношения в паре", "Близость и семья"],
    ["Усталость и восстановление", "Тело и здоровье", "Жизненная энергия", "Уверенность и спокойствие"],
    ["Стресс и выгорание", "Тревога и страхи", "Психологические травмы", "Депрессия и апатия"],
  ];
  for (const [index, category] of ru.entries()) {
    const subs = listMyTubeSubcategories(category.id, "ru");
    assert.deepEqual(subs.map(item => item.label), expected[index]);
    assert.ok(subs.every(item => item.chooseWhen.length > 10));
  }
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
          assert.equal(new Set(scenarios.map((s) => s.creativeBrief)).size, 4);
          assert.equal(new Set(scenarios.map((s) => s.sceneOutline[0])).size, 4);
          assert.ok(scenarios.every((s) => s.sceneOutline.length === 4
            && s.sceneOutline.every((beat) => beat.length >= 8)
            && s.creativeBrief === s.sceneOutline.join(" → ")));
          assert.ok(scenarios.every((s) => s.conceptOnly === true
            && s.canExport === false && s.sourceStatus === "editorial_only_unbound"));
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
    categoryId: "stress-recovery", subcategoryId: "anxiety-fears", topicId: "panic-attacks",
  });
  assert.deepEqual(resolveMyTubeTopic("autoaceptación", "es"), {
    categoryId: "energy-confidence", subcategoryId: "confidence-worth", topicId: "self-acceptance",
  });
  assert.equal(resolveMyTubeTopic("ambiguous partial"), null);
  assert.equal(resolveMyTubeTopic(""), null);
});

test("scenarios are topic-specific stories rather than four reusable archetype labels", () => {
  assert.deepEqual(listMyTubeScenarios("life-purpose", "ru").map((s) => s.label), [
    "Чужой компас", "Три искры", "Мастерская смыслов", "Пробный маршрут",
  ]);
  assert.deepEqual(listMyTubeScenarios("panic-attacks", "ru").map((s) => s.label), [
    "Волна и берег", "Комната настоящего", "План поддержки под рукой", "После эпизода",
  ]);
  assert.deepEqual(listMyTubeScenarios("self-acceptance", "es").map((s) => s.label), [
    "El jardín imperfecto", "El espejo amable", "Lugar para emociones diversas", "Crecer a mi ritmo",
  ]);
  assert.notDeepEqual(
    listMyTubeScenarios("life-purpose", "ru").map((s) => s.creativeBrief),
    listMyTubeScenarios("finding-self", "ru").map((s) => s.creativeBrief),
  );
  for (const locale of ["ru","en","es"]) {
    for (const category of listMyTubeCategories(locale)) {
      for (const sub of listMyTubeSubcategories(category.id,locale)) {
        for (const topic of listMyTubeTopics(category.id,sub.id,locale)) {
          const stories = listMyTubeScenarios(topic.id,locale);
          for (const story of stories) {
            assert.ok(!/^(?:Путь|Опора|Новый взгляд|Новый шаг|Path|Support|New Perspective|Integration)$/i.test(story.label));
            assert.ok(story.sceneOutline[3].length > 8);
          }
        }
      }
    }
  }
});

test("unknown IDs do not silently route to another category", () => {
  assert.deepEqual(listMyTubeSubcategories("missing"), []);
  assert.deepEqual(listMyTubeTopics("goals-money", "missing"), []);
  assert.deepEqual(listMyTubeScenarios("missing"), []);
  assert.equal(getMyTubeTopic("missing"), null);
});
