import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import test from "node:test";

const root = process.cwd();
const read = (...parts) => readFileSync(path.join(root, ...parts), "utf8");

test("Library opens as compact section blocks with Books and Videos switch", () => {
  const hub = read("components", "library-hub.tsx");
  const page = read("app", "[locale]", "library", "page.tsx");

  assert.match(hub, /library-media-switch/);
  assert.match(hub, /view=videos/);
  assert.match(hub, /section=\$\{section\}/);
  assert.match(hub, /"alchemy", "dao", "maya"/);
  assert.match(hub, /CatalogShowcase/);
  assert.match(hub, /bookSectionLeads/);
  assert.match(page, /rawView === "videos"/);
});

test("Library section links filter books without removing the flat direct catalog", () => {
  const catalog = read("components", "book-catalog.tsx");
  const page = read("app", "[locale]", "books", "page.tsx");
  const sections = read("data", "library-sections.ts");

  assert.match(sections, /bookSectionKeys = \["alchemy", "dao", "maya"\]/);
  assert.match(page, /parseBookSection\(query\.section\)/);
  assert.match(catalog, /section \? books\.filter\(\(book\) => book\.mediaSeries === section\) : books/);
  assert.match(catalog, /section \? bookSectionTitles\[locale\]\[section\] : text\.heading/);
});

test("mobile Library uses compact contents plus one-screen showcase chapters", () => {
  const showcase = read("app", "catalog-showcase.css");
  const styles = read("app", "globals.css");

  assert.match(showcase, /\.catalog-showcase-index-card \{[\s\S]*?min-height: 74px;/);
  assert.match(showcase, /\.catalog-showcase-panel,[\s\S]*?min-height: calc\(100svh - 76px\)/);
  assert.match(showcase, /grid-template-rows: minmax\(250px, 42svh\) auto/);
  assert.match(showcase, /\.catalog-showcase-action \{[\s\S]*?width: 100%/);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*?\.catalog-card,[\s\S]*?min-height: 74px;[\s\S]*?height: 74px;/);
  assert.match(styles, /\.remedies-book-grid \{[\s\S]*?grid-template-columns: 1fr;/);
});
