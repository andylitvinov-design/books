import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

const read = (file) => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("Holistic Support thematic navigation reuses existing public routes and practices", () => {
  const page = read("app/[locale]/holistic-support/page.tsx");
  const filter = read("components/holistic-support-topic-filter.tsx");
  const meditations = read("data/academy/holistic-support-meditations.ts");
  const support = read("app/[locale]/services/remote-energy-support/page.tsx");

  assert.match(page, /<HolisticSupportTopicFilter locale=\{locale\} \/>/);
  assert.ok(page.indexOf('id="holistic-healing-support"') < page.indexOf("<HolisticSupportTopicFilter"));
  assert.ok(page.indexOf("<HolisticSupportTopicFilter") < page.indexOf('id="meditation-practices"'));
  assert.equal((page.match(/<HolisticSupportTopicFilter /g) || []).length, 1);
  assert.doesNotMatch(page, /data-holistic-healing|holistic-healing-title|02 · PRACTICES & SUPPORT/);
  assert.match(filter, /SUPPORT BY THEME/);
  const firstScreen = existsSync(new URL("../components/holistic-support-choices.tsx", import.meta.url))
    ? read("components/holistic-support-choices.tsx") : "";
  assert.match(page + firstScreen, /data-holistic-first-screen/);
  assert.match(filter, /data-holistic-topic-filter/);
  assert.match(filter, /data-holistic-topic-selected=\{activeTopic\}/);
  assert.match(filter, /data-holistic-topic-card=\{id\}/);
  for (const topic of ["business", "love", "health"]) {
    assert.match(filter, new RegExp('id: "' + topic + '"'));
    assert.match(filter, new RegExp('data-holistic-topic=\\{id\\}'));
  }
  for (const offer of ["meditation", "talisman", "expert"])
    assert.match(filter, new RegExp('id: "' + offer + '"'));
  assert.match(filter, /"#meditation-practices"/);
  assert.match(page, /id="meditation-practices"/);
  assert.match(meditations, /freeMeditationVideos\(locale: PublicLocale\)/);
  assert.match(filter, /data-holistic-order-trigger=\{id\}/);
  assert.match(filter, /<HolisticInlineSupportOrder locale=\{locale\}/);
  assert.match(filter, /onClose=\{\(\) => setOrderKind\(null\)\}/);
  assert.match(page, /id="talismans"/);
  assert.match(support, /RemoteEnergySupport/);
});

test("thematic cards include distinct EN/RU/ES copy without medical claims or fake products", () => {
  const filter = read("components/holistic-support-topic-filter.tsx");
  const page = read("app/[locale]/holistic-support/page.tsx");
  for (const label of [
    "Business", "Love", "Health",
    "Бизнес", "Любовь", "Здоровье",
    "Negocios", "Amor", "Salud",
    "Meditations for focus", "Медитации для внутреннего контакта", "Meditaciones para descansar",
    "Symbols for love", "Символы внутренней опоры", "Símbolos de intención",
    "Energy support for work", "Поддержка в теме отношений", "Apoyo complementario",
  ]) assert.ok(filter.includes(label), "missing topic label: " + label);
  assert.match(filter, /historical Academy learning materials remain available separately/);
  assert.match(filter, /Ваши загруженные талисманы остаются приватными/);
  assert.match(filter, /Los talismanes que subas son privados/);
  assert.match(filter, /no diagnostica, trata ni sustituye/i);
  assert.doesNotMatch(filter, /fetch\(|localStorage|sessionStorage|window\.location|[?&](?:condition|health|question)=/);
  assert.doesNotMatch(filter, /checkout|payment_received|orderConfirmed|<form/);
  assert.match(page, /Homeopathy lacks reliable evidence/);
});

test("three thematic filters are accessible and compact on phones", () => {
  const filter = read("components/holistic-support-topic-filter.tsx");
  const css = read("components/holistic-support-topic-filter.module.css");
  assert.match(filter, /role="tablist"/);
  assert.match(filter, /role="tab"/);
  assert.match(filter, /role="tabpanel"/);
  assert.match(filter, /aria-selected=\{activeTopic === id\}/);
  assert.match(filter, /aria-labelledby=\{"holistic-topic-tab-" \+ activeTopic\}/);
  assert.match(filter, /tabIndex=\{activeTopic === id \? 0 : -1\}/);
  assert.match(filter, /ArrowRight"/);
  assert.match(filter, /ArrowLeft"/);
  assert.match(filter, /prefetch=\{false\}/);
  assert.match(css, /min-height:48px/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /max-width:720px/);
  assert.match(css, /max-width:360px/);
  assert.match(css, /grid-template-columns:minmax\(0,1fr\)/);
  for (const path of [
    "public/images/holistic-house/reiki-practitioner-sunrise.webp",
    "public/images/holistic-house/reiki-approved-sunrise-v3.webp",
    "public/academy/reiki-yggdrasil/source/advanced-runes.png",
  ]) assert.ok(existsSync(new URL("../" + path, import.meta.url)), "missing image " + path);
});
