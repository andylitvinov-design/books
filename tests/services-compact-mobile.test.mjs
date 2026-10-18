import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("services starts with personal offers and booking, retaining free tests and all EN/RU routes", () => {
  const page = read("app/[locale]/services/page.tsx");
  const ui = read("components/services-solutions.tsx");
  const offers = read("data/core-service-offers.ts");
  const css = read("components/services-solutions.module.css");
  const hero = read("components/services-conversion-hero.tsx");
  assert.match(page, /<ServicesSolutions locale=/);
  assert.match(ui, /allOffers\.filter/);
  assert.match(ui, /visibleOffers\.map/);
  assert.match(page, /<ServicesTestsIntro locale=\{locale as Locale\} \/>/);
  assert.doesNotMatch(page, /<FreeInsightsPaths/);
  assert.match(page, /<ServicesConversionHero locale=\{locale as Locale\} \/>/);
  assert.ok(page.indexOf("<ServicesConversionHero") < page.indexOf("<ServicesTestsIntro"), "Green hero precedes blue tests and course");
  assert.match(read("components/services-tests-intro.tsx"), /data-services-course-action/);
  assert.ok(page.indexOf("<ServicesTestsIntro locale={locale as Locale} />") > page.indexOf("<ServicesSolutions locale={locale as Locale} />"), "Owner #996 puts personal service photos before optional tests");
  assert.ok(page.indexOf("<ServicesSolutions locale={locale as Locale} />") < page.indexOf("<ServicesAboutEntry locale={locale as Locale} />"), "Service photos must remain above the practitioner section");
  assert.doesNotMatch(page, /ServiceCart|service-cart/);
  assert.match(ui, /: allOffers;/);
  assert.match(ui, /styles\.home, !isHome \? styles\.servicesPage/);
  assert.match(read("components/services-tests-intro.tsx"), /href: "\/en\/client\/tests"/);
  assert.match(read("components/services-tests-intro.tsx"), /href: "\/ru\/client\/tests"/);
  assert.match(read("components/services-tests-intro.tsx"), /href: "\/es\/client"/);
  for (const key of ["situation","dao","alchemy","hypnotherapy"])
    assert.ok(offers.includes('id: "' + key + '"'), key);
  for (const route of ["free-situation-review","dao-health-profile","alchemy-of-soul","hypnotherapy-course"])
    assert.ok(offers.includes('route: "' + route + '"'), route);
  assert.match(offers, /Free Wu Xing Resource Profile/);
  assert.match(offers, /Бесплатный профиль ресурсов У-Син/);
  assert.match(offers, /Alchemy of the Soul/);
  assert.match(offers, /Курс гипнотерапии/);
  assert.match(ui, /id="methods"/);
  assert.match(ui, /data-alchemy-service-actions/);
  assert.match(ui, /ContactChannelChooser/);
  assert.match(ui, /styles\.cardDetails/);
  assert.match(ui, /styles\.cardDirectOrder/);
  assert.match(ui, /"data-alchemy-booking": "services-card"/);
  assert.doesNotMatch(hero, /ME, GOAL|draw by hand|€100/i);
  const editorialStart = page.indexOf("const editorialOffers =");
  const renderStart = page.indexOf("  return (");
  assert.ok(editorialStart > 0 && renderStart > editorialStart, "Separate editorial offer data from the rendered Services layout");
  assert.match(page.slice(editorialStart, renderStart), /€50 \/ 30 min · €100 \/ 60 min/);
  assert.doesNotMatch(page.slice(renderStart), /€50|€100/, "Editorial prices are metadata; visible cards render separately scoped paid session prices");
  assertBusinessPriceScope(offers);
  assert.match(hero, /paidCta: "Ask about a personal session · from €50"/);
  assert.match(hero, /href="#consultation" data-service-hero-cta="paid"/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:760px\)/);
  assert.match(css, /min-height:44px/);
});

test("homepage restores photo-left four services while keeping tests and Academy", () => {
  const home = read("components/holistic-house-home.tsx");
  const css = read("app/holistic-house-home.css");
  assert.doesNotMatch(home, /<FreeInsightsPaths locale=\{locale\} \/>/);
  assert.ok(read("components/services-solutions.tsx").includes('const visibleOffers = isHome ? allOffers.filter((offer) => offer.id !== "business") : allOffers;'));
  assert.match(home, /<ServicesSolutions locale=\{locale\} variant="home" \/>/);
  assert.doesNotMatch(home, /<PersonalWorkJourney locale=/);
  assert.match(home, /event="self_check_start"/);
  assert.match(home, /\{text\.academyAction\}/);
  assert.match(home, /\{text\.libraryAction\}/);
  assert.doesNotMatch(home, /heroIntro: "[^"]*ME \/ GOAL/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("new DAO, Soul Alchemy and hypnotherapy landing pages are bilingual and have specific safe two-channel requests", () => {
  const detail = read("components/core-service-detail.tsx");
  const css = read("components/core-service-detail.module.css");
  for(const [slug,kind] of [["dao-health-profile","dao"],["alchemy-of-soul","alchemy"],["hypnotherapy-course","hypnotherapy"]]) {
    const route = read("app/[locale]/services/" + slug + "/page.tsx");
    assert.match(route, /generateMetadata/);
    assert.match(route, /generateStaticParams/);
    assert.match(route, /isSupportedLocale/);
    if(kind === "alchemy") {
      assert.match(route, /<AlchemySoulLanding locale=/);
      assert.match(route, /data-alchemy-extended-guide/);
    } else {
      assert.match(route, /<CoreServiceDetail locale=/);
      assert.ok(route.includes('kind = "' + kind + '"'));
    }
    for(const lang of ["en","ru"]) assert.ok(route.includes("/" + lang + "/services/" + slug));
  }
  for (const method of ["Situation analysis","Systemic constellations","homeopathic selection","Анализ ситуации","Системная расстановка","гомеопатический подбор"])
    assert.ok(detail.toLowerCase().includes(method.toLowerCase()), method);
  assert.match(detail, /const whatsappUrl = whatsappEnquiryUrl\(\{/);
  assert.match(detail, /service: t\.title/);
  assert.match(detail, /request: t\.actionMessage/);
  assert.match(detail, /option: t\.action/);
  assert.match(detail, /pagePath: "\/" \+ locale \+ "\/services\/" \+ serviceSlug/);
  assert.equal((detail.match(/<ContactChannelChooser locale=\{locale\} whatsappUrl=\{whatsappUrl\}/g) || []).length, 3);
  assert.match(detail, /reliable evidence/);
  assert.match(detail, /не медицинское обследование/);
  assert.match(css, /@media\(max-width:760px\)/);
});

test("free diagnostic retains private-data-safe channel choice, explicit copying and illustrative preview", () => {
  const intake = read("components/free-drawing-intake.tsx");
  const tracking = read("components/acquisition-event-link.tsx");
  const freePage = read("app/[locale]/services/free-situation-review/page.tsx");
  assert.match(intake, /copyButton: "Copy answers"/);
  assert.match(intake, /<ContactChannelChooser[\s\S]*?whatsappUrl=\{whatsappUrl\}/);
  assert.match(intake, /onChannelClick=\{\(\) => \{ void copyAnswers\(\); \}\}/);
  assert.match(intake, /onClick=\{\(\) => \{ void copyAnswers\(\); \}\}/);
  assert.match(intake, /navigator\.clipboard\.writeText\(answers\)/);
  assert.match(intake, /readyRef\.current\?\.focus\(\)/);
  assert.match(intake, /Nothing has been sent/);
  const draft = intake.slice(intake.indexOf("const whatsappUrl ="), intake.indexOf("function changeAnswer"));
  assert.match(draft, /request: t\.whatsappIntro/);
  assert.match(draft, /topic: t\.options\[topic\]/);
  assert.doesNotMatch(draft, /\b(?:answers|problem|goal|obstacle|tried)\b/);
  assert.match(tracking, /onClick\?\.\(\); emit\(event\)/);
  assert.match(freePage, /sampleCopy/);
  assert.match(freePage, /not a real client's drawing or results/);
  assert.doesNotMatch(intake, /localStorage|sessionStorage|sendBeacon|fetch\(/);
});

function assertBusinessPriceScope(source) {
  const blocks = [...source.matchAll(/\{\s*id: "business",[\s\S]*?\n    \},/g)].map(match => match[0]);
  assert.equal(blocks.length, 3, "Exactly one Business offer per locale");
  const benefits = ["Free written review · €50 express · €100 strategy session", "Бесплатный разбор · экспресс €50 · стратегия €100", "Revisión gratuita · sesión exprés €50 · estrategia €100"];
  blocks.forEach((block, index) => {
    assert.ok(block.includes('benefit: "' + benefits[index] + '"'));
    assert.match(block, /route: "business-consulting"/);
    assert.match(block, /image: images\.business/);
  });
  assert.doesNotMatch(source.replace(/\{\s*id: "business",[\s\S]*?\n    \},/g, ""), /€50|€100/, "Existing non-Business card copy remains unchanged by Business prices");
}

test("Business card price scope rejects missing prices, wrong destination and price leakage", () => {
  const source = read("data/core-service-offers.ts");
  assertBusinessPriceScope(source);
  for (const [before, after] of [["€50 express", "express"], ['route: "business-consulting"', 'route: "wrong"'], ['id: "situation"', 'id: "situation", injectedPrice: "€50"']]) {
    const mutation = source.replace(before, after);
    assert.notEqual(mutation, source);
    assert.throws(() => assertBusinessPriceScope(mutation));
  }
});
