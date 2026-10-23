import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("Services landing has free-first cards and preserves original personal paths", () => {
  const page = read("app/[locale]/services/page.tsx");
  const ui = read("components/services-studio-offers.tsx");
  const css = read("components/services-studio-offers.module.css");
  const offers = read("data/core-service-offers.ts");
  const hero = read("components/services-conversion-hero.tsx");
  assert.match(page, /<ServicesStudioOffers locale=/);
  assert.match(page, /<ServicesConversionHero locale=/);
  assert.match(page, /<ServicesIntroMedia locale=/);
  assert.match(page, /<PersonalTestimonials locale=/);
  assert.match(page, /<ServicesDirectoryInvitation locale=/);
  assert.ok(page.indexOf("<ServicesConversionHero") < page.indexOf("<ServicesStudioOffers"));
  assert.ok(page.indexOf("<ServicesStudioOffers") < page.indexOf("<ServicesIntroMedia"));
  assert.ok(page.indexOf("<ServicesIntroMedia") < page.indexOf("<PersonalTestimonials"));
  assert.ok(page.indexOf("<PersonalTestimonials") < page.indexOf("<PublicConsultationCta"));
  assert.doesNotMatch(page, /<ServicesSmartDiscovery|<ServiceCart|<FreeInsightsPaths/);
  for (const id of ["tests", "situation", "dao", "alchemy", "hypnotherapy", "business", "constellations", "remote-energy-support"])
    assert.ok(ui.includes('id: "' + id + '"') || ui.includes('session("' + id + '")'), id);
  for (const route of ["free-situation-review", "dao-health-profile", "alchemy-of-soul", "hypnotherapy-course"])
    assert.ok(offers.includes('route: "' + route + '"'), route);
  assert.match(ui, /href: "\/" \+ locale \+ "\/tests"/);
  assert.match(ui, /ContactChannelChooser/);
  assert.match(ui, /<details className=\{styles.details\}>/);
  assert.match(ui, /data-services-studio-free/);
  assert.match(ui, /data-services-studio-paid/);
  assert.match(hero, /paidCta: "Ask about a personal session · from €50"/);
  assert.match(hero, /href="#free-insights" data-service-hero-cta="free"/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /min-height:44px/);
  assertBusinessPriceScope(offers);
});

test("homepage restores photo-left four services while keeping tests and Academy", () => {
  const home = read("components/holistic-house-home.tsx");
  const css = read("app/holistic-house-home.css");
  assert.doesNotMatch(home, /<FreeInsightsPaths locale=\{locale\} \/>/);
  assert.ok(read("components/services-solutions.tsx").includes('const visibleOffers = isHome ? allOffers.filter((offer) => offer.id !== "business") : allOffers;'));
  const disclosure = read("components/home-more-disclosure.tsx");
  assert.match(home, /<HomeMoreDisclosure locale=\{locale\}>/);
  assert.doesNotMatch(home, /<ServicesSolutions/);
  assert.match(disclosure, /<ServicesSolutions locale=\{locale\} variant="home" \/>/);
  assert.match(disclosure, /onToggle=\{event => setExpanded\(event.currentTarget.open\)\}/);
  assert.match(disclosure, /\{expanded \? \(locale === "es"/);
  assert.doesNotMatch(home, /<PersonalWorkJourney locale=/);
  assert.match(home, /event="self_check_start"/);
  const explore = read("components/home-explore-sections.tsx");
  assert.match(disclosure, /<HomeExploreSections locale=\{locale\} \/>/);
  assert.match(explore, /"\/academy"/);
  assert.match(explore, /"\/library"/);
  assert.doesNotMatch(home, /heroIntro: "[^"]*ME \/ GOAL/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});

test("new DAO free page is independent of two existing personal service landings and has a genuine multilingual enquiry", () => {
  const dao = read("app/[locale]/services/dao-health-profile/page.tsx");
  const shared = read("components/free-entry-landing.tsx");
  const form = read("components/compact-lead-capture.tsx");
  assert.match(dao, /generateMetadata/);
  assert.match(dao, /generateStaticParams/);
  assert.match(dao, /kind="dao"/);
  assert.match(dao, /isPublicLocale/);
  for (const lang of ["en", "ru", "es"]) assert.ok(dao.includes("/" + lang + "/services/dao-health-profile"));
  assert.match(shared, /"request-free-wu-xing"/);
  assertCompactCapture(shared, form);
  for (const [before, after] of [['if (!consent || sending || reference) return;', 'if (sending) return;'], ['contactConsent: true', 'contactConsent: false'], ['result?.saved !== true', 'false'], ['          serviceTitle,', '          serviceTitle: "wrong",']]) {
    assert.ok(form.includes(before));
    assert.throws(() => assertCompactCapture(shared, form.replace(before, after)));
  }
  assert.throws(() => assertCompactCapture(shared.replace('serviceTitle={serviceTitles[kind]}', 'serviceTitle="wrong"'), form));
  for (const [slug, kind] of [["alchemy-of-soul", "alchemy"], ["hypnotherapy-course", "hypnotherapy"]]) {
    const route = read("app/[locale]/services/" + slug + "/page.tsx");
    assert.match(route, /generateMetadata/);
    assert.match(route, /generateStaticParams/);
    for(const lang of ["en", "ru"]) assert.ok(route.includes("/" + lang + "/services/" + slug));
    if (kind === "alchemy") {
      assert.match(route, /<AlchemySoulLanding locale=/);
      assert.match(route, /data-alchemy-extended-guide/);
    } else {
      assert.match(route, /<CoreServiceDetail locale=/);
    }
  }
  const detail = read("components/core-service-detail.tsx");
  assert.match(detail, /reliable evidence/);
  assert.match(read("components/core-service-detail.module.css"), /@media\(max-width:760px\)/);
});

test("free diagnostic retains private-safe detailed form, drawing instructions, and illustrative scenes", () => {
  const intake = read("components/free-drawing-intake.tsx");
  const tracking = read("components/acquisition-event-link.tsx");
  const landing = read("components/free-entry-landing.tsx");
  const offer = read("app/[locale]/services/free-situation-review/page.tsx");
  assert.match(intake, /copyButton: "Copy answers"/);
  assert.match(intake, /<ContactChannelChooser[\s\S]*?whatsappUrl=\{whatsappUrl\}/);
  assert.match(intake, /onChannelClick=\{\(\) => \{ void copyAnswers\(\); \}\}/);
  assert.match(intake, /navigator\.clipboard\.writeText\(answers\)/);
  assert.match(intake, /readyRef\.current\?\.focus\(\)/);
  assert.match(intake, /Nothing has been sent/);
  const draft = intake.slice(intake.indexOf("const whatsappUrl ="), intake.indexOf("function changeAnswer"));
  assert.match(draft, /request: t\.whatsappIntro/);
  assert.match(draft, /topic: t\.options\[topic\]/);
  assert.doesNotMatch(draft, /\b(?:answers|problem|goal|obstacle|tried)\b/);
  assert.match(tracking, /onClick\?\.\(\); emit\(event\)/);
  assert.match(offer, /kind="situation"/);
  assert.match(landing, /<FreeSituationReviewForm locale=\{locale\}/);
  assert.match(landing, /"\/images\/holistic-house\/andy-about\.png"/);
  assert.match(landing, /"\/images\/holistic-house\/report-lighthouse-coast\.webp"/);
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


function assertCompactCapture(landing, form) {
  assert.match(landing, /<CompactLeadCapture\s+locale=\{locale\}\s+id=\{captureId\}\s+serviceTitle=\{serviceTitles\[kind\]\}/);
  assert.match(form, /if \(!consent \|\| sending \|\| reference\) return;/);
  assert.match(form, /<input type="checkbox" required checked=\{consent\}/);
  assert.match(form, /fetch\("\/api\/service-enquiries",/);
  assert.match(form, /body: JSON.stringify\(\{\s*operationId: operationId.current,\s*serviceTitle,\s*sourcePath:/);
  assert.match(form, /contactConsent: true/);
  assert.match(form, /result\?\.saved !== true/);
  assert.match(form, /setReference\(result.referenceCode\)/);
  assert.doesNotMatch(form, /window.location|router.push|api\/payments|stripe|paypal|sendBeacon/);
}
