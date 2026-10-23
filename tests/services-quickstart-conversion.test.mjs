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

test("real production browser QA proves exact selected-format enquiry and receipt in all locales", () => {
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
  assertPersonalReceipt(script, read("scripts/helpers/enquiry-receipt-verifier.mjs"));
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

function assertPersonalReceipt(script, helper) {
  assert.match(script, /await assertRegisteredEnquiryReceipt\(target, expect, page, \{\s*locale, sourcePath: "\/" \+ locale \+ "\/services\/" \+ service, serviceTitle: receiptTitles\.personal\[service\]\[locale\], selectedFormat: receiptFormats\.personal\[locale\],\s*\}\)/);
  assert.match(helper, /assert\.equal\(request\.description, selectedFormat,/);
  assert.match(helper, /assert\.equal\(request\.contactConsent, true\)/);
  assert.match(helper, /assert\.equal\(explicitSubmit, true,/);
  assert.match(helper, /assert\.equal\(submissions\.length, 1,/);
  assert.match(helper, /parseEnquiryReceipt\(raw\)/);
  assert.match(helper, /await expect\(page\)\.toHaveURL\(start\.origin \+ '\/' \+ locale \+ '\/thank-you'\)/);
}
test("receipt proof rejects lost selected format, wrong source and bypassed consent or saved-request validation", () => {
 const script=read("scripts/verify-public-services-production.mjs"),helper=read("scripts/helpers/enquiry-receipt-verifier.mjs");
 for(const [before,after] of [['selectedFormat: receiptFormats.personal[locale]','selectedFormat: ""'],['serviceTitle: receiptTitles.personal[service][locale]','serviceTitle: "Other"']]){
  assert.ok(script.includes(before));assert.throws(()=>assertPersonalReceipt(script.replace(before,after),helper));
 }
 for(const before of ['assert.equal(request.description, selectedFormat,','assert.equal(request.contactConsent, true)','assert.equal(explicitSubmit, true,','assert.equal(submissions.length, 1,']){
  assert.ok(helper.includes(before));assert.throws(()=>assertPersonalReceipt(script,helper.replace(before,'assert.ok(true); //')));
 }
});
