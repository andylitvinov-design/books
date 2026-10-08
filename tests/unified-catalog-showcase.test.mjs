import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

test("Academy and Library share showcase while Services uses its own three-direction layout", () => {
  const services = read("app", "[locale]", "services", "page.tsx");
  const academy = read("components", "academy-hub.tsx");
  const library = read("components", "library-hub.tsx");

  assert.doesNotMatch(services, /CatalogShowcase/);
  assert.match(services, /directionStack/);
  assert.match(academy, /CatalogShowcase/);
  assert.match(library, /CatalogShowcase/);
  assert.match(services, /psychohomeopathy/);
  assert.match(academy, /academy-featured-yggdrasil/);
  assert.match(academy, /academy-featured-tantra-reiki/);
  assert.match(academy, /academyDirections\.filter/);
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

test("Services keeps marketplace and published video surfaces after the redesign", () => {
  const services = read("app", "[locale]", "services", "page.tsx");

  assert.match(services, /className=\{styles\.extra\}/);
  assert.match(services, /listPublicServices\(locale\)/);
  assert.match(services, /PageVideo slot="services-intro"/);
  assert.match(services, /classifyOffering/);
  assert.match(services, /method-hypnotherapy/);
  assert.match(services, /method-constellations/);
});


test("mini cards navigate to direct destinations instead of in-page anchors", () => {
  const component = read("components", "catalog-showcase.tsx");
  const services = read("app", "[locale]", "services", "page.tsx");
  const academy = read("components", "academy-hub.tsx");
  const library = read("components", "library-hub.tsx");

  assert.match(component, /indexHref\?: string/);
  assert.match(component, /item\.indexHref \?\? item\.href/);
  assert.match(services, /href=\{\`#\$\{service\.id\}\`\}/);
  assert.match(services, /\/services\/imagery-therapy/);
  assert.match(services, /academy\/reiki/);
  assert.match(services, /personal-constellation-session/);
  assert.match(services, /Business & decision constellations/);
  assert.match(services, /homeopathy-consultation/);

  assert.match(academy, /href: "\/" \+ locale \+ "\/academy\/" \+ direction\.path/);
  assert.match(library, /href: `\/\$\{locale\}\/books`/);
  assert.match(library, /href: `\/\$\{locale\}\/homeopathy\/remedies`/);
  assert.match(library, /href: `\/\$\{locale\}\/wu-xing`/);
  assert.doesNotMatch(library, /books\?section=/);
});
