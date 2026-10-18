import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const read = (path) => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("all three canonical service pages exist in EN/RU/ES with SEO and actual enquiry", () => {
  for (const name of ["psychohomeopathy","imagery-therapy","systemic-constellations"]) {
    const page = read("app/[locale]/services/" + name + "/page.tsx");
    assert.match(page,/generateMetadata/);
    assert.match(page,/generateStaticParams/);
    for (const locale of ["en","ru","es"]) assert.ok(page.includes("/" + locale + "/services/" + name), locale + " missing in " + name);
    assert.match(page,/PersonalServiceLanding/);
    assert.match(page,/isPublicLocale/);
  }
  const component = read("components/personal-service-landing.tsx");
  assert.match(component, /<PersonalConsultationForm locale={locale} service={t.orderLabel}/);
  assert.match(component, /id="request-session"/);
  assert.match(component, /href="#request-session"/);
  assert.match(component, /t\.questions\.map/);
  assert.match(component, /t\.process\.map/);
  assert.match(component, /t\.faqs\.map/);
  assert.match(component, /t\.disclaimer/);
});

test("three free paths and two personal cards retain all core service detail pages and legacy method links", () => {
  const services = read("app/[locale]/services/page.tsx");
  const offers = read("data/core-service-offers.ts");
  const ui = read("components/services-solutions.tsx");
  const free = read("app/[locale]/services/free-situation-review/page.tsx");
  assert.match(services, /<ServicesSolutions locale=/);
  for(const slug of ["free-situation-review","dao-health-profile","alchemy-of-soul","hypnotherapy-course"])
    assert.ok(offers.includes('route: "' + slug + '"'));
  for(const slug of ["alchemy-of-soul","imagery-therapy","systemic-constellations"])
    assert.ok(ui.includes('href:"' + slug + '"') || ui.includes('href: "' + slug + '"'));
  const freePaths = read("components/free-insights-paths.tsx");
  assert.match(freePaths, /free-situation-review/);
  assert.match(freePaths, /dao-health-profile/);
  assert.match(ui, /visibleOffers.map/);
  assert.match(free, /FreeSituationReviewForm/);
});

test("free diagnostic renders scope and safety in its steps and FAQ without a duplicate scope section", () => {
  const s = read("app/[locale]/services/free-situation-review/page.tsx");
  assert.match(s, /t\.steps\.map/);
  assert.match(s, /t\.faqs\.map/);
  assert.match(s, /<p className=\{styles\.safety\}>\{t\.transparency\}<\/p>/);
  for (const phrase of [
    "The free offer does not include a live call.",
    "Бесплатного созвона в этот формат не входит.",
    "No incluye una llamada en directo.",
    "not a medical diagnosis, psychiatric diagnosis or prescription",
    "не медицинский или психиатрический диагноз или назначение лечения",
    "sin diagnósticos médicos o psiquiátricos ni recetas",
  ]) assert.ok(s.includes(phrase), phrase);
  assert.match(s, /className=\{styles\.finalCapture\} id="personal-consultation"/);
  assert.match(s, /className=\{styles\.finalRequest\} id="request-free-review"/);
  assert.match(s, /<FreeReviewQuickRequest locale=\{locale\} \/>/);
  assert.match(s, /This is optional, never a requirement for your free written review/);
  assert.ok(s.indexOf('id="personal-consultation"') > s.indexOf("className={styles.details}"));
  assert.doesNotMatch(s, /className=\{styles\.scope\}/);
  const css = read("app/[locale]/services/free-situation-review/review.module.css");
  assert.match(css, /\.steps\{grid-template-columns:1fr/);
  assert.match(css, /@media\(max-width:767px\)/);
});

test("all personal services have source-backed educational language, approved prices and no medical claims", () => {
  const copy = read("data/personal-service-pages.ts");
  for (const key of ["psychohomeopathy","imagery-therapy","systemic-constellations"]) assert.ok(copy.includes(key), key);
  for (const l of ["ru: {", "en: {", "es: {"]) assert.ok(copy.includes(l));
  assert.match(copy, /homeopathy lacks reliable evidence/i);
  assert.match(copy, /не имеет надёжных доказательств/);
  assert.match(copy, /not a payment or automatic booking/);
  assert.match(copy, /No payment is taken on this page/);
  assert.doesNotMatch(copy, /100% guaranteed|guaranteed cure|лечит болезни|100\s*% успех/i);
  const css = read("components/personal-service-landing.module.css");
  assert.match(css, /@media\(max-width:767px\)/);
  assert.match(css, /:focus-visible/);
  assert.match(css, /min-height:56px/);
});

test("paid individual services retain contextual handoff without a compulsory intake form", () => {
  const wrapper = read("components/personal-consultation-form.tsx");
  const shared = read("components/consultation-choice-capture.tsx");
  const landing = read("components/personal-service-landing.tsx");
  const css = read("components/personal-service-landing.module.css");
  assert.match(wrapper, /<ConsultationChoiceCapture locale=\{locale\} variant=\{service \? "service" : "personal"\} service=\{service\}/);
  assert.doesNotMatch(wrapper, /<form|<input|<select|<textarea|FormData/);
  assert.match(shared, /60-minute personal session · €100/);
  assert.match(shared, /Free drawing assessment \+ written report/);
  assert.match(shared, /30-minute express consultation · €50/);
  assert.match(shared, /service: service \|\|/);
  assert.match(shared, /This is an enquiry, not a confirmed booking or payment/);
  assert.match(landing, /id="request-session"/);
  assert.match(landing, /<PersonalConsultationForm locale=\{locale\} service=\{t.orderLabel\}/);
  assert.match(css, /\.order :global\(\[data-consultation-capture="service"\]\)/);
});
