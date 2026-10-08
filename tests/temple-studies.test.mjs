import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const read = (path) => readFileSync(path, "utf8");

test("Academy features exactly three clear programs and retains a separate archive link", () => {
  const hub = read("components/academy-hub.tsx");
  for (const slug of ["academy-featured-yggdrasil", "academy-featured-tantra-reiki", "academy-featured-temple-studies"]) {
    assert.match(hub, new RegExp(slug));
  }
  assert.doesNotMatch(hub, /academyDirections\.filter\(\(direction\) => direction\.id !== "reiki"\)/);
  assert.match(hub, /academy-archive-nav/);
});

test("Temple Studies has four localized chapters, editorial photos and source-backed archive access", () => {
  const page = read("components/temple-studies.tsx");
  const css = read("app/temple-studies.css");
  const layout = read("app/layout.tsx");
  for (const heading of ["Mysteries & Ancient Traditions", "Runes, Elements & Symbolic Arts", "Applied Archetypal Practice", "School Path & Integration"]) {
    assert.match(page, new RegExp(heading));
  }
  for (const language of ["en:", "ru:", "es:"]) assert.match(page, new RegExp(language));
  for (const direction of ['direction: "mysteries"', 'direction: "symbolic"', 'direction: "applied"', 'direction: "school"']) {
    assert.ok(page.includes(direction), "missing source direction " + direction);
  }
  assert.match(page, /academyPublicBlocks\(record, locale\)/);
  assert.match(page, /mediaForRecord\(record\)/);
  assert.match(page, /recordsForDirection\(direction, locale\)/);
  assert.match(page, /<details className="temple-sources">/);
  assert.match(page, /<Image src=\{image\}/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(layout, /temple-studies\.css/);
});

test("Old directory URLs redirect to Temple Studies and substantial original records remain accessible", () => {
  const route = read("app/[locale]/academy/[[...slug]]/page.tsx");
  assert.match(route, /key === "temple-studies"/);
  assert.match(route, /<TempleStudies locale=\{locale\}/);
  for (const legacy of ["mysteries", "symbolic", "applied", "path", "traditions", "runes", "elements"]) {
    assert.match(route, new RegExp(legacy));
  }
  assert.match(route, /permanentRedirect\("\/" \+ locale \+ "\/academy\/temple-studies#"/);
  assert.match(route, /visibleBody\.length < 2 && !hasVideo/);
  assert.match(route, /<AcademyRecordPage locale=\{locale\} record=\{record\}/);
  const catalog = read("data/academy/catalog.ts");
  assert.match(catalog, /"mysteries\/archetypes-of-gods"/);
  assert.match(catalog, /"mysteries\/egyptian-hypno-course"/);
  assert.match(catalog, /"runes\/runes-business"/);
});
