import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
const read = file => readFileSync(new URL("../" + file, import.meta.url), "utf8");

test("Service carousel shows an on-slide quick enquiry and all categories directly below", () => {
  const hero = read("components/services-conversion-hero.tsx");
  const css = read("components/services-conversion-hero.module.css");
  assert.match(hero, /<ServicesHeroQuickRequest/);
  assert.match(hero, /data-services-slide-request=\{slide.kind\}/);
  assert.match(hero, /slide\.kind !== "free"/);
  assert.match(hero, /data-services-slide-action=\{slide.kind\}/);
  assert.ok(hero.indexOf('className={styles.filterHeader}') < hero.indexOf('className={styles.topicList}'));
  assert.ok(hero.indexOf('className={styles.modeToggle}') < hero.indexOf('className={styles.topicList}'));
  assert.match(hero, /onClick=\{\(\) => chooseTopic\(kind\)\}/);
  assert.match(hero, /if \(kind === "reiki" \|\| kind === "free"\) setMode\("online"\)/);
  assert.match(css, /\.finder \.topicList \{ display:grid; grid-template-columns:repeat\(6/);
  assert.match(css, /grid-template-columns:repeat\(2,minmax\(0,1fr\)\)/);
  assert.match(css, /\.slider\[data-request-open="true"\]/);
  assert.match(css, /\.requestPanel/);
  assert.match(css, /@media\(max-width:365px\)/);
});

test("Online and Toronto format buttons sit compactly beside the question on desktop and phones", () => {
  const hero = read("components/services-conversion-hero.tsx");
  const css = read("components/services-conversion-hero.module.css");
  assert.match(hero, /className=\{styles\.filterHeader\}/);
  assert.match(hero, /className=\{styles\.modeToggle\} role="group" aria-label=\{t\.modeTitle\}/);
  assert.match(hero, /data-services-mode="online"/);
  assert.match(hero, /data-services-mode="toronto"/);
  assert.match(hero, /aria-pressed=\{mode === "online"\}/);
  assert.match(hero, /aria-pressed=\{mode === "toronto"\}/);
  assert.match(hero, /inPerson: "In person"/);
  assert.match(hero, /inPerson: "Лично"/);
  assert.match(hero, /inPerson: "Presencial"/);
  assert.doesNotMatch(hero, /className=\{styles\.finderTop\}/);
  assert.match(css, /\.filterHeader \{ display:grid; grid-template-columns:minmax\(0,1fr\) auto/);
  assert.match(css, /\.filterHeader > p \{ grid-column:1\/-1;/);
  assert.match(css, /\.modeToggle \{ display:grid; grid-template-columns:1fr; width:104px;/);
  assert.match(css, /\.filterHeader \{ grid-template-columns:minmax\(0,1fr\) 98px;/);
  assert.doesNotMatch(css, /\.finder \.finderTop/);
});

test("Quick contact form is consented, idempotent and reuses encrypted CRM-backed API", () => {
  const form = read("components/services-hero-quick-request.tsx");
  const api = read("app/api/service-enquiries/route.js");
  const writer = read("lib/practitioners/public-service-enquiry.js");
  for (const copy of ['en:', 'ru:', 'es:']) assert.match(form, new RegExp(copy));
  assert.match(form, /contactConsent: true/);
  assert.match(form, /operationId\.current \|\|= window\.crypto\.randomUUID\(\)/);
  assert.match(form, /fetch\("\/api\/service-enquiries"/);
  assert.match(form, /response\.ok/);
  assert.match(form, /result\?\.saved !== true/);
  assert.match(form, /sessionStorage\.setItem\(RECEIPT_SESSION_KEY/);
  assert.match(form, /!consent/);
  assert.match(form, /parseContact\(address\)/);
  assert.doesNotMatch(form, /lead_created|booking_confirmed|payment_received|gtag\(/);
  assert.match(api, /createPublicServiceEnquiry/);
  assert.match(writer, /insert into app\.public_service_enquiries/);
  assert.match(writer, /insert into app\.crm_contacts/);
  assert.match(writer, /if \(contact && !crmEnabled\(\)\)/);
  assert.doesNotMatch(form, /contact: \{[^}]*sourcePath/);
});
