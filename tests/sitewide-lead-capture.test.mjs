import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { classifyPublicLead, courseTopicForPath, trainingEnquiryUrl } from "../lib/public-lead-capture.js";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("all public service, learning and reading families get a relevant lead capture", () => {
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
    ["/en/academy/temple-studies", "en", "training"],
    ["/es/library/distance-homeopathy", "es", "reading"],
    ["/ru/homeopathy/remedies/aconitum", "ru", "reading"],
    ["/en/wu-xing", "en", "reading"],
    ["/en/books", "en", "reading"],
    ["/books/dao-wuxing-model-steps", "ru", "reading"],
    ["/en/academy/archive", "en", "training"],
  ];
  for (const [url, locale, kind] of cases) {
    assert.deepEqual(classifyPublicLead(url), { locale, kind }, url);
  }
});

test("never show marketing on client records, forms, test results, administrative or legal pages", () => {
  for (const path of [
    "/", "/en", "/ru", "/es", "/en/client", "/es/client/tests", "/ru/app/consultations",
    "/admin", "/api/health", "/en/account/history", "/ru/prescriptions/patient",
    "/en/tests/results", "/en/services/free-situation-review", "/ru/services/free-situation-review",
    "/es/services/free-situation-review", "/en/about", "/es/privacy", "/ru/terms",
    "/document-preview/a", "/en/auth/callback", "/en/private/report",
    "/en/settings", "/en/dashboard",
  ]) assert.equal(classifyPublicLead(path), null, "No marketing on " + path);
});

test("training enquiry leads to the actual course, not an unrelated paid personal session", () => {
  assert.equal(courseTopicForPath("/en/academy/reiki/yggdrasil/basic-course"), "DAO Reiki Yggdrasil");
  assert.equal(courseTopicForPath("/ru/academy/reiki/tantra-reiki"), "Tantra Reiki");
  assert.equal(courseTopicForPath("/es/academy/mysteries"), "Mysteries & Ancient Traditions");
  assert.equal(courseTopicForPath("/en/academy/archive"), "Academy archive");
  for (const locale of ["en", "ru", "es"]) {
    const url = new URL(trainingEnquiryUrl(locale, "/" + locale + "/academy/reiki/tantra-reiki"));
    assert.equal(url.hostname, "wa.me");
    assert.equal(url.pathname, "/14376066502");
    const message = url.searchParams.get("text") || "";
    assert.ok(message.includes("Tantra Reiki"));
    assert.ok(!message.toLowerCase().includes("diagnosis"));
  }
});

test("every applicable public route has a responsive global fallback without two visible CTAs", () => {
  const root = read("app/layout.tsx");
  const component = read("components/sitewide-lead-capture.tsx");
  const local = read("components/public-consultation-cta.tsx");
  const css = read("components/sitewide-lead-capture.module.css");
  const suppress = read("app/sitewide-capture.css");
  assert.match(root, /<SitewideLeadCapture \/>/);
  assert.ok(root.indexOf("{children}") < root.indexOf("<SitewideLeadCapture"));
  assert.ok(root.indexOf("<SitewideLeadCapture") < root.indexOf("<MobileBottomNavigation"));
  assert.match(component, /clientPath \? classifyPublicLead\(clientPath\) : null/);
  assert.match(component, /setClientPath\(pathname\)/);
  assert.match(local, /clientPath \? classifyPublicLead\(clientPath\) : null/);
  assert.match(local, /useEffect\(\(\) => setClientPath\(pathname\)/);
  assert.match(component, /setLegacyBookLocale/);
  assert.match(component, /window.location.search/);
  assert.match(component, /trainingEnquiryUrl\(locale, pathname\)/);
  assert.match(component, /data-sitewide-capture=\{kind\}/);
  assert.match(component, /services\/free-situation-review/);
  assert.match(component, /sitewide-capture-title/);
  assert.match(component, /Explore the Academy/);
  assert.match(local, /data-consultation-cta/);
  assert.match(local, /data-conversion-kind=\{mode\}/);
  assert.match(local, /trainingEnquiryUrl\(locale, pathname\)/);
  assert.match(local, /free-situation-review/);
  const services = read("app/[locale]/services/[practitionerSlug]/[serviceSlug]/page.tsx");
  const practitioner = read("app/[locale]/masters/[slug]/page.tsx");
  assert.match(services, /id="request-service"/);
  assert.match(services, /practitioner.slug === "andy-litvinov"/);
  assert.match(practitioner, /id="practitioner-services"/);
  assert.match(component, /kind === "network"/);
  assert.match(component, /networkService \? "#request-service"/);
  assert.match(component, /networkMaster \? "#practitioner-services"/);
  assert.match(suppress, /body:has\(\[data-consultation-cta\]\) \[data-sitewide-capture\] \{ display: none; \}/);
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /min-height:48px/);
  assert.match(css, /:focus-visible/);
});

test("all three languages explain safe voluntary next steps and historic course availability", () => {
  const source = read("components/sitewide-lead-capture.tsx");
  const shared = read("components/public-consultation-cta.tsx");
  for (const text of [
    "No obligation", "Бесплатный разбор", "No hay obligación",
    "historical archive materials are not necessarily open", "архивные программы", "del archivo",
  ]) {
    assert.ok((source + shared).toLowerCase().includes(text.toLowerCase()), text);
  }
  assert.doesNotMatch(source + shared, /cure guarantee|лечит все|replace standard medical care|financial guarantee/i);
});
