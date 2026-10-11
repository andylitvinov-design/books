import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("four benefit-led core Services offers link to their own local EN/RU pages", () => {
  const page = read("app/[locale]/services/page.tsx");
  const ui = read("components/services-solutions.tsx");
  const offers = read("data/core-service-offers.ts");
  const css = read("components/services-solutions.module.css");
  const hero = read("components/services-conversion-hero.tsx");
  assert.match(page, /<ServicesSolutions locale=/);
  assert.match(ui, /coreServiceOffers\(locale\)\.map/);
  for (const key of ["situation","dao","alchemy","hypnotherapy"])
    assert.ok(offers.includes('id: "' + key + '"'), key);
  for (const route of ["free-situation-review","dao-health-profile","alchemy-of-soul","hypnotherapy-course"])
    assert.ok(offers.includes('route: "' + route + '"'), route);
  assert.match(offers, /Free DAO Health & Resource Profile/);
  assert.match(offers, /Дао-диагностика здоровья/);
  assert.match(offers, /Alchemy of the Soul/);
  assert.match(offers, /Курс гипнотерапии/);
  assert.match(ui, /id="methods"/);
  assert.doesNotMatch(hero, /ME, GOAL|draw by hand|€50|€100/i);
  assert.doesNotMatch(page, /€50|€100/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /min-height:44px/);
});

test("homepage reuses exact four offers and keeps tests/Academy below, without duplicate personal offer", () => {
  const home = read("components/holistic-house-home.tsx");
  const css = read("app/holistic-house-home.css");
  assert.match(home, /<ServicesSolutions locale=\{locale\} variant="home" \/>/);
  assert.doesNotMatch(home, /<PersonalWorkJourney locale=/);
  assert.match(home, /event="self_check_start"/);
  assert.match(home, /\{text\.academyAction\}/);
  assert.match(home, /\{text\.libraryAction\}/);
  assert.doesNotMatch(home, /heroIntro: "[^"]*ME \/ GOAL/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("new DAO, Soul Alchemy and hypnotherapy landing pages are bilingual and have specific safe WhatsApp requests", () => {
  const detail = read("components/core-service-detail.tsx");
  const css = read("components/core-service-detail.module.css");
  for(const [slug,kind] of [["dao-health-profile","dao"],["alchemy-of-soul","alchemy"],["hypnotherapy-course","hypnotherapy"]]) {
    const route = read("app/[locale]/services/" + slug + "/page.tsx");
    assert.match(route, /generateMetadata/);
    assert.match(route, /generateStaticParams/);
    assert.match(route, /isSupportedLocale/);
    assert.match(route, /<CoreServiceDetail locale=/);
    assert.ok(route.includes('kind = "' + kind + '"'));
    for(const lang of ["en","ru"]) assert.ok(route.includes("/" + lang + "/services/" + slug));
  }
  for (const method of ["Situation analysis","Systemic constellations","homeopathic selection","Анализ ситуации","Системная расстановка","гомеопатический подбор"])
    assert.ok(detail.toLowerCase().includes(method.toLowerCase()), method);
  assert.match(detail, /encodeURIComponent\(t\.actionMessage\)/);
  assert.match(detail, /https:\/\/wa\.me\/14376066502/);
  assert.match(detail, /reliable evidence/);
  assert.match(detail, /не медицинское обследование/);
  assert.match(css, /@media\(max-width:760px\)/);
});

test("free diagnostic retains private-data-safe explicit WhatsApp send, with fewer taps and illustrative preview", () => {
  const intake = read("components/free-drawing-intake.tsx");
  const tracking = read("components/acquisition-event-link.tsx");
  const freePage = read("app/[locale]/services/free-situation-review/page.tsx");
  assert.match(intake, /Copy answers & open WhatsApp/);
  assert.match(intake, /onClick=\{\(\) => \{ void copyAnswers\(\); \}\}/);
  assert.match(intake, /navigator\.clipboard\.writeText\(answers\)/);
  assert.match(intake, /Only the broad topic and the generic request enter the WhatsApp URL/);
  assert.match(tracking, /onClick\?\.\(\); emit\(event\)/);
  assert.match(freePage, /sampleCopy/);
  assert.match(freePage, /not a real client's drawing or results/);
  assert.doesNotMatch(intake, /localStorage|sessionStorage|sendBeacon/);
});
