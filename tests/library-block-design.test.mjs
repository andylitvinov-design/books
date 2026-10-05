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
  assert.match(hub, /library-index-card/);
  assert.match(hub, /library-index-photo/);
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

test("mobile Library and book rows stay full-width and approximately 72-74px tall", () => {
  const ia = read("app", "ia-v2.css");
  const styles = read("app", "globals.css");

  assert.match(ia, /@media \(max-width: 600px\)[\s\S]*?\.library-index-grid \{ grid-template-columns: minmax\(0,1fr\);/);
  assert.match(ia, /\.library-index-card \{ min-height: 74px; grid-template-columns: 76px minmax\(0,1fr\) 24px;/);
  assert.match(ia, /\.library-index-photo \{ min-height: 72px;/);
  assert.match(styles, /@media \(max-width: 767px\)[\s\S]*?\.catalog-card,[\s\S]*?min-height: 74px;[\s\S]*?height: 74px;/);
  assert.match(styles, /\.catalog-cover \{[\s\S]*?width: 78px;[\s\S]*?height: 72px;/);
  assert.match(styles, /\.remedies-book-grid \{[\s\S]*?grid-template-columns: 1fr;/);
});
