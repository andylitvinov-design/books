// Read-only SEO audit; default mode uses no network, credentials or patient data.
// To verify after deployment: npm run verify:seo -- --live-base=https://holistichouse.vercel.app
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { getPrioritySitemapEntries, SEO_PRIORITY_PAGE_FAMILIES } from "../data/seo-priority-paths.js";

const projectRoot = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, projectRoot), "utf8");
const origin = "https://holistichouse.vercel.app";
const publicRouteSources = [
  ["app/[locale]/about/page.tsx", /generateMetadata/, /alternates:/, /<h1/],
  ["app/[locale]/services/free-situation-review/page.tsx", /generateMetadata/, /alternates:/, /<h1/],
  ["app/[locale]/academy/[[...slug]]/page.tsx", /generateMetadata/, /alternates:/],
  ["components/yggdrasil-free-initiation.tsx", /<h1/],
];
const privateRouteSources = [
  "app/[locale]/app/[[...path]]/page.jsx",
  "app/[locale]/client/[selector]/page.js",
  "app/[locale]/report/[assessmentId]/page.jsx",
  "app/admin/clients/page.js",
];

export function auditSeoSources() {
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const entries = getPrioritySitemapEntries(origin);
  const map = JSON.parse(read("data/seo-demand-map.json"));
  check(entries.length === 12, "Unexpected number of public locale-complete pages");
  check(SEO_PRIORITY_PAGE_FAMILIES.length === 4, "Unexpected number of priority page families");
  check(new Set(entries.map((entry) => entry.url)).size === entries.length, "Duplicate priority sitemap URLs");
  for (const entry of entries) {
    check(entry.url.startsWith(origin + "/"), "Priority URL must use the canonical HTTPS origin: " + entry.url);
    check(Object.keys(entry.alternates.languages).sort().join(",") === "en,es,ru", "Priority sitemap alternate set is incomplete: " + entry.url);
    check(!/\/(api|admin|app|client|report|prescriptions|documents)(\/|$)/.test(entry.url), "Private URL in priority sitemap: " + entry.url);
  }
  check(map.keywords.length >= 30, "Demand map is unexpectedly incomplete");
  check(/not_google_metrics/.test(map.status), "Demand map must not claim unavailable Google metrics");
  for (const row of map.keywords) {
    check(row.source === "editorial_seed_unvalidated", "Demand source is not an editorial seed: " + row.cluster_id);
    for (const metric of Object.values(row.measured)) check(metric === null, "Invented Google metric for " + row.cluster_id);
    if (row.primary_path !== null) {
      check(row.primary_path === "/" || row.primary_path.startsWith("/" + row.locale + "/"), "Demand path locale mismatch: " + row.cluster_id);
      check(!/\/(api|admin|app|client|report|prescriptions|documents)(\/|$)/.test(row.primary_path), "Private demand path: " + row.cluster_id);
    }
  }
  for (const [path, ...patterns] of publicRouteSources) {
    check(existsSync(new URL(path, projectRoot)), "Missing public SEO source: " + path);
    const source = read(path);
    for (const pattern of patterns) check(pattern.test(source), "Missing public SEO contract " + pattern + " in " + path);
  }
  for (const path of privateRouteSources) {
    check(existsSync(new URL(path, projectRoot)), "Missing private route source: " + path);
    check(/robots:\s*\{\s*index:\s*false/.test(read(path)), "Private route must remain noindex: " + path);
  }
  const sitemapCode = read("app/sitemap.ts");
  check(/getPrioritySitemapEntries\(base\)/.test(sitemapCode), "Priority sitemap entries are not integrated");
  check(/\.\.\.existing, \.\.\.entries, \.\.\.priorityEntries, \.\.\.network/.test(sitemapCode), "Sitemap merge or deduplication contract changed");
  const shell = read("app/layout.tsx");
  check(/type="application\/ld\+json"/.test(shell) && /"@type": "WebSite"/.test(shell), "Public WebSite JSON-LD is missing");
  const freeInitiation = read("components/yggdrasil-free-initiation.tsx");
  for (const suffix of ["/basic-course#ry-l01-s01", "/basic-course/description", "/basic-course"]) {
    check(freeInitiation.includes(suffix), "Missing internal Yggdrasil learning link: " + suffix);
  }
  return { ok: failures.length === 0, failures, checked: { publicRoutes: publicRouteSources.length, privateRoutes: privateRouteSources.length, prioritySitemapEntries: entries.length } };
}

const report = auditSeoSources();
assert.ok(report.ok, report.failures.join("\n"));
console.log(`PASS: SEO map, ${report.checked.prioritySitemapEntries} public locale URLs, sitemap integration, public metadata/H1 and private noindex contracts`);

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
