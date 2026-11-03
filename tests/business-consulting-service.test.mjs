import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("business consulting has a localized standalone page and booking enquiry", () => {
  const page = read("app/[locale]/services/business-consulting/page.tsx");
  const copy = read("data/personal-service-pages.ts");
  const form = read("components/personal-service-landing.tsx");
  assert.match(page, /business-consulting/);
  assert.match(page, /generateStaticParams/);
  assert.match(copy, /"business-consulting":/);
  assert.match(copy, /активация цели/i);
  assert.match(copy, /Activate the goal/);
  assert.match(copy, /Activar la meta/);
  assert.match(form, /PersonalConsultationForm/);
});
test("all service indexes and locale changes can find the new offer", () => {
  assert.match(read("data/core-service-offers.ts"), /route: "business-consulting"/);
  assert.match(read("components/services-solutions.tsx"), /offer\.id === "business"/);
  assert.match(read("app/es/services/page.tsx"), /\/es\/services\/business-consulting/);
  assert.match(read("app/sitemap.ts"), /services\/business-consulting/);
  assert.match(read("lib/public-locales.ts"), /business-consulting/);
});
