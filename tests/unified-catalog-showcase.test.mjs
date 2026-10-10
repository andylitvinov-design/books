import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

test("Services leads with client solutions; Academy and Library retain shared showcase", () => {
  const services = read("app", "[locale]", "services", "page.tsx");
  const solutions = read("components", "services-solutions.tsx");
  const academy = read("components", "academy-hub.tsx");
  const library = read("components", "library-hub.tsx");
  assert.match(services, /ServicesSolutions/);
  assert.doesNotMatch(services, /<CatalogShowcase/);
  assert.match(solutions, /t.solutions.map/);
  assert.match(solutions, /href=.*free-situation-review\?topic=/);
  assert.match(academy, /CatalogShowcase/);
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

test("Services goal cards go to preselected free intake; method details have real routes", () => {
  const solutions = read("components", "services-solutions.tsx");
  const capture = read("components", "consultation-choice-capture.tsx");
  const academy = read("components", "academy-hub.tsx");
  const library = read("components", "library-hub.tsx");

  assert.match(solutions, /free-situation-review\?topic=/);
  for (const topic of ["wellbeing","personal","goal","business"]) {
    assert.ok(solutions.includes('topic: "' + topic + '"'), topic);
  }
  for (const slug of ["psychohomeopathy","imagery-therapy","systemic-constellations"]) {
    assert.ok(solutions.includes('href: "' + slug + '"'), slug);
  }
  assert.match(capture, /isTopic\(requestedTopic\)/);
  assert.match(academy, /academy\/temple-studies/);
  assert.doesNotMatch(library, /books\?section=/);
});
