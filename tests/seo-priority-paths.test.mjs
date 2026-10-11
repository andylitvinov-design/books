import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import test from "node:test";
import { getPrioritySitemapEntries, SEO_PRIORITY_LOCALES, SEO_PRIORITY_PAGE_FAMILIES } from "../data/seo-priority-paths.js";

const origin = "https://holistichouse.vercel.app";
const entries = getPrioritySitemapEntries(origin);

test("curated SEO pages are real, localized, canonical HTTPS routes with reciprocal sitemap hreflang", () => {
  assert.equal(SEO_PRIORITY_PAGE_FAMILIES.length, 4);
  assert.equal(entries.length, SEO_PRIORITY_PAGE_FAMILIES.length * SEO_PRIORITY_LOCALES.length);
  assert.equal(new Set(entries.map((item) => item.url)).size, entries.length);
  for (const item of entries) {
    const url = new URL(item.url);
    assert.equal(url.origin, origin);
    assert.match(url.pathname, /^\/(en|ru|es)\//);
    assert.doesNotMatch(url.pathname, /\/(app|client|api|admin|report|prescriptions|documents)(\/|$)/);
    assert.equal(item.changeFrequency, "monthly");
    assert.equal(Object.keys(item.alternates.languages).sort().join(","), "en,es,ru");
    const suffix = url.pathname.replace(/^\/(en|ru|es)/, "");
    for (const locale of SEO_PRIORITY_LOCALES) {
      assert.equal(item.alternates.languages[locale], origin + "/" + locale + suffix);
    }
  }
  assert.deepEqual(entries.map((item) => item.url).filter((url) => url.includes("/services/free-situation-review")).length, 3);
  assert.throws(() => getPrioritySitemapEntries("http://insecure.example"), /HTTPS/);
});

test("published SEO routes use existing page handlers and join dynamic sitemap without replacing them", () => {
  for (const path of ["app/[locale]/about/page.tsx", "app/[locale]/services/free-situation-review/page.tsx", "app/[locale]/academy/[[...slug]]/page.tsx"]) {
    assert.ok(existsSync(new URL("../" + path, import.meta.url)), path);
  }
  const sitemap = readFileSync(new URL("../app/sitemap.ts", import.meta.url), "utf8");
  assert.match(sitemap, /getPrioritySitemapEntries\(base\)/);
  assert.match(sitemap, /\.\.\.existing, \.\.\.entries, \.\.\.priorityEntries, \.\.\.network/);
  assert.doesNotMatch(sitemap, /\/en\/client|\/ru\/client|\/es\/client/);
});
