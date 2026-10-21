import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { getHexagram } from "../data/dao-hexagrams.mjs";
import { drawRandomHexagram } from "../lib/dao-divination.mjs";
import { getIdeasAphorisms, getIdeasFreeRecommendations, ideaTopics, matchIdeasTopic } from "../lib/ideas-guidance.mjs";
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
  assert.match(component, /\/dao\/hexagrams\//);
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
    const books = getCompactNavigation(locale).find(item => item.id === "books");
    assert.equal(books.href, "/" + locale + "/books");
    assert.equal(navigationCopy[locale].books, locale === "ru" ? "Идеи" : "Ideas");
    assert.equal(getSiteNavigation(locale).find(item => item.id === "library").href, "/" + locale + "/library");
  }
});

test("Personal guidance is one accessible editorial list, not three giant cards or left photos", () => {
  const component = read("components/ideas-discovery.tsx");
  const css = read("components/ideas-discovery.module.css");
  assert.match(component, /getIdeasFreeRecommendations\(result\.topic\)\.map\(\(id, index\)/);
  assert.match(component, /<ol className=\{styles\.guidanceList\} data-ideas-guidance-list>/);
  assert.match(component, /className=\{styles\.guidanceLink\} href=\{freeOfferHref\(locale, id\)\}/);
  assert.match(component, /index === 0 \? answerCopy\.guidanceMatch : answerCopy\.guidanceOther/);
  assert.match(component, /\{item\.action\}<ArrowRight/);
  assert.doesNotMatch(component, /styles\.offers|styles\.offer\b|<Image|<img/);
  assert.match(css, /\.guidanceList li \{/);
  assert.match(css, /\.guidanceLink:focus-visible/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /\.actions \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\); gap: 6px; \}/);
  assert.match(css, /@media \(max-width: 360px\)/);
  assert.match(css, /prefers-reduced-motion: reduce/);
  for (const localized of ["guidanceIntro", "guidanceMatch", "guidanceOther"]) {
    assert.equal(component.split(localized + ":").length - 1, 3, localized + " must be present in RU/EN/ES");
  }
});
