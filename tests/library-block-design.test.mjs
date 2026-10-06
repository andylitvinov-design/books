import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

test("Library opens as compact material blocks with Books and Videos switch", () => {
  const hub = read("components", "library-hub.tsx");
  const page = read("app", "[locale]", "library", "page.tsx");

  assert.match(hub, /library-media-switch/);
  assert.match(hub, /view=videos/);
  assert.match(hub, /All books & guides|Все книги и методички/);
  assert.match(hub, /homeopathy\/remedies/);
  assert.match(hub, /wu-xing/);
  assert.match(hub, /CatalogShowcase/);
  assert.doesNotMatch(hub, /section=\$\{section\}/);
  assert.match(page, /rawView === "videos"/);
});

test("Books route is a single catalog and series remain labels rather than folders", () => {
  const catalog = read("components", "book-catalog.tsx");
  const page = read("app", "[locale]", "books", "page.tsx");
  const structure = read("data", "library-structure.ts");

  assert.doesNotMatch(page, /parseBookSection|section=/);
  assert.doesNotMatch(catalog, /section \? books\.filter/);
  assert.match(catalog, /recommendedReadingPath/);
  assert.match(catalog, /catalog-material-role/);
  assert.match(structure, /foundation/);
  assert.match(structure, /reference/);
  assert.match(structure, /practice/);
});

test("mobile Library uses compact contents plus one-screen showcase chapters", () => {
  const showcase = read("app", "catalog-showcase.css");
  const styles = read("app", "globals.css");

  assert.match(showcase, /\.catalog-showcase-index-card \{[\s\S]*?min-height: 74px;/);
  assert.match(showcase, /\.catalog-showcase-panel,[\s\S]*?min-height: calc\(100svh - 76px\)/);
  assert.match(showcase, /grid-template-rows: minmax\(250px, 42svh\) auto/);
  assert.match(showcase, /\.catalog-showcase-action \{[\s\S]*?width: 100%/);
  assert.match(styles, /\.catalog-reading-steps/);
  assert.match(styles, /\.remedies-book-grid \{[\s\S]*?grid-template-columns: 1fr;/);
});
