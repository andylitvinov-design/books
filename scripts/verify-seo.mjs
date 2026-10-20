// Read-only SEO audit; default mode uses no network, credentials or patient data.
// To verify after deployment: npm run verify:seo -- --live-base=https://holistichouse.vercel.app
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { getPrioritySitemapEntries, SEO_PRIORITY_PAGE_FAMILIES } from "../data/seo-priority-paths.js";

const projectRoot = new URL("../", import.meta.url);
const read = (path) => readFileSync(new URL(path, projectRoot), "utf8");
const origin = "https://holistichouse.vercel.app";
const publicRouteSources = [
  ["app/[locale]/about/page.tsx", /generateMetadata/, /alternates:/, /<h1/],
  ["app/[locale]/services/free-situation-review/page.tsx", /generateMetadata/, /alternates:/],
  ["app/[locale]/academy/[[...slug]]/page.tsx", /generateMetadata/, /alternates:/],
  ["components/yggdrasil-free-initiation.tsx", /<h1/],
];
const privateRouteSources = [
  "app/[locale]/app/[[...path]]/page.jsx",
  "app/[locale]/client/[selector]/page.js",
  "app/[locale]/report/[assessmentId]/page.jsx",
  "app/admin/clients/page.js",
];

// This explicit delegated source check is not rendered HTML or indexing evidence.
export function auditFreeEntryLandingSources(routeSource, landingSource) {
  const uncomment = source => source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const route = uncomment(routeSource);
  const landing = uncomment(landingSource);
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  check(/import \{ FreeEntryLanding \} from ["']@\/components\/free-entry-landing["']/.test(route),
    "Situation route must import the audited FreeEntryLanding component");
  check(/return <FreeEntryLanding locale=\{locale\} kind="situation" \/>/.test(route),
    "Situation route must return the localized situation landing");
  check(!/<h1\b/.test(route), "Situation route must not duplicate the delegated H1");
  const start = landing.indexOf("export function FreeEntryLanding(");
  check(start >= 0, "Missing exported FreeEntryLanding component");
  const component = start < 0 ? "" : landing.slice(start);
  check(/const t = copy\[locale\]\[kind\]/.test(component), "Landing heading must use localized kind-specific copy");
  check(/<main\b[^>]*lang=\{locale\}[^>]*data-free-entry-landing=\{kind\}/.test(component),
    "Landing main must retain locale and entry kind");
  check((component.match(/<h1\b/g) || []).length === 1 &&
    /<h1 id="free-entry-title">\{t.title\}<\/h1>/.test(component),
    "FreeEntryLanding must render exactly one localized H1");
  return { ok: failures.length === 0, failures };
}

export function auditSeoSources() {
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(message); };
  const entries = getPrioritySitemapEntries(origin);
  const map = JSON.parse(read("data/seo-demand-map.json"));
  check(entries.length === 15, "Unexpected number of public locale-complete pages");
  check(SEO_PRIORITY_PAGE_FAMILIES.length === 5, "Unexpected number of priority page families");
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
  failures.push(...auditFreeEntryLandingSources(
    read("app/[locale]/services/free-situation-review/page.tsx"),
    read("components/free-entry-landing.tsx"),
  ).failures);
  for (const path of privateRouteSources) {
    check(existsSync(new URL(path, projectRoot)), "Missing private route source: " + path);
    check(/robots:\s*\{\s*index:\s*false/.test(read(path)), "Private route must remain noindex: " + path);
  }
  const sitemapCode = read("app/sitemap.ts");
  check(/getPrioritySitemapEntries\(base\)/.test(sitemapCode), "Priority sitemap entries are not integrated");
  check(/\.\.\.existing, \.\.\.entries, \.\.\.priorityEntries, \.\.\.network/.test(sitemapCode), "Sitemap merge or deduplication contract changed");
  const shell = read("app/layout.tsx");
  check(/type="application\/ld\+json"/.test(shell) && /"@type": "WebSite"/.test(shell), "Public WebSite JSON-LD is missing");
  check(/"google-site-verification"/.test(shell), "Existing owner-approved Google Search Console verification metadata is missing");
  const freeInitiation = read("components/yggdrasil-free-initiation.tsx");
  for (const suffix of ["/basic-course/description", "/basic-course"]) {
    check(freeInitiation.includes(suffix), "Missing internal Yggdrasil learning link: " + suffix);
  }
  check(/href=\{root \+ "\/basic-course"\}/.test(freeInitiation), "Missing first-party course entry");
  check(/id="preparation-readings"/.test(freeInitiation), "Missing reading entry section");
  check(/<YggdrasilInitiationForm locale=\{locale\} \/>/.test(freeInitiation), "Missing localized contact form");
  return { ok: failures.length === 0, failures, checked: { publicRoutes: publicRouteSources.length, privateRoutes: privateRouteSources.length, prioritySitemapEntries: entries.length } };
}

// Parse only public response markup, never JavaScript strings embedded in Next payloads.
// This bounded HTML reader handles metadata tags, quoted/unquoted attributes and entities;
// it is not a browser or a claim that Google indexed a page.
function decodeEntities(value) {
  return value.replace(/&(#x[\da-f]+|#\d+|amp|quot|apos|lt|gt|nbsp);/gi, (match, entity) => {
    const key = entity.toLowerCase();
    if (key.startsWith("#")) {
      const code = key.startsWith("#x") ? parseInt(key.slice(2), 16) : Number(key.slice(1));
      return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
    }
    return { amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " " }[key];
  });
}
function attributes(tag) {
  const result = {};
  const source = tag.replace(/^<[^\s/>]+/, "");
  for (const match of source.matchAll(/([^\s=<>/'"]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/g)) {
    result[match[1].toLowerCase()] = decodeEntities(match[2] ?? match[3] ?? match[4]);
  }
  return result;
}
function visibleText(value) {
  return decodeEntities(value.replace(/<[^>]*>/g, " ")).replace(/\s+/g, " ").trim();
}
const tagAttributes = String.raw`(?:"[^"]*"|'[^']*'|[^'">])*`;
function excludeTemplates(html) {
  const tags = new RegExp(`<(/?)([a-z][a-z0-9:-]*)\\b${tagAttributes}>`, "gi");
  let depth = 0;
  let cursor = 0;
  let output = "";
  let match;
  while ((match = tags.exec(html))) {
    if (!depth) output += html.slice(cursor, match.index);
    const closing = Boolean(match[1]);
    const tag = match[2].toLowerCase();
    if (tag === "template") {
      if (closing) depth = Math.max(0, depth - 1);
      else depth++;
    } else if (!closing && ["script", "style"].includes(tag)) {
      // Raw script/style contents may contain literal HTML; do not tokenize them.
      const end = new RegExp(`</${tag}\\s*>`, "gi");
      end.lastIndex = tags.lastIndex;
      const found = end.exec(html);
      const finish = found ? end.lastIndex : html.length;
      if (!depth) output += html.slice(match.index, finish);
      tags.lastIndex = finish;
    } else if (!depth) output += match[0];
    cursor = tags.lastIndex;
  }
  return output + (depth ? "" : html.slice(cursor));
}
export function parsePublicSeoHtml(html) {
  const uncommented = excludeTemplates(html.replace(/<!--[\s\S]*?-->/g, ""));
  const scriptPattern = new RegExp(`<script\\b${tagAttributes}>[\\s\\S]*?<\\/script\\s*>`, "gi");
  const scriptOpen = new RegExp(`^<script\\b${tagAttributes}>`, "i");
  const scripts = [...uncommented.matchAll(scriptPattern)];
  const jsonLd = [];
  const schemaErrors = [];
  for (const [script] of scripts) {
    if (attributes(script.match(scriptOpen)[0]).type?.toLowerCase() !== "application/ld+json") continue;
    try {
      const parsed = JSON.parse(script.replace(scriptOpen, "").replace(/<\/script\s*>$/i, ""));
      if (!parsed || typeof parsed !== "object") throw new Error("Structured data must be an object or array");
      jsonLd.push(parsed);
    } catch { schemaErrors.push("Invalid JSON-LD"); }
  }
  const markup = uncommented.replace(new RegExp(`<(script|style)\\b${tagAttributes}>[\\s\\S]*?<\\/\\1\\s*>`, "gi"), "");
  const tags = (name) => [...markup.matchAll(new RegExp(`<${name}\\b${tagAttributes}>`, "gi"))].map(([tag]) => attributes(tag));
  const text = (name) => [...markup.matchAll(new RegExp(`<${name}\\b${tagAttributes}>([\\s\\S]*?)<\\/${name}\\s*>`, "gi"))].map((match) => visibleText(match[1]));
  const links = tags("link");
  const meta = tags("meta");
  return {
    titles: text("title"), h1: text("h1"),
    descriptions: meta.filter((tag) => tag.name?.toLowerCase() === "description").map((tag) => tag.content || ""),
    canonical: links.filter((tag) => tag.rel?.toLowerCase().split(/\s+/).includes("canonical")).map((tag) => tag.href || ""),
    alternates: links.filter((tag) => tag.rel?.toLowerCase().split(/\s+/).includes("alternate") && tag.hreflang),
    robots: meta.filter((tag) => ["robots", "googlebot", "bingbot"].includes(tag.name?.toLowerCase())).map((tag) => tag.content || ""),
    jsonLd, schemaErrors,
  };
}
function schemaTypes(value) {
  if (Array.isArray(value)) return value.flatMap(schemaTypes);
  if (!value || typeof value !== "object") return [];
  return [value["@type"]].flat().filter(Boolean).concat(schemaTypes(value["@graph"]));
}
export function auditPublicSeoHtml({ html, url, languages, xRobotsTag = "" }) {
  const data = parsePublicSeoHtml(html);
  const failures = [];
  const check = (condition, message) => { if (!condition) failures.push(`${url}: ${message}`); };
  for (const key of ["titles", "descriptions", "h1"]) {
    check(data[key].length === 1 && Boolean(data[key][0]?.trim()), `Expected exactly one nonempty ${key}`);
  }
  check(data.canonical.length === 1 && data.canonical[0] === url, "Expected one absolute self-canonical");
  for (const [locale, href] of Object.entries(languages)) {
    const matches = data.alternates.filter((tag) => tag.hreflang.toLowerCase() === locale);
    check(matches.length === 1 && matches[0].href === href, `Incorrect or duplicate ${locale} hreflang`);
  }
  const xDefault = data.alternates.filter((tag) => tag.hreflang.toLowerCase() === "x-default");
  check(xDefault.length <= 1 && (!xDefault.length || xDefault[0].href === languages.en), "Incorrect x-default hreflang");
  check(![...data.robots, xRobotsTag].some((value) => /\b(noindex|none)\b/i.test(value)), "Public page is noindex");
  check(!data.h1.some((value) => /^(404(?:\b.*)?|not found|page not found|страница не найдена|página no encontrada)$/i.test(value)), "Possible soft 404");
  check(data.schemaErrors.length === 0, "Invalid JSON-LD");
  const types = data.jsonLd.flatMap(schemaTypes);
  check(types.includes("WebSite"), "Missing public WebSite JSON-LD");
  if (new URL(url).pathname.endsWith("/academy/reiki/tantra-reiki/free-initiation")) {
    check(types.includes("WebPage") && types.includes("BreadcrumbList"), "Missing Tantra WebPage/BreadcrumbList JSON-LD");
  }
  return { ok: failures.length === 0, failures, title: data.titles[0], schemaTypes: types };
}

// Includes root-level and localized private route families, not only priority pages.
export function isPrivateSeoPath(path) {
  let decoded;
  try { decoded = decodeURIComponent(path); } catch { return true; }
  return /^\/(?:en\/|ru\/|es\/)?(?:api|admin|app|client|report|prescriptions|documents|document-preview)(?:\/|$)/i.test(decoded);
}
export function auditLiveSitemap(xml, base) {
  assert.match(xml, /<urlset\b/, "Expected an XML sitemap");
  const blocks = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((match) => match[1]);
  const locations = blocks.map((block) => [...block.matchAll(/<loc>([^<]+)<\/loc>/g)].map((match) => decodeEntities(match[1])));
  assert.ok(blocks.length >= 15, "Sitemap is unexpectedly incomplete");
  assert.ok(locations.every((urls) => urls.length === 1), "Each sitemap entry needs exactly one loc");
  const found = locations.flat();
  assert.equal(new Set(found).size, blocks.length, "Duplicate sitemap URL");
  for (const url of found) {
    const parsed = new URL(url);
    assert.equal(parsed.origin, base, "Unexpected sitemap origin");
    assert.ok(!parsed.search && !parsed.hash, "Query/fragment URL in sitemap");
    assert.ok(!isPrivateSeoPath(parsed.pathname), "Private URL in sitemap: " + parsed.pathname);
  }
  for (const entry of getPrioritySitemapEntries(base)) {
    const index = found.indexOf(entry.url);
    assert.ok(index >= 0, "Missing public sitemap URL " + entry.url);
    const links = [...blocks[index].matchAll(/<(?:xhtml:)?link\b[^>]*>/gi)].map(([tag]) => attributes(tag));
    for (const [locale, href] of Object.entries(entry.alternates.languages)) {
      const matches = links.filter((tag) => tag.hreflang === locale && tag.rel === "alternate");
      assert.ok(matches.length === 1 && matches[0].href === href, "Missing or incorrect reciprocal alternate " + entry.url + ":" + locale);
    }
  }
  return { urls: found.length, priorityUrls: 15 };
}

export function auditLiveRobots(robots, origin) {
  const groups = [];
  const sitemaps = [];
  let group = null;
  for (const raw of robots.split(/\r?\n/)) {
    const line = raw.replace(/#.*/, "").trim();
    const separator = line.indexOf(":");
    if (separator < 0) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();
    if (key === "sitemap") { sitemaps.push(value); continue; }
    if (key === "user-agent") {
      if (!group || group.rules.length) { group = { agents: [], rules: [] }; groups.push(group); }
      group.agents.push(value.toLowerCase());
    } else if (group && ["allow", "disallow"].includes(key)) group.rules.push({ key, value });
  }
  assert.ok(sitemaps.includes(origin + "/sitemap.xml"), "Missing robots sitemap declaration");
  const wildcard = groups.filter((item) => item.agents.includes("*"));
  assert.ok(wildcard.length > 0, "Missing robots wildcard agent policy");
  const disallow = wildcard.flatMap((item) => item.rules.filter((rule) => rule.key === "disallow").map((rule) => rule.value));
  assert.ok(!disallow.includes("/") && !disallow.includes("/*"), "Public website blocked by robots");
  for (const path of ["/api", "/admin", "/document-preview/", ...["en", "ru", "es"].flatMap((locale) => ["app", "client", "report", "prescriptions"].map((route) => `/${locale}/${route}`))]) {
    assert.ok(disallow.some((value) => value.replace(/\/$/, "") === path.replace(/\/$/, "")), "Missing private robots protection: " + path);
  }
  // A literal Disallow is insufficient: more-specific Allow rules and crawler
  // groups can change the effective policy. Check every declared crawler group,
  // including Google/Bing when they inherit the wildcard policy.
  const agents = new Set(["*", "googlebot", "bingbot", ...groups.flatMap((item) => item.agents)]);
  const isAllowed = (path, rules) => {
    let winner = { specificity: -1, allow: true };
    for (const rule of rules) {
      if (!rule.value) continue;
      const end = rule.value.endsWith("$");
      const pattern = end ? rule.value.slice(0, -1) : rule.value;
      const regex = new RegExp("^" + pattern.split("*").map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".*") + (end ? "$" : ""));
      if (!regex.test(path)) continue;
      const specificity = pattern.replace(/\*/g, "").length;
      const allow = rule.key === "allow";
      if (specificity > winner.specificity || (specificity === winner.specificity && allow)) winner = { specificity, allow };
    }
    return winner.allow;
  };
  const privateSamples = ["/api/example", "/admin/example", "/document-preview/example", ...["en", "ru", "es"].flatMap((locale) => ["app", "client", "report", "prescriptions"].map((route) => `/${locale}/${route}/example`))];
  for (const agent of agents) {
    const specific = groups.filter((item) => item.agents.includes(agent));
    const rules = (specific.length ? specific : wildcard).flatMap((item) => item.rules);
    for (const entry of getPrioritySitemapEntries(origin)) {
      assert.ok(isAllowed(new URL(entry.url).pathname, rules), `Public priority path blocked for ${agent}: ${entry.url}`);
    }
    for (const path of privateSamples) assert.ok(!isAllowed(path, rules), `Private robots protection overridden for ${agent}: ${path}`);
  }
  return { ok: true };
}

export async function auditLiveSeo(base, { fetchImpl = fetch } = {}) {
  const parsed = new URL(base);
  assert.equal(parsed.protocol, "https:");
  assert.ok(!parsed.username && !parsed.password && !parsed.search && !parsed.hash && parsed.pathname === "/", "Expected a public HTTPS origin only");
  const origin = parsed.origin;
  const readPublic = async (path, contentType) => {
    // No automatic retries, authentication or redirect-following. A denied read stops the audit.
    const result = await fetchImpl(origin + path, { method: "GET", redirect: "manual", signal: AbortSignal.timeout(20000) });
    assert.equal(result.status, 200, `Public read failed (${result.status}) at ${path}; do not bypass access restrictions`);
    assert.match(result.headers.get("content-type") || "", contentType, "Unexpected content type at " + path);
    return { text: await result.text(), xRobotsTag: result.headers.get("x-robots-tag") || "" };
  };
  const sitemap = auditLiveSitemap((await readPublic("/sitemap.xml", /(?:application|text)\/xml/i)).text, origin);
  const robots = (await readPublic("/robots.txt", /text\/plain/i)).text;
  auditLiveRobots(robots, origin);
  const pages = [];
  for (const entry of getPrioritySitemapEntries(origin)) {
    const response = await readPublic(new URL(entry.url).pathname, /text\/html/i);
    const report = auditPublicSeoHtml({ html: response.text, url: entry.url, languages: entry.alternates.languages, xRobotsTag: response.xRobotsTag });
    assert.ok(report.ok, report.failures.join("\n"));
    pages.push({ url: entry.url, title: report.title });
  }
  assert.equal(new Set(pages.map((page) => page.title)).size, 15, "Duplicate titles across priority pages");
  return { ok: true, sitemap, pages, checkedAt: new Date().toISOString() };
}

async function main() {
  const report = auditSeoSources();
  assert.ok(report.ok, report.failures.join("\n"));
  console.log(`PASS: SEO map, ${report.checked.prioritySitemapEntries} public locale URLs, sitemap integration, public metadata/H1 and private noindex contracts (source checks only)`);
  const liveArg = process.argv.find((arg) => arg.startsWith("--live-base="));
  if (liveArg) {
    const live = await auditLiveSeo(liveArg.slice("--live-base=".length));
    console.log(`PASS: live sitemap, robots, ${live.pages.length}/15 HTML pages, canonical/hreflang/metadata/JSON-LD at ${live.checkedAt}; this is not proof of Google indexing`);
  }
}
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => { console.error("FAIL:", error.message); process.exitCode = 1; });
}
