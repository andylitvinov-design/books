import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

test("Services, Academy and Library share the same showcase component", () => {
  const services = read("app", "[locale]", "services", "page.tsx");
  const academy = read("components", "academy-hub.tsx");
  const library = read("components", "library-hub.tsx");

  assert.match(services, /CatalogShowcase/);
  assert.match(academy, /CatalogShowcase/);
  assert.match(library, /CatalogShowcase/);
  assert.match(services, /serviceShowcaseItems/);
  assert.match(academy, /academyDirections\.map/);
  assert.match(library, /bookItems\(locale\)/);
});

test("shared showcase has compact contents, visual panels and a clear choice action", () => {
  const component = read("components", "catalog-showcase.tsx");
  const styles = read("app", "catalog-showcase.css");

  assert.match(component, /catalog-showcase-index-card/);
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

  assert.match(services, /services-marketplace/);
  assert.match(services, /featuredService/);
  assert.match(services, /PageVideo slot="services-intro"/);
  assert.match(services, /slot=\{"service-" \+ id\}/);
  assert.match(services, /method-hypnotherapy/);
  assert.match(services, /method-constellations/);
});
