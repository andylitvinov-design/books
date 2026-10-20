import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const read = (relative) => readFileSync(new URL("../" + relative, import.meta.url), "utf8");

test("sitemap runtime asset trace includes Spanish data and EN/RU source documents", () => {
  const config = read("next.config.ts");
  const routeTrace = config.match(/["']\/sitemap\.xml["']\s*:\s*\[([\s\S]*?)\]/);
  assert.ok(routeTrace, "Missing sitemap-specific Next.js output file tracing");
  for (const required of [
    "./data/spanish-remedies.json",
    "./content/remedies/en/*.md",
    "./content/remedies/ru/*.md",
  ]) {
    assert.ok(routeTrace[1].includes('"' + required + '"'), "Sitemap trace missing " + required);
  }
});

test("sitemap source assets exist in Git and Spanish inventory matches English files", () => {
  const translations = JSON.parse(read("data/spanish-remedies.json"));
  assert.equal(translations.schemaVersion, 1);
  assert.equal(translations.targetLocale, "es");
  const en = readdirSync(root + "/content/remedies/en")
    .filter(name => name.endsWith(".md")).map(name => name.slice(0, -3)).sort();
  const ru = readdirSync(root + "/content/remedies/ru")
    .filter(name => name.endsWith(".md"));
  assert.ok(en.length > 0, "Empty English remedy source");
  assert.ok(ru.length > 0, "Empty Russian remedy source");
  assert.deepEqual(Object.keys(translations.entries).sort(), en);
});

test("sitemap isolates optional remedy loader errors from core URLs", () => {
  const sitemap = read("app/sitemap.ts");
  assert.doesNotMatch(sitemap, /^import\s*\{\s*getSitemapEntries\s*\}/m);
  assert.doesNotMatch(sitemap, /^import\s*\{\s*getSpanishRemedySlugs\s*\}/m);
  assert.match(sitemap, /await import\("@\/data\/seo"\)/);
  assert.match(sitemap, /await import\("@\/data\/remedies-es"\)/);
  assert.match(sitemap, /const existing = await loadSeoEntries\(base\)/);
  assert.match(sitemap, /const spanishRemedyPaths = await loadSpanishRemedyPaths\(\)/);
  assert.match(sitemap, /console\.error\("\[sitemap\]/);
});
