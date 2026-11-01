import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getHexagram } from "../data/dao-hexagrams.mjs";
import { drawRandomHexagram } from "../lib/dao-divination.mjs";
import { getIdeasAphorisms, getIdeasFreeRecommendations, getIdeasTestSuggestions, ideaTopics, matchIdeasTopic } from "../lib/ideas-guidance.mjs";
import { getCompactNavigation, getSiteNavigation, navigationCopy } from "../lib/site-navigation-model.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Ideas matches multilingual user topics locally, with a safe generic fallback", () => {
  const cases = [
    ["Мне тяжело в отношениях с партнёром", "relationships"],
    ["Мне страшно, постоянно тревога", "stress"],
    ["Я устала, нет энергии и сил", "resources"],
    ["Надо решить вопрос карьеры и зарплаты", "work"],
    ["Я выбираю направление и смысл жизни", "direction"],
    ["My partner and I have a conflict", "relationships"],
    ["I'm anxious about my future", "stress"],
    ["I have burnout and no energy", "resources"],
    ["I need a new job and a better salary", "work"],
    ["Tengo miedo y mucha ansiedad", "stress"],
    ["Mi trabajo y mi negocio", "work"],
    ["Problemas con mi pareja", "relationships"],
    ["Estoy cansado, sin energía", "resources"],
  ];
  for (const [question, topic] of cases) {
    assert.equal(matchIdeasTopic(question).topic, topic, question);
    assert.equal(matchIdeasTopic(question).matched, true, question);
  }
  assert.deepEqual(matchIdeasTopic("необъяснимый вопрос"), { topic: "direction", matched: false });
  assert.deepEqual(matchIdeasTopic(""), { topic: "direction", matched: false });
});

test("three complete original aphorisms and three real first-party free paths exist for every topic and locale", () => {
  for (const topic of ideaTopics) {
    for (const locale of ["en", "ru", "es"]) {
      const sayings = getIdeasAphorisms(topic, locale);
      assert.equal(sayings.length, 3, topic + "-" + locale);
      assert.ok(sayings.every(text => text.length > 25), topic + "-" + locale);
      assert.equal(new Set(sayings).size, 3);
    }
    const ranked = getIdeasFreeRecommendations(topic);
    assert.equal(ranked.length, 3);
    assert.deepEqual([...ranked].sort(), ["dao", "review", "tests"]);
  }
  assert.notDeepEqual(getIdeasFreeRecommendations("work"), getIdeasFreeRecommendations("stress"));
});

test("Ideas UI reuses official cryptographic hexagram draw and existing free service forms", () => {
  const component = read("components/ideas-discovery.tsx");
  assert.match(component, /drawRandomHexagram\(\)/);
  assert.match(component, /getHexagram\(result\.hexagram\)/);
  assert.doesNotMatch(component, /answerCopy\.(?:card|again)|styles\.hexagramActions/);
  assert.match(component, /\/services\/free-situation-review#request-free-review/);
  assert.match(component, /\/services\/dao-health-profile#request-free-wu-xing/);
  assert.match(component, /\/client\/tests/);
  for (const prohibited of ["fetch(", "XMLHttpRequest", "sendBeacon", "localStorage", "sessionStorage", "navigator.geolocation"]) {
    assert.ok(!component.includes(prohibited), prohibited + " must never receive a public Ideas question");
  }
  for (let number = 1; number <= 64; number++) assert.ok(getHexagram(number));
  assert.ok(getHexagram(drawRandomHexagram()));
  assert.match(component, /aria-live="polite"/);
  assert.match(component, /maxLength=\{500\}/);
});

test("EN/RU/ES books now start with Ideas while retaining book catalogs and canonical readers", () => {
  const catalog = read("components/book-catalog.tsx");
  const spanish = read("app/es/books/page.tsx");
  const localized = read("app/[locale]/books/page.tsx");
  assert.ok(catalog.indexOf("<IdeasDiscovery") < catalog.indexOf("<LibraryBackLink"));
  assert.ok(catalog.indexOf("<IdeasDiscovery") < catalog.indexOf("catalog-header"));
  assert.ok(spanish.indexOf("<IdeasDiscovery") < spanish.indexOf("<LibraryBackLink"));
  assert.match(catalog, /visibleBooks\.map/);
  assert.match(spanish, /<SpanishBookShowcase books=\{books\}/);
  assert.match(localized, /canonical: "\/" \+ locale \+ "\/books"/);
  for (const locale of ["en", "ru", "es"]) {
    assert.ok(!getCompactNavigation(locale).some(item => item.id === "books"), "Books is available in the expanded menu, not fixed bottom");
    assert.equal(navigationCopy[locale].books, { en: "Tests & Coaching", ru: "Тесты и коучинг", es: "Tests y coaching" }[locale]);
    assert.equal(getSiteNavigation(locale).find(item => item.id === "library").href, "/" + locale + "/library");
  }
});

test("Personal guidance is one accessible editorial list, not three giant cards or left photos", () => {
  const component = read("components/ideas-discovery.tsx");
  const css = read("components/ideas-discovery.module.css");
  assert.match(component, /getIdeasFreeRecommendations\(result\.topic\)\.map\(\(id, index\)/);
  assert.match(component, /<ol className=\{styles\.guidanceList\} data-ideas-guidance-list>/);
  assert.match(component, /className=\{styles\.guidanceLink\} href=\{freeOfferHref\(answerLocale, id\)\}/);
  assert.match(component, /index === 0 \? answerCopy\.guidanceMatch : answerCopy\.guidanceOther/);
  assert.match(component, /\{item\.action\}<ArrowRight/);
  assert.doesNotMatch(component, /styles\.offers|styles\.offer\b|<Image|<img/);
  assert.match(css, /\.guidanceList li \{/);
  assert.match(css, /\.guidanceLink:focus-visible/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.exploreLinks\{[\s\S]*?grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  for (const localized of ["guidanceIntro", "guidanceMatch", "guidanceOther"]) {
    assert.equal(component.split(localized + ":").length - 1, 3, localized + " must be present in RU/EN/ES");
  }
});

test("Ideas topic suggestions stay local and use only guest-startable public tests", () => {
  const examples = [
    ["Мне страшно, постоянно тревога", "stress", "gad-7"],
    ["I'm anxious about my future", "stress", "gad-7"],
    ["Tengo miedo y mucha ansiedad", "stress", "gad-7"],
    ["Problemas con mi pareja", "relationships", "hh-monthly-profile"],
    ["My business and income", "work", "hh-monthly-profile"],
    ["I'm tired with little energy", "resources", "hh-resource-pulse"],
    ["I seek purpose in life", "direction", "hh-resource-pulse"],
  ];
  for (const [text, expectedTopic, first] of examples) {
    const result = getIdeasTestSuggestions(text);
    assert.equal(result.topic, expectedTopic);
    assert.equal(result.matched, true);
    assert.equal(result.keys.length, 3);
    assert.equal(result.keys[0], first);
    assert.equal(new Set(result.keys).size, 3);
    assert.ok(result.focus.every(key => /^[a-z]+$/.test(key)));
    assert.ok(!JSON.stringify(result).includes(text), "no private text in suggestions");
  }
  const generic = getIdeasTestSuggestions("unrecognized text");
  assert.equal(generic.matched, false);
  assert.deepEqual(generic.keys, ["hh-current-state", "hh-resource-pulse", "hh-weekly-pulse"]);
  assert.equal(getIdeasTestSuggestions("").matched, false);
  const catalog = read("data/assessments/catalog.js");
  const allKeys = new Set([...examples.flatMap(([text]) => getIdeasTestSuggestions(text).keys), ...generic.keys]);
  for (const key of allKeys) {
    const offset = catalog.indexOf("key: '" + key + "'");
    assert.ok(offset > 0, "public catalog key exists: " + key);
    const record = catalog.slice(offset, offset + 1100);
    assert.match(record, /startable: true/);
    assert.match(record, /rightsStatus: 'cleared'/);
    assert.match(record, /guestEligible: true/);
  }
});
