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
  assert.ok(page.indexOf("<ServicesConversionHero") < page.indexOf("<PublicConsultationCta"));
  assert.ok(page.indexOf("<PublicConsultationCta") < page.indexOf("<ServicesStudioOffers"));
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
  assert.match(css, /:focus-visible/);
  assert.match(ui, /<summary aria-label=\{t\.details \+ ": " \+ offer\.title\}/);
  assertBusinessPriceScope(offers);
});


test("homepage keeps photo-led personal paths, free tests, Academy and reading in its current components", () => {
  const home = read("components/holistic-house-home.tsx");
  const css = read("app/holistic-house-home.css");
  const featured = read("components/home-featured-workspace.tsx");
  const carousel = read("components/home-section-carousel.tsx");
  const more = read("components/home-more-disclosure.tsx");
  const assertPaths = (home, featured, carousel, more) => {
    assert.match(home, /<HomeFeaturedWorkspace locale=\{locale\} \/>/);
    assert.match(home, /<HomeSectionCarousel locale=\{locale\} \/>/);
    assert.match(home, /<HomeMoreDisclosure locale=\{locale\} \/>/);
    assert.doesNotMatch(home, /<FreeInsightsPaths|<PersonalWorkJourney/);
    for (const route of ["free-situation-review", "business-consulting", "systemic-constellations", "alchemy-of-soul", "remote-energy-support"])
      assert.ok(featured.includes('/services/' + route), route);
    assert.ok(featured.includes('allTests: "/" + locale + "/client/tests"'));
    assert.ok(featured.includes('academy: "/" + locale + "/academy"'));
    assert.match(featured, /<Link href=\{hrefs\[offer\.id\]\}/);
    assert.match(carousel, /key: "ideas", href: "\/books"/);
    assert.match(carousel, /<Link className=\{styles\.viewButton\} href=\{href\}/);
    assert.match(more, /href=\{"\/" \+ locale \+ "\/academy"\}/);
  };
  assertPaths(home, featured, carousel, more);
  assert.throws(() => assertPaths(home, featured.replace('/client/tests', '/cart'), carousel, more));
  assert.throws(() => assertPaths(home, featured.replace('/services/free-situation-review', '/cart'), carousel, more));
  assert.throws(() => assertPaths(home, featured, carousel.replace('href: "/books"', 'href: "/cart"'), more));
  assert.throws(() => assertPaths(home, featured, carousel, more.replace('/academy', '/cart')));
  assert.doesNotMatch(home, /heroIntro: "[^"]*ME \/ GOAL/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
});


function assertDaoCapture(shared, compact) {
  assert.match(shared, /kind === "dao" \? "request-free-wu-xing"/);
  assert.match(shared, /kind !== "situation" \? <CompactLeadCapture\s+locale=\{locale\}\s+id=\{captureId\}\s+serviceTitle=\{serviceTitles\[kind\]\}/);
  assert.match(shared, /disclaimer=\{common\.limitations\}/);
  assert.match(compact, /if \(!contact \|\| \(phoneOnly && !contact\.phone\)\) \{[^}]+return; \}/);
  assert.match(compact, /if \(!consent\) \{ setError\(t\.consentRequired\); return; \}/);
  assert.match(compact, /serviceTitle,\s+description: "Preferred reply channel: "/);
  assert.match(compact, /contact: \{ displayName: "", \.\.\.contact \},\s+contactConsent: true/);
  assert.match(compact, /type="checkbox" required checked=\{consent\}/);
  assert.doesNotMatch(compact, /navigator\.clipboard|privateContext|privateAnswers/);
}

test("DAO uses the consented minimal contact capture, independently of the personal service routes", () => {
  const dao = read("app/[locale]/services/dao-health-profile/page.tsx");
  const shared = read("components/free-entry-landing.tsx");
  const compact = read("components/compact-lead-capture.tsx");
  assert.match(dao, /generateMetadata/);
  assert.match(dao, /generateStaticParams/);
  assert.match(dao, /kind="dao"/);
  assert.match(dao, /isPublicLocale/);
  for (const lang of ["en", "ru", "es"]) assert.ok(dao.includes("/" + lang + "/services/dao-health-profile"));
  assertDaoCapture(shared, compact);
  assert.throws(() => assertDaoCapture(shared.replace('serviceTitle={serviceTitles[kind]}', 'serviceTitle="Paid session"'), compact));
  assert.throws(() => assertDaoCapture(shared, compact.replace('if (!consent)', 'if (false)')));
  assert.throws(() => assertDaoCapture(shared, compact.replace('if (!contact || (phoneOnly && !contact.phone))', 'if (false)')));
  assert.throws(() => assertDaoCapture(shared, compact + '\nnavigator.clipboard.writeText(privateAnswers)'));
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

test("free diagnostic reuses private intake, drawing instructions and illustrative scenes", () => {
  const intake = read("components/free-drawing-intake.tsx");
  const landing = read("components/free-entry-landing.tsx");
  const offer = read("app/[locale]/services/free-situation-review/page.tsx");
  assert.match(intake, /\/coaching\/intake/);
  assert.match(intake, /ME, MY GOAL and MY PROBLEM/);
  assert.match(intake, /Saving does not send it to a coach/);
  assert.match(intake, /Do not send private answers/);
  assert.match(offer, /kind="situation"/);
  assert.match(landing, /<FreeSituationReviewForm locale=\{locale\}/);
  assert.match(landing, /"\/images\/holistic-house\/andy-about\.png"/);
  assert.match(landing, /"\/images\/holistic-house\/report-lighthouse-coast\.webp"/);
  assert.doesNotMatch(intake, /navigator\.clipboard|ContactChannelChooser|localStorage|sessionStorage|sendBeacon|fetch\(/);
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
