import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

test("Services leads with free tests and five photo cards while Home preserves four offers", () => {
  const services = read("app", "[locale]", "services", "page.tsx");
  const home = read("components", "holistic-house-home.tsx");
  const solutions = read("components", "services-solutions.tsx");
  const academy = read("components", "academy-hub.tsx");
  const library = read("components", "library-hub.tsx");
  assert.match(services, /<ServicesSolutions locale=/);
  assert.match(home, /<ServicesSolutions locale=\{locale\} variant="home"/);
  assert.ok(solutions.includes('const visibleOffers = isHome ? allOffers.filter((offer) => offer.id !== "business") : allOffers;'));
  assert.ok(services.includes("<ServicesTestsIntro locale={locale as Locale} />"));
  assert.doesNotMatch(services, /<FreeInsightsPaths/);
  assert.doesNotMatch(home, /<FreeInsightsPaths locale=\{locale\} \/>/);
  assert.doesNotMatch(services, /<CatalogShowcase/);
  assert.match(academy, /AcademyCourseItem/);
  assert.match(read("components", "academy-discovery.tsx"), /<AcademyCourseCardList/);
  assert.match(library, /CatalogShowcase/);
  assert.match(academy, /academy-featured-yggdrasil/);
  assert.match(academy, /academy-featured-tantra-reiki/);
  assert.match(academy, /academy-featured-temple-studies/);
  assert.match(library, /bookItems\(locale\)/);
});

test("shared showcase has compact contents, visual panels and a clear choice action", () => {
  const component = read("components", "catalog-showcase.tsx");
  const styles = read("app", "catalog-showcase.css");

  assert.match(component, /catalog-showcase-index-card/);
  assert.match(component, /href=\{item\.indexHref \?\? item\.href\}/);
  assert.doesNotMatch(component, /href=\{"#" \+ item\.id\}/);
  assert.doesNotMatch(component, /catalog-showcase-index-number/);
  assert.doesNotMatch(component, /catalog-showcase-index-copy">[\s\S]*?<small>/);
  assert.match(component, /ChevronRight/);
  assert.match(component, /catalog-showcase-panel/);
  assert.match(component, /catalog-showcase-media/);
  assert.match(component, /catalog-showcase-action/);
  assert.match(component, /actionLabel/);
  assert.match(styles, /@media \(max-width: 720px\)[\s\S]*?\.catalog-showcase \{[\s\S]*?width: 100%/);
  assert.match(styles, /grid-template-columns: 76px minmax\(0, 1fr\) 24px/);
  assert.match(styles, /min-height: 72px/);
  assert.match(styles, /font-size: 18px/);
  assert.match(styles, /min-height: calc\(100svh - 76px\)/);
  assert.match(styles, /grid-template-rows: minmax\(250px, 42svh\) auto/);
});

test("Services preserves published video and marketplace content in optional disclosures", () => {
  const services = read("app", "[locale]", "services", "page.tsx");
  assert.match(services, /services-marketplace/);
  assert.match(services, /featuredService/);
  assert.match(services, /id="available-services"/);
  assert.match(services, /id="method-videos"/);
  assert.match(services, /PageVideo slot="services-intro"/);
  assert.match(services, /method-hypnotherapy/);
  assert.match(services, /method-constellations/);
  assert.match(services, /PageVideo slot="consultation"/);
  assert.match(services, /PersonalTestimonials/);
});

test("core offer links lead to distinct native EN/RU pages, with optional method details", () => {
  const ui = read("components", "services-solutions.tsx");
  const offers = read("data", "core-service-offers.ts");
  const academy = read("components", "academy-hub.tsx");
  const library = read("components", "library-hub.tsx");
  for (const route of ["free-situation-review","dao-health-profile","alchemy-of-soul","hypnotherapy-course"]) {
    assert.ok(offers.includes('route: "' + route + '"'), route);
  }
  for (const slug of ["alchemy-of-soul","imagery-therapy","systemic-constellations"]) {
    assert.ok(ui.includes('href:"' + slug + '"') || ui.includes('href: "' + slug + '"'), slug);
  }
  assert.match(ui, /id="methods"/);
  assert.match(academy, /academy\/temple-studies/);
  assert.doesNotMatch(library, /books\?section=/);
});
