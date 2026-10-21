import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { servicesStudioContract } from "./helpers/services-studio-contract.mjs";
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
test("all service indexes and locale changes can find the new offer", async () => {
  assert.match(read("data/core-service-offers.ts"), /route: "business-consulting"/);
  assert.match(read("components/services-solutions.tsx"), /offer\.id === "business"/);
  for (const locale of ["en", "ru", "es"]) {
    const view = await servicesStudioContract(locale);
    const offer = view.core.find(offer => offer.id === "business");
    assert.ok(offer, locale + ": Business has an actual shared data record");
    assert.equal(offer.href, "/" + locale + "/services/business-consulting");
    const card = view.cards.find(card => card.props["data-services-studio-card"] === "business");
    assert.ok(card, locale + ": the real route mounts the real Business card");
    assert.equal(card.props.hidden, false);
    assert.equal(view.isVisible(card), true);
    assert.ok(view.descendants(card).some(node => node.type === "a" && node.props.href === offer.href));
  }
  assert.match(read("app/sitemap.ts"), /services\/business-consulting/);
  assert.match(read("lib/public-locales.ts"), /business-consulting/);
});
