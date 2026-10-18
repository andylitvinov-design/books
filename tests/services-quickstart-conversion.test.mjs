import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("EN/RU/ES services give visitors a direct free or paid path before searching", () => {
  const quick = read("components/services-quick-start.tsx");
  const css = read("components/services-quick-start.module.css");
  const enRu = read("app/[locale]/services/page.tsx");
  const es = read("app/es/services/page.tsx");
  assert.match(quick, /type PublicLocale/);
  for (const lang of ["en: {", "ru: {", "es: {"]) assert.ok(quick.includes(lang), lang);
  assert.match(quick, /data-services-quick-start/);
  assert.match(quick, /data-services-quick-action": "free-written-review"/);
  assert.match(quick, /data-services-quick-action": "personal-session"/);
  assert.match(quick, /services\/free-situation-review/);
  assert.match(quick, /services\/alchemy-of-soul/);
  assert.match(quick, /Links only: never sends a message/);
  assert.match(css, /min-height:48px/);
  assert.match(css, /@media\(max-width:780px\)/);
  assert.match(css, /:focus-visible/);
  assert.ok(enRu.indexOf("<ServicesQuickStart") < enRu.indexOf("<ServicesSmartDiscovery"), "EN/RU direct actions must be first");
  assert.ok(es.indexOf("<ServicesQuickStart") < es.indexOf("<ServicesSmartDiscovery"), "ES direct actions must be first");
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
  for (const route of ["imagery-therapy", "systemic-constellations", "business-consulting"])
    assert.ok(script.includes('"' + route + '"'), route);
  assert.match(script, /for \(const locale of \["en", "ru", "es"\]\)/);
  assert.match(script, /waitForURL\(\/#request-session\$\/\)/);
  assert.match(script, /assertPreparedContactChannels\(chooser, expect\)/);
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
