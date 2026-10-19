// Read-only, public-only live SEO verification. No authentication, patient data,
// or private routes. Run: node scripts/verify-live-sitemap.mjs [--sample=0]
import assert from "node:assert/strict";
import { mkdir, writeFile } from "node:fs/promises";

const origin = (process.env.HH_SEO_AUDIT_ORIGIN ?? "https://holistichouse.vercel.app").replace(/\/$/, "");
const sampleLimit = Number(process.argv.find(a => a.startsWith("--sample="))?.split("=")[1] ?? 0);
const maxErrors = 75;
const errors = [];
const warnings = [];
const decoded = s => s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
function absolute(value) {
  const url = new URL(decoded(value));
  assert.equal(url.origin, origin, "Sitemap origin mismatch");
  assert.equal(url.search, "", "Indexed URL must not contain query string");
  assert.equal(url.hash, "", "Indexed URL must not contain a hash fragment");
  return url.href;
}
function tags(fragment, name) {
  return [...fragment.matchAll(new RegExp("<" + name + "\\b([^>]*)\\/?>(?:\\s*)", "g"))].map(x => Object.fromEntries([...x[1].matchAll(/([\w:-]+)="([^"]*)"/g)].map(y => [y[1], decoded(y[2])])));
}
function logError(message) { if (errors.length < maxErrors) errors.push(message); }
async function fetchWithTimeout(path, options = {}) {
  const ac = new AbortController();
  const timeout = setTimeout(() => ac.abort(), 25000);
  try {
    return await fetch(origin + path, {
      redirect: "manual", signal: ac.signal,
      headers: { "User-Agent": "HolisticHouse-SEOVerification/1.0", "Accept": "text/html,application/xml;q=0.9,*/*;q=0.8" },
      ...options,
    });
  } finally { clearTimeout(timeout); }
}
function pathOf(url) { return new URL(url).pathname; }
const privatePattern = /^\/(?:api|admin|document-preview|(?:en|ru|es)\/(?:app|client|report|prescriptions))(?:\/|$)/;
const sitemapResponse = await fetchWithTimeout("/sitemap.xml");
assert.equal(sitemapResponse.status, 200, "Sitemap inaccessible");
const xml = await sitemapResponse.text();
assert.match(xml, /<urlset[\s>]/);
const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map(m => m[1]);
assert.ok(blocks.length >= 200, "Sitemap incomplete: " + blocks.length);
const entries = [];
for (const block of blocks) {
  const raw = block.match(/<loc>([^<]+)<\/loc>/)?.[1];
  if (!raw) { logError("URL without loc"); continue; }
  let url;
  try { url = absolute(raw); } catch (e) { logError("Invalid URL " + raw + ": " + e.message); continue; }
  const path = pathOf(url);
  if (privatePattern.test(path)) logError("Private route indexed: " + path);
  if (["/books", "/book", "/en", "/tests"].includes(path)) logError("Redirect indexed: " + path);
  const lm = block.match(/<lastmod>([^<]+)<\/lastmod>/)?.[1];
  if (!lm || Number.isNaN(Date.parse(lm))) logError("Invalid/missing lastmod: " + path);
  const languages = {};
  for (const attributes of tags(block, "xhtml:link")) {
    if (attributes.rel !== "alternate" || !attributes.hreflang || !attributes.href) continue;
    languages[attributes.hreflang] = attributes.href;
  }
  entries.push({ url, path, lastmod: lm ?? null, languages });
}
const byURL = new Map(entries.map(e => [e.url, e]));
if (byURL.size !== entries.length) logError("Duplicate URL in sitemap");
for (const item of entries) {
  for (const [language, href] of Object.entries(item.languages)) {
    if (!byURL.has(href)) { logError("Alternate not included in sitemap: " + item.path + " [" + language + "] " + href); continue; }
    if (language === "x-default") continue;
    const peer = byURL.get(href);
    const peerLanguage = item.path === "/" ? "en" : item.path.split("/")[1];
    if (["en", "ru", "es"].includes(peerLanguage) && peer.languages[peerLanguage] !== item.url) {
      logError("Nonreciprocal hreflang: " + item.path + " -> " + peer.path);
    }
  }
  if (item.languages.en && item.languages["x-default"] !== item.languages.en) {
    logError("Missing English x-default: " + item.path);
  }
}
// Never request private or non-canonical URL families.
const publicEntries = entries.filter(e => !privatePattern.test(e.path));
const routesToCheck = sampleLimit > 0 ? publicEntries.slice(0, sampleLimit) : publicEntries;
const statuses = { ok: 0, redirect: 0, invalid: 0, network: 0, rateLimited: 0 };
let cursor = 0;
async function worker() {
  while (cursor < routesToCheck.length) {
    const entry = routesToCheck[cursor++];
    try {
      const response = await fetchWithTimeout(entry.path, { method: "HEAD" });
      if (response.status === 200) statuses.ok++;
      else if (response.status === 301 || response.status === 302 || response.status === 307 || response.status === 308) {
        statuses.redirect++;
        logError("Sitemap URL redirects: " + entry.path + " -> " + (response.headers.get("location") ?? "?"));
      } else {
        statuses.invalid++;
        if (response.status === 429) statuses.rateLimited++;
        logError("Sitemap URL HTTP " + response.status + ": " + entry.path);
      }
    } catch (e) {
      statuses.network++;
      logError("Sitemap URL network failure " + entry.path + ": " + e.message);
    }
  }
}
await Promise.all(Array.from({ length: 4 }, () => worker()));

const spotlight = [
  "/", "/ru", "/es", "/en/books", "/ru/books", "/es/books",
  "/en/academy", "/ru/academy", "/es/academy",
  "/en/library", "/ru/library", "/es/library",
  "/en/homeopathy/remedies/arnica", "/ru/homeopathy/remedies/arnica",
  "/es/homeopathy/remedies/arnica", "/en/services",
  "/es/services", "/en/services/free-situation-review",
  "/es/services/free-situation-review", "/es/about",
  "/en/tests", "/ru/tests", "/es/tests",
  "/en/books/alchemy-homeopathy-foundations", "/ru/books/alchemy-homeopathy-foundations",
  "/es/books/alchemy-homeopathy-foundations",
];
const pageReport = [];
for (const path of spotlight) {
  try {
    const response = await fetchWithTimeout(path);
    const html = await response.text();
    const expectedLocale = path === "/" ? "en" : path.split("/")[1];
    const h1 = [...html.matchAll(/<h1(?:\s|>)/g)].length;
    const lang = html.match(/<html[^>]*\blang="([^"]+)"/)?.[1] ?? null;
    const desc = html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/)?.[1] ?? null;
    const canonical = html.match(/<link[^>]*rel="canonical"[^>]*href="([^"]*)"/)?.[1] ?? null;
    const og = /property="og:title"/.test(html) && /property="og:description"/.test(html) && /property="og:image"/.test(html);
    const twitter = /name="twitter:card"/.test(html);
    pageReport.push({ path, status: response.status, h1, lang, descriptionLength: desc?.length ?? null, canonical, og, twitter });
    if (response.status !== 200) logError("Spotlight HTTP " + response.status + ": " + path);
    if (h1 !== 1) logError("H1 count " + h1 + ": " + path);
    if (lang !== expectedLocale) logError("Document lang " + lang + " should be " + expectedLocale + ": " + path);
    if (!desc || desc.length > 160) logError("Meta description length " + (desc?.length ?? "missing") + ": " + path);
    if (!og || !twitter) logError("Missing social meta: " + path);
    if (!canonical || new URL(canonical).origin !== origin || new URL(canonical).pathname !== path) {
      // Existing English canonical root is '/', not the legacy /en.
      logError("Incorrect/missing canonical " + canonical + ": " + path);
    }
    // Public tests are a deliberate SEO landing, not the guest questionnaire UI.
    // Validate the production DOM directly: these pages must never redirect or
    // expose private answers, and their localized links must be crawlable.
    if (["/en/tests", "/ru/tests", "/es/tests"].includes(path)) {
      const firstPartyTestUrl = "/" + expectedLocale + "/client/tests";
      const writtenReviewUrl = "/" + expectedLocale + "/services/free-situation-review";
      if (!html.includes('href="' + firstPartyTestUrl + '"')) logError("Public test CTA missing: " + path);
      if (!html.includes('href="' + writtenReviewUrl + '"')) logError("Free written review link missing: " + path);
      const robots = tags(html, "meta").filter(meta => ["robots", "googlebot"].includes(meta.name));
      if (robots.some(meta => /\\bnoindex\\b/i.test(meta.content ?? "")) ||
          /\\bnoindex\\b/i.test(response.headers.get("x-robots-tag") ?? "")) {
        logError("Public tests unexpectedly noindex: " + path);
      }
      const alternates = Object.fromEntries(
        tags(html, "link")
          .filter(link => link.rel === "alternate" && link.hreflang && link.href)
          .map(link => [link.hreflang, link.href]),
      );
      const sitemapAlternates = byURL.get(origin + path)?.languages ?? {};
      for (const language of ["en", "ru", "es", "x-default"]) {
        const expectedUrl = origin + "/" + (language === "x-default" ? "en" : language) + "/tests";
        if (alternates[language] !== expectedUrl || sitemapAlternates[language] !== expectedUrl) {
          logError("Public tests " + language + " hreflang mismatch " + path +
            " (HTML " + (alternates[language] ?? "missing") +
            ", sitemap " + (sitemapAlternates[language] ?? "missing") + ")");
        }
      }
    }
  } catch (e) { logError("Spotlight request error " + path + ": " + e.message); }
}
for (const [old, target] of [
  ["/books/alchemy-homeopathy-foundations", "/en/books/alchemy-homeopathy-foundations"],
  ["/books/alchemy-homeopathy-foundations?lang=ru", "/ru/books/alchemy-homeopathy-foundations"],
  ["/books/alchemy-homeopathy-foundations?lang=en", "/en/books/alchemy-homeopathy-foundations"],
  ["/ru/cabinet", "/ru/client"],
  ["/es/review", "/es/services/free-situation-review"],
]) {
  const response = await fetchWithTimeout(old, { method: "HEAD" });
  const location = response.headers.get("location") ?? "";
  if (![301, 308].includes(response.status) || !location.endsWith(target)) logError("Legacy redirect " + old + ": " + response.status + " " + location);
}
const notFound = [];
const translatedNotFound = { en: "Page not found", ru: "Страница не найдена", es: "Página no encontrada" };
for (const locale of ["en", "ru", "es"]) {
  const path = "/" + locale + "/seo-audit-missing-route-20261016";
  const response = await fetchWithTimeout(path);
  const html = await response.text();
  const lang = html.match(/<html[^>]*lang="([^"]+)"/)?.[1] ?? null;
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] ?? "";
  const h1 = [...html.matchAll(/<h1(?:\s|>)/g)].length;
  const noindex = /<meta[^>]*name="robots"[^>]*noindex/.test(html);
  notFound.push({ path, status: response.status, lang, title, h1, noindex });
  if (response.status !== 404 || lang !== locale || h1 !== 1 || !title.includes(translatedNotFound[locale])) logError("Localized 404 incomplete: " + JSON.stringify(notFound.at(-1)));
}
const result = {
  timestamp: new Date().toISOString(), origin,
  sitemapEntries: entries.length,
  locales: Object.fromEntries(["en","ru","es"].map(l => [l,entries.filter(e=>e.path === "/"+l || e.path.startsWith("/"+l+"/")).length])),
  urlsChecked: routesToCheck.length, statuses, spotlight: pageReport, notFound,
  errors, warnings,
  passed: errors.length === 0,
};
await mkdir("artifacts", { recursive: true });
await writeFile("artifacts/seo-live-audit.json", JSON.stringify(result, null, 2));
console.log(JSON.stringify({ ...result, spotlight: pageReport.filter(p => p.h1 !== 1 || !p.og || !p.twitter || !p.canonical || (p.descriptionLength ?? 999) > 160) }, null, 2));
if (errors.length) process.exitCode = 1;
