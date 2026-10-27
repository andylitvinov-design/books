import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("EN/RU/ES services keep three free and six personal offers after consultation selection, outside the optional finder", () => {
  const studio = read("components/services-studio-offers.tsx");
  const css = read("components/services-studio-offers.module.css");
  const pages = [read("app/[locale]/services/page.tsx"), read("app/es/services/page.tsx")];
  for (const page of pages) {
    const assertOrder = input => {
      const hero = input.indexOf("<ServicesConversionHero");
      const selector = input.indexOf("<PublicConsultationCta");
      const cards = input.indexOf("<ServicesStudioOffers");
      assert.ok(hero >= 0 && selector > hero && cards > selector);
      assert.match(input, /id="consultation" serviceBooking/);
      assert.doesNotMatch(input, /<ServicesSmartDiscovery/);
    };
    assertOrder(page);
    assert.throws(() => assertOrder(page.replace("<PublicConsultationCta", "<MissingSelector")));
    assert.throws(() => assertOrder(page.replace('id="consultation"', 'id="missing"')));
  }
  assert.match(studio, /data-services-studio-free/);
  assert.match(studio, /data-services-studio-paid/);
  const free = studio.match(/const free: Offer\[\] = \[([\s\S]*?)\n  \];/)?.[1];
  const paid = studio.match(/const paid: Offer\[\] = \[([\s\S]*?)\n  \];/)?.[1];
  assert.ok(free && paid);
  assert.deepEqual([...free.matchAll(/id: "([^"]+)"/g)].map(match => match[1]), ["tests", "situation", "dao"]);
  assert.deepEqual([...paid.matchAll(/(?:id: "|session\(")([^"]+)"/g)].map(match => match[1]),
    ["monthly-support", "alchemy", "hypnotherapy", "constellations", "business", "remote-energy-support"]);
  assert.match(studio, /price: "€50 \/ 30 min · €100 \/ 60 min"/);
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

test("production QA source covers the native registered receipt and preserves service, fee and privacy in all locales", () => {
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
  const helper = read("scripts/helpers/contact-channel-verifier.mjs");
  assertRegisteredReceipt(script, helper);
  for (const [before, after] of [
    ['registerContactChannelRequest(target, expect, page)', 'openRegisteredContactChannelChooser(target, expect, page)'],
    ['request.serviceTitle, selectedTitle', 'request.serviceTitle, request.serviceTitle'],
    ['request.serviceTitle.includes("€50")', 'request.serviceTitle.includes("€100")'],
    ['request.serviceTitle, expectedBusinessTitle', 'request.serviceTitle, request.serviceTitle'],
    [' · 30 min · €50', ' · 30 min · €100'],
  ]) { assert.ok(script.includes(before)); assert.throws(() => assertRegisteredReceipt(script.replace(before, after), helper), undefined, before); }
  for (const [before, after] of [
    ['assert.equal(data.contactConsent,true)', 'assert.ok(data.contactConsent)'],
    ['await expect(page).toHaveURL(destination)', 'await page.goto(destination)'],
    ["['createdAt','referenceCode']", "['createdAt','referenceCode','email']"],
    ["assert.equal(new URL(page.url()).search, ''", "assert.equal(new URL(page.url()).search, '?email=qa'"],
    ["return route.abort('blockedbyclient')", "return route.continue()"],
  ]) { assert.ok(helper.includes(before)); assert.throws(() => assertRegisteredReceipt(script, helper.replace(before, after)), undefined, before); }
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

function assertRegisteredReceipt(script, helper) {
  assert.match(script, /const \{request\} = await registerContactChannelRequest\(target, expect, page\)/);
  assert.match(script, /assert\.equal\(request\.serviceTitle, selectedTitle,/);
  assert.match(script, /assert\.ok\(request\.serviceTitle\.includes\("€50"\)/);
  assert.match(script, /const \{request\} = await registerContactChannelRequest\(express, expect, page\)/);
  assert.match(script, /assert\.equal\(request\.serviceTitle, expectedBusinessTitle,/);
  assert.match(script, /\}\[locale\] \+ " · 30 min · €50"/);
  const submit = helper.slice(helper.indexOf('async function submitRegisteredContactChannelRequest('), helper.indexOf('// Legacy in-place'));
  assert.match(submit, /route\.request\(\)\.method\(\) !== 'POST' \|\| route\.request\(\)\.url\(\) !== sourceUrl\.origin \+ '\/api\/service-enquiries'/);
  assert.match(submit, /return route\.abort\('blockedbyclient'\)/);
  assert.match(submit, /assert\.equal\(submissions\.length,1,/);
  assert.match(submit, /assert\.equal\(data\.contactConsent,true\)/);
  assert.match(submit, /assert\.equal\(data\.description,''/);
  assert.match(submit, /assert\.equal\(data\.sourcePath, sourceUrl\.pathname\)/);
  const receipt = helper.slice(helper.indexOf('export async function registerContactChannelRequest('), helper.indexOf('export async function openRegisteredCompactPhoneChooser('));
  assert.match(receipt, /await expect\(page\)\.toHaveURL\(destination\)/);
  assert.match(receipt, /sourceUrl\.origin \+ '\/' \+ request\.locale \+ '\/thank-you'/);
  assert.match(receipt, /toHaveText\('HH-ABCD1234EF56'\)/);
  assert.match(receipt, /assert\.deepEqual\(Object\.keys\(stored\)\.sort\(\), \['createdAt','referenceCode'\]\)/);
  assert.match(receipt, /not\.toContainText\(\/Public QA Visitor\|enquiry-qa@example/);
  assert.match(receipt, /assert\.equal\(new URL\(page\.url\(\)\)\.search, ''/);
  assert.doesNotMatch(submit + receipt, /force:\s*true|page\.goto\(|route\.continue\(/);
}
