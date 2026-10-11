// Read-only SEO audit; default mode uses no network, credentials or patient data.
// To verify after deployment: npm run verify:seo -- --live-base=https://holistichouse.vercel.app
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { getPrioritySitemapEntries, SEO_PRIORITY_PAGE_FAMILIES } from "../data/seo-priority-paths.js";

const projectRoot = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, projectRoot), "utf8");
const origin = "https://holistichouse.vercel.app";
const entries = getPrioritySitemapEntries(origin);
const map = JSON.parse(read("data/seo-demand-map.json"));

assert.equal(entries.length, 12, "Unexpected number of public locale-complete pages");
assert.equal(SEO_PRIORITY_PAGE_FAMILIES.length, 4);
assert.equal(new Set(entries.map((e) => e.url)).size, entries.length);
assert.ok(map.keywords.length >= 30);
assert.match(map.status, /not_google_metrics/);
for (const row of map.keywords) {
  assert.equal(row.source, "editorial_seed_unvalidated");
  for (const metric of Object.values(row.measured)) {
    assert.equal(metric, null, "Do not invent Google metrics for " + row.cluster_id);
  }
  if (row.primary_path !== null) {
    assert.ok(row.primary_path === "/" || row.primary_path.startsWith("/" + row.locale + "/"));
    assert.doesNotMatch(row.primary_path, /\/(api|admin|app|client|report|prescriptions|documents)(\/|$)/);
  }
}
for (const suffix of ["/about", "/services/free-situation-review"]) {
  assert.ok(existsSync(new URL("app/[locale]" + suffix + "/page.tsx", projectRoot)));
}
assert.ok(existsSync(new URL("app/[locale]/academy/[[...slug]]/page.tsx", projectRoot)));
const sitemapCode = read("app/sitemap.ts");
assert.match(sitemapCode, /getPrioritySitemapEntries\(base\)/);
assert.match(sitemapCode, /\.\.\.existing, \.\.\.entries, \.\.\.priorityEntries, \.\.\.network/);
console.log("PASS: SEO map, 12 public locale URLs, sitemap integration, no invented metrics/private URLs");

const liveArg = process.argv.find((arg) => arg.startsWith("--live-base="));
if (liveArg) {
  const parsed = new URL(liveArg.slice("--live-base=".length));
  assert.equal(parsed.protocol, "https:");
  assert.equal(parsed.search, "");
  assert.equal(parsed.hash, "");
  const base = parsed.origin;
  const response = await fetch(base + "/sitemap.xml", { redirect: "manual" });
  assert.equal(response.status, 200, "Sitemap not accessible; authenticate any protected Vercel preview");
  const xml = await response.text();
  assert.match(xml, /<urlset\b/);
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
  assert.ok(blocks.length >= 12);
  const found = new Set(blocks.flatMap((block) => [...block.matchAll(/<loc>([^<]+)<\/loc>/g)].map((x) => x[1])));
  assert.equal(found.size, blocks.length, "Duplicate or missing loc in sitemap");
  for (const entry of getPrioritySitemapEntries(base)) {
    const block = blocks.find((value) => value.includes("<loc>" + entry.url + "</loc>"));
    assert.ok(block, "Missing public sitemap URL " + entry.url);
    for (const [locale, href] of Object.entries(entry.alternates.languages)) {
      assert.ok(block.includes('hreflang="' + locale + '"') && block.includes('href="' + href + '"'), "Missing reciprocal alternate " + entry.url + ":" + locale);
    }
  }
  for (const url of found) {
    const path = new URL(url).pathname;
    assert.doesNotMatch(path, /^\/(?:en|ru|es)\/(?:admin|api|app|report|prescriptions|documents)(?:\/|$)/);
    assert.doesNotMatch(path, /^\/(?:en|ru|es)\/client\/.+/);
  }
  const robotsResponse = await fetch(base + "/robots.txt", { redirect: "manual" });
  assert.equal(robotsResponse.status, 200);
  assert.ok((await robotsResponse.text()).includes("Sitemap: " + base + "/sitemap.xml"));
  for (const path of ["/en/about", "/ru/about", "/en/services/free-situation-review", "/en/academy/reiki/yggdrasil/free-initiation"]) {
    const result = await fetch(base + path, { method: "HEAD", redirect: "manual" });
    assert.equal(result.status, 200, "Public route not reachable " + path);
  }
  console.log("PASS: live sitemap, reciprocal locale links, robots and public page status at " + base);
}
