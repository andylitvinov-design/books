import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classifyPublicLead, courseTopicForPath, trainingEnquiryUrl } from "../lib/public-lead-capture.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("public services, learning and reading pages get contextual final captures", () => {
  const cases = [
    ["/en/services", "en", "personal"],
    ["/ru/services/imagery-therapy", "ru", "personal"],
    ["/es/masters/andy-litvinov", "es", "personal"],
    ["/en/masters/another-practitioner", "en", "network"],
    ["/ru/services/another-practitioner/therapy-session", "ru", "network"],
    ["/en/services/andy-litvinov/homeopathy-consultation", "en", "personal"],
    ["/en/academy", "en", "training"],
    ["/ru/academy/reiki/yggdrasil/basic-course", "ru", "training"],
    ["/es/academy/reiki/tantra-reiki", "es", "training"],
    ["/es/library/distance-homeopathy", "es", "reading"],
    ["/ru/homeopathy/remedies/aconitum", "ru", "reading"],
    ["/en/wu-xing", "en", "reading"],
    ["/books/dao-wuxing-model-steps", "ru", "reading"],
  ];
  for (const [url, locale, kind] of cases) {
    assert.deepEqual(classifyPublicLead(url), { locale, kind }, url);
  }
});

test("no generic capture on private routes, results or dedicated free landings", () => {
  for (const path of [
    "/", "/en", "/ru", "/es", "/en/client", "/es/client/tests",
    "/ru/app/consultations", "/admin", "/api/health", "/en/account/history",
    "/ru/prescriptions/patient", "/en/tests/results",
    "/en/services/free-situation-review", "/ru/services/free-situation-review",
    "/es/services/free-situation-review", "/en/services/dao-health-profile",
    "/ru/services/dao-health-profile", "/es/services/dao-health-profile",
    "/en/about", "/es/privacy", "/ru/terms", "/document-preview/a",
    "/en/auth/callback", "/en/private/report", "/en/settings", "/en/dashboard",
  ]) assert.equal(classifyPublicLead(path), null, "No extra capture on " + path);
});

test("training enquiry still identifies the correct programme on existing direct CTAs", () => {
  assert.equal(courseTopicForPath("/en/academy/reiki/yggdrasil/basic-course"), "DAO Reiki Yggdrasil");
  assert.equal(courseTopicForPath("/ru/academy/reiki/tantra-reiki"), "Tantra Reiki");
  assert.equal(courseTopicForPath("/es/academy/mysteries"), "Mysteries & Ancient Traditions");
  for (const locale of ["en", "ru", "es"]) {
    const url = new URL(trainingEnquiryUrl(locale, "/" + locale + "/academy/reiki/tantra-reiki"));
    assert.equal(url.hostname, "wa.me");
    assert.ok((url.searchParams.get("text") || "").includes("Tantra Reiki"));
  }
});

test("global fallback is a short consented footer after page content and preserves provider ownership", () => {
  const root = read("app/layout.tsx");
  const component = read("components/sitewide-lead-capture.tsx");
  const css = read("components/sitewide-lead-capture.module.css");
  const suppress = read("app/sitewide-capture.css");
  assert.ok(root.indexOf("{children}") < root.indexOf("<SitewideLeadCapture"));
  assert.ok(root.indexOf("<SitewideLeadCapture") < root.indexOf("<MobileBottomNavigation"));
  assert.match(component, /clientPath \? classifyPublicLead\(clientPath\) : null/);
  assert.match(component, /setClientPath\(pathname\)/);
  assert.match(component, /setLegacyBookLocale/);
  assert.match(component, /window.location.search/);
  assert.match(component, /<CompactLeadCapture/);
  assert.match(component, /courseTopicForPath\(pathname\)/);
  assert.match(component, /kind === "network"/);
  assert.match(component, /networkService \? "#request-service"/);
  assert.match(component, /networkMaster \? "#practitioner-services"/);
  assert.match(component, /data-sitewide-capture=\{kind\}/);
  assert.match(component, /Independent practitioners own their enquiries/);
  assert.match(suppress, /body:has\(\[data-consultation-cta\]\) \[data-sitewide-capture\]/);
  assert.match(suppress, /body:has\(\[data-reiki-choice-capture\]\) \[data-sitewide-capture\]/);
  assert.match(suppress, /body:has\(\[data-free-entry-landing\]\) \[data-sitewide-capture\]/);
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /min-height:48px/);
  assert.match(css, /:focus-visible/);
});

test("single-field request is explicit opt-in with real CRM commit receipt and no private details", () => {
  const form = read("components/compact-lead-capture.tsx");
  const css = read("components/compact-lead-capture.module.css");
  const api = read("app/api/service-enquiries/route.js");
  const writer = read("lib/practitioners/public-service-enquiry.js");
  for (const locale of ["en:", "ru:", "es:"]) assert.ok(form.includes(locale));
  assert.match(form, /data-compact-last-slide/);
  assert.match(form, /data-compact-lead-form/);
  assert.match(form, /contactConsent: true/);
  assert.match(form, /!consent \|\| sending \|\| reference/);
  assert.match(form, /parseContact\(address\)/);
  assert.match(form, /window.crypto.randomUUID\(\)/);
  assert.match(form, /fetch\("\/api\/service-enquiries"/);
  assert.match(form, /result\?\.saved !== true/);
  assert.match(form, /setReference\(result.referenceCode\)/);
  assert.match(form, /RECEIPT_SESSION_KEY/);
  assert.doesNotMatch(form, /lead_created|booking_confirmed|payment_received|gtag\(/);
  assert.match(api, /createPublicServiceEnquiry/);
  assert.match(writer, /insert into app\.public_service_enquiries/);
  assert.match(writer, /insert into app\.crm_contacts/);
  assert.match(writer, /if \(contact && !crmEnabled\(\)\)/);
  assert.match(css, /@media\(max-width:600px\)/);
  assert.match(css, /grid-template-columns:1fr/);
  assert.match(css, /:focus-visible/);
});

test("free landing's final slide is just the compact form, in all three languages", () => {
  const page = read("components/free-entry-landing.tsx");
  const pageCss = read("components/free-entry-landing.module.css");
  const main = read("app/[locale]/services/page.tsx");
  const es = read("app/es/services/page.tsx");
  assert.match(page, /const finalCopy = \{/);
  assert.match(page, /tests: \{ title:/);
  assert.match(page, /situation: \{ title:/);
  assert.match(page, /dao: \{ title:/);
  assert.match(page, /id=\{captureId\}/);
  assert.match(page, /disclaimer=\{common.limitations\}/);
  assert.ok(page.lastIndexOf("<CompactLeadCapture") > page.lastIndexOf("<PersonalTestimonials"));
  assert.ok(page.lastIndexOf("<CompactLeadCapture") > page.lastIndexOf("<ServiceVideoShowcase"));
  assert.doesNotMatch(page, /<section className=\{styles\.end\}/);
  assert.doesNotMatch(page, /<FreeResourceEnquiry/);
  assert.match(page, /data-optional-written-review/);
  assert.match(pageCss, /\.page\{padding-bottom:0\}/);
  assert.match(main, /<CompactLeadCapture locale=\{locale as Locale\}/);
  assert.match(es, /<CompactLeadCapture locale="es"/);
  assert.ok(main.lastIndexOf("<CompactLeadCapture") > main.lastIndexOf("<ServicesDirectoryInvitation"));
  assert.ok(es.lastIndexOf("<CompactLeadCapture") > es.lastIndexOf("<ServicesDirectoryInvitation"));
});
