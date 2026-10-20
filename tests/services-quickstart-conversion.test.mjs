import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("EN/RU/ES services give three free and five personal offers before the optional finder", () => {
  const studio = read("components/services-studio-offers.tsx");
  const css = read("components/services-studio-offers.module.css");
  const pages = [read("app/[locale]/services/page.tsx"), read("app/es/services/page.tsx")];
  for (const page of pages) {
    assert.ok(page.indexOf("<ServicesStudioOffers") > page.indexOf("<ServicesConversionHero"));
    assert.ok(page.indexOf("<ServicesStudioOffers") < page.indexOf("<PublicConsultationCta"));
    assert.ok(!page.includes("<ServicesSmartDiscovery"));
  }
  assert.match(studio, /data-services-studio-free/);
  assert.match(studio, /data-services-studio-paid/);
  assert.match(studio, /id: "tests"/);
  assert.match(studio, /id: "remote-energy-support"/);
  assert.match(studio, /<ContactChannelChooser/);
  assert.match(css, /min-height:44px/);
  assert.match(css, /@media\(max-width:680px\)/);
  assert.match(css, /:focus-visible/);
  const directory = read("components/services-directory-page.tsx");
  assert.match(directory, /<ServicesSmartDiscovery/);
  assert.match(directory, /<MarketplaceServiceFinder/);
  const quick = read("components/services-quick-start.tsx");
  assert.doesNotMatch(quick, /fetch\(|sendBeacon\(|localStorage|sessionStorage|\bgtag\(/);
});

test("personal pages keep three price and free alternatives without suggesting automatic booking", () => {
  const page = read("components/personal-service-landing.tsx");
  const css = read("components/personal-service-landing.module.css");
  assert.match(page, /data-personal-service=\{service\}/);
  assert.match(page, /30 min · €50/);
  assert.match(page, /60 min · €100/);
  assert.match(page, /30 мин · €50/);
  assert.match(page, /60 мин · €100/);
  assert.match(page, /Nothing is booked or charged automatically/);
  assert.match(page, /Никакой автоматической записи или оплаты/);
  assert.match(page, /No hay reservas ni cobros automáticos/);
  assert.match(page, /<PersonalConsultationForm locale=\{locale\} service=\{t.orderLabel\}/);
  assert.match(page, /href="#request-session"/);
  assert.match(page, /<h2 id="questions-title">\{ui.forWhom\}<\/h2>/);
  assert.doesNotMatch(page, /<p className=\{styles.smallEyebrow\}>\{ui.forWhom\}<\/p>/);
  assert.match(css, /@media\(min-width:901px\) and \(min-height:820px\)/);
  assert.match(css, /\.order\{position:sticky/);
  assert.match(css, /@media\(max-width:767px\)\{\s*\.order\{position:static\}/);
});

test("real production browser QA covers personal landing CTA and safe messenger draft in all locales", () => {
  const script = read("scripts/verify-public-services-production.mjs");
  const workflow = read(".github/workflows/hh-public-services-production.yml");
  for (const route of ["imagery-therapy", "systemic-constellations"])
    assert.ok(script.includes('"' + route + '"'), route);
  assertBusinessBrowserRoute(script);
  const business = read("components/business-consulting-landing.tsx");
  assert.match(business, /data-business-consulting/);
  assert.match(business, /data-business-offer=\{offer.kind\}/);
  assert.match(script, /main\[data-business-consulting\]/);
  assert.match(script, /data-business-offer="express"/);
  assert.match(script, /Business Strategy & Founder Coaching has its own separate/);
  assert.match(script, /for \(const locale of \["en", "ru", "es"\]\)/);
  assert.match(script, /waitForURL\(\/#request-session\$\/\)/);
  assertPersonalSaveGatedCaller(script);
  assert.match(script, /personal-request\//);
  assert.doesNotMatch(script, /telegram\.com\/send|wa\.me\/send/);
  assert.match(workflow, /node scripts\/verify-public-services-production\.mjs/);
  assert.match(workflow, /artifacts\/public-services-production/);
});

test("no analytics privacy bypass for conversion optimization", () => {
  const flag = read("lib/public-analytics.ts");
  assert.match(flag, /PUBLIC_ANALYTICS_AVAILABLE = false/);
  const ga = read("components/ga4-analytics.tsx");
  assert.match(ga, /if \(!PUBLIC_ANALYTICS_AVAILABLE/);
  const quick = read("components/services-quick-start.tsx");
  assert.doesNotMatch(quick, /fetch\(|sendBeacon\(|localStorage|sessionStorage|\bgtag\(/);
});

function assertBusinessBrowserRoute(script) {
  assert.match(script, /for \(const locale of \["en", "ru", "es"\]\) \{\s*const page = await createPage\(390\);\s*const label = locale \+ "\/business-consulting\/390";\s*const response = await page\.goto\(origin \+ "\/" \+ locale \+ "\/services\/business-consulting"/);
}

test("Business browser contract rejects missing route or locale coverage", () => {
  const script = read("scripts/verify-public-services-production.mjs");
  assertBusinessBrowserRoute(script);
  for (const changed of [script.replace('locale + "/services/business-consulting"', 'locale + "/services/wrong"'), script.replaceAll('["en", "ru", "es"]', '["en", "ru"]')]) {
    assert.notEqual(changed, script);
    assert.throws(() => assertBusinessBrowserRoute(changed));
  }
});

function assertPersonalSaveGatedCaller(source) {
  assert.match(source, /import \{ assertSingleEntryEnquiryUi, exercisePublicEnquiryUi \} from '\.\/helpers\/public-enquiry-ui-verifier\.mjs'/);
  assert.match(source, /const prepared = await exercisePublicEnquiryUi\(page, scope, expect, options\)/);
  assert.match(source, /const target = main\.locator\('aside#request-session \[data-consultation-capture="service"\]'\)/);
  assert.match(source, /await choices\.nth\(1\)\.click\(\)/);
  assert.match(source, /await runEnquiryFixture\(page, target, \{ locale, kind: service, requiredMessage: \["€50"\] \}\)/);
  assert.match(source, /prepared\.whatsappUrl\.searchParams\.get\("text"\) \|\| ""\)\.includes\("€50"\)/);
  assert.match(source, /HH_PUBLIC_QA_ENQUIRY_FIXTURE !== "1"/);
  assert.match(source, /backend persistence and messenger delivery NOT verified/);
  assert.doesNotMatch(source, /openContactChannelChooser|assertPreparedContactChannels/);
}

test("public intake compatibility rejects personal fixture bypass, wrong scope or lost selected price", () => {
  const source = read("scripts/verify-public-services-production.mjs");
  assertPersonalSaveGatedCaller(source);
  for (const [before, after] of [
    ["await exercisePublicEnquiryUi(page, scope, expect, options)", "await otherFixture(page, scope, expect, options)"],
    ['runEnquiryFixture(page, target, { locale, kind: service, requiredMessage: ["€50"] })', 'runEnquiryFixture(page, main, { locale, kind: service, requiredMessage: [] })'],
    ['await choices.nth(1).click()', 'await choices.nth(0).click()'],
    ['HH_PUBLIC_QA_ENQUIRY_FIXTURE !== "1"', 'false'],
    ['backend persistence and messenger delivery NOT verified', 'backend persistence verified'],
  ]) {
    assert.ok(source.includes(before));
    assert.throws(() => assertPersonalSaveGatedCaller(source.replace(before, after)));
  }
});
